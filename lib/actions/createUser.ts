/**
 * Create User Action
 * Creates a new user within an organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateUserOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  exists,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  userAddedEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ INPUT SCHEMA ============

/**
 * Input schema for createUser action
 */
export const createUserSchema = z.object({
  /** User's email (required) */
  email: z
    .string()
    .email('Please enter a valid email address'),

  /** User's full name */
  name: z.string().max(255).optional(),

  /** User's designation/role */
  designation: z.string().max(255).optional(),

  /** User's phone number */
  phone: z.string().max(50).optional(),

  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ============ ID GENERATION ============

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============ ACTION IMPLEMENTATION ============

export const createUser: Action<CreateUserInput, CreateUserOutput> = {
  name: 'CREATE_USER',
  description: 'Create a new user within an organization',
  schema: createUserSchema,

  async execute(input, context): Promise<ActionResult<CreateUserOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = createUserSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { email, name, designation, phone, orgId } = validation.data;

    // Check for existing user with same email in this org
    const userExists = await exists(supabase, TABLES.USERS, {
      org_id: orgId,
      email: email,
    });

    if (userExists) {
      return failedResult(
        fieldError('email', 'A user with this email already exists in this organization'),
        'User already exists'
      );
    }

    // Generate user ID
    const newUserId = generateUserId();

    // Prepare user data
    const userData: Record<string, any> = {
      user_id: newUserId,
      org_id: orgId,
      email: email,
      full_name: name || null,
      designation: designation || null,
      current_stage: 'invited',
      created_at: new Date().toISOString(),
    };

    if (phone) userData.phone = phone;

    // Insert user
    const { error: userError } = await insertOne(supabase, TABLES.USERS, userData);

    if (userError) {
      return failedResult(userError, 'Failed to create user');
    }

    // Track the insert for undo
    changes.push(trackInsert(TABLES.USERS, newUserId, userData));

    // Create timeline event
    const displayName = name || email;
    const timelineResult = await createTimelineEvent(
      supabase,
      userAddedEvent(orgId, displayName, email, userId)
    );

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CREATE_USER: ${displayName}`,
      changes,
    });

    return {
      success: true,
      data: {
        userId: newUserId,
        email,
        orgId,
      },
      changes,
      summary: `Created user: ${displayName}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to createUser input
 */
export function mapToCreateUserInput(
  fields: Record<string, any>,
  orgId: string,
  userName?: string
): CreateUserInput {
  return {
    email: fields.email || '',
    name: userName || fields.name || fields.role || undefined,
    designation: fields.designation || fields.role || undefined,
    phone: fields.phone || undefined,
    orgId,
  };
}

export default createUser;
