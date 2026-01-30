-- Create schedule_blocks table for blocking time slots
CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  block_time TEXT, -- NULL = all-day block, "09:00" = specific time slot
  block_type TEXT NOT NULL DEFAULT 'other' CHECK (block_type IN ('holiday', 'vacation', 'maintenance', 'other')),
  title TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_schedule_blocks_org_date ON public.schedule_blocks(organization_id, block_date);

-- Enable RLS
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their organization's blocks
CREATE POLICY "Users can view their organization blocks"
  ON public.schedule_blocks FOR SELECT
  USING (organization_id = get_user_organization_id());

-- RLS policy: Users can create blocks for their organization
CREATE POLICY "Users can create blocks for their organization"
  ON public.schedule_blocks FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- RLS policy: Users can update their organization's blocks
CREATE POLICY "Users can update their organization blocks"
  ON public.schedule_blocks FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- RLS policy: Users can delete their organization's blocks
CREATE POLICY "Users can delete their organization blocks"
  ON public.schedule_blocks FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Trigger for updated_at
CREATE TRIGGER update_schedule_blocks_updated_at
  BEFORE UPDATE ON public.schedule_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();