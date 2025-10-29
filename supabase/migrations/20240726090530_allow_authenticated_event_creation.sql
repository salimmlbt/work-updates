
-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated users to read holidays" ON "public"."official_holidays";

-- Create a new policy that allows both SELECT and INSERT
CREATE POLICY "Allow authenticated users to manage holidays"
ON "public"."official_holidays"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
