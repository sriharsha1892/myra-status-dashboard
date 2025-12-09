/**
 * Create Prospect Organization Action
 * Creates a new organization marked as a prospect (pre-trial)
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateProspectOrgOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';
import {
  PROSPECT_STAGE_VALUES,
  PROSPECT_SOURCE_VALUES,
  type ProspectStageValue,
  type ProspectSourceValue,
} from '@/lib/prospects/config';

// Re-export types for backwards compatibility
export type ProspectStage = ProspectStageValue;
export type ProspectSource = ProspectSourceValue;

// ============ INPUT SCHEMA ============

export const createProspectOrgSchema = z.object({
  /** Organization name (required) */
  orgName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255, 'Organization name is too long'),

  /** Initial prospect stage */
  prospectStage: z.enum(PROSPECT_STAGE_VALUES).optional().default('cold_lead'),

  /** Source of the prospect */
  prospectSource: z.enum(PROSPECT_SOURCE_VALUES).optional(),

  /** ICP fit score (0-100) */
  icpFitScore: z.number().int().min(0).max(100).optional(),

  /** Website URL */
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),

  /** Description/notes */
  description: z.string().max(5000).optional(),
});

export type CreateProspectOrgInput = z.infer<typeof createProspectOrgSchema>;

// ============ ID GENERATION ============

function generateOrgId(): string {
  // Use proper UUID format for database compatibility
  return crypto.randomUUID();
}

// ============ ACTION IMPLEMENTATION ============

export const createProspectOrg: Action<CreateProspectOrgInput, CreateProspectOrgOutput> = {
  name: 'CREATE_PROSPECT_ORG',
  description: 'Create a new prospect organization (pre-trial)',
  schema: createProspectOrgSchema,

  async execute(input, context): Promise<ActionResult<CreateProspectOrgOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = createProspectOrgSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgName, prospectStage, prospectSource, icpFitScore, website, description } =
      validation.data;

    // Generate organization ID
    const orgId = generateOrgId();

    // Prepare organization data
    const orgData: Record<string, any> = {
      org_id: orgId,
      org_name: orgName,
      domain: 'TMT', // Required: NOT NULL constraint - default to TMT
      org_lifecycle_stage: 'prospect',
      trial_status: 'requested',
      is_prospect: true,
      prospect_stage: prospectStage || 'cold_lead',
      account_manager_id: userId, // Required: NOT NULL constraint
      created_at: new Date().toISOString(),
    };

    // Add optional fields
    if (prospectSource) orgData.prospect_source = prospectSource;
    if (icpFitScore !== undefined) orgData.icp_fit_score = icpFitScore;
    if (website) orgData.org_url = website;
    if (description) orgData.description = description;

    // Insert organization
    const { error: orgError } = await insertOne(supabase, TABLES.ORGANIZATIONS, orgData);

    if (orgError) {
      return failedResult(orgError, 'Failed to create prospect organization');
    }

    // Track the insert for undo
    changes.push(trackInsert(TABLES.ORGANIZATIONS, orgId, orgData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'org_created',
      eventCategory: 'milestones',
      title: `Prospect created: ${orgName}`,
      description: `Added as prospect from ${prospectSource || 'unknown source'}`,
      loggedBy: userId,
      sentiment: 'neutral',
      severity: 'low',
      metadata: {
        prospect_stage: prospectStage,
        prospect_source: prospectSource,
        is_prospect: true,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CREATE_PROSPECT_ORG: ${orgName}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        orgName,
        prospectStage: prospectStage || 'cold_lead',
      },
      changes,
      summary: `Created prospect: ${orgName}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToCreateProspectOrgInput(
  fields: Record<string, any>,
  orgName?: string
): CreateProspectOrgInput {
  return {
    orgName: orgName || fields.org_name || '',
    prospectStage: fields.prospect_stage || 'cold_lead',
    prospectSource: fields.prospect_source || undefined,
    icpFitScore: fields.icp_fit_score ? Number(fields.icp_fit_score) : undefined,
    website: fields.website || undefined,
    description: fields.description || undefined,
  };
}

export default createProspectOrg;
