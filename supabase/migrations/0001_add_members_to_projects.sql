-- Add the 'members' column to the 'projects' table
alter table public.projects
add column members uuid[] null;

-- Enable Row Level Security for the 'projects' table if it's not already enabled
alter table public.projects enable row level security;

-- Drop existing policies if they exist to avoid conflicts
drop policy if exists "Allow authenticated users to view projects" on public.projects;
drop policy if exists "Allow authenticated users to manage projects" on public.projects;

-- Create a policy to allow any authenticated user to view all projects
create policy "Allow authenticated users to view projects" on public.projects for
select using (auth.role() = 'authenticated');

-- Create a policy to allow any authenticated user to insert, update, or delete projects
create policy "Allow authenticated users to manage projects" on public.projects for all using (auth.role() = 'authenticated');
