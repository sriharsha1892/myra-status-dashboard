-- Migration: Add platform queries support to atomic trial org creation
-- Date: 2025-11-17
-- Description: Extend create_trial_organization_atomic to handle platform queries

-- Drop existing function
DROP FUNCTION IF EXISTS create_trial_organization_atomic(jsonb, jsonb, jsonb);

-- Recreate with queries_data parameter
CREATE OR REPLACE FUNCTION create_trial_organization_atomic(
  org_data jsonb,
  users_data jsonb DEFAULT '[]'::jsonb,
  activities_data jsonb DEFAULT '[]'::jsonb,
  queries_data jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_created_user_count int := 0;
  v_created_activity_count int := 0;
  v_created_query_count int := 0;
  v_expected_user_count int;
  v_expected_activity_count int;
  v_expected_query_count int;
  v_user_ids uuid[] := ARRAY[]::uuid[];
  v_activity_ids uuid[] := ARRAY[]::uuid[];
  v_query_ids uuid[] := ARRAY[]::uuid[];
  v_user_record record;
  v_activity_record record;
  v_query_record record;
  v_user_id uuid;
  v_activity_id uuid;
  v_query_id uuid;
BEGIN
  -- Calculate expected counts
  v_expected_user_count := jsonb_array_length(users_data);
  v_expected_activity_count := jsonb_array_length(activities_data);
  v_expected_query_count := jsonb_array_length(queries_data);

  -- Extract org name for response
  v_org_name := org_data->>'org_name';

  -- Insert organization
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
    parent_organization,
    trial_status
  ) VALUES (
    v_org_name,
    org_data->>'domain',
    (org_data->>'account_manager_id')::uuid,
    org_data->>'org_lifecycle_stage',
    (org_data->>'trial_start_date')::timestamp,
    (org_data->>'trial_end_date')::timestamp,
    org_data->>'org_url',
    org_data->>'logo_url',
    (org_data->>'sales_poc_id')::uuid,
    org_data->>'description',
    org_data->>'parent_company',
    org_data->>'parent_organization',
    org_data->>'trial_status'
  )
  RETURNING org_id INTO v_org_id;

  -- Insert users
  FOR v_user_record IN SELECT * FROM jsonb_array_elements(users_data)
  LOOP
    INSERT INTO trial_users (
      org_id,
      name,
      email,
      role,
      current_stage
    ) VALUES (
      v_org_id,
      v_user_record.value->>'name',
      v_user_record.value->>'email',
      v_user_record.value->>'role',
      v_user_record.value->>'current_stage'
    )
    RETURNING user_id INTO v_user_id;

    v_user_ids := array_append(v_user_ids, v_user_id);
    v_created_user_count := v_created_user_count + 1;
  END LOOP;

  -- Insert activities
  FOR v_activity_record IN SELECT * FROM jsonb_array_elements(activities_data)
  LOOP
    INSERT INTO user_interactions (
      org_id,
      user_id,
      interaction_type,
      title,
      notes,
      conducted_by,
      interaction_date,
      duration_minutes
    ) VALUES (
      v_org_id,
      (v_activity_record.value->>'user_id')::uuid,
      v_activity_record.value->>'interaction_type',
      v_activity_record.value->>'title',
      v_activity_record.value->>'notes',
      v_activity_record.value->>'conducted_by',
      (v_activity_record.value->>'interaction_date')::timestamp,
      (v_activity_record.value->>'duration_minutes')::int
    )
    RETURNING interaction_id INTO v_activity_id;

    v_activity_ids := array_append(v_activity_ids, v_activity_id);
    v_created_activity_count := v_created_activity_count + 1;
  END LOOP;

  -- Insert platform queries
  FOR v_query_record IN SELECT * FROM jsonb_array_elements(queries_data)
  LOOP
    INSERT INTO platform_queries (
      org_id,
      user_id,
      query_topic,
      query_text,
      status,
      confidence_score,
      response_time_ms,
      session_id,
      executed_at,
      metadata
    ) VALUES (
      v_org_id,
      -- If user_id is null, use the first created user, otherwise use provided user_id
      COALESCE(
        (v_query_record.value->>'user_id')::uuid,
        CASE WHEN array_length(v_user_ids, 1) > 0 THEN v_user_ids[1] ELSE NULL END
      ),
      v_query_record.value->>'query_topic',
      v_query_record.value->>'query_text',
      v_query_record.value->>'status',
      (v_query_record.value->>'confidence_score')::decimal,
      (v_query_record.value->>'response_time_ms')::int,
      v_query_record.value->>'session_id',
      (v_query_record.value->>'executed_at')::timestamp,
      COALESCE((v_query_record.value->>'metadata')::jsonb, '{}'::jsonb)
    )
    RETURNING query_id INTO v_query_id;

    v_query_ids := array_append(v_query_ids, v_query_id);
    v_created_query_count := v_created_query_count + 1;
  END LOOP;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org_id,
    'org_name', v_org_name,
    'created_user_count', v_created_user_count,
    'created_activity_count', v_created_activity_count,
    'created_query_count', v_created_query_count,
    'expected_user_count', v_expected_user_count,
    'expected_activity_count', v_expected_activity_count,
    'expected_query_count', v_expected_query_count,
    'user_ids', to_jsonb(v_user_ids),
    'activity_ids', to_jsonb(v_activity_ids),
    'query_ids', to_jsonb(v_query_ids)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_trial_organization_atomic(jsonb, jsonb, jsonb, jsonb) TO authenticated;
