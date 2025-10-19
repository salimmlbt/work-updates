
-- Drop the existing projects table and all its dependencies
DROP TABLE IF EXISTS public.projects CASCADE;

-- Re-create the projects table with the correct schema and constraints
CREATE TABLE public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    start_date date NULL,
    due_date date NULL,
    client_id uuid NULL,
    status text NULL DEFAULT 'New'::text,
    priority text NULL DEFAULT 'None'::text,
    leaders uuid[] NULL,
    members uuid[] NULL,
    type text NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone NULL,
    CONSTRAINT projects_pkey PRIMARY KEY (id),
    CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Re-add comments and policies if needed
COMMENT ON TABLE public.projects IS 'Stores information about projects.';

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Allow all for authenticated users" ON public.projects FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
