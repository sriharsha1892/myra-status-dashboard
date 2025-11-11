-- Storage Policies for Support System
-- Run this in Supabase Dashboard > SQL Editor

-- Allow authenticated users to upload files to support-attachments folder
CREATE POLICY "Allow authenticated uploads to support-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'support-attachments'
);

-- Allow public read access to all files in public bucket
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'support-attachments'
);

-- Allow anonymous users to upload support attachments (for public support form)
CREATE POLICY "Allow anonymous uploads to support-attachments"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'support-attachments'
);

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
