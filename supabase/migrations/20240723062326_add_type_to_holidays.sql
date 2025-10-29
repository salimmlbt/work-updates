
-- Add the 'type' column to the 'official_holidays' table
ALTER TABLE "public"."official_holidays"
ADD COLUMN "type" TEXT;

-- Drop the existing policy
DROP POLICY "Allow authenticated users to manage holidays" ON "public"."official_holidays";

-- Recreate the policy to include the new 'type' column logic
CREATE POLICY "Allow authenticated users to manage holidays"
ON "public"."official_holidays"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  -- Public holidays and special days are visible to everyone
  user_id IS NULL
  -- Personal events are visible only to their creator
  OR user_id = auth.uid()
)
WITH CHECK (
  -- Allow inserting personal events for oneself
  user_id = auth.uid()
  -- Allow inserting public holidays/special days (user_id is NULL)
  OR user_id IS NULL
);
