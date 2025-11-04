
create table "public"."content_schedules" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "client_id" uuid not null,
    "title" text not null,
    "scheduled_date" timestamp with time zone not null,
    "status" text not null default 'Planned'::text,
    "content_type" text,
    "notes" text,
    "is_deleted" boolean not null default false
);

alter table "public"."content_schedules" enable row level security;

CREATE UNIQUE INDEX content_schedules_pkey ON public.content_schedules USING btree (id);

alter table "public"."content_schedules" add constraint "content_schedules_pkey" PRIMARY KEY using index "content_schedules_pkey";

alter table "public"."content_schedules" add constraint "content_schedules_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."content_schedules" validate constraint "content_schedules_client_id_fkey";

grant delete on table "public"."content_schedules" to "anon";
grant insert on table "public"."content_schedules" to "anon";
grant references on table "public"."content_schedules" to "anon";
grant select on table "public"."content_schedules" to "anon";
grant trigger on table "public"."content_schedules" to "anon";
grant truncate on table "public"."content_schedules" to "anon";
grant update on table "public"."content_schedules" to "anon";

grant delete on table "public"."content_schedules" to "authenticated";
grant insert on table "public"."content_schedules" to "authenticated";
grant references on table "public"."content_schedules" to "authenticated";
grant select on table "public"."content_schedules" to "authenticated";
grant trigger on table "public"."content_schedules" to "authenticated";
grant truncate on table "public"."content_schedules" to "authenticated";
grant update on table "public"."content_schedules" to "authenticated";

grant delete on table "public"."content_schedules" to "service_role";
grant insert on table "public"."content_schedules" to "service_role";
grant references on table "public"."content_schedules" to "service_role";
grant select on table "public"."content_schedules" to "service_role";
grant trigger on table "public"."content_schedules" to "service_role";
grant truncate on table "public"."content_schedules" to "service_role";
grant update on table "public"."content_schedules" to "service_role";


CREATE POLICY "Enable all actions for users based on user_id" ON "public"."content_schedules"
AS PERMISSIVE FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
