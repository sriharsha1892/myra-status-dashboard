-- Document Library System
-- Created: 2025-11-08
-- Purpose: Link-based resource library with glassmorphism UI

-- Global document categories
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- lucide icon name
  color TEXT, -- tailwind color for glass effect
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document library (hybrid: global + org-specific)
CREATE TABLE IF NOT EXISTS document_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES document_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  link_url TEXT NOT NULL, -- OneDrive or external link
  link_type TEXT DEFAULT 'onedrive', -- 'onedrive', 'google_drive', 'external'
  thumbnail_url TEXT,
  is_global BOOLEAN DEFAULT true, -- global resources vs org-specific
  trial_org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE, -- NULL for global
  tags TEXT[], -- flexible tagging
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource notes (logged to activity feed)
CREATE TABLE IF NOT EXISTS resource_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES document_library(id) ON DELETE CASCADE,
  trial_org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO document_categories (name, description, icon, color, sort_order) VALUES
('Onboarding', 'Getting started guides and initial setup resources', 'Rocket', 'blue', 1),
('Training', 'Video tutorials and training materials', 'GraduationCap', 'purple', 2),
('Technical Docs', 'API documentation and technical references', 'Code', 'green', 3),
('Best Practices', 'Industry best practices and use cases', 'Star', 'yellow', 4),
('Support', 'Troubleshooting guides and FAQs', 'LifeBuoy', 'red', 5),
('Templates', 'Report templates and sample workflows', 'FileText', 'indigo', 6),
('Legal', 'Terms of service, privacy policy, compliance docs', 'Scale', 'slate', 7),
('Case Studies', 'Success stories and customer examples', 'TrendingUp', 'emerald', 8)
ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_category ON document_library(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON document_library(trial_org_id);
CREATE INDEX IF NOT EXISTS idx_documents_global ON document_library(is_global);
CREATE INDEX IF NOT EXISTS idx_resource_notes_resource ON resource_notes(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_notes_org ON resource_notes(trial_org_id);

-- RLS Policies
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_notes ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Categories are viewable by everyone" ON document_categories
  FOR SELECT USING (true);

-- Authenticated users can view all documents (global + their org-specific)
CREATE POLICY "Users can view documents" ON document_library
  FOR SELECT USING (true);

-- Authenticated users can create documents
CREATE POLICY "Authenticated users can create documents" ON document_library
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own documents
CREATE POLICY "Users can update their own documents" ON document_library
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own documents
CREATE POLICY "Users can delete their own documents" ON document_library
  FOR DELETE USING (created_by = auth.uid());

-- Users can view all resource notes
CREATE POLICY "Users can view resource notes" ON resource_notes
  FOR SELECT USING (true);

-- Authenticated users can create notes
CREATE POLICY "Authenticated users can create notes" ON resource_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update/delete their own notes
CREATE POLICY "Users can update their own notes" ON resource_notes
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes" ON resource_notes
  FOR DELETE USING (created_by = auth.uid());

-- Comments
COMMENT ON TABLE document_library IS 'Hybrid document library with global and org-specific resources';
COMMENT ON TABLE resource_notes IS 'Notes attached to resources, logged to trial org activity feed';
COMMENT ON COLUMN document_library.is_global IS 'True for global resources, false for org-specific';
COMMENT ON COLUMN document_library.link_url IS 'OneDrive, Google Drive, or external link';
