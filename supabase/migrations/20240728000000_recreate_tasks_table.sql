
DROP TABLE IF EXISTS public.tasks CASCADE;

-- Recreate the enum type if it was dropped with the table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM (
            'todo',
            'inprogress',
            'done'
        );
    END IF;
END$$;


CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    deadline timestamp with time zone NOT NULL,
    assignee_id uuid,
    tags text[],
    status public.task_status DEFAULT 'todo'::public.task_status,
    project_id uuid,
    client_id uuid,
    type text,
    is_deleted boolean DEFAULT false NOT NULL,
    rich_description jsonb,
    attachments jsonb
);

ALTER TABLE public.tasks OWNER TO postgres;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE ONLY publictasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

GRANT ALL ON TABLE public.tasks TO anon;
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;
