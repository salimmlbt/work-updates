
-- Drop dependent objects first if they exist
DROP TRIGGER IF EXISTS on_task_done_schedule_deletion on public.tasks;
DROP FUNCTION IF EXISTS public.schedule_task_attachment_deletion();
DROP FUNCTION IF EXISTS public.delete_task_attachments(text);

-- Drop the table and the enum type
DROP TABLE IF EXISTS public.tasks;
DROP TYPE IF EXISTS public.task_status;

-- Recreate the enum type
CREATE TYPE public.task_status AS ENUM ('todo', 'inprogress', 'done');

-- Recreate the tasks table with the correct schema
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    description text NOT NULL,
    deadline timestamp with time zone NOT NULL,
    assignee_id uuid NULL,
    project_id uuid NULL,
    client_id uuid NULL,
    status public.task_status NOT NULL DEFAULT 'todo'::public.task_status,
    tags text[] NULL,
    type text NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    attachments jsonb NULL,
    rich_description jsonb NULL,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX tasks_assignee_id_idx ON public.tasks (assignee_id);
CREATE INDEX tasks_status_idx ON public.tasks (status);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Allow all access to authenticated users" ON public.tasks FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
