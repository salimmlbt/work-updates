-- First, drop the tasks_project_id_fkey constraint from the tasks table
-- This is necessary because it depends on the projects table.
-- A better approach in a real scenario might be to alter the constraint,
-- but for a clean recreation, we drop and will let Supabase re-infer it.
-- We will try to drop it if it exists.
DO $$
BEGIN
   IF EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'tasks_project_id_fkey' AND
             conrelid = 'public.tasks'::regclass
   )
   THEN
      ALTER TABLE public.tasks DROP CONSTRAINT tasks_project_id_fkey;
   END IF;
END;
$$;


-- Drop the existing projects table
DROP TABLE IF EXISTS public.projects;

-- Re-create the projects table
CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    start_date date,
    due_date date,
    client_id uuid,
    status text,
    priority text,
    leaders uuid[],
    members uuid[],
    type text,
    is_deleted boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone
);

ALTER TABLE public.projects OWNER TO postgres;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

-- Add back the foreign key to the clients table
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);

-- Add back the foreign key to the tasks table that we dropped earlier
-- This ensures tasks are correctly linked to the new projects table
ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
