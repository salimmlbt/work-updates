-- Drop the existing policy first to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

-- Create a new, simpler policy for inserting projects
CREATE POLICY "Authenticated users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');