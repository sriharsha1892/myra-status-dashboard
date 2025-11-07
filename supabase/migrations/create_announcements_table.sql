-- Create announcements table for platform-wide announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    announcement_type TEXT NOT NULL CHECK (announcement_type IN ('feature', 'update', 'maintenance', 'alert')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    posted_by TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active announcements
CREATE POLICY "Anyone can view active announcements"
    ON public.announcements
    FOR SELECT
    USING (status = 'active');

-- Policy: Authenticated users can view all announcements
CREATE POLICY "Authenticated users can view all announcements"
    ON public.announcements
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert announcements (admin check in app)
CREATE POLICY "Authenticated users can insert announcements"
    ON public.announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Authenticated users can update announcements (admin check in app)
CREATE POLICY "Authenticated users can update announcements"
    ON public.announcements
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Authenticated users can delete announcements (admin check in app)
CREATE POLICY "Authenticated users can delete announcements"
    ON public.announcements
    FOR DELETE
    TO authenticated
    USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row updates
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_announcements_updated_at();
