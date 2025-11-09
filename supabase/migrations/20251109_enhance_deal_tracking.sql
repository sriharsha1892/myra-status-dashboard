-- Migration: Enhance Deal Tracking with Deferred Status, Opportunity Value, and Follow-up Dates
-- Date: 2025-11-09
-- Description:
--   1. Add 'deferred' to deal_status enum (or create enum if it doesn't exist)
--   2. Add opportunity_value field for initial estimates
--   3. Add expected_followup_date for deferred deals
--   4. Update existing future_prospect records to deferred
--   5. Rename future_prospect_reason to deferred_reason

-- Step 1: Add new columns to org_deal_tracking table (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'org_deal_tracking'
    ) THEN
        ALTER TABLE org_deal_tracking
        ADD COLUMN IF NOT EXISTS opportunity_value DECIMAL(12, 2),
        ADD COLUMN IF NOT EXISTS expected_followup_date DATE;
    END IF;
END $$;

-- Step 2: Create or update the deal_status enum type
DO $$
BEGIN
    -- Check if the type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_status') THEN
        -- Type doesn't exist, create it with all values including 'deferred'
        CREATE TYPE deal_status AS ENUM (
            'prospect',
            'negotiating',
            'won',
            'lost',
            'future_prospect',
            'deferred'
        );
    ELSE
        -- Type exists, check if 'deferred' value exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'deferred'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'deal_status')
        ) THEN
            -- Add 'deferred' value to existing enum
            ALTER TYPE deal_status ADD VALUE 'deferred';
        END IF;
    END IF;
END $$;

-- Step 3: Update all existing 'future_prospect' records to 'deferred'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'org_deal_tracking'
    ) THEN
        UPDATE org_deal_tracking
        SET deal_status = 'deferred'
        WHERE deal_status = 'future_prospect';
    END IF;
END $$;

-- Step 4: Rename future_prospect_reason to deferred_reason for clarity
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_deal_tracking'
        AND column_name = 'future_prospect_reason'
    ) THEN
        ALTER TABLE org_deal_tracking
        RENAME COLUMN future_prospect_reason TO deferred_reason;
    END IF;
END $$;

-- Step 5: Add comments for documentation (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'org_deal_tracking'
    ) THEN
        COMMENT ON COLUMN org_deal_tracking.opportunity_value IS 'Estimated deal value at the start of opportunity (before closure)';
        COMMENT ON COLUMN org_deal_tracking.expected_followup_date IS 'Expected date to follow up for deferred deals';
        COMMENT ON COLUMN org_deal_tracking.deferred_reason IS 'Reason why deal was deferred to future';
    END IF;
END $$;

-- Step 6: Create index on expected_followup_date for efficient querying of upcoming follow-ups
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'org_deal_tracking'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_org_deal_tracking_followup_date
        ON org_deal_tracking(expected_followup_date)
        WHERE deal_status = 'deferred' AND expected_followup_date IS NOT NULL;
    END IF;
END $$;

-- Note: 'future_prospect' will remain as a valid enum value for backward compatibility,
-- but the application will use 'deferred' going forward.
