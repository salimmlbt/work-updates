-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_task_done_schedule_deletion ON public.tasks;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.schedule_task_attachment_deletion();
DROP FUNCTION IF EXISTS public.delete_task_attachments(text);

-- Function to delete attachments for a given task
CREATE OR REPLACE FUNCTION public.delete_task_attachments(p_task_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  attachment_paths text[];
BEGIN
  -- Get the attachment paths from the task
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(attachments -> 'path')
  )
  INTO attachment_paths
  FROM public.tasks
  WHERE id = p_task_id;

  -- Delete the files from storage
  IF array_length(attachment_paths, 1) > 0 THEN
    PERFORM storage.delete_objects('attachments', attachment_paths);
  END IF;

  -- Clear the attachments from the task
  UPDATE public.tasks
  SET attachments = NULL
  WHERE id = p_task_id;
END;
$$;

-- Function to schedule the attachment deletion
CREATE OR REPLACE FUNCTION public.schedule_task_attachment_deletion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  delay_seconds integer;
BEGIN
  -- Check if the status was changed to 'done'
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.attachments IS NOT NULL THEN
    -- Get the deletion delay from settings, default to 300 seconds (5 minutes)
    SELECT value::integer INTO delay_seconds
    FROM public.app_settings
    WHERE key = 'attachment_deletion_delay'
    LIMIT 1;

    IF delay_seconds IS NULL THEN
      delay_seconds := 300;
    END IF;

    -- Schedule the deletion job
    PERFORM cron.schedule(
      'delete-attachments-for-task-' || NEW.id,
      (now() + (delay_seconds || 300) * interval '1 second')::text,
      $$ SELECT public.delete_task_attachments('''' || NEW.id || ''''); $$
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on the tasks table
CREATE TRIGGER on_task_done_schedule_deletion
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.schedule_task_attachment_deletion();
