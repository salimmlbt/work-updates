
create table "public"."clients" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "avatar" text not null,
    "industry" text not null,
    "contact" text not null,
    "whatsapp" text,
    "projects_count" integer,
    "tasks_count" integer
);


alter table "public"."clients" enable row level security;

create table "public"."project_members" (
    "project_id" uuid not null,
    "user_id" uuid not null
);


alter table "public"."project_members" enable row level security;

create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "owner_id" uuid not null,
    "start_date" date,
    "due_date" date,
    "client_id" uuid,
    "status" text,
    "priority" text
);


alter table "public"."projects" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "email" text,
    "role_id" uuid,
    "team_id" uuid
);


alter table "public"."profiles" enable row level security;

create table "public"."roles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "permissions" jsonb not null
);


alter table "public"."roles" enable row level security;

create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "description" text not null,
    "deadline" date not null,
    "status" text not null default 'todo'::text,
    "assignee_id" uuid,
    "tags" text[]
);


alter table "public"."tasks" enable row level security;

create table "public"."teams" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "default_tasks" text[],
    "owner_id" uuid not null
);


alter table "public"."teams" enable row level security;

CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);

CREATE UNIQUE INDEX project_members_pkey ON public.project_members USING btree (project_id, user_id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

alter table "public"."clients" add constraint "clients_pkey" PRIMARY KEY using index "clients_pkey";

alter table "public"."project_members" add constraint "project_members_pkey" PRIMARY KEY using index "project_members_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."teams" add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

alter table "public"."project_members" add constraint "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_project_id_fkey";

alter table "public"."project_members" add constraint "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_user_id_fkey";

alter table "public"."projects" add constraint "projects_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL not valid;

alter table "public"."projects" validate constraint "projects_client_id_fkey";

alter table "public"."projects" add constraint "projects_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_owner_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_role_id_fkey";

alter table "public"."profiles" add constraint "profiles_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_team_id_fkey";

alter table "public"."tasks" add constraint "tasks_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."tasks" validate constraint "tasks_assignee_id_fkey";

alter table "public"."tasks" add constraint "tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_project_id_fkey";

alter table "public"."teams" add constraint "teams_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."teams" validate constraint "teams_owner_id_fkey";

-- Create policies for clients table
create policy "Allow all for authenticated users" on public.clients for all using (auth.role() = 'authenticated');

-- Create policies for project_members table
create policy "Allow all for authenticated users" on public.project_members for all using (auth.role() = 'authenticated');

-- Create policies for projects table
create policy "Allow all for authenticated users" on public.projects for all using (auth.role() = 'authenticated');

-- Create policies for profiles table
create policy "Allow all for authenticated users" on public.profiles for all using (auth.role() = 'authenticated');
create policy "Allow individual user access" on public.profiles for all using (auth.uid() = id);

-- Create policies for roles table
create policy "Allow all for authenticated users" on public.roles for all using (auth.role() = 'authenticated');

-- Create policies for tasks table
create policy "Allow all for authenticated users" on public.tasks for all using (auth.role() = 'authenticated');

-- Create policies for teams table
create policy "Allow all for authenticated users" on public.teams for all using (auth.role() = 'authenticated');

-- Create a bucket for avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/png","image/gif","image/webp"}');

-- Create policies for avatars bucket
create policy "Allow public read access" on storage.objects for select to public using (bucket_id = 'avatars');
create policy "Allow authenticated users to upload" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "Allow authenticated users to update" on storage.objects for update to authenticated with check (bucket_id = 'avatars');
create policy "Allow authenticated users to delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');

-- Insert a default admin user and profile if they don't exist
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if the admin user already exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@falaq.com';

    -- If the user does not exist, create them
    IF admin_user_id IS NULL THEN
        -- Create the auth user
        admin_user_id := '00000000-0000-0000-0000-000000000001'; -- A fixed UUID for the admin user

        INSERT INTO auth.users (id, email, encrypted_password, role, aud, instance_id, raw_app_meta_data, raw_user_meta_data)
        VALUES (
            admin_user_id,
            'admin@falaq.com',
            crypt('admin123', gen_salt('bf')), -- Use a secure password in production
            'authenticated',
            'authenticated',
            '00000000-0000-0000-0000-000000000000',
            '{"provider":"email","providers":["email"]}',
            '{"full_name": "Admin User", "avatar_url": "https://i.pravatar.cc/150?u=admin"}'
        );

        -- Create the corresponding profile
        INSERT INTO public.profiles (id, full_name, avatar_url, email)
        VALUES (
            admin_user_id,
            'Admin User',
            'https://i.pravatar.cc/150?u=admin',
            'admin@falaq.com'
        );
    END IF;
END $$;
