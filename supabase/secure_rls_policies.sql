-- ============================================
-- SECURE RLS POLICIES FOR TRADESPOT DATABASE
-- ============================================
-- Goal: Disable all public direct access to Supabase tables
-- All database operations should go through the Express.js backend

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.user;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.clients;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.appointments;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.events;
DROP POLICY IF EXISTS "Appointments Access Policy" ON public.appointments;

-- 2. Create STRICT RLS policies (deny all direct access)
-- Only allow access through the backend (which uses service_role key, bypassing RLS)

-- Policy for user table: Deny all public access
CREATE POLICY "Deny all public access" ON public.user
  FOR ALL USING (false);

-- Policy for clients table: Deny all public access
CREATE POLICY "Deny all public access" ON public.clients
  FOR ALL USING (false);

-- Policy for appointments table: Deny all public access
CREATE POLICY "Deny all public access" ON public.appointments
  FOR ALL USING (false);

-- Policy for events table: Deny all public access
CREATE POLICY "Deny all public access" ON public.events
  FOR ALL USING (false);

-- 3. Verify RLS is still enabled
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 4. Optional: Force RLS even for table owners (super secure)
ALTER TABLE public.user FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

-- ============================================
-- IMPORTANT:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Make sure your backend uses the SUPABASE_SERVICE_ROLE_KEY
--    (not the anon key) to bypass RLS
-- ============================================
