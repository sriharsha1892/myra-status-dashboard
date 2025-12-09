/**
 * Create Organization Action
 * Creates a new organization with optional contacts
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateOrgOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  orgCreatedEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ INPUT SCHEMA ============

/**
 * Contact schema for embedded contacts in org creation
 */
const contactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  role: z.string().optional(),
});

/**
 * Input schema for createOrganization action
 */
export const createOrganizationSchema = z.object({
  /** Organization name (required) */
  orgName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255, 'Organization name is too long'),

  /** Website URL */
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),

  /** Domain category (e.g., SaaS, Enterprise, etc.) */
  domainCategory: z.string().optional(),

  /** Team size */
  teamSize: z.number().int().positive().optional(),

  /** Contract value */
  contractValue: z.number().nonnegative().optional(),

  /** Description */
  description: z.string().max(5000).optional(),

  /** Initial contacts to create */
  contacts: z.array(contactSchema).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// ============ ID GENERATION ============

function generateOrgId(): string {
  // Use proper UUID format for database compatibility
  return crypto.randomUUID();
}

function generateUserId(): string {
  // Use proper UUID format for database compatibility
  return crypto.randomUUID();
}

// ============ ACTION IMPLEMENTATION ============

export const createOrganization: Action<CreateOrganizationInput, CreateOrgOutput> = {
  name: 'CREATE_ORG',
  description: 'Create a new organization with optional contacts',
  schema: createOrganizationSchema,

  async execute(input, context): Promise<ActionResult<CreateOrgOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = createOrganizationSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgName, website, domainCategory, teamSize, contractValue, description, contacts } =
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
      account_manager_id: userId, // Required: NOT NULL constraint
      created_at: new Date().toISOString(),
    };

    // Add optional fields
    if (website) orgData.org_url = website;
    if (domainCategory) orgData.org_domain = domainCategory;
    if (teamSize) orgData.team_size = teamSize;
    if (contractValue) orgData.contract_value = contractValue;
    if (description) orgData.description = description;

    // Insert organization
    const { error: orgError } = await insertOne(supabase, TABLES.ORGANIZATIONS, orgData);

    if (orgError) {
      return failedResult(orgError, 'Failed to create organization');
    }

    // Track the insert for undo
    changes.push(trackInsert(TABLES.ORGANIZATIONS, orgId, orgData));

    // Create contacts if provided
    let contactsCreated = 0;
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        if (contact.email) {
          const contactUserId = generateUserId();
          const userData = {
            user_id: contactUserId,
            org_id: orgId,
            email: contact.email,
            full_name: contact.name || null,
            designation: contact.role || null,
            current_stage: 'invited',
            created_at: new Date().toISOString(),
          };

          const { error: userError } = await insertOne(supabase, TABLES.USERS, userData);

          if (!userError) {
            changes.push(trackInsert(TABLES.USERS, contactUserId, userData));
            contactsCreated++;
          }
        }
      }
    }

    // Create timeline event
    const timelineResult = await createTimelineEvent(
      supabase,
      orgCreatedEvent(orgId, orgName, userId)
    );

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CREATE_ORG: ${orgName}`,
      changes,
    });

    // Build summary
    const summaryParts = [`Created organization: ${orgName}`];
    if (contactsCreated > 0) {
      summaryParts.push(`with ${contactsCreated} contact(s)`);
    }

    return {
      success: true,
      data: {
        orgId,
        orgName,
        contactsCreated,
      },
      changes,
      summary: summaryParts.join(' '),
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to createOrganization input
 * Used by the action registry
 */
export function mapToCreateOrgInput(
  fields: Record<string, any>,
  orgName?: string
): CreateOrganizationInput {
  return {
    orgName: orgName || fields.org_name || '',
    website: fields.website || undefined,
    domainCategory: fields.domain_category || undefined,
    teamSize: fields.team_size ? Number(fields.team_size) : undefined,
    contractValue: fields.contract_value ? Number(fields.contract_value) : undefined,
    description: fields.description || undefined,
    contacts: fields.contacts || undefined,
  };
}

export default createOrganization;
