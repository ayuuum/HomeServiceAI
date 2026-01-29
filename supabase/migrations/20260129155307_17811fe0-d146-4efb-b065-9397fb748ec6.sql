-- 第一希望
ALTER TABLE public.bookings ADD COLUMN preference1_date DATE;
ALTER TABLE public.bookings ADD COLUMN preference1_time TEXT;

-- 第二希望
ALTER TABLE public.bookings ADD COLUMN preference2_date DATE;
ALTER TABLE public.bookings ADD COLUMN preference2_time TEXT;

-- 第三希望
ALTER TABLE public.bookings ADD COLUMN preference3_date DATE;
ALTER TABLE public.bookings ADD COLUMN preference3_time TEXT;

-- 承認された希望番号（1, 2, or 3）
ALTER TABLE public.bookings ADD COLUMN approved_preference INTEGER;