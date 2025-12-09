/**
 * Create Ticket Action
 * Creates a support ticket
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateTicketOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  ticketCreatedEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ TICKET CONSTANTS ============

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_CATEGORIES = ['bug', 'feature', 'question', 'other'] as const;

export type TicketPriority = typeof TICKET_PRIORITIES[number];
export type TicketCategory = typeof TICKET_CATEGORIES[number];

// ============ INPUT SCHEMA ============

export const createTicketSchema = z.object({
  /** Ticket title (required) */
  title: z.string().min(1, 'Ticket title is required').max(500),

  /** Ticket description */
  description: z.string().max(10000).optional(),

  /** Priority level */
  priority: z.string().default('medium'),

  /** Ticket category */
  category: z.string().default('other'),

  /** Organization ID (optional) */
  orgId: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// ============ ACTION IMPLEMENTATION ============

export const createTicket: Action<CreateTicketInput, CreateTicketOutput> = {
  name: 'CREATE_TICKET',
  description: 'Create a support ticket',
  schema: createTicketSchema,

  async execute(input, context): Promise<ActionResult<CreateTicketOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    const validation = createTicketSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { title, description, priority, category, orgId } = validation.data;

    const ticketData: Record<string, any> = {
      title,
      description: description || '',
      status: 'open',
      priority,
      category,
      created_by: userId,
      source: 'command_interface',
      created_at: new Date().toISOString(),
    };

    if (orgId || context.orgId) {
      ticketData.org_id = orgId || context.orgId;
    }

    const { data: ticket, error } = await insertOne(supabase, TABLES.TICKETS, ticketData);

    if (error || !ticket) {
      return failedResult(error || { code: 'DATABASE_ERROR', message: 'Failed to create ticket' }, 'Failed to create ticket');
    }

    const ticketId = (ticket as any).id;
    changes.push(trackInsert(TABLES.TICKETS, ticketId, ticketData));

    // Create timeline event if org context exists
    if (ticketData.org_id) {
      const timelineResult = await createTimelineEvent(
        supabase,
        ticketCreatedEvent(ticketData.org_id, title, priority, userId)
      );
      if (timelineResult.change) changes.push(timelineResult.change);
    }

    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CREATE_TICKET: ${title}`,
      changes,
    });

    return {
      success: true,
      data: { ticketId, title },
      changes,
      summary: `Created ticket: "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToCreateTicketInput(fields: Record<string, any>, orgId?: string): CreateTicketInput {
  return {
    title: fields.ticket_title || '',
    description: fields.ticket_description || fields.details || undefined,
    priority: fields.ticket_priority || 'medium',
    category: fields.ticket_category || 'other',
    orgId: orgId || fields.org_id || undefined,
  };
}

export default createTicket;
