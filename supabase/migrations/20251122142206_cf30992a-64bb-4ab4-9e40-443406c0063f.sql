-- user_rolesテーブルのRLSポリシーを追加
-- 誰でも自分のロールを確認できる
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- 管理者のみロールを挿入・更新・削除できる
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));