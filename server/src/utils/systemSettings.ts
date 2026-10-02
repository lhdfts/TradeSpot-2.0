import { supabase } from './supabaseClient.js';
import { SECTOR_PRE_VENDAS, sectorAliases } from '../constants/sectors.js';

/**
 * Configurações do sistema editáveis pela tela "Configurações"
 * (tabela public.system_settings, chave -> valor jsonb).
 */

export const OWNER_CHANGE_SECTORS_KEY = 'owner_change_sectors';

// Usado enquanto a tabela não existir ou a chave não tiver sido gravada.
const DEFAULT_OWNER_CHANGE_SECTORS = [SECTOR_PRE_VENDAS, 'Closer'];

/** Setores em que o Líder pode trocar o owner dos agendamentos. */
export const getOwnerChangeSectors = async (): Promise<string[]> => {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', OWNER_CHANGE_SECTORS_KEY)
        .maybeSingle();

    if (error) {
        console.error('[SETTINGS] Erro ao ler owner_change_sectors (usando padrão):', error.message);
        return DEFAULT_OWNER_CHANGE_SECTORS;
    }
    if (!data || !Array.isArray(data.value)) return DEFAULT_OWNER_CHANGE_SECTORS;
    return data.value.filter((s: unknown): s is string => typeof s === 'string');
};

export const setOwnerChangeSectors = async (sectors: string[]) => {
    return supabase
        .from('system_settings')
        .upsert({ key: OWNER_CHANGE_SECTORS_KEY, value: sectors, updated_at: new Date().toISOString() });
};

/** O setor (considerando nomes antigos, ex.: Perpétuos) está habilitado para troca de owner? */
export const isOwnerChangeEnabledFor = (enabledSectors: string[], sector?: string | null): boolean =>
    !!sector && enabledSectors.some(s => sectorAliases(s).includes(sector));
