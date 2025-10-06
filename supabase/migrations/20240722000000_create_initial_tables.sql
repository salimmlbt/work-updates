
create table if not exists "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "email" text,
    "role_id" uuid,
    "team_id" uuid
);

alter table "public"."profiles" enable row level security;

create table if not exists "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "owner_id" uuid not null,
    "start_date" timestamp with time zone,
    "due_date" timestamp with time zone,
    "client_id" uuid,
    "status" text,
    "priority" text
);

alter table "public"."projects" enable row level security;

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";
alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."projects" add constraint "projects_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) not valid;
alter table "public"."projects" validate constraint "projects_owner_id_fkey";

grant delete on table "public"."profiles" to "anon";
grant insert on table "public"."profiles" to "anon";
grant references on table "public"."profiles" to "anon";
grant select on table "public"."profiles" to "anon";
grant trigger on table "public"."profiles" to "anon";
grant truncate on table "public"."profiles" to "anon";
grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";
grant insert on table "public"."profiles" to "authenticated";
grant references on table "public"."profiles" to "authenticated";
grant select on table "public"."profiles" to "authenticated";
grant trigger on table "public"."profiles" to "authenticated";
grant truncate on table "public"."profiles" to "authenticated";
grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";
grant insert on table "public"."profiles" to "service_role";
grant references on table "public"."profiles" to "service_role";
grant select on table "public"."profiles" to "service_role";
grant trigger on table "public"."profiles" to "service_role";
grant truncate on table "public"."profiles" to "service_role";
grant update on table "public"."profiles" to "service_role";


grant delete on table "public"."projects" to "anon";
grant insert on table "public"."projects" to "anon";
grant references on table "public"."projects" to "anon";
grant select on table "public"."projects" to "anon";
grant trigger on table "public"."projects" to "anon";
grant truncate on table "public"."projects" to "anon";
grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";
grant insert on table "public"."projects" to "authenticated";
grant references on table "public"."projects" to "authenticated";
grant select on table "public"."projects" to "authenticated";
grant trigger on table "public"."projects" to "authenticated";
grant truncate on table "public"."projects" to "authenticated";
grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";
grant insert on table "public"."projects" to "service_role";
grant references on table "public"."projects" to "service_role";
grant select on table "public"."projects" to "service_role";
grant trigger on table "public"."projects" to "service_role";
grant truncate on table "public"."projects" to "service_role";
grant update on table "public"."projects" to "service_role";

-- Handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$;

-- Trigger the function on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Handle user deletion
create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = old.id;
  return old;
end;
$$;

-- Trigger the function on user profile deletion
create trigger on_profile_deleted
  after delete on public.profiles
  for each row execute procedure public.handle_user_delete();
