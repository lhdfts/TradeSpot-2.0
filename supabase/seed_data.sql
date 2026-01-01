-- SEED DATA
-- This script inserts 3 example rows into user, clients, and appointments.
-- It uses hardcoded UUIDs to ensure relationships are maintained.

-- 0. AUTH USERS (Insert into auth.users to satisfy FK)
-- WARNING: These users will have a dummy password and might not be usable for login without reset.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'leonardo@example.com', 'dummy_password', now(), 'authenticated', 'authenticated'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'bob@example.com', 'dummy_password', now(), 'authenticated', 'authenticated'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'charlie@example.com', 'dummy_password', now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 1. USERS (3 examples)
-- User 1: Admin
INSERT INTO public.user (id, name, email, role, sector, schedule, pauses)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Leonardo Admin',
  'leonardo@example.com',
  'Admin',
  'Admin',
  '{"mon": {"start": "09:00", "end": "17:00"}}',
  '[{"start": "12:00", "end": "13:00"}]'
);

-- User 2: SDR
INSERT INTO public.user (id, name, email, role, sector, schedule, pauses)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Bob SDR',
  'bob@example.com',
  'SDR',
  'Sales',
  '{"mon": {"start": "08:00", "end": "18:00"}}',
  '[{"start": "12:00", "end": "13:00"}]'
);

-- User 3: Closer
INSERT INTO public.user (id, name, email, role, sector, schedule, pauses)
VALUES (
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Charlie Closer',
  'charlie@example.com',
  'Closer',
  'Sales',
  '{"mon": {"start": "10:00", "end": "20:00"}}',
  '[{"start": "14:00", "end": "15:00"}]'
);


-- 2. CLIENTS (3 examples)
INSERT INTO public.clients (id, name, phone, email, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'David Client', 5511999999991, 'david@client.com', 'Alto', 'Iniciante', 'BRL', 5000),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Eva Client', 5511999999992, 'eva@client.com', 'Médio', 'Intermediário', 'USD', 1000),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Frank Client', 5511999999993, 'frank@client.com', 'Baixo', 'Avançado', 'EUR', 500);
  
-- 3. EVENTS (3 examples)
INSERT INTO public.events (id, event_name, start_date, end_date, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', '1125 - Cash Express', '2025-11-25 09:00:00-03', '2025-11-30 18:00:00-03', true),
  ('22222222-2222-2222-2222-222222222222', '1125 - Plano de Fuga', '2025-11-25 09:00:00-03', '2025-12-05 18:00:00-03', false),
  ('33333333-3333-3333-3333-333333333333', '1225 - 26M', '2025-12-25 09:00:00-03', '2025-12-31 18:00:00-03', false);

-- 4. APPOINTMENTS (3 examples)
-- Appointment 1: Bob (SDR) with David
INSERT INTO public.appointments (client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, created_by, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', -- David
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Bob
  '11111111-1111-1111-1111-111111111111', -- Launch Event
  CURRENT_DATE + 1,
  '14:00',
  'Ligação SDR',
  'Pendente',
  'meet.google.com/abc-defg-hij',
  'First contact',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Created by Alice
  'Alto', 'Iniciante', 'BRL', 5000
);

-- Appointment 2: Charlie (Closer) with Eva
INSERT INTO public.appointments (client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, created_by, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', -- Eva
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Charlie
  '22222222-2222-2222-2222-222222222222', -- Webinar
  CURRENT_DATE + 2,
  '16:00',
  'Ligação Closer',
  'Reagendado',
  'meet.google.com/xyz-uvwx-yz',
  'Closing call',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Created by Bob
  'Médio', 'Intermediário', 'USD', 1000
);

-- Appointment 3: Bob (SDR) with Frank
INSERT INTO public.appointments (client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, created_by, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES (
  'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', -- Frank
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Bob
  '33333333-3333-3333-3333-333333333333', -- No event
  CURRENT_DATE - 1,
  '10:00',
  'Ligação SDR',
  'Realizado',
  'meet.google.com/xyz-uvwx-yz',
  'Follow up done',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Created by Alice
  'Baixo', 'Avançado', 'EUR', 500
);
