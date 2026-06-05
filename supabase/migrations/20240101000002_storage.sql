-- ---------------------------------------------------------------------------
-- Storage Buckets
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-images', 'profile-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('rider-documents', 'rider-documents', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('proof-of-delivery', 'proof-of-delivery', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

-- Profile images: users manage own
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Profile images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Rider documents: private
CREATE POLICY "Riders can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'rider-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Riders can view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'rider-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Proof of delivery
CREATE POLICY "Riders can upload proof of delivery"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-of-delivery'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'rider')
  );

CREATE POLICY "Order parties can view proof of delivery"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proof-of-delivery'
    AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR auth.uid() IS NOT NULL
    )
  );

-- Chat attachments
CREATE POLICY "Users can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view chat attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );
