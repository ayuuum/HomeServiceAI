-- Add read_at column to line_messages for tracking read status
ALTER TABLE line_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create index for faster unread message queries
CREATE INDEX IF NOT EXISTS idx_line_messages_read_at ON line_messages (customer_id, direction, read_at) WHERE direction = 'inbound' AND read_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN line_messages.read_at IS 'Timestamp when the message was read by admin. NULL means unread.';
