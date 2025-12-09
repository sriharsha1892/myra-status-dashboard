/**
 * Convert to Trial Action
 * Converts a prospect organization to an active trial
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type ConvertToTrialOutput,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ INPUT SCHEMA ============

export const convertToTrialSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Trial duration in days */
  trialDays: z.number().int().positive().optional().default(14),
});

export type ConvertToTrialInput = z.infer<typeof convertToTrialSchema>;

// ============ ACTION IMPLEMENTATION ============

export const convertToTrial: Action<ConvertToTrialInput, ConvertToTrialOutput> = {
  name: 'CONVERT_TO_TRIAL',
  description: 'Convert a prospect to an active trial organization',
  schema: convertToTrialSchema,

  async execute(input, context): Promise<ActionResult<ConvertToTrialOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = convertToTrialSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, trialDays } = validation.data;

    // Get current org state
    const { data: currentOrg, error: fetchError } = await fetchById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId
    );

    if (fetchError || !currentOrg) {
      return failedResult(
        fetchError || fieldError('orgId', 'Organization not found'),
        'Organization not found'
      );
    }

    const org = currentOrg as any;
    const orgDisplayName = org.org_name || orgName || 'Unknown';

    // Calculate trial dates
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const previousValues: Record<string, any> = {
      is_prospect: org.is_prospect,
      prospect_stage: org.prospect_stage,
      org_lifecycle_stage: org.org_lifecycle_stage,
      trial_status: org.trial_status,
      trial_start_date: org.trial_start_date,
      trial_end_date: org.trial_end_date,
      deal_stage: org.deal_stage,
    };

    // Update organization to trial
    const updateData: Record<string, any> = {
      is_prospect: false,
      prospect_stage: null, // Clear prospect stage
      org_lifecycle_stage: 'trial_active',
      trial_status: 'active',
      trial_start_date: trialStart.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      deal_stage: 'evaluation',
    };

    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to convert to trial');
    }

    // Track the update for undo
    changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, previousValues, updateData));

    // Convert prospects to trial_users (if prospects table exists)
    let prospectsConverted = 0;
    try {
      const { data: prospects } = await supabase
        .from('prospects')
        .select('id, name, email, title')
        .eq('org_id', orgId)
        .eq('status', 'active');

      if (prospects && prospects.length > 0) {
        for (const prospect of prospects) {
          // Create trial_user from prospect
          const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const userData = {
            user_id: userId,
            org_id: orgId,
            email: prospect.email,
            full_name: prospect.name,
            designation: prospect.title,
            current_stage: 'invited',
            created_at: new Date().toISOString(),
          };

          const { error: userError } = await supabase.from(TABLES.USERS).insert(userData);

          if (!userError) {
            // Update prospect to converted
            await supabase
              .from('prospects')
              .update({
                status: 'converted',
                converted_user_id: userId,
              })
              .eq('id', prospect.id);

            prospectsConverted++;
          }
        }
      }
    } catch (e) {
      // Prospects table might not exist yet, ignore
    }

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'trial_started',
      eventCategory: 'milestones',
      title: 'Converted to trial',
      description: `Trial started (${trialDays} days)${prospectsConverted > 0 ? `, ${prospectsConverted} contacts converted` : ''}`,
      loggedBy: userId,
      sentiment: 'positive',
      severity: 'high',
      metadata: {
        trial_days: trialDays,
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        prospects_converted: prospectsConverted,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CONVERT_TO_TRIAL: ${orgDisplayName}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        orgName: orgDisplayName,
        prospectsConverted,
      },
      changes,
      summary: `Converted ${orgDisplayName} to trial (${trialDays} days)${prospectsConverted > 0 ? `, ${prospectsConverted} contacts` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToConvertToTrialInput(
  fields: Record<string, any>,
  orgId: string
): ConvertToTrialInput {
  return {
    orgId,
    trialDays: fields.trial_days ? Number(fields.trial_days) : 14,
  };
}

export default convertToTrial;
