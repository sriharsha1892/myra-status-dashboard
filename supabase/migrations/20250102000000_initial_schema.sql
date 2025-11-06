-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  trial_start_date DATE NOT NULL,
  trial_end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  organization TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Security',
    'Tool Functioning',
    'Feature Set',
    'Usage',
    'Requests',
    'Data Quality',
    'Performance',
    'Feature Request',
    'Other'
  )),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Waiting on User', 'Resolved', 'Closed')),
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create ticket_comments table
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tickets_organization ON tickets(organization);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- Create sequence for ticket numbers
CREATE SEQUENCE ticket_number_seq START 1;

-- Function to generate sequential ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  ticket_num TEXT;
BEGIN
  next_number := nextval('ticket_number_seq');
  ticket_num := 'MYR-' || LPAD(next_number::TEXT, 4, '0');
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_timestamp
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set resolved_at when status changes to Resolved or Closed
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('Resolved', 'Closed') AND OLD.status NOT IN ('Resolved', 'Closed') THEN
    NEW.resolved_at = NOW();
  ELSIF NEW.status NOT IN ('Resolved', 'Closed') AND OLD.status IN ('Resolved', 'Closed') THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_resolved_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_resolved_at();

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Everyone can read organizations
CREATE POLICY "Organizations are viewable by authenticated users"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete organizations (we'll handle this via service role)
CREATE POLICY "Organizations are manageable by admins"
  ON organizations FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'Admin');

-- RLS Policies for tickets
-- AM users can insert tickets
CREATE POLICY "AM users can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('AM', 'Team', 'Admin')
  );

-- Team and Admin can view all tickets
CREATE POLICY "Team and Admin can view all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- Team and Admin can update tickets
CREATE POLICY "Team and Admin can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- Only Admin can delete tickets
CREATE POLICY "Only Admin can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- RLS Policies for ticket_comments
-- Team and Admin can view all comments
CREATE POLICY "Team and Admin can view comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- Team and Admin can insert comments
CREATE POLICY "Team and Admin can create comments"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- Only comment author or Admin can update/delete comments
CREATE POLICY "Users can update their own comments"
  ON ticket_comments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

CREATE POLICY "Users can delete their own comments"
  ON ticket_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- Create a function to get ticket statistics
CREATE OR REPLACE FUNCTION get_ticket_stats(user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_open', COUNT(*) FILTER (WHERE status NOT IN ('Resolved', 'Closed')),
    'assigned_to_me', COUNT(*) FILTER (WHERE assigned_to = user_id AND status NOT IN ('Resolved', 'Closed')),
    'new_tickets', COUNT(*) FILTER (WHERE status = 'New'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'In Progress'),
    'waiting_on_user', COUNT(*) FILTER (WHERE status = 'Waiting on User'),
    'by_category', json_object_agg(
      category,
      COUNT(*)
    ) FILTER (WHERE status NOT IN ('Resolved', 'Closed'))
  )
  INTO result
  FROM tickets;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SEQUENCE ticket_number_seq TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON tickets TO authenticated;
GRANT ALL ON ticket_comments TO authenticated;
