-- Owner do agendamento: quem recebe a comissão. Nasce igual ao criador
-- (created_by) e só o Líder troca, pela tela de edição do agendamento.
-- As colunas appointments.owner (FK user.id) e "owner_changedAt" (timestamptz)
-- já foram criadas manualmente; este script completa o resto.

-- 1. Agendamentos já existentes: owner = criador.
update public.appointments
   set owner = created_by
 where owner is null
   and created_by is not null;

-- 2. Rede de segurança: qualquer insert sem owner (inclusive feito direto no
--    banco ou por automação) herda o criador.
create or replace function public.appointments_default_owner()
returns trigger
language plpgsql
as $$
begin
  if new.owner is null then
    new.owner := new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_default_owner on public.appointments;
create trigger appointments_default_owner
  before insert on public.appointments
  for each row execute function public.appointments_default_owner();

-- 3. Índice para "Meus agendamentos" e o filtro por owner.
create index if not exists appointments_owner_idx on public.appointments (owner);

-- 4. Configurações do sistema (editadas pela tela Configurações).
--    RLS ligado e sem policies: só o backend (service role) lê e grava.
create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

insert into public.system_settings (key, value)
values ('owner_change_sectors', '["Pré-vendas", "Closer"]'::jsonb)
on conflict (key) do nothing;
