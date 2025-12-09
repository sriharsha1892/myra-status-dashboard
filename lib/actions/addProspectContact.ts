/**
 * Add Prospect Contact Action
 * Adds a contact person to a prospect organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type AddProspectContactOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ INPUT SCHEMA ============

export const addProspectContactSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Contact name (required) */
  contactName: z.string().min(1, 'Contact name is required'),

  /** Contact email */
  email: z.string().email('Invalid email address').optional(),

  /** Job title */
  title: z.string().optional(),

  /** Phone number */
  phone: z.string().optional(),

  /** LinkedIn URL */
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),

  /** Is this the primary contact? */
  isPrimaryContact: z.boolean().optional().default(false),

  /** Notes about the contact */
  notes: z.string().optional(),
});

export type AddProspectContactInput = z.infer<typeof addProspectContactSchema>;

// ============ ID GENERATION ============

function generateProspectId(): string {
  return `prospect_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============ ACTION IMPLEMENTATION ============

export const addProspectContact: Action<AddProspectContactInput, AddProspectContactOutput> = {
  name: 'ADD_PROSPECT_CONTACT',
  description: 'Add a contact to a prospect organization',
  schema: addProspectContactSchema,

  async execute(input, context): Promise<ActionResult<AddProspectContactOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = addProspectContactSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const {
      orgId,
      contactName,
      email,
      title,
      phone,
      linkedinUrl,
      isPrimaryContact,
      notes,
    } = validation.data;

    // Generate prospect ID
    const prospectId = generateProspectId();

    // Prepare prospect data
    const prospectData: Record<string, any> = {
      id: prospectId,
      org_id: orgId,
      name: contactName,
      status: 'active',
      is_primary_contact: isPrimaryContact || false,
      created_at: new Date().toISOString(),
    };

    // Add optional fields
    if (email) prospectData.email = email;
    if (title) prospectData.title = title;
    if (phone) prospectData.phone = phone;
    if (linkedinUrl) prospectData.linkedin_url = linkedinUrl;
    if (notes) prospectData.notes = notes;

    // Insert prospect
    const { error: prospectError } = await insertOne(supabase, 'prospects', prospectData);

    if (prospectError) {
      // Check if prospects table doesn't exist yet
      if (prospectError.message?.includes('does not exist')) {
        return failedResult(
          fieldError('orgId', 'Prospects table not yet created. Run database migration first.'),
          'Database migration required'
        );
      }
      return failedResult(prospectError, 'Failed to add prospect contact');
    }

    // Track the insert for undo
    changes.push(trackInsert('prospects', prospectId, prospectData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'contact_added',
      eventCategory: 'engagement',
      title: `Added contact: ${contactName}`,
      description: title ? `${contactName} (${title})` : contactName,
      loggedBy: userId,
      sentiment: 'neutral',
      severity: 'low',
      metadata: {
        prospect_id: prospectId,
        contact_name: contactName,
        title,
        is_primary: isPrimaryContact,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `ADD_PROSPECT_CONTACT: ${contactName}`,
      changes,
    });

    return {
      success: true,
      data: {
        prospectId,
        contactName,
        orgId,
      },
      changes,
      summary: `Added contact ${contactName}${orgName ? ` to ${orgName}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToAddProspectContactInput(
  fields: Record<string, any>,
  orgId: string
): AddProspectContactInput {
  return {
    orgId,
    contactName: fields.contact_name || fields.name || '',
    email: fields.contact_email || fields.email || undefined,
    title: fields.contact_title || fields.title || undefined,
    phone: fields.contact_phone || fields.phone || undefined,
    linkedinUrl: fields.linkedin_url || undefined,
    isPrimaryContact: fields.is_primary_contact || false,
    notes: fields.notes || undefined,
  };
}

export default addProspectContact;
