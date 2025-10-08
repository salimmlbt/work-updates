create table "public"."project_members" (
    "project_id" uuid not null,
    "user_id" uuid not null
);

alter table "public"."project_members" enable row level security;

CREATE UNIQUE INDEX project_members_pkey ON public.project_members USING btree (project_id, user_id);

alter table "public"."project_members" add constraint "project_members_pkey" PRIMARY KEY using index "project_members_pkey";

alter table "public"."project_members" add constraint "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_project_id_fkey";

alter table "public"."project_members" add constraint "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_user_id_fkey";

create policy "Allow all for authenticated users" on public.project_members for all using (auth.role() = 'authenticated');
