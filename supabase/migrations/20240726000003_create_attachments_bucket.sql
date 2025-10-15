-- Create the storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', true, 52428800, array_cat(allowed_mime_types, ARRAY['image/jpeg', 'image/png', 'application/pdf']))
on conflict (id) do nothing;

-- Set up security policies for the bucket
-- 1. Anyone can view attachments
create policy "Anyone can view attachments" on storage.objects
for select using (
  bucket_id = 'attachments'
);

-- 2. Authenticated users can upload attachments
create policy "Authenticated users can upload attachments" on storage.objects
for insert to authenticated with check (
  bucket_id = 'attachments' and owner_id = auth.uid()
);

-- 3. Owners can delete their own attachments
create policy "Owners can delete their own attachments" on storage.objects
for delete to authenticated using (
  bucket_id = 'attachments' and owner_id = auth.uid()
);
