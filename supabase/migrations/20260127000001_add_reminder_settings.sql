-- Add configurable reminder timing to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS line_reminder_hours_before INTEGER[] DEFAULT '{24}';

-- Add JSONB column to track which reminder timings have been sent per booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS line_reminders_sent JSONB DEFAULT '{}';
