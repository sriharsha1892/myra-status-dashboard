/**
 * Supabase RPC (Remote Procedure Call) Wrappers
 * Type-safe interfaces for calling PostgreSQL functions
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrialOrganizationData {
  org_name: string;
  domain?: string;
  account_manager_id?: string; // UUID of account manager
  org_lifecycle_stage?: 'prospect' | 'demo_scheduled' | 'trial_active' | 'converted' | 'churned';
  trial_start_date?: string; // ISO date string
  trial_end_date?: string; // ISO date string
  org_url?: string;
  logo_url?: string;
  sales_poc_id?: string; // UUID of sales POC
  description?: string;
  parent_company?: string;
  parent_organization?: 'Mordor Intelligence' | 'GMI'; // Added: Organization parent
  contract_value?: number;
  trial_duration_days?: number;
  trial_status?: string;
}

export interface TrialUserData {
  name: string;
  email: string;
  role?: string;
  current_stage?: 'invited' | 'low_activity' | 'active' | 'power_user' | 'dormant';
}

export interface UserInteractionData {
  interaction_type: string;
  title: string;
  notes?: string;
  conducted_by?: string;
  interaction_date?: string; // ISO timestamp string
  duration_minutes?: number;
  user_id?: string; // If specified, must be one of the created user IDs
}

export interface PlatformQueryData {
  query_topic: string;
  query_text: string;
  status: 'success' | 'partial' | 'failed' | 'timeout';
  confidence_score?: number; // 0-100
  response_time_ms?: number;
  session_id?: string;
  executed_at: string; // ISO timestamp string
  user_id: string; // UUID of the user who executed the query
}

export interface PlatformQuery extends PlatformQueryData {
  query_id: string;
  org_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AtomicTrialOrgResult {
  success: boolean;
  org_id: string;
  org_name: string;
  created_user_count: number;
  created_activity_count: number;
  created_query_count?: number; // Added: Number of platform queries created
  expected_user_count: number;
  expected_activity_count: number;
  expected_query_count?: number; // Added: Expected number of platform queries
  user_ids: string[];
  activity_ids: string[];
  query_ids?: string[]; // Added: IDs of created platform queries
}

// ============================================================================
// RPC FUNCTIONS
// ============================================================================

/**
 * Atomically creates a trial organization with users and activities
 *
 * If ANY step fails, ALL changes are rolled back automatically.
 * This ensures data integrity - you won't have orphaned organizations without users.
 *
 * @param orgData - Organization information
 * @param usersData - Array of users to create (optional)
 * @param activitiesData - Array of activities/interactions to create (optional)
 * @param supabaseClient - Optional Supabase client (uses default if not provided)
 * @returns Promise with creation result including all created IDs
 *
 * @example
 * ```typescript
 * const result = await createTrialOrganizationAtomic(
 *   {
 *     org_name: "Acme Corp",
 *     domain: "E&C",
 *     account_manager_id: "uuid-of-account-manager"
 *   },
 *   [
 *     { name: "Jane Doe", email: "jane@acme.com" },
 *     { name: "John Smith", email: "john@acme.com" }
 *   ],
 *   [
 *     { interaction_type: "demo", title: "Initial demo completed" }
 *   ]
 * );
 *
 * if (result.created_user_count !== result.expected_user_count) {
 *   console.error("Some users failed to create!");
 * }
 * ```
 */
export async function createTrialOrganizationAtomic(
  orgData: TrialOrganizationData,
  usersData: TrialUserData[] = [],
  activitiesData: UserInteractionData[] = [],
  queriesData: PlatformQueryData[] = [],
  supabaseClient?: SupabaseClient
): Promise<AtomicTrialOrgResult> {
  const supabase = supabaseClient || createClient();

  // Validate input before calling RPC
  if (!orgData.org_name || orgData.org_name.trim() === '') {
    throw new Error('Organization name is required');
  }

  usersData.forEach((user, index) => {
    if (!user.name || user.name.trim() === '') {
      throw new Error(`User at index ${index} must have a name`);
    }
    if (!user.email || user.email.trim() === '') {
      throw new Error(`User at index ${index} must have an email`);
    }
  });

  activitiesData.forEach((activity, index) => {
    if (!activity.title || activity.title.trim() === '') {
      throw new Error(`Activity at index ${index} must have a title`);
    }
    if (!activity.interaction_type || activity.interaction_type.trim() === '') {
      throw new Error(`Activity at index ${index} must have an interaction_type`);
    }
  });

  queriesData.forEach((query, index) => {
    if (!query.query_topic || query.query_topic.trim() === '') {
      throw new Error(`Query at index ${index} must have a query_topic`);
    }
    if (!query.query_text || query.query_text.trim() === '') {
      throw new Error(`Query at index ${index} must have query_text`);
    }
    if (!query.user_id) {
      throw new Error(`Query at index ${index} must have a user_id`);
    }
    if (!query.executed_at) {
      throw new Error(`Query at index ${index} must have an executed_at timestamp`);
    }
  });

  // Call the PostgreSQL function
  const { data, error } = await supabase.rpc('create_trial_organization_atomic', {
    org_data: orgData,
    users_data: usersData,
    activities_data: activitiesData,
    queries_data: queriesData
  });

  if (error) {
    throw new Error(`Failed to create trial organization: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from RPC function');
  }

  return data as AtomicTrialOrgResult;
}

// ============================================================================
// VERIFICATION HELPERS
// ============================================================================

/**
 * Verifies that the expected number of records were created
 *
 * @param result - Result from createTrialOrganizationAtomic
 * @returns Object with verification status and any mismatches
 *
 * @example
 * ```typescript
 * const result = await createTrialOrganizationAtomic(...);
 * const verification = verifyAtomicCreation(result);
 *
 * if (!verification.success) {
 *   console.error("Verification failed:", verification.errors);
 * }
 * ```
 */
export function verifyAtomicCreation(result: AtomicTrialOrgResult): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check user count
  if (result.created_user_count !== result.expected_user_count) {
    errors.push(
      `User count mismatch: expected ${result.expected_user_count}, created ${result.created_user_count}`
    );
  }

  // Check activity count
  if (result.created_activity_count !== result.expected_activity_count) {
    errors.push(
      `Activity count mismatch: expected ${result.expected_activity_count}, created ${result.created_activity_count}`
    );
  }

  // Warnings for zero counts (might be intentional)
  if (result.created_user_count === 0 && result.expected_user_count > 0) {
    warnings.push('No users were created despite providing user data');
  }

  if (result.created_activity_count === 0 && result.expected_activity_count > 0) {
    warnings.push('No activities were created despite providing activity data');
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Queries the database to verify records actually exist
 *
 * This performs a secondary verification by counting actual records in the database.
 * Use this for critical operations where you need absolute certainty.
 *
 * @param orgId - Organization ID to verify
 * @param supabaseClient - Optional Supabase client
 * @returns Promise with database verification results
 *
 * @example
 * ```typescript
 * const result = await createTrialOrganizationAtomic(...);
 * const dbVerification = await verifyDatabaseRecords(result.org_id);
 *
 * if (!dbVerification.success) {
 *   console.error("Database verification failed!");
 * }
 * ```
 */
export async function verifyDatabaseRecords(
  orgId: string,
  supabaseClient?: SupabaseClient
): Promise<{
  success: boolean;
  org_exists: boolean;
  user_count: number;
  activity_count: number;
  sample_user: any | null;
  sample_activity: any | null;
}> {
  const supabase = supabaseClient || createClient();

  // Verify organization exists
  const { data: org, error: orgError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name')
    .eq('org_id', orgId)
    .single();

  if (orgError || !org) {
    return {
      success: false,
      org_exists: false,
      user_count: 0,
      activity_count: 0,
      sample_user: null,
      sample_activity: null
    };
  }

  // Count users
  const { count: userCount } = await supabase
    .from('trial_users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Count activities
  const { count: activityCount } = await supabase
    .from('user_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Get sample user
  const { data: sampleUser } = await supabase
    .from('trial_users')
    .select('user_id, full_name, email')
    .eq('org_id', orgId)
    .limit(1)
    .single();

  // Get sample activity
  const { data: sampleActivity } = await supabase
    .from('user_interactions')
    .select('interaction_id, title, interaction_type')
    .eq('org_id', orgId)
    .limit(1)
    .single();

  return {
    success: true,
    org_exists: true,
    user_count: userCount ?? 0,
    activity_count: activityCount ?? 0,
    sample_user: sampleUser,
    sample_activity: sampleActivity
  };
}
