-- Add line_reminder_sent_at column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS line_reminder_sent_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN bookings.line_reminder_sent_at IS 'Timestamp when the LINE reminder message was sent';
