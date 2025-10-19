-- Drop the trigger and function to completely remove the attachment deletion logic

DROP TRIGGER IF EXISTS on_task_done_schedule_deletion ON public.tasks;
DROP FUNCTION IF EXISTS public.schedule_task_attachment_deletion(text, integer);
