import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { publicAppointmentSchema } from '../schemas/appointmentSchema.js';
import { findBestAttendant, findBestAttendantWithLogs, type CheckLogItem, isAttendantWithinSchedule, hasConflictingAppointment, isAttendantBlockedForEvent, hasSectorTimeLimit, loadCustomerSuccessTeam, isCustomerSuccessSlotFull, isCustomerSuccessLimitDbError } from '../utils/distribution.js';
import { getAppointmentWebhooks, getGlobalAppointmentWebhook } from '../config/webhooks.js';
import { createGoogleMeetLink } from '../services/googleMeet.js';
import { supabase } from '../utils/supabaseClient.js';
import { rescheduleLastNoShow } from '../utils/noShowReschedule.js';
import { PRE_VENDAS_ALIASES, CUSTOMER_SUCCESS_ALIASES, SECTOR_CUSTOMER_SUCCESS, isCustomerSuccess, isPreVendas, sectorAliases } from '../constants/sectors.js';
import { verifyFirebaseToken, requireRole } from '../middleware/firebaseAuth.js';
import { availableTimesRateLimiter } from '../middleware/rateLimiter.js';
import { normalizeDateInput } from '../utils/dateInput.js';

const router = Router();

// Janela máxima para auto-agendamento pelo link público
const MAX_PUBLIC_BOOKING_DAYS_AHEAD = 180;
// Antecedência mínima padrão do POST (CS e SDR têm regras próprias)
const PUBLIC_MIN_LEAD_MINUTES = 30;

// --- Event-specific Restrictions ---
const RESTRICTED_EVENT_ID = 'c375b72f-85a5-4f2e-b99a-614d04e5b6fb';
const RESTRICTED_EVENT_WHITELIST = [
    'andre1994bento@gmail.com',
    'menezes.sp@gmail.com',
    'luiz.lima@orange.fr',
    'pmigueltm@gmail.com',
    'rubensrs28@hotmail.com',
    'fabioricardo737@gmail.com',
    'ronaldolorenzi68@gmail.com',
];
const RESTRICTED_EVENT_MAX_APPOINTMENTS = 2;
// Statuses that do NOT count toward the limit (slot was freed up)
const RESTRICTED_EVENT_FREE_STATUSES = ['Cancelado', 'Reagendado'];

// Usado só pelo painel interno (Events.tsx): exige sessão autenticada (cookie).
router.get('/events/feeds', verifyFirebaseToken, requireRole('Admin', 'Dev', 'Líder', 'Co-líder', 'Qualidade', 'Colaborador'), async (req: Request, res: Response) => {
    const { sector } = req.query;
    if (!sector || typeof sector !== 'string') {
        return res.status(400).json({ error: 'Setor é obrigatório' });
    }

    try {
        // 1. Get events from the same sector
        const { data: sectorEvents, error: sectorError } = await supabase
            .from('events')
            .select('*')
            .in('sector', sectorAliases(sector));

        if (sectorError) throw sectorError;

        // 2. Get events that generated appointments for this sector in the last 30 days
        // Closer types: ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade']
        const closerTypes = ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade'];
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: apptEvents, error: apptError } = await supabase
            .from('appointments')
            .select('event_id')
            .in('type', closerTypes)
            .gte('date', dateStr)
            .not('event_id', 'is', null);

        if (apptError) throw apptError;

        const uniqueEventIds = Array.from(new Set(apptEvents.map(a => a.event_id)));
        
        // Fetch those extra events if not already in sectorEvents
        const existingIds = sectorEvents.map(e => e.id);
        const extraIds = uniqueEventIds.filter(id => !existingIds.includes(id));

        let allEvents = [...sectorEvents];

        if (extraIds.length > 0) {
            const { data: extraEvents, error: extraError } = await supabase
                .from('events')
                .select('*')
                .in('id', extraIds);
            
            if (!extraError && extraEvents) {
                allEvents = [...allEvents, ...extraEvents];
            }
        }

        res.json(allEvents);
    } catch (err: any) {
        console.error("Feeds Fetch Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// --- GET Event by Link ---
router.get('/events/:link', async (req: Request, res: Response) => {
    const { link } = req.params;

    if (!link) return res.status(400).json({ error: 'Link inválido' });

    try {
        const { data: event, error } = await supabase
            .from('events')
            .select('id, event_name, sector, self_scheduling_link, status')
            .eq('self_scheduling_link', link)
            .single();

        if (error || !event) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        if (!event.status) {
            return res.status(400).json({ error: 'Este evento não está mais ativo' });
        }

        // Return safe DTO
        res.json({
            id: event.id,
            event_name: event.event_name,
            sector: event.sector,
            duration: 60
        });

    } catch (err: any) {
        console.error("Public Event Fetch Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// ---------------------------------------------------------------- disponibilidade
// Regras compartilhadas por GET /available-times (horários de um dia) e
// GET /available-days (dias com horário no mês). Um único lugar para as regras
// de setor/tipo, para os dois endpoints nunca divergirem.

interface AvailabilityContext {
    appointmentType: string;
    sectors: string[];
    durationMinutes: number;
    /** Todos os atendentes do setor (o limite do CS conta o time inteiro). */
    attendants: any[];
    /** Atendentes que podem receber este evento (sem os bloqueados). */
    filteredAttendants: any[];
    /** Time inteiro do Customer Success (qualquer cargo), base do limite de simultâneos. */
    csTeam: { id: string; sector: string }[];
}

// Tipo de agendamento, setores e duração usados para um evento.
async function resolveAvailabilityRules(eventId?: string) {
    let appointmentType = 'Ligação Closer';
    let sectors = ['Closer'];
    let durationMinutes = 60;

    if (eventId) {
        const { data: eventData } = await supabase.from('events').select('event_name, sector, duration_minutes').eq('id', eventId).single();
        if (eventData) {
            if (eventData.duration_minutes) durationMinutes = eventData.duration_minutes;
            // 1. Tipo base
            if (eventData.event_name === 'Primeiro Dólar na Prática' || eventData.event_name === 'Dollar On Demand') {
                appointmentType = 'Gold Call';
            }

            // 2. Ajustes por setor
            if (isCustomerSuccess(eventData.sector)) {
                sectors = [...CUSTOMER_SUCCESS_ALIASES];
                appointmentType = 'Onboarding';
            } else if (eventData.sector === 'CEO') {
                sectors = ['CEO'];
                appointmentType = 'Agendamento Pessoal';
            } else if (isPreVendas(eventData.sector)) {
                sectors = [...PRE_VENDAS_ALIASES];
            } else if (eventData.sector === 'SDR') {
                sectors = ['SDR'];
                appointmentType = 'Ligação SDR';
            } else if (eventData.sector === 'Closer') {
                sectors = ['Closer'];
            } else {
                sectors = [eventData.sector];
            }
        }
    }

    return { appointmentType, sectors, durationMinutes };
}

// Monta o contexto (regras + atendentes). Lança erro se a busca falhar.
async function loadAvailabilityContext(eventId?: string): Promise<AvailabilityContext> {
    const { appointmentType, sectors, durationMinutes } = await resolveAvailabilityRules(eventId);

    // Atendentes do setor (sem Líder). Ignora attendantId do link público: a
    // distribuição é sempre automática.
    let attendantsQuery = supabase.from('user').select('*').neq('role', 'Líder').in('sector', sectors);
    // SDR e Customer Success: só Colaborador e Co-líder (no CS ficam de fora o
    // Admin e as Qualidades que vieram do Suporte).
    if (sectors.includes('SDR') || sectors.some(s => isCustomerSuccess(s))) {
        attendantsQuery = attendantsQuery.in('role', ['Colaborador', 'Co-líder']);
    }

    const { data: attendants, error } = await attendantsQuery;
    if (error || !attendants) {
        console.error('Error fetching attendants:', error);
        throw new Error('Erro ao buscar atendentes');
    }

    const filteredAttendants = eventId
        ? attendants.filter(a => !isAttendantBlockedForEvent(a, eventId, appointmentType))
        : attendants;

    // O limite do CS conta o time todo, não só Colaborador/Co-líder do pool acima.
    const csTeam = sectors.some(s => isCustomerSuccess(s)) ? await loadCustomerSuccessTeam() : [];

    return { appointmentType, sectors, durationMinutes, attendants, filteredAttendants, csTeam };
}

// Horários livres de um dia. `dayAppointments` deve conter só os agendamentos
// (não cancelados) DESTE dia: hasConflictingAppointment não compara a data.
// `accept` filtra horários extras; com `stopAtFirst` para no primeiro livre
// (basta saber se o dia tem horário).
async function computeAvailableTimes(
    ctx: AvailabilityContext,
    date: string,
    dayAppointments: any[],
    options: { accept?: (time: string) => boolean; stopAtFirst?: boolean } = {}
): Promise<string[]> {
    const { appointmentType, sectors, durationMinutes, csTeam, filteredAttendants } = ctx;
    const accept = options.accept ?? (() => true);
    const availableTimes: string[] = [];

    // CEO: usa as datas personalizadas da agenda dele em vez de 0-24h
    if (sectors.includes('CEO')) {
        if (filteredAttendants.length === 0) return [];
        const ceo = filteredAttendants[0];
        const customDates = ceo.schedule?.custom_dates || {};
        const ceoTimesForDate: string[] = customDates[date] || [];

        for (const timeSlot of ceoTimesForDate) {
            if (!accept(timeSlot)) continue;
            if (!hasConflictingAppointment(ceo.id, date, timeSlot, appointmentType, dayAppointments, undefined, durationMinutes)) {
                availableTimes.push(timeSlot);
                if (options.stopAtFirst) break;
            }
        }
        return Array.from(new Set(availableTimes)).sort();
    }

    const isCsEvent = sectors.some(s => isCustomerSuccess(s));
    const isSDR = sectors.includes('SDR');
    const allowedMinutes = isCsEvent ? [0, 30] : [0, 15, 30, 45];
    const now = Date.now();

    for (let hour = 0; hour < 24; hour++) {
        for (const minute of allowedMinutes) {
            const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const diffMinutes = (new Date(`${date}T${timeSlot}:00-03:00`).getTime() - now) / 60000;

            if (isCsEvent) {
                // Janela das 09:00 às 21:00 (último horário às 21:00)
                if (hour < 9 || hour > 21 || (hour === 21 && minute > 0)) continue;
                // 12h de antecedência para o Customer Success (link externo)
                if (diffMinutes < 12 * 60) continue;
                // Limite de simultâneos do CS: qualquer tipo ou evento, time inteiro.
                if (hasSectorTimeLimit(SECTOR_CUSTOMER_SUCCESS, date, timeSlot, dayAppointments, csTeam, undefined, durationMinutes)) continue;
            }

            // 1h de antecedência para SDR (link externo)
            if (isSDR && diffMinutes < 60) continue;

            if (!accept(timeSlot)) continue;

            if (await checkIfAnyCloserAvailable(filteredAttendants, dayAppointments, date, timeSlot, appointmentType, durationMinutes)) {
                availableTimes.push(timeSlot);
                if (options.stopAtFirst) return availableTimes;
            }
        }
    }

    return availableTimes;
}

// --- GET Available Times for a Date ---
// Returns list of time slots that have at least one closer available
router.get('/available-times', availableTimesRateLimiter, async (req: Request, res: Response) => {
    // Disable caching for this endpoint
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { date, eventId } = req.query;
    const eventIdStr = eventId && typeof eventId === 'string' ? eventId : undefined;

    if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Data é obrigatória (formato: YYYY-MM-DD)' });
    }

    // Validate date format
    if (normalizeDateInput(date, false) === null) {
        return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    try {
        const ctx = await loadAvailabilityContext(eventIdStr);

        const { data: appointments, error: appError } = await supabase
            .from('appointments')
            .select('id, attendant_id, date, time, end_time, type, status')
            .eq('date', date)
            .neq('status', 'Cancelado');

        if (appError) {
            console.error('Error fetching appointments:', appError);
            return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        }

        const availableTimes = await computeAvailableTimes(ctx, date, appointments || []);

        console.log('[AVAILABLE-TIMES] Final result:', {
            date,
            sectors: ctx.sectors,
            type: ctx.appointmentType,
            attendantsCount: ctx.filteredAttendants.length,
            availableTimesCount: availableTimes.length,
        });

        res.json({ date, availableTimes: Array.from(new Set(availableTimes)).sort() });

    } catch (err: any) {
        console.error("Available Times Fetch Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// --- GET Available Days for a Month ---
// Dias do mês com pelo menos um horário livre, para o calendário da página
// pública não oferecer dias vazios. Só até PUBLIC_CALENDAR_DAYS_AHEAD dias.
const PUBLIC_CALENDAR_DAYS_AHEAD = 60;
const availableDaysQuerySchema = z.object({
    eventId: z.string().uuid('Evento inválido'),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido. Use YYYY-MM.'),
});

// "YYYY-MM-DD" em Brasília (UTC-3 fixo), deslocado em `days` dias.
const brazilISO = (ms: number, days = 0) => new Date(ms - 3 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

router.get('/available-days', availableTimesRateLimiter, async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    const parsed = availableDaysQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Parâmetros inválidos', details: parsed.error.format() });
    }
    const { eventId, month } = parsed.data;

    try {
        // Mesma regra do POST: só eventos ativos com link público
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('sector, status, self_scheduling_link')
            .eq('id', eventId)
            .single();
        if (eventError || !eventData || !eventData.self_scheduling_link) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }
        if (!eventData.status) {
            return res.status(400).json({ error: 'Este evento não está mais ativo' });
        }

        // Interseção do mês pedido com a janela [hoje, hoje + 60 dias]
        const now = Date.now();
        const windowStart = brazilISO(now);
        const windowEnd = brazilISO(now, PUBLIC_CALENDAR_DAYS_AHEAD);
        const [year, monthNum] = month.split('-').map(Number);
        const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
        const from = `${month}-01` < windowStart ? windowStart : `${month}-01`;
        const to = `${month}-${String(lastDay).padStart(2, '0')}` > windowEnd ? windowEnd : `${month}-${String(lastDay).padStart(2, '0')}`;

        if (from > to) return res.json({ month, days: [] });

        // Atendentes e agendamentos do período buscados uma vez só
        const ctx = await loadAvailabilityContext(eventId);
        const { data: appointments, error: appError } = await supabase
            .from('appointments')
            .select('id, attendant_id, date, time, end_time, type, status')
            .gte('date', from)
            .lte('date', to)
            .neq('status', 'Cancelado');

        if (appError) {
            console.error('Error fetching appointments:', appError);
            return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        }

        const byDate = new Map<string, any[]>();
        for (const appt of appointments || []) {
            const list = byDate.get(appt.date);
            if (list) list.push(appt);
            else byDate.set(appt.date, [appt]);
        }

        // Mesmos filtros que a página aplica antes de mostrar um horário:
        // antecedência mínima do POST (30 min; CS e SDR já filtrados acima) e,
        // em Pré-vendas, só :00 e :30.
        const preVendas = isPreVendas(eventData.sector);
        const minStart = now + PUBLIC_MIN_LEAD_MINUTES * 60_000;

        const days: string[] = [];
        for (let day = from; day <= to; day = brazilISO(Date.parse(`${day}T12:00:00-03:00`), 1)) {
            const accept = (time: string) =>
                Date.parse(`${day}T${time}:00-03:00`) >= minStart &&
                (!preVendas || time.endsWith(':00') || time.endsWith(':30'));
            const times = await computeAvailableTimes(ctx, day, byDate.get(day) || [], { accept, stopAtFirst: true });
            if (times.length > 0) days.push(day);
        }

        res.json({ month, days });
    } catch (err: any) {
        console.error('Available Days Fetch Error:', err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// Helper function to check if any closer is available at a given time
async function checkIfAnyCloserAvailable(
    attendants: any[],
    appointments: any[],
    date: string,
    time: string,
    type: string,
    durationMinutes: number = 60
): Promise<boolean> {
    // Filter by schedule first
    const availableBySchedule = attendants.filter(a => isAttendantWithinSchedule(a, date, time, type, durationMinutes));
    if (availableBySchedule.length === 0) return false;

    // At least one without a conflict
    return availableBySchedule.some(attendant =>
        !hasConflictingAppointment(attendant.id, date, time, type, appointments, undefined, durationMinutes)
    );
}

// --- POST Create Appointment ---
router.post('/appointments', async (req: Request, res: Response) => {
    try {
        // 1. Validate Input Strict
        const validation = publicAppointmentSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Erro de Validação',
                details: validation.error.format()
            });
        }

        const data = validation.data;
        const eventId = data.eventId;

        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('event_name, sector, duration_minutes, status, self_scheduling_link')
            .eq('id', eventId)
            .single();

        // Só eventos acessíveis pelo link público (mesma regra do GET /events/:link)
        if (eventError || !eventData || !eventData.self_scheduling_link) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        if (!eventData.status) {
            return res.status(400).json({ error: 'Este evento não está mais ativo' });
        }

        const durationMinutes = eventData.duration_minutes || 60;

        let APPOINTMENT_TYPE = 'Ligação Closer';
        if (eventData.event_name === 'Primeiro Dólar na Prática' || eventData.event_name === 'Dollar On Demand') {
            APPOINTMENT_TYPE = 'Gold Call';
        } else if (eventData.sector === 'CEO') {
            APPOINTMENT_TYPE = 'Agendamento Pessoal';
        } else if (isCustomerSuccess(eventData.sector)) {
            APPOINTMENT_TYPE = 'Onboarding';
        } else if (eventData.sector === 'SDR') {
            APPOINTMENT_TYPE = 'Ligação SDR';
        }

        // 2. Buffer Check (30 minutes or 12 hours)
        const now = new Date();
        const apptDateTime = new Date(`${data.date}T${data.time}:00-03:00`);
        if (!Number.isFinite(apptDateTime.getTime())) {
            return res.status(400).json({ error: 'Data ou horário inválido.' });
        }
        const diffMinutes = (apptDateTime.getTime() - now.getTime()) / 60000;

        if (diffMinutes > MAX_PUBLIC_BOOKING_DAYS_AHEAD * 24 * 60) {
            return res.status(400).json({ error: `O agendamento pode ser feito com no máximo ${MAX_PUBLIC_BOOKING_DAYS_AHEAD} dias de antecedência.` });
        }

        const isCsEvent = isCustomerSuccess(eventData.sector);
        const isSDR = eventData.sector === 'SDR';
        const minLeadMinutes = isCsEvent ? 12 * 60 : isSDR ? 60 : PUBLIC_MIN_LEAD_MINUTES;

        if (diffMinutes < minLeadMinutes) {
            let errorMsg = 'O agendamento deve ter pelo menos 30 minutos de antecedência.';
            if (isCsEvent) errorMsg = 'O agendamento para este setor deve ter pelo menos 12 horas de antecedência.';
            else if (isSDR) errorMsg = 'O agendamento deve ter pelo menos 1 hora de antecedência.';
            return res.status(400).json({ error: errorMsg });
        }

        // 2.5 Time Slot Restriction (only :00 and :30 for Customer Success)
        if (isCsEvent) {
            const minutes = parseInt(data.time.split(':')[1]);
            if (minutes !== 0 && minutes !== 30) {
                return res.status(400).json({ error: 'Para este setor, os agendamentos são permitidos apenas nos horários cheios (:00) ou meias horas (:30).' });
            }
        }

        // 3. Client Validation (1 Pending Rule)
        const cleanPhone = data.phone.replace(/\D/g, '');

        // Check if ANY client with this phone has a PENDING appointment
        // We first find the client ID(s) for this phone
        const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('phone', cleanPhone);

        if (clientData && clientData.length > 0) {
            const clientIds = clientData.map(c => c.id);
            const { data: pendingAppts } = await supabase
                .from('appointments')
                .select('id')
                .in('client_id', clientIds)
                .eq('status', 'Pendente');

            if (pendingAppts && pendingAppts.length > 0) {
                return res.status(409).json({ error: 'Você já possui um agendamento pendente.' });
            }
        }

        // 3.5 Event-specific Whitelist & Limit Check
        if (eventId === RESTRICTED_EVENT_ID) {
            const emailNorm = data.email.toLowerCase();
            if (!RESTRICTED_EVENT_WHITELIST.includes(emailNorm)) {
                console.warn(`[RESTRICTED EVENT] Blocked unauthorized email (public): ${emailNorm}`);
                return res.status(403).json({ error: 'Este email não está autorizado a agendar neste evento.' });
            }

            // Count existing non-freed appointments for this email in this event
            const { data: emailClients } = await supabase
                .from('clients')
                .select('id')
                .eq('email', emailNorm);

            if (emailClients && emailClients.length > 0) {
                const clientIds = emailClients.map((c: any) => c.id);
                const { data: existingEventAppts } = await supabase
                    .from('appointments')
                    .select('id, status')
                    .eq('event_id', RESTRICTED_EVENT_ID)
                    .in('client_id', clientIds)
                    .not('status', 'in', `(${RESTRICTED_EVENT_FREE_STATUSES.map(s => `"${s}"`).join(',')})`);

                const usedSlots = existingEventAppts?.length || 0;
                console.log(`[RESTRICTED EVENT] Email ${emailNorm} has ${usedSlots}/${RESTRICTED_EVENT_MAX_APPOINTMENTS} slots used.`);

                if (usedSlots >= RESTRICTED_EVENT_MAX_APPOINTMENTS) {
                    return res.status(409).json({
                        error: `Você já utilizou o limite de ${RESTRICTED_EVENT_MAX_APPOINTMENTS} agendamentos para este evento.`
                    });
                }
            }
        }

        // 4. Distribution Logic
        // Força distribuição automática, ignorando qualquer attendantId enviado
        let distributionChecksLog: CheckLogItem[] | null = null;
        
        const resDist = await findBestAttendantWithLogs(data.date, data.time, APPOINTMENT_TYPE, eventId, { durationMinutes });
        let finalAttendantId = resDist.attendantId;
        distributionChecksLog = resDist.checksLog;

        if (!finalAttendantId) {
            return res.status(409).json({
                error: 'Não há horários disponíveis para este momento. Por favor, escolha outro horário.'
            });
        }

        // Event-specific blocklist: never assign blocked closer for this event
        const { data: finalAttendantData } = await supabase
            .from('user')
            .select('id, name, sector, schedule, pauses, denied_events')
            .eq('id', finalAttendantId)
            .single();

        if (isAttendantBlockedForEvent(finalAttendantData, eventId, APPOINTMENT_TYPE)) {
            return res.status(409).json({
                error: 'Este atendente está bloqueado para este evento.'
            });
        }

        // Checagem final do limite de simultâneos do Customer Success (a distribuição
        // já o respeita; aqui pega quem agendou no meio tempo).
        if (await isCustomerSuccessSlotFull({ attendantId: finalAttendantId, date: data.date, time: data.time, durationMinutes })) {
            return res.status(409).json({
                error: 'Não há horários disponíveis para este momento. Por favor, escolha outro horário.'
            });
        }

        // VALIDAÇÃO FINAL DE CONFLITO (Double Booking)
        const { data: conflicts } = await supabase
            .from('appointments')
            .select('id, attendant_id, date, time, end_time, type, status')
            .eq('date', data.date)
            .eq('attendant_id', finalAttendantId)
            .neq('status', 'Cancelado');

        if (conflicts && hasConflictingAppointment(finalAttendantId, data.date, data.time, APPOINTMENT_TYPE, conflicts, undefined, durationMinutes)) {
            return res.status(409).json({ error: 'Este horário acabou de ser preenchido. Por favor, escolha outro.' });
        }

        // 5. Client Management (Create or Update)
        let clientId: string | null = null;

        // Upsert client structure
        const clientPayload = {
            name: data.lead,
            phone: cleanPhone,
            email: data.email,
            // Defaults as requested
            interest_level: 'Desconhecido',
            knowledge_level: 'Iniciante',
            financial_currency: 'BRL',
            financial_amount: 0
        };

        // Try to find existing first
        const { data: existingClient } = await supabase
            .from('clients')
            .select('id, name, email, interest_level, knowledge_level, financial_currency, financial_amount')
            .eq('phone', cleanPhone)
            .single();

        if (existingClient) {
            clientId = existingClient.id;
            // Link público não é autenticado: nunca sobrescreve dados já cadastrados do
            // cliente (nome, email, perfil do CRM). Só preenche campos vazios.
            const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
            const fillPayload: Record<string, unknown> = {};
            for (const key of ['name', 'email', 'interest_level', 'knowledge_level', 'financial_currency', 'financial_amount'] as const) {
                if (isEmpty((existingClient as any)[key])) fillPayload[key] = clientPayload[key];
            }
            if (Object.keys(fillPayload).length > 0) {
                const { error: fillError } = await supabase.from('clients').update(fillPayload).eq('id', clientId);
                if (fillError) console.error('[PUBLIC] Falha ao completar cadastro do cliente:', fillError);
            }
        } else {
            const { data: newClient } = await supabase.from('clients').insert(clientPayload).select('id').single();
            if (newClient) clientId = newClient.id;
        }

        if (!clientId) throw new Error("Falha ao processar o cadastro do cliente.");

        // 6. Create Appointment
        // Calculate End Time based on event duration_minutes
        const [hours, minutes] = data.time.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + durationMinutes;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        // Dynamic created_by Attribution
        // Always assign system user for public links
        let validatedSenderId = 'a6127506-db64-4ac9-ba09-7eac663b0b31'; // Default system user

        // Get Event ID from Link (we expect the link to be passed or we need the ID)
        // Actually, the Frontend should probably pass the Event ID explicitly if it has it, 
        // OR pass the link and we look it up.
        // The schema doesn't have eventId or link, let's fix that.
        // Wait, the user said "link único, eles preencherão formulário".
        // The frontend will know the Event ID because it fetched it.
        // I should probably add `eventId` to the body.
        // But the user didn't explicitly ask to validate eventId in the public form input.
        // I will trust the frontend to send it, or better, add it to schema validation as hidden field.
        // Since I already wrote the schema validation, I need to check if I can pass extra fields.
        // Zod strips unknown fields by default if using strict, or ignores them if safeParse.
        // I need the event ID to link it.
        // Let's assume the frontend sends `eventId` and I will just trust it or validate it.
        // Actually, I missed adding `eventId` to `publicAppointmentSchema`. 
        // I'll grab it from the body directly for now, or assume it is sent.

        // Removed late event check since it was moved to the top.

        // 5.5 Create Google Meet Link
        let meetLink = '';
        let googleEventId = null;

        // Calculate ISO strings for Google
        // We need to handle potential date crossing if late night, but let's stick to simple ISO for now
        // Assuming time is HH:MM and date is YYYY-MM-DD
        const startIso = `${data.date}T${data.time}:00-03:00`;
        const endIso = `${data.date}T${endTime}:00-03:00`;

        // Get Attendant Email
        const { data: attendantUser } = await supabase.from('user').select('email').eq('id', finalAttendantId).single();
        const attendees = [data.email]; // Client email
        if (attendantUser && attendantUser.email) {
            attendees.push(attendantUser.email);
        }
        if (!attendees.includes('di01@tradestars.com.br')) {
            attendees.push('di01@tradestars.com.br');
        }

        // Create Event
        const googleData = await createGoogleMeetLink(
            `Reunião com ${data.lead}`,
            startIso,
            endIso,
            attendees
        );

        if (googleData) {
            meetLink = googleData.meetLink || '';
            googleEventId = googleData.eventId;
        }

        const appointmentPayload = {
            client_id: clientId,
            date: data.date,
            time: data.time,
            end_time: endTime,
            type: APPOINTMENT_TYPE,
            status: 'Pendente',
            attendant_id: finalAttendantId,
            event_id: eventId,
            meet_link: meetLink,
            notes: 'Auto-agendamento via Link Público',
            additional_info: '',
            google_event_id: googleEventId, // Save Google Event ID
            interest_level: 'Desconhecido',
            knowledge_level: 'Iniciante',
            financial_currency: 'BRL',
            financial_amount: 0,
            created_at: new Date().toISOString(),
            created_by: validatedSenderId,
            owner: validatedSenderId
        };

        const { data: createdAppointment, error: appError } = await supabase
            .from('appointments')
            .insert(appointmentPayload)
            .select()
            .single();

        if (appError) {
            // DB-level guarantee (see supabase/add_no_double_booking_constraint.sql): the
            // exclusion constraint rejects any overlapping "Pendente" appointment for the
            // same attendant, closing the check-then-insert race the app-level checks above
            // can't fully close on their own.
            if (appError.code === '23P01') {
                return res.status(409).json({ error: 'Conflito: Este atendente já possui um compromisso neste horário.' });
            }
            // Trigger do banco (supabase/add_customer_success_concurrent_limit.sql): dois
            // pedidos passaram pela checagem do limite do CS ao mesmo tempo.
            if (isCustomerSuccessLimitDbError(appError)) {
                return res.status(409).json({ error: 'Este horário acabou de ser preenchido. Por favor, escolha outro.' });
            }
            console.error("Supabase Write Error:", appError);
            return res.status(500).json({ error: 'Erro ao salvar agendamento' });
        }

        // Último agendamento do aluno estava como No-show: vira Reagendado.
        await rescheduleLastNoShow(clientId, createdAppointment.id, null);

        if (distributionChecksLog && finalAttendantId && createdAppointment && clientId) {
            const { data: selectedUser } = await supabase.from('user').select('name').eq('id', finalAttendantId).maybeSingle();
            const attName = selectedUser?.name || 'Atendente Selecionado';
            supabase.from('execution_logs').insert({
                client_id: clientId,
                execution_type: 'Distribuição Automática',
                selected_attendant_id: finalAttendantId,
                selected_attendant_name: attName,
                appointment_id: createdAppointment.id,
                checks_log: distributionChecksLog
            }).then(({ error: logErr }) => {
                if (logErr) console.error('[EXECUTION LOGS] Error inserting log in publicRoutes:', logErr);
            });
        }

        // 7. Webhook Trigger
        // Fetch names and sectors for webhooks
        let attendantName = '';
        let attendantSector = '';
        let creatorName = 'Sistema (Link Público)';

        const idsToFetch = [finalAttendantId, validatedSenderId].filter(Boolean) as string[];
        if (idsToFetch.length > 0) {
            const { data: users } = await supabase.from('user').select('id, name, sector').in('id', idsToFetch);
            if (users) {
                const att = users.find(u => u.id === finalAttendantId);
                if (att) {
                    attendantName = att.name;
                    attendantSector = att.sector || '';
                }

                const creator = users.find(u => u.id === validatedSenderId);
                if (creator) {
                    creatorName = (validatedSenderId === 'a6127506-db64-4ac9-ba09-7eac663b0b31')
                        ? 'Sistema (Link Público)'
                        : creator.name || 'Sistema (Link Público)';
                }
            }
        }

        const webhookPayload = {
            ...createdAppointment,
            lead: clientPayload.name,
            phone: clientPayload.phone,
            email: clientPayload.email,
            student_profile: {
                interest: 'Desconhecido',
                knowledge: 'Iniciante',
                financial: { currency: 'BRL', amount: 0 }
            },
            attendant_name: attendantName,
            attendant_sector: attendantSector || eventData.sector || '',
            event_name: eventData.event_name,
            event_sector: eventData.sector,
            created_by_name: creatorName,
            owner_id: validatedSenderId,
            owner_name: creatorName
        };

        const webhookUrl = getAppointmentWebhooks()[APPOINTMENT_TYPE];
        if (webhookUrl) {
            console.log(`[Webhook Debug] Disparando webhook para tipo: ${APPOINTMENT_TYPE}`);
            console.log(`[Webhook Debug] URL resolvida: ${webhookUrl}`);
            
            try {
                // Must await in Vercel Serverless, otherwise the function freezes before the request is sent
                await axios.post(webhookUrl, webhookPayload);
                console.log(`[Webhook Debug] Webhook disparado com sucesso para ${APPOINTMENT_TYPE}`);
            } catch (err: any) {
                console.error(`[Webhook Debug] Falha no disparo (${webhookUrl}):`, err.message);
                // We don't throw here to ensure the client still gets a success response
            }
        } else {
            console.warn(`[Webhook Debug] Nenhuma URL configurada para o tipo: ${APPOINTMENT_TYPE}`);
        }

        // Global / Unified Webhook Trigger (Todos os agendamentos criados)
        const globalWebhookUrl = getGlobalAppointmentWebhook();
        if (globalWebhookUrl) {
            console.log(`[Webhook Debug] Disparando webhook global unificado: ${globalWebhookUrl}`);
            try {
                await axios.post(globalWebhookUrl, webhookPayload);
                console.log(`[Webhook Debug] Webhook global disparado com sucesso`);
            } catch (err: any) {
                console.error(`[Webhook Debug] Falha no disparo do webhook global (${globalWebhookUrl}):`, err.message);
            }
        }

        res.status(201).json({ message: 'Agendamento realizado com sucesso!', id: createdAppointment.id });

    } catch (err: any) {
        console.error("Public Create Error:", err);
        res.status(500).json({ error: 'Erro Interno do Servidor' });
    }
});

export default router;
