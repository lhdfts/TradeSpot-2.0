// Nome oficial do setor de pré-vendas (antigo "Perpétuos").
export const SECTOR_PRE_VENDAS = 'Pré-vendas';

// Nome antigo, ainda aceito enquanto a migração do banco não for concluída.
// Depois que nenhuma linha usar mais "Perpétuos", remover esta constante e o
// mapeamento em normalizeSector.
const LEGACY_SECTOR_PRE_VENDAS = 'Perpétuos';

// Aldeia, Tribo e Suporte viraram um único time: Customer Success. Os nomes
// antigos seguem aceitos até a migração do banco (supabase/merge_customer_success.sql);
// depois que nenhuma linha usar mais esses nomes, remover LEGACY_CUSTOMER_SUCCESS.
export const SECTOR_CUSTOMER_SUCCESS = 'Customer Success';
const LEGACY_CUSTOMER_SUCCESS = ['Aldeia', 'Tribo', 'Suporte'];

/** Traduz nomes antigos de setor para o nome atual. */
export const normalizeSector = <T extends string | null | undefined>(sector: T): T => {
    if (sector === LEGACY_SECTOR_PRE_VENDAS) return SECTOR_PRE_VENDAS as T;
    if (sector && LEGACY_CUSTOMER_SUCCESS.includes(sector)) return SECTOR_CUSTOMER_SUCCESS as T;
    return sector;
};

export const isPreVendas = (sector?: string | null): boolean =>
    normalizeSector(sector) === SECTOR_PRE_VENDAS;

export const isCustomerSuccess = (sector?: string | null): boolean =>
    normalizeSector(sector) === SECTOR_CUSTOMER_SUCCESS;

// Setor fictício dos colaboradores arquivados (ver server/src/constants/sectors.ts).
export const SECTOR_DESATIVADO = 'Desativado';

// Setor de quem entra no sistema pela primeira vez, até um líder ajustar o cadastro.
export const SECTOR_SEM_SETOR = 'Sem setor';

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

// Produtos: usados no "Produto de Interesse" (Pré-vendas/Closer) e no
// "Produto Adquirido" (Customer Success).
export const PRODUCTS = ['Aldeia', 'Tribo'] as const;
export type Product = typeof PRODUCTS[number];
export const INTEREST_PRODUCTS = PRODUCTS;
export type InterestProduct = Product;
