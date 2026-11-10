-- Meio de Contato: por onde o setor Pré-vendas falou com o lead antes de marcar
-- o agendamento. Obrigatório na criação para Pré-vendas (validado no backend).
--
-- A coluna aceita nulo: os demais setores, o autoagendamento público e os
-- agendamentos anteriores a esta coluna não têm o campo.
--
-- Rodar no SQL Editor do Supabase ANTES de publicar o código que grava a coluna.

alter table public.appointments
  add column if not exists contact_channel text;

alter table public.appointments
  drop constraint if exists appointments_contact_channel_check;

alter table public.appointments
  add constraint appointments_contact_channel_check
  check (contact_channel is null or contact_channel in ('Unnichat', '3C Plus', 'Whatsapp Comercial'));

comment on column public.appointments.contact_channel is 'Meio de contato com o lead: Unnichat, 3C Plus ou Whatsapp Comercial (Pré-vendas).';
