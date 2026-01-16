-- FIX RLS POLICIES FOR LEADERS
-- Goal: Allow Leaders to see appointments created by their sector members (even if assigned to another sector)

-- 1. Drop existing restrictive policies if any (Assuming standard naming, but using broadly permissive logic for the new one)
-- NOTE: We cannot know the exact name of the existing policy without inspecting pg_policies.
-- We will create a new policy that covers the requirement. If there is a conflicting one, it should be disabled.
-- ideally: DROP POLICY IF EXISTS "Policy Name" ON public.appointments;

-- 2. Create/Replace Policy for Appointments
-- This policy allows access if:
-- - User is Admin/Dev/TEI/Qualidade/Suporte (Global Access)
-- - User is the attendant or creator or updater
-- - User is a Leader/Co-Leader of the Attendant's sector
-- - User is a Leader/Co-Leader of the Creator's sector <--- The FIX

CREATE OR REPLACE FUNCTION public.is_sector_leader(user_id uuid, target_sector text)
RETURNS boolean AS $$
DECLARE
  u_role text;
  u_sector text;
BEGIN
  SELECT role, sector INTO u_role, u_sector FROM public.user WHERE id = user_id;
  RETURN (u_role IN ('Líder', 'Co-Líder', 'Co-líder') AND u_sector = target_sector);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main Policy
CREATE POLICY "Appointments Access Policy" ON public.appointments
FOR ALL
USING (
  -- 1. Admin/Global Roles
  (SELECT role FROM public.user WHERE id = auth.uid()) IN ('Admin', 'Dev', 'TEI', 'Qualidade', 'Suporte')
  
  OR

  -- 2. Own Data (Attendant, Creator, Updater)
  auth.uid() = attendant_id
  OR
  auth.uid() = created_by
  -- OR auth.uid() = updatedBy (if mapped, but usually handled by id)

  OR

  -- 3. Sector Leadership (Check Attendant)
  EXISTS (
    SELECT 1 FROM public.user att
    WHERE att.id = appointments.attendant_id
    AND (SELECT sector FROM public.user WHERE id = auth.uid()) = att.sector
    AND (SELECT role FROM public.user WHERE id = auth.uid()) IN ('Líder', 'Co-Líder', 'Co-líder')
  )

  OR

  -- 4. Sector Leadership (Check Creator) <-- THE CRITICAL FIX
  EXISTS (
    SELECT 1 FROM public.user creator
    WHERE creator.id = appointments.created_by
    AND (SELECT sector FROM public.user WHERE id = auth.uid()) = creator.sector
    AND (SELECT role FROM public.user WHERE id = auth.uid()) IN ('Líder', 'Co-Líder', 'Co-líder')
  )
);
