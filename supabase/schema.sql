-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  email text unique not null,
  role text check (role in ('SDR', 'Closer', 'Admin')),
  level int,
  sector text,
  schedule jsonb,
  pauses jsonb,
  start_journey time,
  end_time time,
  start_pause time,
  end_pause time,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CLIENTS TABLE
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  email text,
  interest_level text check (interest_level in ('Baixo', 'Médio', 'Alto')),
  knowledge_level text check (knowledge_level in ('Iniciante', 'Intermediário', 'Avançado')),
  financial_currency text,
  financial_amount text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EVENTS TABLE
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  event_name text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  status text check (status in ('Active', 'Archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- APPOINTMENTS TABLE
create table public.appointments (
  id text primary key default ('AG-' || trim(to_char(nextval('public.appointments_id_seq'), '000'))),
  client_id uuid references public.clients(id) on delete set null,
  attendant_id uuid references public.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  date date not null,
  time time not null,
  type text check (type in ('Ligação SDR', 'Ligação Closer', 'Personal Appointment', 'Reschedule')),
  status text check (status in ('Cancelado', 'Esquecimento', 'Não compareceu', 'Pendente', 'Realizado', 'Reagendado')),
  meet_link text,
  notes text,
  additional_info text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sequence for appointment IDs
create sequence if not exists public.appointments_id_seq;

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- Create policies (Allow all for everyone for now - DEV MODE)
create policy "Enable all access for everyone" on public.users
  for all using (true);

create policy "Enable all access for everyone" on public.clients
  for all using (true);

create policy "Enable all access for everyone" on public.appointments
  for all using (true);

alter table public.events enable row level security;

create policy "Enable all access for everyone" on public.events
  for all using (true);
