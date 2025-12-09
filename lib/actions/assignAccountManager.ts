/**
 * Assign Account Manager Action
 * Assigns an account manager to an organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DatabaseChange,
  TABLES,
  fetchById,
  fetchMany,
  updateById,
  validationError,
  failedResult,
  fieldError,
  notFoundError,
  createTimelineEvent,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ OUTPUT TYPE ============

interface AssignAccountManagerOutput {
  orgId: string;
  accountManagerId: string;
  accountManagerName: string;
}

// ============ INPUT SCHEMA ============

export const assignAccountManagerSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Account manager name to search for */
  accountManagerName: z.string().min(1, 'Account manager name is required'),
});

export type AssignAccountManagerInput = z.infer<typeof assignAccountManagerSchema>;

// ============ ACTION IMPLEMENTATION ============

export const assignAccountManager: Action<AssignAccountManagerInput, AssignAccountManagerOutput> = {
  name: 'ASSIGN_ACCOUNT_MANAGER',
  description: 'Assign an account manager to an organization',
  schema: assignAccountManagerSchema,

  async execute(input, context): Promise<ActionResult<AssignAccountManagerOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    const validation = assignAccountManagerSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, accountManagerName } = validation.data;

    // Look up account manager by name (fuzzy match)
    const { data: managers, error: managerError } = await supabase
      .from(TABLES.ACCOUNT_MANAGERS)
      .select('id, full_name')
      .ilike('full_name', `%${accountManagerName}%`)
      .limit(1);

    if (managerError) {
      return failedResult(
        { code: 'DATABASE_ERROR', message: 'Failed to search for account manager', technical: managerError.message },
        'Failed to search for account manager'
      );
    }

    if (!managers || managers.length === 0) {
      return failedResult(
        notFoundError('Account manager', accountManagerName),
        `Account manager "${accountManagerName}" not found`
      );
    }

    const am = managers[0];

    // Get current org state
    const { data: currentOrg, error: fetchError } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);

    if (fetchError || !currentOrg) {
      return failedResult(notFoundError('Organization', orgId), 'Organization not found');
    }

    // Update organization with account manager
    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      { account_manager_id: am.id }
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to assign account manager');
    }

    changes.push(trackUpdate(
      TABLES.ORGANIZATIONS,
      orgId,
      { account_manager_id: (currentOrg as any).account_manager_id },
      { account_manager_id: am.id }
    ));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'account_manager_assigned',
      eventCategory: 'milestones',
      title: `Account manager assigned: ${am.full_name}`,
      description: `${am.full_name} was assigned as account manager for ${orgName || 'this organization'}`,
      loggedBy: userId,
      sentiment: 'positive',
      severity: 'medium',
      metadata: {
        account_manager_id: am.id,
        account_manager_name: am.full_name,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `ASSIGN_ACCOUNT_MANAGER: ${am.full_name}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        accountManagerId: am.id,
        accountManagerName: am.full_name,
      },
      changes,
      summary: `Assigned account manager: ${am.full_name}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToAssignAccountManagerInput(fields: Record<string, any>, orgId: string): AssignAccountManagerInput {
  return {
    orgId,
    accountManagerName: fields.account_manager_name || '',
  };
}

export default assignAccountManager;
