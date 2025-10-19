-- Drop the old, incorrect function if it exists
DROP FUNCTION IF EXISTS delete_task_attachments(uuid);

-- Create a new function to delete attachments for a given task ID
CREATE OR REPLACE FUNCTION delete_task_attachments(p_task_id UUID)
RETURNS VOID AS $$
DECLARE
    attachment_path TEXT;
    attachment_paths_json JSONB;
BEGIN
    -- Get the attachments JSONB array from the task
    SELECT attachments INTO attachment_paths_json
    FROM public.tasks
    WHERE id = p_task_id;

    -- Check if there are any attachments
    IF attachment_paths_json IS NOT NULL AND jsonb_array_length(attachment_paths_json) > 0 THEN
        -- Loop through each attachment object in the JSON array
        FOR attachment_path IN (SELECT value->>'path' FROM jsonb_array_elements(attachment_paths_json))
        LOOP
            -- Use the built-in storage function to delete the object
            -- This is safer and handles permissions correctly.
            PERFORM storage.delete_object('attachments', attachment_path);
        END LOOP;
    END IF;
    
    -- After deleting, clear the attachments field in the tasks table
    UPDATE public.tasks
    SET attachments = NULL
    WHERE id = p_task_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop the old scheduling function if it exists from previous attempts
DROP FUNCTION IF EXISTS schedule_task_attachment_deletion(text, integer);

-- Create the function that schedules the deletion job
CREATE OR REPLACE FUNCTION schedule_task_attachment_deletion(p_task_id UUID, p_delay_seconds INT)
RETURNS BIGINT AS $$
DECLARE
    job_id BIGINT;
BEGIN
    -- Schedule the deletion function to run after the specified delay
    SELECT cron.schedule(
        'delete-attachments-' || p_task_id::text,
        (p_delay_seconds || ' seconds')::interval,
        'SELECT delete_task_attachments(''' || p_task_id::text || ''')'
    ) INTO job_id;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
