// Nome oficial do setor de pré-vendas (antigo "Perpétuos").
export const SECTOR_PRE_VENDAS = 'Pré-vendas';

// Nome antigo, ainda aceito enquanto a migração do banco não for concluída.
// Depois que nenhuma linha usar mais "Perpétuos", remover esta constante.
const LEGACY_SECTOR_PRE_VENDAS = 'Perpétuos';

/** Todos os nomes pelos quais o setor pode estar gravado no banco hoje. */
export const PRE_VENDAS_ALIASES = [SECTOR_PRE_VENDAS, LEGACY_SECTOR_PRE_VENDAS];

export const isPreVendas = (sector?: string | null): boolean =>
    !!sector && PRE_VENDAS_ALIASES.includes(sector);

// Aldeia, Tribo e Suporte viraram um único time: Customer Success. Os nomes
// antigos seguem aceitos até a migração do banco (supabase/merge_customer_success.sql);
// depois que nenhuma linha usar mais esses nomes, deixar só SECTOR_CUSTOMER_SUCCESS.
export const SECTOR_CUSTOMER_SUCCESS = 'Customer Success';
export const CUSTOMER_SUCCESS_ALIASES = [SECTOR_CUSTOMER_SUCCESS, 'Aldeia', 'Tribo', 'Suporte'];

export const isCustomerSuccess = (sector?: string | null): boolean =>
    !!sector && CUSTOMER_SUCCESS_ALIASES.includes(sector);

/** Limite de agendamentos simultâneos do Customer Success (o time todo, não por pessoa). */
export const CUSTOMER_SUCCESS_CONCURRENT_LIMIT = 4;

/**
 * Para consultas `.in('sector', ...)`: devolve todos os nomes equivalentes a um
 * setor, de modo que o filtro funcione com o banco migrado ou não.
 */
export const sectorAliases = (sector?: string | null): string[] => {
    if (!sector) return [];
    if (isPreVendas(sector)) return PRE_VENDAS_ALIASES;
    if (isCustomerSuccess(sector)) return CUSTOMER_SUCCESS_ALIASES;
    return [sector];
};

/**
 * Quem enxerga os agendamentos de todos os setores: o setor TEI e os cargos
 * globais. Antes isso valia também para o SETOR Suporte; com o Suporte dentro do
 * Customer Success, a visão ampla passou a ser do cargo (Admin, Qualidade).
 */
export const GLOBAL_VIEW_ROLES = ['Admin', 'Dev', 'Qualidade', 'Suporte'];
export const hasGlobalView = (user?: { sector?: string | null; role?: string | null } | null): boolean =>
    !!user && (user.sector === 'TEI' || GLOBAL_VIEW_ROLES.includes(user.role || ''));

// Setor de quem entra no sistema pela primeira vez, até um líder ajustar o cadastro.
export const SECTOR_SEM_SETOR = 'Sem setor';

export const PRODUCTS = ['Aldeia', 'Tribo'] as const;

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

/**
 * Colaborador e Co-líder de Pré-vendas só alteram o status de Ligação Closer, Reagendamento
 * Closer e Upgrade quando é o ATENDENTE. Ter criado ou ser o responsável (owner)
 * não basta: o status desses tipos é do Closer que atendeu. O Líder de Pré-vendas segue podendo.
 */
export const PRE_VENDAS_ATTENDANT_ONLY_STATUS_TYPES = ['Ligação Closer', 'Reagendamento Closer', 'Upgrade'];
export const isStatusLockedForPreVendas = (
    user: { id?: string | null; sector?: string | null; role?: string | null } | null | undefined,
    appointment: { type?: string | null; attendantId?: string | null }
): boolean =>
    !!user && isPreVendas(user.sector) && ['Colaborador', 'Co-líder'].includes(user.role || '') &&
    PRE_VENDAS_ATTENDANT_ONLY_STATUS_TYPES.includes(appointment.type || '') &&
    appointment.attendantId !== user.id;
