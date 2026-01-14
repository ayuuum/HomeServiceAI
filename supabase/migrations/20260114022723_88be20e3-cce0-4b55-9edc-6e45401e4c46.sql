-- サービス画像用バケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true);

-- アップロードポリシー（認証済みユーザーのみ）
CREATE POLICY "Authenticated users can upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- 閲覧ポリシー（誰でも閲覧可能）
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-images');

-- 削除ポリシー（認証済みユーザーのみ）
CREATE POLICY "Authenticated users can delete service images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-images');