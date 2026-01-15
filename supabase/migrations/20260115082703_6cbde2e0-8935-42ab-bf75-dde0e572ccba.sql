-- Add LINE configuration columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS line_channel_token TEXT,
ADD COLUMN IF NOT EXISTS line_channel_secret TEXT,
ADD COLUMN IF NOT EXISTS line_bot_user_id TEXT;

-- Create line_messages table for chat history
CREATE TABLE public.line_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    line_user_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    line_message_id TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_line_messages_organization_id ON public.line_messages(organization_id);
CREATE INDEX idx_line_messages_customer_id ON public.line_messages(customer_id);
CREATE INDEX idx_line_messages_line_user_id ON public.line_messages(line_user_id);
CREATE INDEX idx_line_messages_sent_at ON public.line_messages(sent_at DESC);

-- Enable RLS
ALTER TABLE public.line_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for line_messages
CREATE POLICY "Users can view their organization messages"
ON public.line_messages
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert messages for their organization"
ON public.line_messages
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

-- Service role can insert (for webhook)
CREATE POLICY "Service role can insert messages"
ON public.line_messages
FOR INSERT
WITH CHECK (true);

-- Enable realtime for line_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.line_messages;