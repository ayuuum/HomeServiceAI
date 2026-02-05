-- =====================================================
-- Stripe Payment Integration - Phase 1: Schema Changes
-- =====================================================

-- 1. Add payment-related columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS checkout_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_amount integer;

-- 2. Add Stripe Connect columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_account_status text DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS payment_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checkout_expiry_hours integer DEFAULT 72,
ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2) DEFAULT 7.00;

-- 3. Add prepayment flag to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS requires_prepayment boolean DEFAULT false;

-- 4. Create stripe_webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  payload jsonb,
  organization_id uuid REFERENCES public.organizations(id)
);

-- Enable RLS on stripe_webhook_events
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only authenticated users can view their org's webhook events
CREATE POLICY "Users can view their org webhook events"
ON public.stripe_webhook_events
FOR SELECT
USING (organization_id = get_user_organization_id());

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_checkout_expires_at ON public.bookings(checkout_expires_at);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id ON public.stripe_webhook_events(stripe_event_id);