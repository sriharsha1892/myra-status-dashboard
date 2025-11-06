-- Email Threading Tables
CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  html TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Integration Tables
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Ticket Calendar Events
CREATE TABLE IF NOT EXISTS public.ticket_calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_threads_ticket_id ON public.email_threads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_message_id ON public.email_threads(message_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_timestamp ON public.email_threads(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON public.calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON public.calendar_integrations(provider);

CREATE INDEX IF NOT EXISTS idx_ticket_calendar_events_ticket_id ON public.ticket_calendar_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_calendar_events_user_id ON public.ticket_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_calendar_events_start_time ON public.ticket_calendar_events(start_time);

-- RLS Policies for email_threads
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email threads for accessible tickets"
  ON public.email_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = email_threads.ticket_id
    )
  );

CREATE POLICY "System can insert email threads"
  ON public.email_threads
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for calendar_integrations
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar integrations"
  ON public.calendar_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integrations"
  ON public.calendar_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integrations"
  ON public.calendar_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar integrations"
  ON public.calendar_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ticket_calendar_events
ALTER TABLE public.ticket_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calendar events for accessible tickets"
  ON public.ticket_calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_calendar_events.ticket_id
    )
  );

CREATE POLICY "Users can insert calendar events for accessible tickets"
  ON public.ticket_calendar_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_calendar_events.ticket_id
    )
  );

CREATE POLICY "Users can update their own calendar events"
  ON public.ticket_calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
  ON public.ticket_calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_threads_updated_at BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_calendar_events_updated_at BEFORE UPDATE ON public.ticket_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
