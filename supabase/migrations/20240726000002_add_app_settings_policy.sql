-- Drop the faulty policy first to avoid conflicts
DROP POLICY IF EXISTS "Allow admins to manage app settings" ON public.app_settings;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'Falaq Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the correct policy using the new helper function
CREATE POLICY "Allow admins to manage app settings"
ON public.app_settings
FOR ALL
USING ( is_admin() )
WITH CHECK ( is_admin() );
