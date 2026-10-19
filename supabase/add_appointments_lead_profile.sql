-- Perfil do lead preenchido por Pré-vendas e Closer ao criar o agendamento:
-- profissão (lista da tabela professions ou texto livre via "Outra"), dor e
-- produto de interesse. Substituem, para esses setores, Moeda, Perfil Financeiro
-- e Perfil de Interesse.
--
-- As colunas aceitam nulo: os demais setores e o autoagendamento público não
-- preenchem esses campos. A obrigatoriedade para Pré-vendas/Closer fica no backend.

alter table public.appointments
  add column if not exists profession text,
  add column if not exists pain text,
  add column if not exists interest_product text;

alter table public.appointments
  drop constraint if exists appointments_interest_product_check;

alter table public.appointments
  add constraint appointments_interest_product_check
  check (interest_product is null or interest_product in ('Aldeia', 'Tribo'));

comment on column public.appointments.profession is 'Profissão do lead (Pré-vendas/Closer).';
comment on column public.appointments.pain is 'Dor do lead, até 50 caracteres (Pré-vendas/Closer).';
comment on column public.appointments.interest_product is 'Produto de interesse: Aldeia ou Tribo (Pré-vendas/Closer).';
