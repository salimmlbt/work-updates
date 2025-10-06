
CREATE POLICY "Allow authenticated delete on avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' );
