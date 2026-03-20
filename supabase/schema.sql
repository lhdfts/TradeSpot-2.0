-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USER TABLE (Note: Singular 'user')
create table public.user (
  id uuid references auth.users on delete cascade not null primary key,
  firebase_id text,
  name text,
  email text,
  sector text,
  role text,
  schedule jsonb,
  pauses jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CLIENTS TABLE
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text,
  phone int8,
  email text,
  interest_level text,
  knowledge_level text,
  financial_currency text,
  financial_amount int8,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- EVENTS TABLE
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  event_name text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status boolean,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- APPOINTMENTS TABLE
create table public.appointments (
  id text primary key default ('AG-' || trim(to_char(nextval('public.appointments_id_seq'), '000'))),
  client_id uuid references public.clients(id) on delete set null,
  attendant_id uuid references public.user(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  date date,
  time time with time zone,
  end_time time with time zone,
  type text,
  status text,
  meet_link text,
  notes text,
  additional_info text,
  created_by uuid references public.user(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  interest_level text,
  knowledge_level text,
  financial_currency text,
  financial_amount int8
);

-- Create sequence for appointment IDs
create sequence if not exists public.appointments_id_seq;

-- Enable Row Level Security (RLS)
alter table public.user enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.events enable row level security;

-- Create policies (Allow all for everyone for now - DEV MODE)
create policy "Enable all access for everyone" on public.user
  for all using (true);

create policy "Enable all access for everyone" on public.clients
  for all using (true);

create policy "Enable all access for everyone" on public.appointments
  for all using (true);

create policy "Enable all access for everyone" on public.events
  for all using (true);
