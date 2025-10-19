-- Drop existing objects if they exist, handling dependencies.
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TYPE IF EXISTS public.task_status;

-- Create the ENUM type for task status
CREATE TYPE public.task_status AS ENUM ('todo', 'inprogress', 'done');

-- Create the tasks table
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    description text NOT NULL,
    deadline timestamp with time zone NOT NULL,
    status public.task_status NOT NULL DEFAULT 'todo'::public.task_status,
    assignee_id uuid,
    project_id uuid,
    client_id uuid,
    tags text[],
    "type" text,
    is_deleted boolean NOT NULL DEFAULT false,
    attachments jsonb,
    rich_description jsonb,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
    CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients (id) ON DELETE SET NULL,
    CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.tasks OWNER TO postgres;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON "public"."tasks"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
