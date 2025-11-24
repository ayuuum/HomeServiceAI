-- Create booking_services table for multiple services per booking
CREATE TABLE IF NOT EXISTS public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  service_title text NOT NULL,
  service_quantity integer NOT NULL DEFAULT 1,
  service_base_price integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_services
CREATE POLICY "Anyone can insert booking services"
  ON public.booking_services
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can view booking services"
  ON public.booking_services
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing data from bookings to booking_services
INSERT INTO public.booking_services (booking_id, service_id, service_title, service_quantity, service_base_price)
SELECT 
  b.id,
  b.service_id,
  s.title,
  b.service_quantity,
  s.base_price
FROM public.bookings b
JOIN public.services s ON b.service_id = s.id
WHERE b.service_id IS NOT NULL;

-- Remove old columns from bookings table
ALTER TABLE public.bookings 
  DROP COLUMN IF EXISTS service_id,
  DROP COLUMN IF EXISTS service_quantity;