-- Guarantees, at the database level, that no attendant ever holds two overlapping
-- "Pendente" appointments — regardless of which code path created them (internal
-- create/edit forms, auto-distribution, public self-scheduling, or a bulk-insert
-- script). Application-level conflict checks (see server/src/utils/distribution.ts)
-- remain in place for good UX (clear error before hitting the database), but only a
-- DB constraint can close the race window between "check" and "insert".
--
-- 'Fora da agenda' and 'Fechamento' stay exempt, matching current application
-- behavior (they are intentionally allowed to overlap with anything, per
-- server/src/routes/appointmentRoutes.ts).
--
-- Safe to run: as of this writing there are zero overlapping 'Pendente' appointments
-- in production, so this constraint applies cleanly with no pre-existing violations.

create extension if not exists btree_gist;

-- Wall-clock occupied time range for the appointment (local time, no timezone math —
-- "time"/"end_time" are always stored with a fixed +00 marker regardless of the
-- attendant's actual timezone, so we strip it and work with plain time/timestamp).
alter table public.appointments
  add column if not exists occupied_range tsrange generated always as (
    case
      when attendant_id is null or date is null or "time" is null then null
      else tsrange(
        (date + "time"::time),
        (date + "time"::time) + (
          case
            when end_time is null then interval '60 minutes'
            when end_time::time <= "time"::time then (end_time::time - "time"::time) + interval '24 hours'
            else (end_time::time - "time"::time)
          end
        ),
        '[)'
      )
    end
  ) stored;

alter table public.appointments
  add constraint no_double_booking_per_attendant
  exclude using gist (
    attendant_id with =,
    occupied_range with &&
  )
  where (status = 'Pendente' and type not in ('Fora da agenda', 'Fechamento'));
