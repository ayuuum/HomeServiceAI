-- Broadcasts table: stores each broadcast campaign
CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  segment_filters JSONB NOT NULL DEFAULT '{}',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Broadcast recipients: tracks each recipient and delivery status
CREATE TABLE public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_broadcasts_organization_id ON public.broadcasts(organization_id);
CREATE INDEX idx_broadcasts_status ON public.broadcasts(status);
CREATE INDEX idx_broadcasts_created_at ON public.broadcasts(created_at DESC);
CREATE INDEX idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_status ON public.broadcast_recipients(status);

-- Enable RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcasts
CREATE POLICY "Users can view own org broadcasts"
  ON public.broadcasts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create broadcasts for own org"
  ON public.broadcasts FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org broadcasts"
  ON public.broadcasts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS Policies for broadcast_recipients
CREATE POLICY "Users can view own org broadcast recipients"
  ON public.broadcast_recipients FOR SELECT
  USING (broadcast_id IN (
    SELECT id FROM public.broadcasts WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert own org broadcast recipients"
  ON public.broadcast_recipients FOR INSERT
  WITH CHECK (broadcast_id IN (
    SELECT id FROM public.broadcasts WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access broadcasts"
  ON public.broadcasts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access broadcast_recipients"
  ON public.broadcast_recipients FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
