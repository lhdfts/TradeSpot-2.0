import express, { Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { AuthenticatedRequest, requireRole } from '../middleware/firebaseAuth.js';

const router = express.Router();

// GET /api/unnichat-connections
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('unnichat_connections').select('*').order('name', { ascending: true });
        if (error) throw new Error(error.message);
        res.json(data || []);
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
        res.status(500).json({ error: err.message || 'Erro Interno' });
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

        let updatePayload: any = { name, unnichat_url };
        if (req.user?.role === 'Admin' || req.user?.role === 'Dev' || req.user?.sector === 'TEI') {
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
        res.status(500).json({ error: err.message || 'Erro Interno' });
    }
});

// DELETE /api/unnichat-connections/:id
router.delete('/:id', requireRole('Admin', 'Dev', 'Líder', 'TEI'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('unnichat_connections').delete().eq('id', id);
        if (error) throw new Error(error.message);
        res.status(204).send();
    } catch (err: any) {
        console.error("Delete Unnichat Connection Error:", err);
        res.status(500).json({ error: 'Erro Interno' });
    }
});

export default router;
