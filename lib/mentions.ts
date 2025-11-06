import { createClient } from '@/lib/supabase/client';

export interface MentionContext {
  type: 'ticket' | 'ticket_comment' | 'internal_note' | 'trial_org_note' | 'meeting_note';
  entityId: string;
  entityTitle?: string;
  url?: string;
}

/**
 * Create notifications for all mentioned users
 */
export async function createMentionNotifications(
  mentionedUserIds: string[],
  currentUserId: string,
  context: MentionContext
) {
  if (mentionedUserIds.length === 0) return;

  const supabase = createClient();

  try {
    // Get current user's name
    const { data: currentUser } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('user_id', currentUserId)
      .single();

    const authorName = currentUser?.full_name || currentUser?.email || 'Someone';

    // Generate notification message based on context
    const getMessage = () => {
      const title = context.entityTitle ? ` "${context.entityTitle}"` : '';
      switch (context.type) {
        case 'ticket':
          return `${authorName} mentioned you in ticket${title}`;
        case 'ticket_comment':
          return `${authorName} mentioned you in a comment on ticket${title}`;
        case 'internal_note':
          return `${authorName} mentioned you in an internal note${title}`;
        case 'trial_org_note':
          return `${authorName} mentioned you in a note on ${context.entityTitle || 'an organization'}`;
        case 'meeting_note':
          return `${authorName} mentioned you in a meeting note${title}`;
        default:
          return `${authorName} mentioned you`;
      }
    };

    const message = getMessage();

    // Create notifications for each mentioned user (except the author)
    const notifications = mentionedUserIds
      .filter(userId => userId !== currentUserId) // Don't notify yourself
      .map(userId => ({
        user_id: userId,
        type: 'mention',
        message,
        ticket_id: context.type.includes('ticket') ? context.entityId : null,
        link_url: context.url || null,
        created_at: new Date().toISOString(),
      }));

    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating mention notifications:', error);
        throw error;
      }

      console.log(`✓ Created ${notifications.length} mention notifications`);
    }
  } catch (error) {
    console.error('Failed to create mention notifications:', error);
    throw error;
  }
}

/**
 * Extract plain text from HTML content (for preview/summary)
 */
export function extractTextFromHTML(html: string): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, ' ');
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value.trim();
}

/**
 * Parse mentioned user names from HTML content for display
 */
export function extractMentionedNames(html: string): string[] {
  const mentionRegex = /<span[^>]*class="[^"]*mention[^"]*"[^>]*data-id="([^"]*)"[^>]*>([^<]*)<\/span>/g;
  const names: string[] = [];
  let match;

  while ((match = mentionRegex.exec(html)) !== null) {
    if (match[2]) {
      names.push(match[2].replace('@', ''));
    }
  }

  return names;
}
