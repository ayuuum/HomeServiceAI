-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL,           -- 'new_booking', 'booking_cancelled', 'line_message'
  title TEXT NOT NULL,          -- Notification title
  message TEXT,                 -- Detail message
  
  -- Related resource
  resource_type TEXT,           -- 'booking', 'customer', 'line_message'
  resource_id UUID,             -- Related resource ID
  
  -- State management
  read_at TIMESTAMPTZ,          -- Read timestamp (NULL = unread)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient unread notification queries
CREATE INDEX idx_notifications_org_unread 
  ON public.notifications (organization_id, created_at DESC) 
  WHERE read_at IS NULL;

-- Index for general queries
CREATE INDEX idx_notifications_org_created 
  ON public.notifications (organization_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org notifications"
  ON public.notifications FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org notifications"
  ON public.notifications FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert notifications for their org"
  ON public.notifications FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Allow anonymous insert for edge functions (booking creation)
CREATE POLICY "Anyone can insert notifications with org"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;