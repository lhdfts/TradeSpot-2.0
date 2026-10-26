-- Fusão de Aldeia, Tribo e Suporte no setor "Customer Success".
--
-- QUANDO RODAR: depois do deploy do código. O código aceita tanto os nomes
-- antigos (Aldeia, Tribo, Suporte) quanto o novo, então funciona antes e depois
-- deste script. Ajuste o n8n (variável acquired_product) no mesmo momento.
--
-- Tudo roda numa transação: se qualquer passo falhar, nada é aplicado.
-- A ordem importa: os passos 2 e 3 leem os setores antigos, que mudam no passo 5.
--
-- Fora deste script (manual): o setor do Medina (medina@tradestars.com.br).

begin;

-- 1. Coluna "Produto Adquirido" (preenchida pelo Customer Success; vai no webhook
--    como acquired_product para o n8n escolher a conexão do Unnichat).
alter table public.appointments
  add column if not exists acquired_product text;

alter table public.appointments
  drop constraint if exists appointments_acquired_product_check;

alter table public.appointments
  add constraint appointments_acquired_product_check
  check (acquired_product is null or acquired_product in ('Aldeia', 'Tribo'));

comment on column public.appointments.acquired_product is
  'Produto que o aluno adquiriu (Aldeia ou Tribo), informado pelo Customer Success.';

-- 2. Produto Adquirido só dos agendamentos PENDENTES (o histórico não é tocado),
--    pelo setor de quem atende; se o atendente não for de Aldeia/Tribo (ex.:
--    Reagendamento Closer marcado pela Aldeia), pelo setor de quem criou.
update public.appointments a
set acquired_product = coalesce(
    (select u.sector from public.user u where u.id = a.attendant_id and u.sector in ('Aldeia', 'Tribo')),
    (select u.sector from public.user u where u.id = a.created_by  and u.sector in ('Aldeia', 'Tribo'))
)
where a.status = 'Pendente'
  and a.acquired_product is null
  and (
    exists (select 1 from public.user u where u.id = a.attendant_id and u.sector in ('Aldeia', 'Tribo'))
    or exists (select 1 from public.user u where u.id = a.created_by and u.sector in ('Aldeia', 'Tribo'))
  );

-- 3. Eventos bloqueados (denied_events) dos eventos que serão mesclados.
--    Para cada evento ativo que existe nos dois setores com o mesmo nome, fica o
--    da Aldeia e o da Tribo é desativado (passo 4). Quem é da Tribo passa a ter no
--    evento mantido o MESMO bloqueio que tinha na versão da Tribo; quem é da Aldeia
--    continua como está. Assim ninguém começa nem deixa de receber esses eventos.
with pairs as (
  select k.id::text as kept_id, d.id::text as dropped_id
  from public.events k
  join public.events d on d.event_name = k.event_name
  where k.sector = 'Aldeia' and d.sector = 'Tribo' and k.status and d.status
)
update public.user u
set denied_events = (
  select coalesce(jsonb_agg(distinct x), '[]'::jsonb)
  from (
    select e as x
    from jsonb_array_elements_text(coalesce(u.denied_events, '[]'::jsonb)) e
    where e not in (select kept_id from pairs)
    union
    select p.kept_id from pairs p
    where coalesce(u.denied_events, '[]'::jsonb) ? p.dropped_id
  ) s
)
where u.sector = 'Tribo';

-- 4. Eventos: desativa a versão da Tribo dos eventos duplicados e passa os
--    eventos ATIVOS de Aldeia e Tribo para Customer Success. Eventos inativos
--    ficam como estão (o código já os trata como Customer Success).
update public.events t
set status = false
where t.sector = 'Tribo' and t.status
  and exists (
    select 1 from public.events a
    where a.sector = 'Aldeia' and a.status and a.event_name = t.event_name
  );

update public.events
set sector = 'Customer Success'
where sector in ('Aldeia', 'Tribo') and status;

-- 5. Pessoas: Aldeia, Tribo e Suporte viram Customer Success (menos o Medina,
--    que será movido manualmente). Só o Lucas Manosso continua Líder; os demais
--    Líderes viram Co-líder e passam a receber agendamentos.
update public.user
set sector = 'Customer Success'
where sector in ('Aldeia', 'Tribo', 'Suporte')
  and email <> 'medina@tradestars.com.br';

update public.user
set role = 'Co-líder'
where email in ('victor@tradestars.com.br', 'natan@tradestars.com.br', 'lara@tradestars.com.br')
  and role = 'Líder';

-- 6. Conexões do Unnichat: continuam duas (uma por produto), agora no setor novo.
update public.unnichat_connections
set sector = 'Customer Success'
where sector in ('Aldeia', 'Tribo');

commit;

-- Conferência (rode depois do commit):
-- select sector, role, count(*) from public.user where sector in ('Customer Success', 'Aldeia', 'Tribo', 'Suporte') group by 1, 2 order by 1, 2;
-- select sector, status, count(*) from public.events where sector in ('Customer Success', 'Aldeia', 'Tribo') group by 1, 2 order by 1, 2;
-- select acquired_product, count(*) from public.appointments where status = 'Pendente' group by 1;
-- select name, sector from public.unnichat_connections where sector = 'Customer Success';
