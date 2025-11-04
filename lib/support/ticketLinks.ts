import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { logLinkActivity } from './activityLogger';
import { notifyWatchers } from './notifications';

type LinkType = 'blocks' | 'blocked_by' | 'related' | 'duplicate';
type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketLink = Database['public']['Tables']['ticket_links']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

interface LinkTicketsParams {
  ticketId: string;
  relatedTicketId: string;
  linkType: LinkType;
  userId: string;
}

interface MergeTicketsParams {
  parentId: string;
  childId: string;
  userId: string;
}

interface LinkedTicketWithDetails extends TicketLink {
  related_ticket?: Ticket;
}

/**
 * Link two tickets together
 * Prevents circular links and duplicate links
 */
export async function linkTickets({
  ticketId,
  relatedTicketId,
  linkType,
  userId,
}: LinkTicketsParams): Promise<{ success: boolean; error?: string; linkId?: string }> {
  const supabase = createClient();

  try {
    // Prevent self-linking
    if (ticketId === relatedTicketId) {
      return { success: false, error: 'Cannot link a ticket to itself' };
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('ticket_links')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('related_ticket_id', relatedTicketId)
      .eq('link_type', linkType)
      .single();

    if (existingLink) {
      return { success: false, error: 'This link already exists' };
    }

    // Check for circular links (A links to B, B links to A)
    const { data: circularLink } = await supabase
      .from('ticket_links')
      .select('id')
      .eq('ticket_id', relatedTicketId)
      .eq('related_ticket_id', ticketId)
      .single();

    if (circularLink) {
      return { success: false, error: 'Circular link detected. This relationship already exists in reverse.' };
    }

    // Verify both tickets exist
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, ticket_number')
      .in('id', [ticketId, relatedTicketId]);

    if (ticketsError || !tickets || tickets.length !== 2) {
      return { success: false, error: 'One or both tickets do not exist' };
    }

    // Create the link
    const { data: newLink, error: linkError } = await supabase
      .from('ticket_links')
      .insert({
        ticket_id: ticketId,
        related_ticket_id: relatedTicketId,
        link_type: linkType,
        created_by: userId,
      })
      .select()
      .single();

    if (linkError) throw linkError;

    // Get ticket numbers for logging
    const ticket1 = tickets.find(t => t.id === ticketId);
    const ticket2 = tickets.find(t => t.id === relatedTicketId);

    // Log activity for both tickets
    if (ticket1 && ticket2) {
      await logLinkActivity(ticketId, userId, ticket2.ticket_number, linkType);
      await logLinkActivity(relatedTicketId, userId, ticket1.ticket_number,
        linkType === 'blocks' ? 'blocked_by' : linkType === 'blocked_by' ? 'blocks' : linkType);

      // Notify watchers of both tickets
      await notifyWatchers(
        ticketId,
        'status_change',
        `Ticket ${ticket1.ticket_number} was linked to ${ticket2.ticket_number} (${linkType})`,
        userId
      );
      await notifyWatchers(
        relatedTicketId,
        'status_change',
        `Ticket ${ticket2.ticket_number} was linked to ${ticket1.ticket_number} (${linkType})`,
        userId
      );
    }

    return { success: true, linkId: newLink.id };
  } catch (error) {
    console.error('Error linking tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link tickets',
    };
  }
}

/**
 * Merge two tickets together
 * Combines comments, watchers, and marks child as closed
 */
export async function mergeTickets({
  parentId,
  childId,
  userId,
}: MergeTicketsParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get both tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .in('id', [parentId, childId]);

    if (ticketsError || !tickets || tickets.length !== 2) {
      return { success: false, error: 'One or both tickets do not exist' };
    }

    const parentTicket = tickets.find(t => t.id === parentId)!;
    const childTicket = tickets.find(t => t.id === childId)!;

    // 1. Copy all comments from child to parent
    const { data: childComments, error: commentsError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', childId);

    if (commentsError) throw commentsError;

    if (childComments && childComments.length > 0) {
      // Add a merge marker comment to parent
      await supabase.from('ticket_comments').insert({
        ticket_id: parentId,
        user_id: userId,
        comment: `--- Merged from ${childTicket.ticket_number} ---`,
        is_internal: true,
      });

      // Copy all comments
      const commentsToInsert = childComments.map(comment => ({
        ticket_id: parentId,
        user_id: comment.user_id,
        comment: comment.comment,
        is_internal: comment.is_internal,
        created_at: comment.created_at,
      }));

      const { error: insertCommentsError } = await supabase
        .from('ticket_comments')
        .insert(commentsToInsert);

      if (insertCommentsError) throw insertCommentsError;
    }

    // 2. Copy all watchers from child to parent (avoid duplicates)
    const { data: childWatchers, error: watchersError } = await supabase
      .from('ticket_watchers')
      .select('user_id')
      .eq('ticket_id', childId);

    if (watchersError) throw watchersError;

    if (childWatchers && childWatchers.length > 0) {
      // Get existing parent watchers
      const { data: parentWatchers } = await supabase
        .from('ticket_watchers')
        .select('user_id')
        .eq('ticket_id', parentId);

      const existingWatcherIds = parentWatchers?.map(w => w.user_id) || [];

      // Only add watchers that don't already exist
      const newWatchers = childWatchers
        .filter(w => !existingWatcherIds.includes(w.user_id))
        .map(w => ({
          ticket_id: parentId,
          user_id: w.user_id,
        }));

      if (newWatchers.length > 0) {
        const { error: insertWatchersError } = await supabase
          .from('ticket_watchers')
          .insert(newWatchers);

        if (insertWatchersError) throw insertWatchersError;
      }
    }

    // 3. Update child ticket status to Closed
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'Closed',
        updated_at: new Date().toISOString(),
        description: `${childTicket.description}\n\n[MERGED INTO ${parentTicket.ticket_number}]`,
      })
      .eq('id', childId);

    if (updateError) throw updateError;

    // 4. Add merge note to parent ticket description
    const { error: parentUpdateError } = await supabase
      .from('tickets')
      .update({
        description: `${parentTicket.description}\n\n[MERGED FROM ${childTicket.ticket_number}]`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parentId);

    if (parentUpdateError) throw parentUpdateError;

    // 5. Log activity for both tickets
    await logLinkActivity(parentId, userId, childTicket.ticket_number, 'duplicate');
    await logLinkActivity(childId, userId, parentTicket.ticket_number, 'duplicate');

    // 6. Notify all watchers (now combined)
    await notifyWatchers(
      parentId,
      'status_change',
      `Ticket ${childTicket.ticket_number} was merged into ${parentTicket.ticket_number}`,
      userId
    );

    return { success: true };
  } catch (error) {
    console.error('Error merging tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to merge tickets',
    };
  }
}

/**
 * Get all linked tickets for a specific ticket
 */
export async function getLinkedTickets(
  ticketId: string
): Promise<{ success: boolean; links?: LinkedTicketWithDetails[]; error?: string }> {
  const supabase = createClient();

  try {
    // Get all links where this ticket is the source
    const { data: outgoingLinks, error: outgoingError } = await supabase
      .from('ticket_links')
      .select('*')
      .eq('ticket_id', ticketId);

    if (outgoingError) throw outgoingError;

    // Get all links where this ticket is the target (for bidirectional relationships)
    const { data: incomingLinks, error: incomingError } = await supabase
      .from('ticket_links')
      .select('*')
      .eq('related_ticket_id', ticketId);

    if (incomingError) throw incomingError;

    // Combine and fetch related ticket details
    const allLinks = [...(outgoingLinks || []), ...(incomingLinks || [])];

    if (allLinks.length === 0) {
      return { success: true, links: [] };
    }

    // Get unique related ticket IDs
    const relatedIds = Array.from(
      new Set(
        allLinks.map(link =>
          link.ticket_id === ticketId ? link.related_ticket_id : link.ticket_id
        )
      )
    );

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .in('id', relatedIds);

    if (ticketsError) throw ticketsError;

    // Map links with ticket details
    const linksWithDetails = allLinks.map(link => {
      const relatedTicketId = link.ticket_id === ticketId
        ? link.related_ticket_id
        : link.ticket_id;

      return {
        ...link,
        related_ticket: tickets?.find(t => t.id === relatedTicketId),
      };
    });

    return { success: true, links: linksWithDetails };
  } catch (error) {
    console.error('Error fetching linked tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch links',
    };
  }
}

/**
 * Remove a ticket link
 */
export async function unlinkTickets(
  linkId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get link details before deleting (for logging)
    const { data: link, error: getLinkError } = await supabase
      .from('ticket_links')
      .select('*, tickets!ticket_links_ticket_id_fkey(ticket_number), tickets!ticket_links_related_ticket_id_fkey(ticket_number)')
      .eq('id', linkId)
      .single();

    if (getLinkError) throw getLinkError;

    // Delete the link
    const { error: deleteError } = await supabase
      .from('ticket_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) throw deleteError;

    // Log activity (optional - you could create a logUnlinkActivity function)
    if (link) {
      await logLinkActivity(
        link.ticket_id,
        userId,
        'removed link',
        'related'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error unlinking tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink tickets',
    };
  }
}

/**
 * Check if a ticket is marked as duplicate
 */
export async function isDuplicate(ticketId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from('ticket_links')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('link_type', 'duplicate')
      .limit(1)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get ticket cluster (parent + all related tickets)
 */
export async function getTicketCluster(
  ticketId: string
): Promise<{ success: boolean; cluster?: Ticket[]; error?: string }> {
  const supabase = createClient();

  try {
    const result = await getLinkedTickets(ticketId);

    if (!result.success || !result.links) {
      return { success: false, error: result.error };
    }

    // Get the main ticket
    const { data: mainTicket, error: mainError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (mainError) throw mainError;

    const cluster = [
      mainTicket,
      ...(result.links
        .filter(link => link.related_ticket)
        .map(link => link.related_ticket!) || []),
    ];

    return { success: true, cluster };
  } catch (error) {
    console.error('Error fetching ticket cluster:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cluster',
    };
  }
}
