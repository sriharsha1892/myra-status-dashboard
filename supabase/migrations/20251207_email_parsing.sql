-- ============================================
-- Email Parsing Schema
-- Parse and analyze email threads for insights
-- ============================================

-- Parsed emails table
CREATE TABLE IF NOT EXISTS parsed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw content
  raw_content TEXT NOT NULL,
  message_id TEXT UNIQUE,

  -- Email headers
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  subject TEXT,
  email_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  body_text TEXT,

  -- Linked org (matched or manually linked)
  org_id UUID REFERENCES trial_organizations(org_id),

  -- AI-extracted insights
  extracted_entities JSONB DEFAULT '{}',  -- orgs, people, competitors
  extracted_actions JSONB DEFAULT '[]',   -- action items found
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'urgent')),
  summary TEXT,
  key_topics TEXT[] DEFAULT '{}',

  -- Metadata
  ingestion_method TEXT NOT NULL CHECK (ingestion_method IN ('paste', 'webhook', 'forward')),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email action items extracted from parsed emails
CREATE TABLE IF NOT EXISTS email_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to email
  parsed_email_id UUID NOT NULL REFERENCES parsed_emails(id) ON DELETE CASCADE,

  -- Action details
  action_text TEXT NOT NULL,
  action_type TEXT CHECK (action_type IN ('follow_up', 'meeting', 'task', 'deadline', 'question', 'other')),
  assignee TEXT,  -- Extracted name of person responsible
  due_date DATE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),

  -- Conversion to other entities
  converted_to_followup_id UUID,  -- If converted to a follow_up
  converted_to_ticket_id UUID,    -- If converted to a ticket

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email contacts extracted (people mentioned)
CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to email
  parsed_email_id UUID NOT NULL REFERENCES parsed_emails(id) ON DELETE CASCADE,

  -- Contact details
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,  -- CTO, VP Sales, etc.
  company TEXT,

  -- Matched to existing user
  matched_user_id UUID REFERENCES trial_users(user_id),

  -- Classification
  contact_type TEXT CHECK (contact_type IN ('sender', 'recipient', 'mentioned', 'cc')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parsed_emails_org ON parsed_emails(org_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_status ON parsed_emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_date ON parsed_emails(email_date);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_created_by ON parsed_emails(created_by);
CREATE INDEX IF NOT EXISTS idx_email_action_items_email ON email_action_items(parsed_email_id);
CREATE INDEX IF NOT EXISTS idx_email_action_items_status ON email_action_items(status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_email ON email_contacts(parsed_email_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_matched ON email_contacts(matched_user_id);

-- Full-text search on email content
CREATE INDEX IF NOT EXISTS idx_parsed_emails_body_search ON parsed_emails USING gin(to_tsvector('english', COALESCE(body_text, '')));
CREATE INDEX IF NOT EXISTS idx_parsed_emails_subject_search ON parsed_emails USING gin(to_tsvector('english', COALESCE(subject, '')));

-- RLS Policies
ALTER TABLE parsed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view emails they created or related to their orgs
CREATE POLICY "Users can view their own emails"
  ON parsed_emails
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.role = 'Admin' OR users.is_super_admin = true)
      )
    )
  );

-- Users can create emails
CREATE POLICY "Authenticated users can create emails"
  ON parsed_emails
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own emails
CREATE POLICY "Users can update their own emails"
  ON parsed_emails
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.role = 'Admin' OR users.is_super_admin = true)
      )
    )
  );

-- Action items follow email permissions
CREATE POLICY "Action items follow email permissions"
  ON email_action_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parsed_emails
      WHERE parsed_emails.id = email_action_items.parsed_email_id
      AND (
        parsed_emails.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND (users.role = 'Admin' OR users.is_super_admin = true)
        )
      )
    )
  );

-- Contacts follow email permissions
CREATE POLICY "Contacts follow email permissions"
  ON email_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parsed_emails
      WHERE parsed_emails.id = email_contacts.parsed_email_id
      AND (
        parsed_emails.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND (users.role = 'Admin' OR users.is_super_admin = true)
        )
      )
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access emails"
  ON parsed_emails
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access action items"
  ON email_action_items
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access contacts"
  ON email_contacts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger
CREATE TRIGGER update_parsed_emails_updated_at
  BEFORE UPDATE ON parsed_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_action_items_updated_at
  BEFORE UPDATE ON email_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE parsed_emails IS 'Emails parsed for sales intelligence';
COMMENT ON TABLE email_action_items IS 'Action items extracted from parsed emails';
COMMENT ON TABLE email_contacts IS 'Contacts mentioned in parsed emails';
