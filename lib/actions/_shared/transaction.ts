/**
 * Transaction and Undo Support
 * Handles storing undo information and executing undo operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES, getIdColumn } from '@/lib/db/schema';
import { transformDbError, undoExpiredError, alreadyUndoneError, notFoundError } from './errors';
import type { ActionError, ActionResult, DatabaseChange } from './types';

// ============ CONSTANTS ============

/** Default undo window in milliseconds (5 minutes) */
const UNDO_WINDOW_MS = 5 * 60 * 1000;

// ============ ID GENERATION ============

/**
 * Generate a unique ID for undo records
 * Uses timestamp + random component for uniqueness
 */
export function generateUndoId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `undo_${timestamp}_${random}`;
}

// ============ UNDO STORAGE ============

export interface StoreUndoInput {
  /** Supabase client */
  supabase: SupabaseClient;
  /** User who executed the action */
  userId: string;
  /** Command identifier or description */
  commandText: string;
  /** Database changes to track */
  changes: DatabaseChange[];
  /** Custom undo window in milliseconds (default: 5 minutes) */
  undoWindowMs?: number;
}

export interface StoreUndoResult {
  /** Generated undo ID */
  undoId: string;
  /** ISO timestamp when undo expires */
  expiresAt: string;
  /** Error if storage failed */
  error: ActionError | null;
}

/**
 * Store undo information for an action
 * @param input - Undo storage input
 * @returns Undo ID and expiration
 */
export async function storeUndoInfo(input: StoreUndoInput): Promise<StoreUndoResult> {
  const {
    supabase,
    userId,
    commandText,
    changes,
    undoWindowMs = UNDO_WINDOW_MS,
  } = input;

  // Skip if no changes to track
  if (changes.length === 0) {
    return {
      undoId: '',
      expiresAt: '',
      error: null,
    };
  }

  const undoId = generateUndoId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + undoWindowMs);

  const { error } = await supabase.from(TABLES.COMMAND_UNDO_LOG).insert({
    id: undoId,
    user_id: userId,
    command_text: commandText,
    changes: changes,
    executed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    undone: false,
  });

  if (error) {
    console.error('[Undo] Failed to store undo info:', error);
    // Don't fail the action if undo storage fails
    return {
      undoId: '',
      expiresAt: '',
      error: transformDbError(error),
    };
  }

  return {
    undoId,
    expiresAt: expiresAt.toISOString(),
    error: null,
  };
}

// ============ UNDO EXECUTION ============

export interface ExecuteUndoInput {
  /** Supabase client */
  supabase: SupabaseClient;
  /** Undo ID to execute */
  undoId: string;
  /** User requesting undo (must match original user) */
  userId: string;
}

export interface ExecuteUndoResult {
  /** Whether undo succeeded */
  success: boolean;
  /** List of reverted changes */
  reverted: string[];
  /** Error if undo failed */
  error: ActionError | null;
}

/**
 * Execute an undo operation
 * Reverts all changes tracked by the undo record
 * @param input - Undo execution input
 * @returns Result of undo operation
 */
export async function executeUndo(input: ExecuteUndoInput): Promise<ExecuteUndoResult> {
  const { supabase, undoId, userId } = input;

  // Fetch undo record
  const { data: undoRecord, error: fetchError } = await supabase
    .from(TABLES.COMMAND_UNDO_LOG)
    .select('*')
    .eq('id', undoId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !undoRecord) {
    return {
      success: false,
      reverted: [],
      error: notFoundError('Undo record', undoId),
    };
  }

  // Check if already undone
  if (undoRecord.undone) {
    return {
      success: false,
      reverted: [],
      error: alreadyUndoneError(),
    };
  }

  // Check if expired
  if (new Date(undoRecord.expires_at) < new Date()) {
    return {
      success: false,
      reverted: [],
      error: undoExpiredError(),
    };
  }

  const reverted: string[] = [];
  const changes = undoRecord.changes as DatabaseChange[];

  // Revert changes in reverse order (LIFO)
  for (const change of [...changes].reverse()) {
    try {
      if (change.operation === 'insert') {
        // Delete the inserted record
        const idColumn = getIdColumn(change.table);
        await supabase
          .from(change.table)
          .delete()
          .eq(idColumn, change.record_id);
        reverted.push(`Deleted ${getTableDisplayName(change.table)}`);
      } else if (change.operation === 'update' && change.previous_values) {
        // Restore previous values
        const idColumn = getIdColumn(change.table);
        await supabase
          .from(change.table)
          .update(change.previous_values)
          .eq(idColumn, change.record_id);
        reverted.push(`Restored ${getTableDisplayName(change.table)}`);
      } else if (change.operation === 'delete' && change.previous_values) {
        // Re-insert deleted record
        await supabase.from(change.table).insert(change.previous_values);
        reverted.push(`Re-created ${getTableDisplayName(change.table)}`);
      }
    } catch (error: any) {
      console.error(`[Undo] Failed to revert ${change.table}:`, error);
      // Continue with other changes, don't fail entirely
    }
  }

  // Mark as undone
  await supabase
    .from(TABLES.COMMAND_UNDO_LOG)
    .update({ undone: true })
    .eq('id', undoId);

  return {
    success: reverted.length > 0,
    reverted,
    error: null,
  };
}

// ============ CHANGE TRACKING HELPERS ============

/**
 * Create a DatabaseChange record for an insert operation
 */
export function trackInsert(
  table: string,
  recordId: string,
  newValues: Record<string, any>
): DatabaseChange {
  return {
    table,
    operation: 'insert',
    record_id: recordId,
    new_values: newValues,
  };
}

/**
 * Create a DatabaseChange record for an update operation
 */
export function trackUpdate(
  table: string,
  recordId: string,
  previousValues: Record<string, any>,
  newValues: Record<string, any>
): DatabaseChange {
  return {
    table,
    operation: 'update',
    record_id: recordId,
    previous_values: previousValues,
    new_values: newValues,
  };
}

/**
 * Create a DatabaseChange record for a delete operation
 */
export function trackDelete(
  table: string,
  recordId: string,
  previousValues: Record<string, any>
): DatabaseChange {
  return {
    table,
    operation: 'delete',
    record_id: recordId,
    previous_values: previousValues,
  };
}

// ============ RESULT HELPERS ============

/**
 * Add undo info to an ActionResult
 */
export function withUndoInfo<T>(
  result: Omit<ActionResult<T>, 'undoId' | 'undoExpiresAt'>,
  undoResult: StoreUndoResult
): ActionResult<T> {
  return {
    ...result,
    undoId: undoResult.undoId || undefined,
    undoExpiresAt: undoResult.expiresAt || undefined,
  };
}

// ============ HELPERS ============

/**
 * Get display name for table (for undo messages)
 */
function getTableDisplayName(table: string): string {
  const displayNames: Record<string, string> = {
    [TABLES.ORGANIZATIONS]: 'organization',
    [TABLES.USERS]: 'user',
    [TABLES.TIMELINE_EVENTS]: 'timeline event',
    [TABLES.DEAL_TRACKING]: 'deal',
    [TABLES.ACTIVITY_NOTES]: 'note',
    [TABLES.PRODUCT_ROADMAP]: 'roadmap item',
    [TABLES.TICKETS]: 'ticket',
    [TABLES.FEATURE_REQUESTS]: 'feature request',
    [TABLES.ACCOUNT_MANAGERS]: 'account manager',
  };
  return displayNames[table] || 'record';
}

// ============ BATCH OPERATIONS ============

/**
 * Execute multiple operations and track all changes
 * If any operation fails, returns error without rolling back
 * (Supabase doesn't support true transactions)
 */
export async function executeWithTracking<T>(
  supabase: SupabaseClient,
  operations: Array<() => Promise<{
    data: any;
    change: DatabaseChange | null;
    error: ActionError | null;
  }>>
): Promise<{
  results: T[];
  changes: DatabaseChange[];
  error: ActionError | null;
}> {
  const results: T[] = [];
  const changes: DatabaseChange[] = [];

  for (const operation of operations) {
    const { data, change, error } = await operation();

    if (error) {
      return { results, changes, error };
    }

    if (data) {
      results.push(data);
    }
    if (change) {
      changes.push(change);
    }
  }

  return { results, changes, error: null };
}
