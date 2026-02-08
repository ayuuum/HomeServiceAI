-- Add survey_sent_at to bookings for tracking post-service survey delivery
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS survey_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add google_review_url to organizations for post-service Google review requests
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS google_review_url TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN bookings.survey_sent_at IS 'Timestamp when post-service survey was sent to customer';
COMMENT ON COLUMN organizations.google_review_url IS 'Google Business Profile review URL for collecting customer reviews';

-- Create index for survey cron job efficiency
CREATE INDEX IF NOT EXISTS idx_bookings_survey_pending 
ON bookings (updated_at, status) 
WHERE survey_sent_at IS NULL AND status = 'completed';
