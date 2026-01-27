-- Create a new storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view (Public)
-- This allows displaying images in the admin dashboard without complex signed URLs
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-attachments' );

-- Policy: Only authenticated users (Service Role / Edge Function) can upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat-attachments' );

-- Policy: Allow updates/deletes for admin/service role (Optional but good for cleanup)
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'chat-attachments' );
