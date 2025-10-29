-- Create the attachments bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload files to the 'attachments' bucket
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'attachments' );

-- Allow authenticated users to view their own files
create policy "Allow individual read access"
on storage.objects for select
to authenticated
using ( auth.uid() = owner_id::uuid );

-- Allow authenticated users to delete their own files
create policy "Allow individual delete access"
on storage.objects for delete
to authenticated
using ( auth.uid() = owner_id::uuid );
