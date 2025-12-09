/**
 * Database Helpers
 * Re-exports schema constants and provides query helper functions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES, ID_COLUMNS, getIdColumn, type TableName } from '@/lib/db/schema';
import { transformDbError, notFoundError } from './errors';
import type { ActionError } from './types';

// Re-export schema constants for convenience
export { TABLES, ID_COLUMNS, getIdColumn } from '@/lib/db/schema';
export type { TableName } from '@/lib/db/schema';

// ============ QUERY RESULT TYPES ============

export interface QueryResult<T> {
  data: T | null;
  error: ActionError | null;
}

export interface QueryManyResult<T> {
  data: T[];
  error: ActionError | null;
}

// ============ FETCH HELPERS ============

/**
 * Fetch a single record by ID
 * @param supabase - Supabase client
 * @param table - Table name (use TABLES constant)
 * @param id - Record ID
 * @param columns - Columns to select (default: '*')
 * @returns Query result with data or error
 */
export async function fetchById<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  id: string,
  columns = '*'
): Promise<QueryResult<T>> {
  const idColumn = getIdColumn(table);

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq(idColumn, id)
    .single();

  if (error) {
    // Handle "no rows" error specifically
    if (error.code === 'PGRST116') {
      return {
        data: null,
        error: notFoundError(getTableDisplayName(table), id),
      };
    }
    return {
      data: null,
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: data as T, error: null };
}

/**
 * Fetch multiple records with optional filters
 * @param supabase - Supabase client
 * @param table - Table name (use TABLES constant)
 * @param filters - Key-value filters to apply
 * @param columns - Columns to select (default: '*')
 * @param limit - Maximum records to return
 * @returns Query result with data array or error
 */
export async function fetchMany<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  filters: Record<string, any> = {},
  columns = '*',
  limit?: number
): Promise<QueryManyResult<T>> {
  let query = supabase.from(table).select(columns);

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: (data || []) as T[], error: null };
}

/**
 * Check if a record exists
 * @param supabase - Supabase client
 * @param table - Table name
 * @param filters - Filters to match
 * @returns Boolean indicating existence
 */
export async function exists(
  supabase: SupabaseClient,
  table: TableName | string,
  filters: Record<string, any>
): Promise<boolean> {
  const idColumn = getIdColumn(table);

  let query = supabase.from(table).select(idColumn, { count: 'exact', head: true });

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error(`[DB] exists check failed for ${table}:`, error);
    return false;
  }

  return (count || 0) > 0;
}

// ============ INSERT HELPERS ============

export interface InsertResult<T> {
  data: T | null;
  error: ActionError | null;
}

/**
 * Insert a single record
 * @param supabase - Supabase client
 * @param table - Table name
 * @param values - Values to insert
 * @returns Insert result with data or error
 */
export async function insertOne<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  values: Record<string, any>
): Promise<InsertResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: data as T, error: null };
}

/**
 * Insert multiple records
 * @param supabase - Supabase client
 * @param table - Table name
 * @param values - Array of values to insert
 * @returns Insert result with data array or error
 */
export async function insertMany<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  values: Record<string, any>[]
): Promise<QueryManyResult<T>> {
  if (values.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select();

  if (error) {
    return {
      data: [],
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: (data || []) as T[], error: null };
}

// ============ UPDATE HELPERS ============

/**
 * Update a single record by ID
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID
 * @param values - Values to update
 * @returns Update result with data or error
 */
export async function updateById<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  id: string,
  values: Record<string, any>
): Promise<QueryResult<T>> {
  const idColumn = getIdColumn(table);

  const { data, error } = await supabase
    .from(table)
    .update(values)
    .eq(idColumn, id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        data: null,
        error: notFoundError(getTableDisplayName(table), id),
      };
    }
    return {
      data: null,
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: data as T, error: null };
}

/**
 * Update records matching filters
 * @param supabase - Supabase client
 * @param table - Table name
 * @param filters - Filters to match records
 * @param values - Values to update
 * @returns Update result with affected records or error
 */
export async function updateMany<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  filters: Record<string, any>,
  values: Record<string, any>
): Promise<QueryManyResult<T>> {
  let query = supabase.from(table).update(values);

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query.select();

  if (error) {
    return {
      data: [],
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: (data || []) as T[], error: null };
}

// ============ DELETE HELPERS ============

/**
 * Delete a single record by ID
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID
 * @returns The deleted record or error
 */
export async function deleteById<T = Record<string, any>>(
  supabase: SupabaseClient,
  table: TableName | string,
  id: string
): Promise<QueryResult<T>> {
  const idColumn = getIdColumn(table);

  // First fetch the record to return it
  const { data: existing } = await supabase
    .from(table)
    .select()
    .eq(idColumn, id)
    .single();

  if (!existing) {
    return {
      data: null,
      error: notFoundError(getTableDisplayName(table), id),
    };
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq(idColumn, id);

  if (error) {
    return {
      data: null,
      error: transformDbError(error, getErrorContext(table)),
    };
  }

  return { data: existing as T, error: null };
}

// ============ HELPER FUNCTIONS ============

/**
 * Get display name for table (for error messages)
 */
function getTableDisplayName(table: TableName | string): string {
  const displayNames: Record<string, string> = {
    [TABLES.ORGANIZATIONS]: 'Organization',
    [TABLES.USERS]: 'User',
    [TABLES.TIMELINE_EVENTS]: 'Timeline Event',
    [TABLES.DEAL_TRACKING]: 'Deal',
    [TABLES.ACTIVITY_NOTES]: 'Note',
    [TABLES.PRODUCT_ROADMAP]: 'Roadmap Item',
    [TABLES.TICKETS]: 'Ticket',
    [TABLES.FEATURE_REQUESTS]: 'Feature Request',
    [TABLES.ACCOUNT_MANAGERS]: 'Account Manager',
    [TABLES.ENTITY_ALIASES]: 'Entity Alias',
    [TABLES.COMMAND_UNDO_LOG]: 'Undo Record',
  };
  return displayNames[table] || 'Record';
}

/**
 * Get error context for better error messages
 */
function getErrorContext(table: TableName | string): string {
  const contexts: Record<string, string> = {
    [TABLES.ORGANIZATIONS]: 'org',
    [TABLES.USERS]: 'user',
    [TABLES.TICKETS]: 'ticket',
    [TABLES.FEATURE_REQUESTS]: 'feature',
    [TABLES.PRODUCT_ROADMAP]: 'roadmap',
    [TABLES.TIMELINE_EVENTS]: 'timeline',
    [TABLES.DEAL_TRACKING]: 'deal',
    [TABLES.ACTIVITY_NOTES]: 'note',
  };
  return contexts[table] || 'default';
}

// ============ TRANSACTION SUPPORT ============

/**
 * Execute multiple operations with rollback on failure
 * Note: Supabase doesn't support true transactions, so this is best-effort
 * @param operations - Array of operations to execute
 * @returns Result of all operations or error on first failure
 */
export async function executeSequential<T>(
  operations: Array<() => Promise<QueryResult<any> | QueryManyResult<any>>>
): Promise<{ results: any[]; error: ActionError | null }> {
  const results: any[] = [];

  for (const op of operations) {
    const result = await op();
    if (result.error) {
      return { results, error: result.error };
    }
    results.push(result.data);
  }

  return { results, error: null };
}
