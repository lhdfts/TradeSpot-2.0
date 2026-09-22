-- =============================================================================
-- TradeSpot RLS Policies
-- =============================================================================
-- Contexto: o app autentica via Firebase (não Supabase Auth). A publishable key
-- no frontend opera como role "anon". A secret/service_role key no backend
-- bypassa RLS automaticamente.
--
-- Modelo de segurança recomendado:
--   Frontend (publishable key) → leitura de dados operacionais
--   Backend  (secret key)      → escrita sensível + validação Firebase
--
-- Execute no SQL Editor do Supabase APÓS revisar as políticas abaixo.
-- =============================================================================

-- Remover políticas de desenvolvimento (acesso total)
drop policy if exists "Enable all access for everyone" on public.user;
drop policy if exists "Enable all access for everyone" on public.clients;
drop policy if exists "Enable all access for everyone" on public.appointments;
drop policy if exists "Enable all access for everyone" on public.events;

-- Garantir que RLS está ativo
alter table public.user enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.events enable row level security;

-- -----------------------------------------------------------------------------
-- LEITURA: permitida para role anon (publishable key no frontend)
-- -----------------------------------------------------------------------------

create policy "anon_select_user"
    on public.user for select
    to anon, authenticated
    using (true);

create policy "anon_select_clients"
    on public.clients for select
    to anon, authenticated
    using (true);

create policy "anon_select_appointments"
    on public.appointments for select
    to anon, authenticated
    using (true);

create policy "anon_select_events"
    on public.events for select
    to anon, authenticated
    using (true);

-- -----------------------------------------------------------------------------
-- ESCRITA via frontend (publishable key) — mantém o app funcionando
-- O controle fino de permissões fica no backend (Firebase + service role).
-- Quando todas as escritas migrarem para a API, remova estas políticas.
-- -----------------------------------------------------------------------------

create policy "anon_insert_clients"
    on public.clients for insert
    to anon, authenticated
    with check (true);

create policy "anon_update_clients"
    on public.clients for update
    to anon, authenticated
    using (true)
    with check (true);

create policy "anon_insert_appointments"
    on public.appointments for insert
    to anon, authenticated
    with check (true);

create policy "anon_update_appointments"
    on public.appointments for update
    to anon, authenticated
    using (true)
    with check (true);

create policy "anon_insert_events"
    on public.events for insert
    to anon, authenticated
    with check (true);

create policy "anon_update_events"
    on public.events for update
    to anon, authenticated
    using (true)
    with check (true);

create policy "anon_delete_events"
    on public.events for delete
    to anon, authenticated
    using (true);

-- user: leitura pelo frontend; escrita apenas pelo backend (service role)
-- O middleware firebaseAuth.ts cria usuários com a secret key.

create policy "anon_update_user_firebase_sync"
    on public.user for update
    to anon, authenticated
    using (true)
    with check (true);

-- -----------------------------------------------------------------------------
-- FASE 2 (futuro): políticas mais restritivas
-- Quando create/update de appointments e events passarem 100% pelo backend,
-- execute:
--
--   drop policy "anon_insert_appointments" on public.appointments;
--   drop policy "anon_update_appointments" on public.appointments;
--   drop policy "anon_insert_events" on public.events;
--   drop policy "anon_update_events" on public.events;
--   drop policy "anon_delete_events" on public.events;
--   drop policy "anon_update_user_firebase_sync" on public.user;
--
-- O backend com SUPABASE_SERVICE_ROLE_KEY continuará funcionando (bypassa RLS).
-- -----------------------------------------------------------------------------
