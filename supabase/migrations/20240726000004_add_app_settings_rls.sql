
-- Enable RLS for the app_settings table if it's not already enabled.
alter table public.app_settings enable row level security;

-- Drop existing policies if they exist, to ensure a clean slate.
drop policy if exists "Allow admins to manage app settings" on public.app_settings;

-- Create the new policy that allows users with the 'Falaq Admin' role to do everything.
create policy "Allow admins to manage app settings"
on public.app_settings
for all
using (
  (get_my_claim('user_role') ->> 'name') = 'Falaq Admin'
)
with check (
  (get_my_claim('user_role') ->> 'name') = 'Falaq Admin'
);

-- Note: The get_my_claim function is a custom helper that should exist in your DB.
-- If it doesn't, you would define it to get claims from the JWT, like this:
create or replace function public.get_my_claim(claim_name text)
returns jsonb
language sql
stable
as $$
  select
    coalesce(
        current_setting('request.jwt.claims', true)::jsonb -> claim_name,
        null
    );
$$;
