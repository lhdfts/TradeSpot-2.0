// Nome oficial do setor de pré-vendas (antigo "Perpétuos").
export const SECTOR_PRE_VENDAS = 'Pré-vendas';

// Nome antigo, ainda aceito enquanto a migração do banco não for concluída.
// Depois que nenhuma linha usar mais "Perpétuos", remover esta constante e o
// mapeamento em normalizeSector.
const LEGACY_SECTOR_PRE_VENDAS = 'Perpétuos';

/** Traduz nomes antigos de setor para o nome atual. */
export const normalizeSector = <T extends string | null | undefined>(sector: T): T =>
    (sector === LEGACY_SECTOR_PRE_VENDAS ? SECTOR_PRE_VENDAS : sector) as T;

export const isPreVendas = (sector?: string | null): boolean =>
    normalizeSector(sector) === SECTOR_PRE_VENDAS;
