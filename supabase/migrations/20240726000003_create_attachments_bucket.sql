-- Create the 'attachments' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload files to the 'attachments' bucket
create policy "Authenticated users can upload attachments"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'attachments' );

-- Allow authenticated users to view files they own in the 'attachments' bucket
create policy "Authenticated users can view their own attachments"
on storage.objects for select
to authenticated
using ( bucket_id = 'attachments' and auth.uid() = owner_id );

-- Allow authenticated users to delete files they own from the 'attachments' bucket
create policy "Authenticated users can delete their own attachments"
on storage.objects for delete
to authenticated
using ( bucket_id = 'attachments' and auth.uid() = owner_id );
