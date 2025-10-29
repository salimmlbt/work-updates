
-- Create the storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to view files in the attachments bucket
CREATE POLICY "Allow authenticated read access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Create policy to allow authenticated users to upload files to the attachments bucket
CREATE POLICY "Allow authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Create policy to allow authenticated users to update their own files
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = owner_uid)
WITH CHECK (bucket_id = 'attachments');

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = owner_uid);
