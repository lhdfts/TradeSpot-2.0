-- =============================================================================
-- TradeSpot - Bloqueio de acesso direto via PostgREST (anon / authenticated)
-- =============================================================================
-- Contexto: o login é Firebase, não Supabase Auth. O frontend não acessa mais o
-- Supabase diretamente: todo acesso passa pelo backend (/api/*), que usa a
-- secret key (sb_secret_* / service_role) e por isso IGNORA o RLS.
--
-- Logo, os roles "anon" e "authenticated" (usados por publishable/anon keys)
-- não precisam de acesso a nada. Este script:
--   1. Remove TODAS as policies do schema public que valem para anon,
--      authenticated ou public (incluindo as anon_* de rls_policies.sql, que
--      os scripts secure_*.sql nunca removeram).
--   2. Habilita RLS em todas as tabelas do schema public (sem policies = nega tudo).
--   3. Revoga privilégios de tabela, sequência e função de anon/authenticated.
--   4. Corrige is_sector_leader (SECURITY DEFINER sem search_path, executável por anon).
--
-- Seguro para o backend: service_role tem BYPASSRLS e grants próprios.
-- Idempotente: pode ser executado mais de uma vez.
--
-- NÃO execute rls_policies.sql, secure_policies.sql, secure_rls_policies.sql
-- nem fix_rls_policies.sql depois deste script: eles recriam acesso.
-- =============================================================================

begin;

-- 1. Remover policies aplicáveis a anon / authenticated / public
do $$
declare
    p record;
begin
    for p in
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
          and roles && array['anon', 'authenticated', 'public']::name[]
    loop
        execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
        raise notice 'Policy removida: %.% -> %', p.schemaname, p.tablename, p.policyname;
    end loop;
end $$;

-- 2. Habilitar RLS em todas as tabelas do schema public
do $$
declare
    t record;
begin
    for t in
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p')
    loop
        execute format('alter table public.%I enable row level security', t.relname);
    end loop;
end $$;

-- 3. Revogar privilégios diretos
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 4. is_sector_leader: fixar search_path (evita hijack de objetos) se existir
do $$
begin
    if exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'is_sector_leader'
    ) then
        execute 'alter function public.is_sector_leader(uuid, text) set search_path = public, pg_temp';
    end if;
end $$;

commit;

-- =============================================================================
-- Verificação (rode depois; o esperado é nenhuma linha nas duas primeiras)
-- =============================================================================
-- select schemaname, tablename, policyname, roles from pg_policies
--   where schemaname = 'public' and roles && array['anon','authenticated','public']::name[];
--
-- select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
--
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated');
