import { Router, Response } from 'express';
import { type AuthenticatedRequest } from '../middleware/firebaseAuth.js';
import { supabase } from '../utils/supabaseClient.js';

const router = Router();

/**
 * GET /api/professions
 * Opções do menu de profissões, em ordem alfabética. A lista é mantida direto na
 * tabela `professions` do Supabase; linhas com active = false ficam de fora.
 */
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('professions')
            .select('name')
            .eq('active', true)
            .order('name', { ascending: true });
        if (error) throw new Error(error.message);

        res.json((data || []).map(p => p.name));
    } catch (err: any) {
        console.error('[PROFESSIONS] Erro ao listar profissões:', err?.message);
        res.status(500).json({ error: 'Erro ao carregar profissões.' });
    }
});

export default router;
