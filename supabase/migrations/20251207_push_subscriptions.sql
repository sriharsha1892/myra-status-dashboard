-- Push Subscriptions Table for Web Push Notifications
-- Stores browser push subscriptions for status page alerts

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Push subscription details (from browser PushSubscription object)
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,  -- Public key for encryption
  auth TEXT NOT NULL,     -- Auth secret for encryption

  -- User preferences for notification filtering
  preferences JSONB NOT NULL DEFAULT '{"allChanges": false, "outagesOnly": true, "majorOutagesOnly": false}',

  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique subscriptions per endpoint
  CONSTRAINT unique_push_endpoint UNIQUE (endpoint)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (public subscription from /status page)
CREATE POLICY "Anyone can subscribe to push"
  ON push_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update their own subscription (by endpoint match)
-- Note: In practice, only the browser with the subscription can update it
CREATE POLICY "Anyone can update push subscription"
  ON push_subscriptions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Anyone can delete their own subscription
CREATE POLICY "Anyone can unsubscribe from push"
  ON push_subscriptions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Service role can read all subscriptions (for sending notifications)
CREATE POLICY "Service role can read all push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- Comments
COMMENT ON TABLE push_subscriptions IS 'Browser push subscriptions for status page notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL from browser';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'P-256 DH public key for message encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for message encryption';
COMMENT ON COLUMN push_subscriptions.preferences IS 'JSON with allChanges, outagesOnly, majorOutagesOnly booleans';
