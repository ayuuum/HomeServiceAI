-- Add read_at column to line_messages table for tracking read status
ALTER TABLE public.line_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add UPDATE policy so users can mark messages as read
CREATE POLICY "Users can update messages for their organization"
ON public.line_messages
FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());