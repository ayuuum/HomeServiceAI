-- user_roles テーブルのRLSを有効化
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- user_roles のRLSポリシー
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "HQ admins can manage all roles"
ON user_roles FOR ALL
USING (has_role(auth.uid(), 'hq_admin'))
WITH CHECK (has_role(auth.uid(), 'hq_admin'));