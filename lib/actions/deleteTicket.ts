/**
 * Delete Ticket Action
 * Deletes a support ticket
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type DatabaseChange,
  TABLES,
  fetchById,
  deleteById,
  failedResult,
  validationError,
  storeUndoInfo,
  trackDelete,
} from './_shared';

// ============ OUTPUT TYPE ============

export interface DeleteTicketOutput {
  ticketId: string;
  title: string;
}

// ============ INPUT SCHEMA ============

export const deleteTicketSchema = z.object({
  ticketId: z.string().min(1, 'Ticket is required'),
});

export type DeleteTicketInput = z.infer<typeof deleteTicketSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteTicket: Action<DeleteTicketInput, DeleteTicketOutput> = {
  name: 'DELETE_TICKET',
  description: 'Delete a support ticket',
  schema: deleteTicketSchema,

  async execute(input, context): Promise<ActionResult<DeleteTicketOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteTicketSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { ticketId } = validation.data;

    // Fetch the ticket first
    const { data: ticket, error: fetchError } = await fetchById(
      supabase,
      TABLES.TICKETS,
      ticketId
    );

    if (fetchError || !ticket) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Ticket not found' },
        'Ticket not found'
      );
    }

    const ticketData = ticket as any;
    const title = ticketData.title || ticketData.subject || 'Untitled';

    // Delete the ticket
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.TICKETS,
      ticketId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete ticket');
    }

    // Track the deletion
    changes.push(trackDelete(TABLES.TICKETS, ticketId, ticketData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_TICKET: ${title}`,
      changes,
    });

    return {
      success: true,
      data: {
        ticketId,
        title,
      },
      changes,
      summary: `Deleted ticket "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteTicketInput(
  fields: Record<string, any>,
  ticketId?: string
): DeleteTicketInput {
  return {
    ticketId: ticketId || fields.ticket_id || fields.ticketId,
  };
}

export default deleteTicket;
