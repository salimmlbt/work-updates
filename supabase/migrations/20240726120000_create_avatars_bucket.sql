
-- Create avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create policy for public access to avatars
create policy "Public Access for Avatars"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Create policy for authenticated users to upload avatars
create policy "Authenticated Upload for Avatars"
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
