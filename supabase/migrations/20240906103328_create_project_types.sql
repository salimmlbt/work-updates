
create table "public"."project_types" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null
);


alter table "public"."project_types" enable row level security;

CREATE UNIQUE INDEX project_types_pkey ON public.project_types USING btree (id);

alter table "public"."project_types" add constraint "project_types_pkey" PRIMARY KEY using index "project_types_pkey";

create policy "Allow all access to authenticated users"
on "public"."project_types"
as permissive
for all
to authenticated
using (true)
with check (true);
