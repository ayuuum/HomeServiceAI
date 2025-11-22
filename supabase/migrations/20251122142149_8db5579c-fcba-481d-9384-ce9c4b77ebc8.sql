-- 管理者ロールのenumを作成
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ユーザーロールテーブルを作成
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- RLSを有効化
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 管理者チェック関数（SECURITY DEFINER）
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 予約テーブルを作成
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  service_quantity INTEGER NOT NULL DEFAULT 1,
  selected_date DATE NOT NULL,
  selected_time TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  diagnosis_has_parking BOOLEAN,
  diagnosis_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 予約オプションの中間テーブル
CREATE TABLE public.booking_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.service_options(id) ON DELETE CASCADE NOT NULL,
  option_title TEXT NOT NULL,
  option_price INTEGER NOT NULL,
  option_quantity INTEGER NOT NULL DEFAULT 1
);

-- RLSポリシー設定
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_options ENABLE ROW LEVEL SECURITY;

-- 誰でも予約を作成できる
CREATE POLICY "Anyone can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (true);

-- 誰でも予約を閲覧できる
CREATE POLICY "Anyone can view bookings"
ON public.bookings FOR SELECT
USING (true);

-- 管理者のみ予約を更新できる
CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 管理者のみ予約を削除できる
CREATE POLICY "Admins can delete bookings"
ON public.bookings FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- booking_optionsのポリシー
CREATE POLICY "Anyone can insert booking options"
ON public.booking_options FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view booking options"
ON public.booking_options FOR SELECT
USING (true);

-- updated_atトリガー
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- リアルタイム有効化
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_options;

-- servicesテーブルに割引ルールのJSON列を追加
ALTER TABLE public.services
ADD COLUMN quantity_discounts JSONB DEFAULT '[]'::jsonb;