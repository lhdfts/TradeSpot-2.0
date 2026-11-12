-- Garante, no banco, o limite de agendamentos simultâneos do Customer Success:
-- 4 em dias úteis e 1 aos sábados e domingos. Conta o time inteiro (qualquer
-- cargo), qualquer tipo de agendamento (inclusive Agendamento Pessoal) e qualquer
-- evento, seja qual for o caminho que criou ou alterou a linha: formulário
-- interno, edição, distribuição automática, link público ou script.
--
-- As checagens na aplicação (server/src/utils/distribution.ts) continuam, para a
-- mensagem chegar antes de bater no banco; só o trigger fecha a corrida entre
-- "conferir" e "gravar" quando dois pedidos chegam ao mesmo tempo (o link
-- público, por exemplo, cria o Google Meet entre a conferência e a gravação).
-- O servidor traduz o SQLSTATE TS409 em HTTP 409.
--
-- Espelha server/src/constants/sectors.ts (limites e nomes do setor): se mudar
-- lá, mudar aqui. Linhas já gravadas acima do limite não são tocadas; o trigger
-- só barra inserções e alterações novas.

-- Intervalo ocupado pelo agendamento (hora local, sem fuso: "time"/"end_time"
-- sempre têm o marcador +00 fixo). Mesma conta de add_no_double_booking_constraint.sql.
create or replace function public.appointment_occupied_range(p_date date, p_time timetz, p_end_time timetz)
returns tsrange
language sql
immutable
as $$
  select case
    when p_date is null or p_time is null then null
    else tsrange(
      (p_date + p_time::time),
      (p_date + p_time::time) + (
        case
          when p_end_time is null then interval '60 minutes'
          when p_end_time::time <= p_time::time then (p_end_time::time - p_time::time) + interval '24 hours'
          else (p_end_time::time - p_time::time)
        end
      ),
      '[)'
    )
  end
$$;

create or replace function public.enforce_customer_success_concurrent_limit()
returns trigger
language plpgsql
as $$
declare
  cs_sectors constant text[] := array['Customer Success', 'Aldeia', 'Tribo', 'Suporte'];
  v_sector text;
  v_limit integer;
  v_count integer;
  v_range tsrange;
begin
  if new.status is distinct from 'Pendente' or new.attendant_id is null or new.date is null or new.time is null then
    return new;
  end if;

  -- Em alteração, só confere quando algo que entra na contagem muda de fato
  -- (atendente, data, horário, duração) ou quando o status volta a Pendente.
  -- Assim um agendamento antigo acima do limite segue editável.
  if tg_op = 'UPDATE'
     and old.status = 'Pendente'
     and old.attendant_id is not distinct from new.attendant_id
     and old.date is not distinct from new.date
     and old.time is not distinct from new.time
     and old.end_time is not distinct from new.end_time then
    return new;
  end if;

  select sector into v_sector from public.user where id = new.attendant_id;
  if v_sector is null or not (v_sector = any (cs_sectors)) then
    return new;
  end if;

  -- Serializa as gravações do CS no mesmo dia: dois pedidos simultâneos passam
  -- aqui um de cada vez, e o segundo já enxerga o primeiro.
  perform pg_advisory_xact_lock(hashtext('customer_success_concurrent_limit:' || new.date::text));

  v_limit := case when extract(isodow from new.date) in (6, 7) then 1 else 4 end;
  v_range := public.appointment_occupied_range(new.date, new.time, new.end_time);

  select count(*) into v_count
  from public.appointments a
  join public.user u on u.id = a.attendant_id
  where a.id <> new.id
    and a.status = 'Pendente'
    and a.date = new.date
    and u.sector = any (cs_sectors)
    and public.appointment_occupied_range(a.date, a.time, a.end_time) && v_range;

  if v_count >= v_limit then
    raise exception 'CS_CONCURRENT_LIMIT: o Customer Success já tem % agendamento(s) simultâneo(s) em % às % (limite %).',
      v_count, new.date, new.time, v_limit
      using errcode = 'TS409';
  end if;

  return new;
end;
$$;

drop trigger if exists customer_success_concurrent_limit on public.appointments;
create trigger customer_success_concurrent_limit
  before insert or update of attendant_id, date, "time", end_time, status
  on public.appointments
  for each row
  execute function public.enforce_customer_success_concurrent_limit();
