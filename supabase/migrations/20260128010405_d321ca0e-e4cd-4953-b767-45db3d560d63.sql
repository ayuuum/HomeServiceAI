-- Add missing columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS line_reminder_hours_before integer[] DEFAULT '{24}';

-- Add missing column to bookings table  
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS line_reminder_sent_at timestamptz;

-- Create broadcasts table for bulk messaging
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  segment_filters jsonb DEFAULT '{}',
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create broadcast_recipients table
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies for broadcasts table
CREATE POLICY "Users can view their organization broadcasts"
ON public.broadcasts FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create broadcasts for their organization"
ON public.broadcasts FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization broadcasts"
ON public.broadcasts FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization broadcasts"
ON public.broadcasts FOR DELETE
USING (organization_id = get_user_organization_id());

-- RLS policies for broadcast_recipients table
CREATE POLICY "Users can view their organization broadcast recipients"
ON public.broadcast_recipients FOR SELECT
USING (broadcast_id IN (
  SELECT id FROM public.broadcasts WHERE organization_id = get_user_organization_id()
));

CREATE POLICY "Users can create broadcast recipients for their organization"
ON public.broadcast_recipients FOR INSERT
WITH CHECK (broadcast_id IN (
  SELECT id FROM public.broadcasts WHERE organization_id = get_user_organization_id()
));

CREATE POLICY "Users can update their organization broadcast recipients"
ON public.broadcast_recipients FOR UPDATE
USING (broadcast_id IN (
  SELECT id FROM public.broadcasts WHERE organization_id = get_user_organization_id()
));

-- Create updated_at trigger for broadcasts
CREATE TRIGGER update_broadcasts_updated_at
BEFORE UPDATE ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();