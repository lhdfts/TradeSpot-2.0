import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

const router = Router();

// Fuso de Brasília. As datas do relatório são dias civis brasileiros, não UTC —
// sem isso um agendamento criado às 22h de ontem cairia no relatório de hoje.
const BRT_OFFSET = '-03:00';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const yesterdayInBrazil = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const now = new Date();
    return formatter.format(new Date(now.getTime() - 24 * 60 * 60 * 1000));
};

type Bucket = {
    total: number;
    porTipo: Record<string, number>;
    porStatus: Record<string, number>;
};

const emptyBucket = (): Bucket => ({ total: 0, porTipo: {}, porStatus: {} });

const addToBucket = (bucket: Bucket, type: string, status: string) => {
    bucket.total += 1;
    bucket.porTipo[type] = (bucket.porTipo[type] || 0) + 1;
    bucket.porStatus[status] = (bucket.porStatus[status] || 0) + 1;
};

/**
 * GET /api/integrations/partners-report
 *
 * Contagem de agendamentos dos eventos cujo nome contém "Partners", separada
 * por time (setor do ATENDENTE designado), por tipo e por status.
 *
 * Agendamentos criados por usuários do setor TEI são excluídos da contagem
 * (são testes da equipe técnica). A quantidade descartada vai em
 * "ignoradosTeste" para o relatório continuar auditável.
 *
 * Devolve dois recortes independentes:
 *   - porDataDeCriacao: agendamentos criados dentro do período
 *   - porDataAgendada:  agendamentos marcados para acontecer dentro do período
 *
 * Query params (opcionais): startDate, endDate no formato YYYY-MM-DD.
 * Sem parâmetros, o período é o dia anterior (horário de Brasília).
 */
router.get('/partners-report', async (req: Request, res: Response) => {
    try {
        const rawStart = typeof req.query.startDate === 'string' ? req.query.startDate : '';
        const rawEnd = typeof req.query.endDate === 'string' ? req.query.endDate : '';

        const fallback = yesterdayInBrazil();
        const startDate = rawStart || fallback;
        const endDate = rawEnd || rawStart || fallback;

        if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
            return res.status(400).json({ error: 'startDate e endDate devem estar no formato YYYY-MM-DD.' });
        }
        if (startDate > endDate) {
            return res.status(400).json({ error: 'startDate não pode ser posterior a endDate.' });
        }

        // 1. Eventos com "Partners" no nome
        const { data: eventos, error: eventosErr } = await supabase
            .from('events')
            .select('id, event_name, sector')
            .ilike('event_name', '%Partners%');

        if (eventosErr) {
            console.error('[PARTNERS REPORT] Erro ao buscar eventos:', eventosErr);
            return res.status(500).json({ error: 'Erro ao buscar eventos.' });
        }

        const eventIds = (eventos || []).map(e => e.id);

        const periodo = { startDate, endDate };
        const eventosDto = (eventos || []).map(e => ({
            id: e.id,
            nome: e.event_name,
            setor: e.sector
        }));

        if (eventIds.length === 0) {
            return res.json({
                periodo,
                eventos: [],
                porDataDeCriacao: { total: 0, ignoradosTeste: 0, times: {} },
                porDataAgendada: { total: 0, ignoradosTeste: 0, times: {} }
            });
        }

        // 2. Os dois recortes de data, em paralelo
        const criadoDe = `${startDate}T00:00:00.000${BRT_OFFSET}`;
        const criadoAte = `${endDate}T23:59:59.999${BRT_OFFSET}`;

        const [porCriacao, porAgenda, usuarios] = await Promise.all([
            supabase
                .from('appointments')
                .select('id, type, status, attendant_id, created_by')
                .in('event_id', eventIds)
                .gte('created_at', criadoDe)
                .lte('created_at', criadoAte),
            supabase
                .from('appointments')
                .select('id, type, status, attendant_id, created_by')
                .in('event_id', eventIds)
                .gte('date', startDate)
                .lte('date', endDate),
            supabase.from('user').select('id, sector')
        ]);

        if (porCriacao.error || porAgenda.error || usuarios.error) {
            console.error('[PARTNERS REPORT] Erro ao buscar dados:', porCriacao.error || porAgenda.error || usuarios.error);
            return res.status(500).json({ error: 'Erro ao gerar relatório.' });
        }

        const setorPorUsuario = new Map<string, string>(
            (usuarios.data || []).map(u => [u.id, u.sector])
        );

        // Agrupa pelo setor do atendente designado. Agendamentos cujo atendente
        // não é de Closer nem de Perpétuos entram em "Outros" para que a soma
        // dos times sempre feche com o total.
        //
        // Agendamentos CRIADOS por alguém do setor TEI são descartados antes da
        // contagem: são testes da equipe técnica, não movimento real.
        const agrupar = (linhas: { type: string; status: string; attendant_id: string | null; created_by: string | null }[]) => {
            const times: Record<string, Bucket> = {
                'Closer': emptyBucket(),
                'Perpétuos': emptyBucket(),
                'Outros': emptyBucket()
            };

            let ignoradosTeste = 0;
            let total = 0;

            for (const linha of linhas) {
                const setorCriador = linha.created_by ? setorPorUsuario.get(linha.created_by) : undefined;
                if (setorCriador === 'TEI') {
                    ignoradosTeste += 1;
                    continue;
                }

                const setor = linha.attendant_id ? setorPorUsuario.get(linha.attendant_id) : undefined;
                const chave = setor === 'Closer' || setor === 'Perpétuos' ? setor : 'Outros';
                addToBucket(times[chave], linha.type || '(sem tipo)', linha.status || '(sem status)');
                total += 1;
            }

            return { total, ignoradosTeste, times };
        };

        return res.json({
            periodo,
            eventos: eventosDto,
            porDataDeCriacao: agrupar(porCriacao.data || []),
            porDataAgendada: agrupar(porAgenda.data || [])
        });
    } catch (err: any) {
        console.error('[PARTNERS REPORT] Erro inesperado:', err);
        return res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

export default router;
