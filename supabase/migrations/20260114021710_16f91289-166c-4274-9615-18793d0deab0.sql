-- 1. auth.users から on_user_created_assign_role トリガーを削除
DROP TRIGGER IF EXISTS on_user_created_assign_role ON auth.users;

-- 2. assign_default_role 関数を削除（CASCADEで依存オブジェクトも削除）
DROP FUNCTION IF EXISTS public.assign_default_role() CASCADE;