-- Add new columns to org_product_roadmap table for enhanced functionality
-- This migration adds version, category, notes, owner_id, created_by fields

-- First, add new values to the ENUM types if they exist
-- Add 'suggested' to roadmap_status enum (only if the type exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'suggested' AND enumtypid = 'roadmap_status'::regtype) THEN
            ALTER TYPE roadmap_status ADD VALUE 'suggested';
        END IF;
    END IF;
END $$;

-- Add 'account_manager' to source_type enum if it exists, otherwise skip
DO $$
BEGIN
    -- Check if there's an enum type for source_type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_source_type') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'account_manager' AND enumtypid = 'roadmap_source_type'::regtype) THEN
            ALTER TYPE roadmap_source_type ADD VALUE 'account_manager';
        END IF;
    END IF;
END $$;

-- Add version column for tracking feature versions (v1, v2, v3, etc.)
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS version TEXT;

-- Add category column for organizing features by type (Product, Agent, Sales, UX, etc.)
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add notes column for detailed comments and discussions
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add owner_id column for proper user assignment
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Add created_by column to track who created the roadmap item
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for faster filtering by version and category
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_version ON org_product_roadmap(version);
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_category ON org_product_roadmap(category);
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_owner_id ON org_product_roadmap(owner_id);
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_created_by ON org_product_roadmap(created_by);

-- Add comment to table describing the enhancements
COMMENT ON COLUMN org_product_roadmap.version IS 'Feature version (e.g., v1, v2, v3) for organizing roadmap by release';
COMMENT ON COLUMN org_product_roadmap.category IS 'Feature category (e.g., Product, Agent, Sales, UX) for organizing by type';
COMMENT ON COLUMN org_product_roadmap.notes IS 'Detailed notes and comments about the roadmap item';
COMMENT ON COLUMN org_product_roadmap.owner_id IS 'User ID of the assigned owner';
COMMENT ON COLUMN org_product_roadmap.created_by IS 'User ID of the person who created this roadmap item';
