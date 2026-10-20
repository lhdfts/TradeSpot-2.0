// Nome oficial do setor de pré-vendas (antigo "Perpétuos").
export const SECTOR_PRE_VENDAS = 'Pré-vendas';

// Nome antigo, ainda aceito enquanto a migração do banco não for concluída.
// Depois que nenhuma linha usar mais "Perpétuos", remover esta constante.
const LEGACY_SECTOR_PRE_VENDAS = 'Perpétuos';

/** Todos os nomes pelos quais o setor pode estar gravado no banco hoje. */
export const PRE_VENDAS_ALIASES = [SECTOR_PRE_VENDAS, LEGACY_SECTOR_PRE_VENDAS];

export const isPreVendas = (sector?: string | null): boolean =>
    !!sector && PRE_VENDAS_ALIASES.includes(sector);

/**
 * Para consultas `.in('sector', ...)`: devolve todos os nomes equivalentes a um
 * setor, de modo que o filtro funcione com o banco migrado ou não.
 */
export const sectorAliases = (sector?: string | null): string[] => {
    if (!sector) return [];
    return isPreVendas(sector) ? PRE_VENDAS_ALIASES : [sector];
};

// Setor fictício dos colaboradores arquivados. Não existe como setor real: só
// tira o usuário da distribuição e das listas por setor.
export const SECTOR_DESATIVADO = 'Desativado';

// Sufixo do e-mail do colaborador arquivado (libera o e-mail original e impede o login).
export const ARCHIVED_EMAIL_SUFFIX = '.desativado';

/**
 * Setores em que o perfil do lead (profissão, dor e produto de interesse) é
 * obrigatório ao criar agendamentos. O Closer também preenche esses campos,
 * mas neles são opcionais.
 */
export const requiresLeadProfile = (sector?: string | null): boolean =>
    isPreVendas(sector);
