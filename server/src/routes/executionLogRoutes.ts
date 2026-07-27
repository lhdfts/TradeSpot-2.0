import { Router, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { AuthenticatedRequest } from '../middleware/firebaseAuth.js';

const router = Router();

/**
 * GET /api/execution-logs
 * Retorna o histórico de execuções da tabela `execution_logs`, relacionando com a tabela `clients`.
 * Apenas usuários com role 'Admin' ou 'Dev' devem conseguir acessar esta rota (garantido no server.ts + verificação adicional aqui).
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !['Admin', 'Dev', 'Líder'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado. Apenas Admin, Dev e Líder têm permissão.' });
        }

        const { startDate, endDate, executionType, limit = '200' } = req.query;

        let query = supabase
            .from('execution_logs')
            .select(`
                id,
                created_at,
                client_id,
                execution_type,
                selected_attendant_id,
                selected_attendant_name,
                appointment_id,
                checks_log,
                client:clients (
                    name,
                    phone
                )
            `)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit as string, 10) || 200);

        // Se for Líder, filtra para ver apenas logs de atendentes do seu próprio setor
        if (req.user.role === 'Líder' && req.user.sector) {
            const { data: sectorUsers } = await supabase.from('user').select('id').eq('sector', req.user.sector);
            if (sectorUsers && sectorUsers.length > 0) {
                const sectorUserIds = sectorUsers.map(u => u.id);
                query = query.in('selected_attendant_id', sectorUserIds);
            } else {
                query = query.in('selected_attendant_id', ['none']);
            }
        }

        if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
            query = query.gte('created_at', startDate);
        }
        if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
            query = query.lte('created_at', endDate);
        }
        if (executionType && typeof executionType === 'string' && executionType.trim() !== '') {
            query = query.eq('execution_type', executionType);
        }

        const { data: logs, error } = await query;

        if (error) {
            console.error('[EXECUTION LOGS] Error fetching logs:', error);
            return res.status(500).json({ error: 'Erro ao buscar logs de execução.' });
        }

        // Fetch sectors manually
        if (logs && logs.length > 0) {
            const attendantIds = [...new Set(logs.map((l: any) => l.selected_attendant_id).filter(Boolean))];
            if (attendantIds.length > 0) {
                const { data: users } = await supabase.from('user').select('id, sector').in('id', attendantIds);
                if (users) {
                    const sectorMap = users.reduce((acc, u) => {
                        acc[u.id] = u.sector;
                        return acc;
                    }, {} as Record<string, string>);
                    
                    logs.forEach((l: any) => {
                        l.selected_attendant_sector = sectorMap[l.selected_attendant_id] || 'Não definido';
                    });
                }
            }
        }

        return res.json(logs || []);
    } catch (error: any) {
        console.error('[EXECUTION LOGS] Unexpected error:', error);
        return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
});

export default router;
