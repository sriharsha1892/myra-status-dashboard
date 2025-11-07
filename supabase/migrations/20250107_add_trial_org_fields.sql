-- Add missing fields to trial_organizations table
-- These fields are now used in the organization detail form

-- Add sales_poc column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_organizations' AND column_name='sales_poc') THEN
        ALTER TABLE trial_organizations ADD COLUMN sales_poc TEXT;
        RAISE NOTICE 'Added sales_poc column';
    END IF;
END $$;

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_organizations' AND column_name='description') THEN
        ALTER TABLE trial_organizations ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;
END $$;

-- Add org_url column if it doesn't exist (may already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_organizations' AND column_name='org_url') THEN
        ALTER TABLE trial_organizations ADD COLUMN org_url TEXT;
        RAISE NOTICE 'Added org_url column';
    END IF;
END $$;

-- Add logo_url column if it doesn't exist (may already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_organizations' AND column_name='logo_url') THEN
        ALTER TABLE trial_organizations ADD COLUMN logo_url TEXT;
        RAISE NOTICE 'Added logo_url column';
    END IF;
END $$;

-- Add comments on the new columns
COMMENT ON COLUMN trial_organizations.sales_poc IS 'Sales point of contact for this organization';
COMMENT ON COLUMN trial_organizations.description IS 'Brief description of the organization';
COMMENT ON COLUMN trial_organizations.org_url IS 'Organization website URL';
COMMENT ON COLUMN trial_organizations.logo_url IS 'URL to organization logo image';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ trial_organizations fields added successfully!';
    RAISE NOTICE 'New fields: sales_poc, description, org_url, logo_url';
END $$;
