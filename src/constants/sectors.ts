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

// Setor fictício dos colaboradores arquivados (ver server/src/constants/sectors.ts).
export const SECTOR_DESATIVADO = 'Desativado';

/**
 * Setores que veem o perfil do lead (profissão, dor e produto de interesse) ao
 * criar agendamentos, no lugar de Moeda, Perfil Financeiro e Perfil de Interesse.
 */
export const usesLeadProfile = (sector?: string | null): boolean =>
    isPreVendas(sector) || sector === 'Closer';

/**
 * Setores em que o perfil do lead é obrigatório. No Closer os campos aparecem,
 * mas são opcionais. Regra repetida em server/src/constants/sectors.ts.
 */
export const requiresLeadProfile = (sector?: string | null): boolean =>
    isPreVendas(sector);

export const INTEREST_PRODUCTS = ['Aldeia', 'Tribo'] as const;
export type InterestProduct = typeof INTEREST_PRODUCTS[number];
