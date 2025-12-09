/**
 * Update Deal Action
 * Updates or creates deal tracking information for an organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type UpdateDealOutput,
  type DatabaseChange,
  TABLES,
  fetchMany,
  insertOne,
  updateById,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  dealUpdatedEvent,
  storeUndoInfo,
  trackInsert,
  trackUpdate,
} from './_shared';

// ============ DEAL CONSTANTS ============

/**
 * Valid deal statuses
 */
export const DEAL_STATUSES = [
  'pending',
  'negotiating',
  'won',
  'lost',
  'on_hold',
] as const;

export type DealStatus = typeof DEAL_STATUSES[number];

// ============ INPUT SCHEMA ============

/**
 * Input schema for updateDeal action
 */
export const updateDealSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Deal value in dollars */
  dealValue: z.number().nonnegative('Deal value must be positive').optional(),

  /** Deal status */
  dealStatus: z.string().optional(),

  /** Notes about the deal */
  notes: z.string().max(5000).optional(),
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateDeal: Action<UpdateDealInput, UpdateDealOutput> = {
  name: 'UPDATE_DEAL',
  description: 'Update or create deal tracking for an organization',
  schema: updateDealSchema,

  async execute(input, context): Promise<ActionResult<UpdateDealOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input with Zod
    const validation = updateDealSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, dealValue, dealStatus, notes } = validation.data;

    // Check if we have anything to update
    if (dealValue === undefined && !dealStatus && !notes) {
      return failedResult(
        fieldError('dealValue', 'At least one deal field is required'),
        'No deal fields to update'
      );
    }

    // Get current deal tracking record
    const { data: existingDeals } = await fetchMany(
      supabase,
      TABLES.DEAL_TRACKING,
      { org_id: orgId },
      '*',
      1
    );

    const currentDeal = existingDeals?.[0];

    // Build update data
    const updateData: Record<string, any> = {};

    if (dealValue !== undefined) {
      updateData.deal_value = dealValue;
      summaryParts.push(`Deal value: $${dealValue.toLocaleString()}`);
    }

    if (dealStatus) {
      updateData.deal_status = dealStatus;
      updateData.status_updated_at = new Date().toISOString();
      updateData.status_updated_by = userId;
      summaryParts.push(`Status: ${dealStatus}`);
    }

    if (notes) {
      updateData.notes = notes;
    }

    let dealId: string;

    if (currentDeal) {
      // Update existing deal record
      dealId = (currentDeal as any).id;

      const { error: updateError } = await updateById(
        supabase,
        TABLES.DEAL_TRACKING,
        dealId,
        updateData
      );

      if (updateError) {
        return failedResult(updateError, 'Failed to update deal');
      }

      // Track the update for undo
      changes.push(trackUpdate(
        TABLES.DEAL_TRACKING,
        dealId,
        {
          deal_value: (currentDeal as any).deal_value,
          deal_status: (currentDeal as any).deal_status,
          notes: (currentDeal as any).notes,
        },
        updateData
      ));
    } else {
      // Insert new deal tracking record
      const insertData = {
        org_id: orgId,
        ...updateData,
      };

      const { data: newDeal, error: insertError } = await insertOne(
        supabase,
        TABLES.DEAL_TRACKING,
        insertData
      );

      if (insertError || !newDeal) {
        return failedResult(
          insertError || fieldError('orgId', 'Failed to create deal record'),
          'Failed to create deal record'
        );
      }

      dealId = (newDeal as any).id;

      // Track the insert for undo
      changes.push(trackInsert(TABLES.DEAL_TRACKING, dealId, insertData));
    }

    // Create timeline event for deal update
    const timelineResult = await createTimelineEvent(
      supabase,
      dealUpdatedEvent(orgId, orgName || 'Organization', dealValue, dealStatus, userId)
    );

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `UPDATE_DEAL: ${summaryParts.join(', ')}`,
      changes,
    });

    return {
      success: true,
      data: {
        dealId,
        dealValue,
        dealStatus,
      },
      changes,
      summary: `Updated deal: ${summaryParts.join(', ')}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to updateDeal input
 */
export function mapToUpdateDealInput(
  fields: Record<string, any>,
  orgId: string
): UpdateDealInput {
  return {
    orgId,
    dealValue: fields.deal_value !== undefined ? Number(fields.deal_value) : undefined,
    dealStatus: fields.deal_status || undefined,
    notes: fields.note_text || fields.details || undefined,
  };
}

export default updateDeal;
