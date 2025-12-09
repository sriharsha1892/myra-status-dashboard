/**
 * Update Organization Action
 * Updates organization fields (not stage/deal - those have dedicated actions)
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  fieldError,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ OUTPUT TYPE ============

interface UpdateOrganizationOutput {
  orgId: string;
  fieldsUpdated: string[];
}

// ============ INPUT SCHEMA ============

export const updateOrganizationSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Website URL */
  website: z.string().url().optional().or(z.literal('')),

  /** Domain category */
  domainCategory: z.string().optional(),

  /** Team size */
  teamSize: z.number().int().positive().optional(),

  /** Contract value */
  contractValue: z.number().nonnegative().optional(),

  /** Description */
  description: z.string().max(5000).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateOrganization: Action<UpdateOrganizationInput, UpdateOrganizationOutput> = {
  name: 'UPDATE_ORG',
  description: 'Update organization details',
  schema: updateOrganizationSchema,

  async execute(input, context): Promise<ActionResult<UpdateOrganizationOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    const validation = updateOrganizationSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, website, domainCategory, teamSize, contractValue, description } = validation.data;

    // Get current org state
    const { data: currentOrg, error: fetchError } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);

    if (fetchError || !currentOrg) {
      return failedResult(fetchError || fieldError('orgId', 'Organization not found'), 'Organization not found');
    }

    const updateData: Record<string, any> = {};

    if (website !== undefined && website !== '') {
      updateData.org_url = website;
      summaryParts.push(`website: ${website}`);
    }
    if (domainCategory) {
      updateData.org_domain = domainCategory;
      summaryParts.push(`domain: ${domainCategory}`);
    }
    if (teamSize !== undefined) {
      updateData.team_size = teamSize;
      summaryParts.push(`team size: ${teamSize}`);
    }
    if (contractValue !== undefined) {
      updateData.contract_value = contractValue;
      summaryParts.push(`contract: $${contractValue.toLocaleString()}`);
    }
    if (description) {
      updateData.description = description;
      summaryParts.push('description updated');
    }

    if (Object.keys(updateData).length === 0) {
      return failedResult(fieldError('website', 'At least one field is required'), 'No fields to update');
    }

    const { error: updateError } = await updateById(supabase, TABLES.ORGANIZATIONS, orgId, updateData);

    if (updateError) {
      return failedResult(updateError, 'Failed to update organization');
    }

    changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, currentOrg as Record<string, any>, updateData));

    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `UPDATE_ORG: ${summaryParts.join(', ')}`,
      changes,
    });

    return {
      success: true,
      data: { orgId, fieldsUpdated: summaryParts },
      changes,
      summary: `Updated org: ${summaryParts.join(', ')}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToUpdateOrganizationInput(fields: Record<string, any>, orgId: string): UpdateOrganizationInput {
  return {
    orgId,
    website: fields.website || undefined,
    domainCategory: fields.domain_category || undefined,
    teamSize: fields.team_size ? Number(fields.team_size) : undefined,
    contractValue: fields.contract_value ? Number(fields.contract_value) : undefined,
    description: fields.description || undefined,
  };
}

export default updateOrganization;
