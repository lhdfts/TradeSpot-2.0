import { Router, Response } from 'express';
import { type AuthenticatedRequest, logSuccessfulAction, requireRole } from '../middleware/firebaseAuth.js';
import { supabase } from '../utils/supabaseClient.js';
import { isPreVendas, SECTOR_PRE_VENDAS } from '../constants/sectors.js';
import { getOwnerChangeSectors, setOwnerChangeSectors } from '../utils/systemSettings.js';

const router = Router();

// Setores que não fazem sentido como opção de configuração.
const IGNORED_SECTORS = ['Desativado'];

/**
 * GET /api/settings/owner-change-sectors
 * Qualquer usuário autenticado: o front precisa saber onde mostrar a troca de owner.
 * `availableSectors` são os setores existentes hoje nos usuários, para a tela de Configurações.
 */
router.get('/owner-change-sectors', async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const [enabled, { data: users, error }] = await Promise.all([
            getOwnerChangeSectors(),
            supabase.from('user').select('sector')
        ]);
        if (error) throw new Error(error.message);

        const available = new Set<string>();
        for (const u of users || []) {
            if (!u.sector || IGNORED_SECTORS.includes(u.sector)) continue;
            available.add(isPreVendas(u.sector) ? SECTOR_PRE_VENDAS : u.sector);
        }
        enabled.forEach(s => available.add(s));

        res.json({
            sectors: enabled,
            availableSectors: [...available].sort((a, b) => a.localeCompare(b, 'pt-BR'))
        });
    } catch (err: any) {
        console.error('[SETTINGS] Erro ao listar owner_change_sectors:', err?.message);
        res.status(500).json({ error: 'Erro ao carregar configurações.' });
    }
});

/** PUT /api/settings/owner-change-sectors { sectors: string[] } — Admin e Dev. */
router.put('/owner-change-sectors', requireRole('Admin', 'Dev'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const raw = req.body?.sectors;
        if (!Array.isArray(raw) || raw.some(s => typeof s !== 'string')) {
            return res.status(400).json({ error: 'sectors deve ser uma lista de setores.' });
        }
        const sectors = [...new Set(raw.map((s: string) => s.trim()).filter(Boolean))];

        const { error } = await setOwnerChangeSectors(sectors);
        if (error) {
            if (error.code === '42P01' || error.code === 'PGRST205') {
                return res.status(503).json({ error: 'Tabela de configurações ausente: rode supabase/add_appointment_owner.sql.' });
            }
            throw new Error(error.message);
        }

        logSuccessfulAction(req, 'UPDATE', 'Settings', 'owner_change_sectors');
        res.json({ sectors });
    } catch (err: any) {
        console.error('[SETTINGS] Erro ao salvar owner_change_sectors:', err?.message);
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

export default router;
