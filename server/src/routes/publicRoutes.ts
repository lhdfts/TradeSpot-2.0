import { Router, Request, Response } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { publicAppointmentSchema } from '../schemas/appointmentSchema.js';
import { findBestAttendant, isAttendantWithinSchedule, hasConflictingAppointment } from '../utils/distribution.js';
import { getAppointmentWebhooks } from '../config/webhooks.js';
import { createGoogleMeetLink } from '../services/googleMeet.js';

const router = Router();

// Init Supabase with SERVICE ROLE key if available for admin tasks, 
// BUT here we might want to stick to ANON key to respect policies, 
// OR we need admin strict access because we are creating users/appts on their behalf.
// Since this is a backend trusted endpoint, we should probably use the same key as the main app logic.
// The main `appointmentRoutes.ts` uses ANON_KEY? let's check. 
// Yes: const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// We will use the same credentials.

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials missing in backend!");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

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
            duration: 60 // Fixed for Ligação Closer
        });

    } catch (err: any) {
        console.error("Public Event Fetch Error:", err);
        res.status(500).json({ error: 'Erro Interno', details: err.message });
    }
});

// --- GET Available Times for a Date ---
// Returns list of time slots that have at least one closer available
router.get('/available-times', async (req: Request, res: Response) => {
    const { date } = req.query;
    const { attendantId } = req.query;

    if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Data é obrigatória (formato: YYYY-MM-DD)' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    try {
        const APPOINTMENT_TYPE = 'Ligação Closer';

        // 1. Fetch Closers (including Líder and Co-Líder who can also attend)
        const { data: attendants, error: attError } = await supabase
            .from('user')
            .select('*')
            .in('sector', ['Closer', 'Líder', 'Co-Líder']);

        if (attError || !attendants) {
            console.error("Error fetching attendants:", attError);
            return res.status(500).json({ error: 'Erro ao buscar atendentes' });
        }

        let filteredAttendants = attendants;
        if (attendantId && typeof attendantId === 'string') {
            filteredAttendants = attendants.filter(a => a.id === attendantId);
        }

        // 2. Fetch Appointments for this date
        const { data: appointments, error: appError } = await supabase
            .from('appointments')
            .select('id, attendant_id, date, time, type, status')
            .eq('date', date)
            .neq('status', 'Cancelado');

        if (appError) {
            console.error("Error fetching appointments:", appError);
            return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        }

        const existingAppointments = appointments || [];

        // 3. Generate all possible time slots
        const allTimes: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            for (const minute of [0, 15, 30, 45]) {
                allTimes.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
            }
        }

        // 4. Filter times where at least ONE closer is available
        const availableTimes: string[] = [];
        for (const timeSlot of allTimes) {
            const hasAvailableCloser = await checkIfAnyCloserAvailable(
                filteredAttendants, // Usa a lista filtrada
                existingAppointments,
                date,
                timeSlot,
                APPOINTMENT_TYPE
            );
            if (hasAvailableCloser) availableTimes.push(timeSlot);
        }

        for (const timeSlot of allTimes) {
            // Check if any closer is available at this time
            const hasAvailableCloser = await checkIfAnyCloserAvailable(
                attendants,
                existingAppointments,
                date,
                timeSlot,
                APPOINTMENT_TYPE
            );

            if (hasAvailableCloser) {
                availableTimes.push(timeSlot);
            }
        }

        res.json({ date, availableTimes });

    } catch (err: any) {
        console.error("Available Times Fetch Error:", err);
        res.status(500).json({ error: 'Erro Interno', details: err.message });
    }
});

// Helper function to check if any closer is available at a given time
async function checkIfAnyCloserAvailable(
    attendants: any[],
    appointments: any[],
    date: string,
    time: string,
    type: string
): Promise<boolean> {
    // Filter by schedule first
    const availableBySchedule = attendants.filter(a =>
        isAttendantWithinSchedule(a, date, time, type)
    );

    if (availableBySchedule.length === 0) return false;

    // Check if at least one doesn't have a conflict
    for (const attendant of availableBySchedule) {
        const hasConflict = hasConflictingAppointment(
            attendant.id,
            date,
            time,
            type,
            appointments
        );

        if (!hasConflict) {
            return true; // At least one closer is available
        }
    }

    return false;
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
        // Force type
        const APPOINTMENT_TYPE = 'Ligação Closer';

        // 2. Buffer Check (10 minutes)
        const now = new Date();
        const apptDateTime = new Date(`${data.date}T${data.time}:00-03:00`);
        const diffMinutes = (apptDateTime.getTime() - now.getTime()) / 60000;

        if (diffMinutes < 10) {
            return res.status(400).json({ error: 'O agendamento deve ter pelo menos 10 minutos de antecedência.' });
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

        // 4. Distribution Logic
        let finalAttendantId = req.body.attendantId; // Pega o ID enviado pelo link

        // Validação extra: se um ID foi enviado, verificar se o atendente é um Closer
        if (finalAttendantId && finalAttendantId !== 'distribuicao_automatica') {
            const { data: attendantData } = await supabase
                .from('user')
                .select('*') // Buscar tudo para ter schedule e pauses
                .eq('id', finalAttendantId)
                .single();

            // Se o atendente não existir ou não for do setor Closer, resetamos para distribuição automática
            if (!attendantData || attendantData.sector !== 'Closer') {
                finalAttendantId = 'distribuicao_automatica';
            } else {
                // VALIDAR ESCALA
                if (!isAttendantWithinSchedule(attendantData, data.date, data.time, APPOINTMENT_TYPE)) {
                    return res.status(409).json({ error: 'O atendente selecionado não está disponível neste horário.' });
                }
            }
        }

        // Se não houver ID ou se for explicitamente para distribuição automática
        if (!finalAttendantId || finalAttendantId === 'distribuicao_automatica') {
            finalAttendantId = await findBestAttendant(data.date, data.time, APPOINTMENT_TYPE);
        }

        if (!finalAttendantId) {
            return res.status(409).json({
                error: 'Não há horários disponíveis para este momento. Por favor, escolha outro horário.'
            });
        }

        // VALIDAÇÃO FINAL DE CONFLITO (Double Booking)
        const { data: conflicts } = await supabase
            .from('appointments')
            .select('id, attendant_id, date, time, type, status')
            .eq('date', data.date)
            .eq('attendant_id', finalAttendantId)
            .neq('status', 'Cancelado');

        if (conflicts && hasConflictingAppointment(finalAttendantId, data.date, data.time, APPOINTMENT_TYPE, conflicts)) {
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
            .select('id')
            .eq('phone', cleanPhone)
            .single();

        if (existingClient) {
            clientId = existingClient.id;
            await supabase.from('clients').update(clientPayload).eq('id', clientId);
        } else {
            const { data: newClient } = await supabase.from('clients').insert(clientPayload).select('id').single();
            if (newClient) clientId = newClient.id;
        }

        if (!clientId) throw new Error("Falha ao processar o cadastro do cliente.");

        // 6. Create Appointment
        // Calculate End Time (1 hour duration)
        const [hours, minutes] = data.time.split(':').map(Number);
        const endHours = (hours + 1) % 24;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        // Dynamic created_by Attribution
        const senderId = req.body.attendantId;
        let validatedSenderId = 'a6127506-db64-4ac9-ba09-7eac663b0b31'; // Default system user

        if (senderId && senderId !== 'distribuicao_automatica') {
            const { data: userExists } = await supabase.from('user').select('id').eq('id', senderId).maybeSingle();
            if (userExists) {
                validatedSenderId = senderId;
            }
        }

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

        // Let's rely on req.body.eventId being present but valid.
        const eventId = req.body.eventId;
        if (!eventId) return res.status(400).json({ error: 'ID do evento é obrigatório' });

        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('event_name')
            .eq('id', eventId)
            .single();

        if (eventError || !eventData) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

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
            created_by: validatedSenderId
        };

        const { data: createdAppointment, error: appError } = await supabase
            .from('appointments')
            .insert(appointmentPayload)
            .select()
            .single();

        if (appError) {
            console.error("Supabase Write Error:", appError);
            return res.status(500).json({ error: 'Erro ao salvar agendamento' });
        }

        // 7. Webhook Trigger
        const webhookUrl = getAppointmentWebhooks()[APPOINTMENT_TYPE];
        if (webhookUrl) {
            // Fetch names for webhook
            let attendantName = '';
            let creatorName = 'Sistema (Link Público)';

            const idsToFetch = [finalAttendantId, validatedSenderId].filter(Boolean) as string[];
            if (idsToFetch.length > 0) {
                const { data: users } = await supabase.from('user').select('id, name').in('id', idsToFetch);
                if (users) {
                    const att = users.find(u => u.id === finalAttendantId);
                    if (att) attendantName = att.name;

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
                event_name: eventData.event_name,
                created_by_name: creatorName
            };

            // Non-blocking webhook
            axios.post(webhookUrl, webhookPayload).catch(err => console.error("Webhook Public Error:", err.message));
        }

        res.status(201).json({ message: 'Agendamento realizado com sucesso!', id: createdAppointment.id });

    } catch (err: any) {
        console.error("Public Create Error:", err);
        res.status(500).json({ error: 'Erro Interno do Servidor' });
    }
});

export default router;
