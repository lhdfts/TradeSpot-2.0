-- Coluna com os 7 últimos dígitos do telefone, calculada pelo próprio banco,
-- para a consulta GET /api/integrations/prior-appointment.
--
-- clients.phone é bigint, e a API do Supabase não filtra "termina com" em número.
-- Uma coluna gerada fica sempre em dia com o telefone (inclusive nos cadastros
-- existentes) e o índice evita varrer a tabela inteira a cada consulta.

alter table public.clients
  add column if not exists phone_last7 text
  generated always as (right(phone::text, 7)) stored;

create index if not exists clients_phone_last7_idx
  on public.clients (phone_last7);
