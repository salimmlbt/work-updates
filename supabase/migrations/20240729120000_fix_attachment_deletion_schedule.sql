
-- Drop the old, problematic function if it exists
DROP FUNCTION IF EXISTS public.delete_task_attachments(text, interval);

-- Create the new, correct function that accepts seconds as an integer
CREATE OR REPLACE FUNCTION public.schedule_task_attachment_deletion(p_task_id text, p_delay_seconds integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id integer;
BEGIN
  -- Schedule the deletion using pg_cron, converting seconds to an interval
  SELECT cron.schedule(
    'delete-attachments-' || p_task_id,
    now() + (p_delay_seconds || ' seconds')::interval,
    $$
      DELETE FROM storage.objects WHERE bucket_id = 'attachments' AND "owner" IN (
        SELECT id FROM auth.users WHERE id = (
          SELECT regexp_replace(split_part(path, '/', 2), 'user_id=', '') 
          FROM storage.objects 
          WHERE name = (
            SELECT unnest(attachments ->> 'path') 
            FROM public.tasks 
            WHERE id = p_task_id
            LIMIT 1
          )
        )
      );
    $$
  ) INTO job_id;

  RETURN job_id;
END;
$$;
