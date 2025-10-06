
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  avatar text not null,
  industry text not null,
  contact text not null,
  whatsapp text,
  projects_count integer,
  tasks_count integer
);
