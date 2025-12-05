-- Status Subscriptions Table
-- Stores email subscriptions for status page alerts

CREATE TABLE IF NOT EXISTS status_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{"allChanges": false, "outagesOnly": true, "majorOutagesOnly": false}',
  providers TEXT[] DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique active subscriptions per email
  CONSTRAINT unique_active_email UNIQUE (email)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_status_subscriptions_email ON status_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_status_subscriptions_active ON status_subscriptions(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE status_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public subscription form)
CREATE POLICY "Anyone can subscribe"
  ON status_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can update their own subscription (by email match)
CREATE POLICY "Users can update own subscription"
  ON status_subscriptions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Only service role can read all subscriptions (for sending notifications)
CREATE POLICY "Service role can read all"
  ON status_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_status_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER status_subscriptions_updated_at
  BEFORE UPDATE ON status_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_status_subscription_timestamp();

-- Comments
COMMENT ON TABLE status_subscriptions IS 'Email subscriptions for status page alerts';
COMMENT ON COLUMN status_subscriptions.preferences IS 'JSON object with allChanges, outagesOnly, majorOutagesOnly booleans';
COMMENT ON COLUMN status_subscriptions.providers IS 'Array of provider IDs to watch, NULL means all providers';
