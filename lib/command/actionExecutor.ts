/**
 * Action Executor - Database operations for command execution
 *
 * This module now delegates to the new action modules in lib/actions/
 * for all command execution, providing a unified, validated, and
 * type-safe execution layer.
 */

import {
  executeAction as executeNewAction,
  type ActionResult,
  type ResolvedCommand as ActionResolvedCommand,
  type DatabaseChange as ActionDatabaseChange,
} from '@/lib/actions';
import type {
  ResolvedCommand,
  ExecutionResult,
  DatabaseChange,
  CommandAction,
} from './types';

// Re-export executeUndo from the new action system
export { executeUndo } from '@/lib/actions';

// Actions that DON'T require an existing organization
const ORG_OPTIONAL_ACTIONS: CommandAction[] = [
  'CREATE_ORG',
  'CREATE_TICKET',
  'CREATE_ROADMAP_ITEM',
  'CREATE_PROSPECT_ORG',
];

/**
 * Execute a resolved command
 * Delegates to the new action modules in lib/actions/
 *
 * @param command - Resolved command from parser
 * @param userId - User executing the command
 * @returns ExecutionResult for backward compatibility
 */
export async function executeCommand(
  command: ResolvedCommand,
  userId: string
): Promise<ExecutionResult> {
  const commandId = command.id;

  try {
    const { parsed, entities } = command;
    const orgId = entities.org?.id;

    // Check if action requires org
    const requiresOrg = !ORG_OPTIONAL_ACTIONS.includes(parsed.action);
    if (requiresOrg && !orgId) {
      return {
        success: false,
        command_id: commandId,
        changes: [],
        summary: 'Could not resolve organization',
        error: 'Organization not found',
      };
    }

    // Map to action system's ResolvedCommand format
    const actionCommand: ActionResolvedCommand = {
      id: command.id,
      parsed: {
        action: parsed.action as any,
        fields: parsed.fields,
        org_name: parsed.org_name,
        user_name: parsed.user_name,
      },
      entities: {
        org: entities.org ? { id: entities.org.id, name: entities.org.name } : undefined,
        user: entities.user ? { id: entities.user.id, name: entities.user.name } : undefined,
      },
    };

    // Execute action using new action system
    const result = await executeNewAction(actionCommand, userId);

    // Map ActionResult to ExecutionResult for backward compatibility
    return mapToExecutionResult(result, commandId);
  } catch (error: any) {
    console.error(`[ActionExecutor] Failed to execute ${command.parsed.action}:`, error);
    return {
      success: false,
      command_id: commandId,
      changes: [],
      summary: 'Command execution failed',
      error: error?.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Map ActionResult from new system to ExecutionResult for backward compatibility
 */
function mapToExecutionResult(result: ActionResult, commandId: string): ExecutionResult {
  // Map DatabaseChange from action system to command system format
  const mappedChanges: DatabaseChange[] = result.changes.map((change: ActionDatabaseChange) => ({
    table: change.table,
    operation: change.operation === 'delete' ? 'update' : change.operation, // Map delete to update for compat
    record_id: change.record_id,
    previous_values: change.previous_values,
    new_values: change.new_values || {},
  }));

  return {
    success: result.success,
    command_id: commandId,
    changes: mappedChanges,
    summary: result.summary,
    undo_id: result.undoId,
    undo_expires_at: result.undoExpiresAt,
    error: result.error?.message,
  };
}

/**
 * Execute multiple commands in sequence
 * Stops on first failure
 */
export async function executeBatch(
  commands: ResolvedCommand[],
  userId: string
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const command of commands) {
    const result = await executeCommand(command, userId);
    results.push(result);

    // Stop on failure
    if (!result.success) {
      break;
    }
  }

  return results;
}
