
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name text not null,
  permissions jsonb not null
);
