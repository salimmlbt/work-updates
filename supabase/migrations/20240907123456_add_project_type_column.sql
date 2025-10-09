
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.projects
    ADD COLUMN "type" text;
  END IF;
END
$$;
