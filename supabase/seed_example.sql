-- Example INSERT for a user with 08:00 - 18:00 schedule and 12:00 - 13:00 lunch (GMT-3)

-- Note: We store the "wall clock" time (08:00). 
-- If your application handles timezones, you treat this as 08:00 GMT-3.

INSERT INTO public.users (
  id,
  name,
  email,
  role,
  level,
  sector,
  schedule,
  pauses,
  start_journey,
  end_time,
  start_pause,
  end_pause
) VALUES (
  uuid_generate_v4(), -- or a specific auth.users id
  'Support Agent',
  'support@example.com',
  'SDR',
  1,
  'SDR',
  -- Schedule JSONB: Weekly schedule
  '{
    "mon": {"start": "08:00", "end": "18:00"},
    "tue": {"start": "08:00", "end": "18:00"},
    "wed": {"start": "08:00", "end": "18:00"},
    "thu": {"start": "08:00", "end": "18:00"},
    "fri": {"start": "08:00", "end": "18:00"}
  }'::jsonb,
  -- Pauses JSONB: Array of break intervals (Supports multiple breaks)
  '[
    {"start": "10:00", "end": "10:15"},
    {"start": "12:00", "end": "13:00"},
    {"start": "15:30", "end": "15:45"}
  ]'::jsonb,
  -- Individual Columns (if used for specific queries)
  '08:00', -- start_journey
  '18:00', -- end_time
  '12:00', -- start_pause
  '13:00'  -- end_pause
);
