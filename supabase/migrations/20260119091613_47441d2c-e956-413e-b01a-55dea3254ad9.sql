-- Create storage bucket for challenge files
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-files', 'challenge-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view challenge files (public bucket)
CREATE POLICY "Challenge files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-files');

-- Allow authenticated admins to upload files
CREATE POLICY "Admins can upload challenge files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'challenge-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to update files
CREATE POLICY "Admins can update challenge files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'challenge-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to delete files
CREATE POLICY "Admins can delete challenge files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'challenge-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);