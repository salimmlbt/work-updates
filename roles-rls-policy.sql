-- This policy allows all operations (INSERT, SELECT, UPDATE, DELETE) on the 'roles' table.
-- Since there is no user authentication in this app yet, this policy uses 'true'
-- to grant access to any request, which is appropriate for the current setup.

-- First, ensure Row Level Security is enabled on the table.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop the existing policy if it exists, to avoid errors.
DROP POLICY IF EXISTS "Allow all operations on roles" ON public.roles;

-- Create the new policy that allows all actions.
CREATE POLICY "Allow all operations on roles"
ON public.roles
FOR ALL
USING (true)
WITH CHECK (true);
