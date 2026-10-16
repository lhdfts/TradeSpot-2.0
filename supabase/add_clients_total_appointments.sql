-- clients.total_appointments: quantos agendamentos o cliente tem, em qualquer
-- status. A coluna já foi criada manualmente; este script preenche os clientes
-- existentes e mantém o número atualizado pelo próprio banco, seja qual for a
-- origem do agendamento (tela, link público, n8n ou SQL direto).
-- Pode ser rodado de novo sem risco.

-- 1. Clientes existentes: contagem atual.
update public.clients c
   set total_appointments = coalesce(t.qtd, 0)
  from (
    select cl.id, count(a.id) as qtd
      from public.clients cl
      left join public.appointments a on a.client_id = cl.id
     group by cl.id
  ) t
 where t.id = c.id
   and c.total_appointments is distinct from coalesce(t.qtd, 0);

-- 2. Novos clientes começam em 0.
alter table public.clients alter column total_appointments set default 0;

-- 3. Gatilho: soma ao criar, subtrai ao apagar e move a contagem quando um
--    agendamento troca de cliente.
create or replace function public.appointments_sync_client_total()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.client_id is not null then
    if tg_op = 'INSERT' or new.client_id is distinct from old.client_id then
      update public.clients
         set total_appointments = coalesce(total_appointments, 0) + 1
       where id = new.client_id;
    end if;
  end if;

  if tg_op in ('DELETE', 'UPDATE') and old.client_id is not null then
    if tg_op = 'DELETE' or new.client_id is distinct from old.client_id then
      update public.clients
         set total_appointments = greatest(coalesce(total_appointments, 0) - 1, 0)
       where id = old.client_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists appointments_sync_client_total on public.appointments;
create trigger appointments_sync_client_total
  after insert or delete or update of client_id on public.appointments
  for each row execute function public.appointments_sync_client_total();
