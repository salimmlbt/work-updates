
-- Enable RLS on the official_holidays table
ALTER TABLE public.official_holidays ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.official_holidays;

-- Create a new policy to allow any authenticated user to read holidays
CREATE POLICY "Allow authenticated read access"
ON public.official_holidays
FOR SELECT
TO authenticated
USING (true);
