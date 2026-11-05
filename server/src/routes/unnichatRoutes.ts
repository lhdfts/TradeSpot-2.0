import express, { Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { AuthenticatedRequest, requireRole } from '../middleware/firebaseAuth.js';
import { sectorAliases } from '../constants/sectors.js';

const router = express.Router();

// Quem gerencia conexões de todos os setores.
const canManageAllSectors = (user: AuthenticatedRequest['user']): boolean =>
    !!user && (['Admin', 'Dev'].includes(user.role) || user.sector === 'TEI');

// Quem pode ver o link (webhook) do Unnichat.
const canSeeUnnichatUrl = (user: AuthenticatedRequest['user']): boolean =>
    canManageAllSectors(user) || user?.role === 'Líder';

/**
 * Líder (sem visão global) só mexe em conexões do próprio setor.
 * Devolve a resposta de erro já enviada, ou null quando pode seguir.
 */
const denyIfOutOfSector = async (req: AuthenticatedRequest, res: Response, id: string) => {
    if (canManageAllSectors(req.user)) return null;
    const { data: current, error } = await supabase.from('unnichat_connections').select('sector').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!current) return res.status(404).json({ error: 'Conexão não encontrada.' });
    if (!current.sector || !sectorAliases(req.user?.sector).includes(current.sector)) {
        return res.status(403).json({ error: 'Você só pode gerenciar conexões do seu setor.' });
    }
    return null;
};

// GET /api/unnichat-connections
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('unnichat_connections').select('*').order('name', { ascending: true });
        if (error) throw new Error(error.message);
        // O link do webhook só vai para quem gerencia as conexões
        const showUrl = canSeeUnnichatUrl(req.user);
        res.json((data || []).map((c: any) => showUrl ? c : { ...c, unnichat_url: undefined }));
    } catch (err: any) {
        console.error("List Unnichat Connections Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// POST /api/unnichat-connections
router.post('/', requireRole('Admin', 'Dev', 'Líder', 'TEI'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, unnichat_url, sector } = req.body;
        if (!name || !unnichat_url) {
            return res.status(400).json({ error: 'Nome da Conexão e Link do Webhook são obrigatórios' });
        }

        let finalSector = sector || null;
        if (req.user?.role === 'Líder' && req.user?.sector !== 'TEI') {
            finalSector = req.user.sector;
        }

        const { data, error } = await supabase
            .from('unnichat_connections')
            .insert({ name, unnichat_url, sector: finalSector })
            .select()
            .single();

        if (error) throw new Error(error.message);
        res.status(201).json(data);
    } catch (err: any) {
        console.error("Create Unnichat Connection Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// PUT /api/unnichat-connections/:id
router.put('/:id', requireRole('Admin', 'Dev', 'Líder', 'TEI'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, unnichat_url, sector } = req.body;
        if (!name || !unnichat_url) {
            return res.status(400).json({ error: 'Nome da Conexão e Link do Webhook são obrigatórios' });
        }

        if (await denyIfOutOfSector(req, res, id)) return;

        let updatePayload: any = { name, unnichat_url };
        if (canManageAllSectors(req.user)) {
            updatePayload.sector = sector || null;
        } else if (req.user?.role === 'Líder') {
            updatePayload.sector = req.user.sector;
        }

        const { data, error } = await supabase
            .from('unnichat_connections')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        res.json(data);
    } catch (err: any) {
        console.error("Update Unnichat Connection Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

// DELETE /api/unnichat-connections/:id
router.delete('/:id', requireRole('Admin', 'Dev', 'Líder', 'TEI'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (await denyIfOutOfSector(req, res, id)) return;
        const { error } = await supabase.from('unnichat_connections').delete().eq('id', id);
        if (error) throw new Error(error.message);
        res.status(204).send();
    } catch (err: any) {
        console.error("Delete Unnichat Connection Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

export default router;
