-- Add postal_code column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add address columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_postal_code TEXT;