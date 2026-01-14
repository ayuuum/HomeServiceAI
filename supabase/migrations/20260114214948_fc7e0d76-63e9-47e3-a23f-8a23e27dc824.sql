-- 既存の RESTRICTIVE ポリシーを削除
DROP POLICY IF EXISTS "Anyone can create customers with org" ON public.customers;

-- 新しい PERMISSIVE ポリシーを作成（未ログインユーザーでも顧客レコードを作成可能に）
CREATE POLICY "Anyone can create customers with org" 
ON public.customers 
FOR INSERT 
TO public
WITH CHECK (true);