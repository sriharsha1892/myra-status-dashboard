-- Migration: Auto-reassignment trigger for deleted Account Managers
-- Priority: MEDIUM - Prevents orphaned trial assignments
-- Date: 2025-01-13

-- When an Account Manager is deleted, automatically reassign their trials
-- to the first super_admin in the same company

-- Create trigger function
CREATE OR REPLACE FUNCTION reassign_trials_on_am_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_fallback_admin_id UUID;
BEGIN
  -- Only process if the deleted user was an Account Manager
  IF OLD.role = 'Account Manager' THEN

    -- Find the first super_admin in the same company
    SELECT id INTO v_fallback_admin_id
    FROM users
    WHERE parent_company = OLD.parent_company
      AND is_super_admin = true
      AND id != OLD.id  -- Exclude the deleted user
    ORDER BY created_at ASC
    LIMIT 1;

    -- If no super_admin found in the company, find any Admin in the company
    IF v_fallback_admin_id IS NULL THEN
      SELECT id INTO v_fallback_admin_id
      FROM users
      WHERE parent_company = OLD.parent_company
        AND role = 'Admin'
        AND id != OLD.id  -- Exclude the deleted user
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- If a fallback admin was found, reassign all trials
    IF v_fallback_admin_id IS NOT NULL THEN
      UPDATE trial_organizations
      SET
        account_manager_id = v_fallback_admin_id,
        updated_at = NOW()
      WHERE account_manager_id = OLD.id;

      -- Log the reassignment
      RAISE NOTICE 'Reassigned % trial(s) from deleted Account Manager % (%) to user %',
        (SELECT COUNT(*) FROM trial_organizations WHERE account_manager_id = v_fallback_admin_id),
        OLD.full_name,
        OLD.email,
        v_fallback_admin_id;
    ELSE
      -- No admin found - set account_manager_id to NULL
      UPDATE trial_organizations
      SET
        account_manager_id = NULL,
        updated_at = NOW()
      WHERE account_manager_id = OLD.id;

      RAISE WARNING 'No admin found in company % to reassign trials from deleted Account Manager % (%)',
        OLD.parent_company,
        OLD.full_name,
        OLD.email;
    END IF;

  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_reassign_trials_on_am_deletion ON users;

CREATE TRIGGER trigger_reassign_trials_on_am_deletion
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION reassign_trials_on_am_deletion();

-- Add comment for documentation
COMMENT ON FUNCTION reassign_trials_on_am_deletion() IS 'Automatically reassigns trial organizations to a fallback admin when an Account Manager is deleted. Priority: 1) Super admins in same company, 2) Admins in same company, 3) Set to NULL if no admin found.';

-- Summary:
-- When an Account Manager is deleted:
-- 1. Find first super_admin in same company (by created_at)
-- 2. If no super_admin, find first Admin in same company
-- 3. If no admin found, set account_manager_id to NULL
-- 4. All assigned trials are automatically reassigned
-- 5. Logs reassignment action for audit purposes
