-- Atomic Trial Organization Creation Function
-- Created: 2025-11-16
-- Purpose: Ensure trial organization, users, and activities are created atomically
-- If ANY step fails, ALL changes are rolled back

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_trial_organization_atomic(JSONB, JSONB[], JSONB[]);

-- Create the atomic function
CREATE OR REPLACE FUNCTION create_trial_organization_atomic(
  org_data JSONB,
  users_data JSONB[],
  activities_data JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  user_record JSONB;
  activity_record JSONB;
  created_user_ids UUID[] := ARRAY[]::UUID[];
  created_activity_ids UUID[] := ARRAY[]::UUID[];
  new_user_id UUID;
  new_activity_id UUID;
  user_count INTEGER := 0;
  activity_count INTEGER := 0;
BEGIN
  -- Validate input data
  IF org_data IS NULL THEN
    RAISE EXCEPTION 'Organization data cannot be null';
  END IF;

  IF org_data->>'org_name' IS NULL OR org_data->>'org_name' = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  -- Step 1: Insert organization
  INSERT INTO trial_organizations (
    org_name,
    domain,
    account_manager_id,
    org_lifecycle_stage,
    trial_start_date,
    trial_end_date,
    org_url,
    logo_url,
    sales_poc_id,
    description,
    parent_company,
    contract_value,
    team_size,
    trial_duration_days,
    trial_status
  )
  VALUES (
    org_data->>'org_name',
    org_data->>'domain',
    (org_data->>'account_manager_id')::UUID,
    COALESCE(org_data->>'org_lifecycle_stage', 'prospect'),
    (org_data->>'trial_start_date')::DATE,
    (org_data->>'trial_end_date')::DATE,
    org_data->>'org_url',
    org_data->>'logo_url',
    (org_data->>'sales_poc_id')::UUID,
    org_data->>'description',
    org_data->>'parent_company',
    (org_data->>'contract_value')::NUMERIC,
    (org_data->>'team_size')::INTEGER,
    (org_data->>'trial_duration_days')::INTEGER,
    COALESCE(org_data->>'trial_status', 'requested')
  )
  RETURNING org_id INTO new_org_id;

  -- Step 2: Insert users (if provided)
  IF users_data IS NOT NULL AND array_length(users_data, 1) > 0 THEN
    FOREACH user_record IN ARRAY users_data
    LOOP
      -- Validate user data
      IF user_record->>'name' IS NULL OR user_record->>'name' = '' THEN
        RAISE EXCEPTION 'User name is required for all users';
      END IF;

      IF user_record->>'email' IS NULL OR user_record->>'email' = '' THEN
        RAISE EXCEPTION 'User email is required for all users';
      END IF;

      -- Insert user
      INSERT INTO trial_users (
        org_id,
        name,
        email,
        role,
        phone,
        current_stage,
        account_manager
      )
      VALUES (
        new_org_id,
        user_record->>'name',
        user_record->>'email',
        user_record->>'role',
        user_record->>'phone',
        COALESCE(user_record->>'current_stage', 'invited'),
        (org_data->>'account_manager_id')::UUID
      )
      RETURNING user_id INTO new_user_id;

      created_user_ids := array_append(created_user_ids, new_user_id);
      user_count := user_count + 1;
    END LOOP;
  END IF;

  -- Step 3: Insert activities/interactions (if provided)
  IF activities_data IS NOT NULL AND array_length(activities_data, 1) > 0 THEN
    FOREACH activity_record IN ARRAY activities_data
    LOOP
      -- Validate activity data
      IF activity_record->>'title' IS NULL OR activity_record->>'title' = '' THEN
        RAISE EXCEPTION 'Activity title is required for all activities';
      END IF;

      IF activity_record->>'interaction_type' IS NULL OR activity_record->>'interaction_type' = '' THEN
        RAISE EXCEPTION 'Activity interaction_type is required for all activities';
      END IF;

      -- Determine user_id (either specified or use first created user)
      new_user_id := NULL;
      IF activity_record->>'user_id' IS NOT NULL THEN
        new_user_id := (activity_record->>'user_id')::UUID;

        -- Verify user_id exists in created users
        IF new_user_id != ALL(created_user_ids) THEN
          RAISE EXCEPTION 'Specified user_id % not found in created users', new_user_id;
        END IF;
      ELSIF array_length(created_user_ids, 1) > 0 THEN
        -- Use first created user
        new_user_id := created_user_ids[1];
      ELSE
        RAISE EXCEPTION 'No users available for activity assignment';
      END IF;

      -- Insert activity
      INSERT INTO user_interactions (
        user_id,
        org_id,
        interaction_type,
        title,
        notes,
        conducted_by,
        interaction_date,
        duration_minutes
      )
      VALUES (
        new_user_id,
        new_org_id,
        activity_record->>'interaction_type',
        activity_record->>'title',
        activity_record->>'notes',
        activity_record->>'conducted_by',
        COALESCE((activity_record->>'interaction_date')::TIMESTAMP, NOW()),
        (activity_record->>'duration_minutes')::INTEGER
      )
      RETURNING interaction_id INTO new_activity_id;

      created_activity_ids := array_append(created_activity_ids, new_activity_id);
      activity_count := activity_count + 1;
    END LOOP;
  END IF;

  -- Return success result with all created IDs
  RETURN jsonb_build_object(
    'success', true,
    'org_id', new_org_id,
    'org_name', org_data->>'org_name',
    'created_user_count', user_count,
    'created_activity_count', activity_count,
    'user_ids', to_jsonb(created_user_ids),
    'activity_ids', to_jsonb(created_activity_ids),
    'expected_user_count', COALESCE(array_length(users_data, 1), 0),
    'expected_activity_count', COALESCE(array_length(activities_data, 1), 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error triggers automatic rollback
    RAISE EXCEPTION 'Failed to create trial organization atomically: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_trial_organization_atomic(JSONB, JSONB[], JSONB[]) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION create_trial_organization_atomic IS
'Atomically creates a trial organization with users and activities.
If any step fails, all changes are rolled back.
Returns JSON with created IDs and counts for verification.';
