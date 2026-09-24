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
