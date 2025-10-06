
create table public.roles (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    name text not null,
    permissions jsonb not null,
    constraint roles_pkey primary key (id),
    constraint roles_name_key unique (name)
);

alter table public.roles enable row level security;

create policy "Allow all access to roles"
on public.roles for all
using (true)
with check (true);
