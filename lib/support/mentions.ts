import { createClient } from '@/lib/supabase/client';

/**
 * Parse @mentions from comment text
 * Returns array of username strings found in the text
 */
export function parseMentions(text: string): string[] {
  const mentionPattern = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  // Return unique mentions
  return Array.from(new Set(mentions));
}

/**
 * Fetch all users for mention picker
 * Returns list of users with id, email, and name
 */
export async function fetchUsers() {
  try {
    const supabase = createClient();

    // Try to get users from auth.users
    // Note: This requires admin privileges in production
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      // Fallback: return current user only
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return [
          {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || user.user_metadata?.full_name || 'Unknown',
            role: user.user_metadata?.role || 'Team',
          },
        ];
      }
      return [];
    }

    if (data?.users) {
      return data.users.map((user) => ({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Unknown',
        role: user.user_metadata?.role || 'Team',
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in fetchUsers:', error);
    return [];
  }
}

/**
 * Map usernames to user IDs
 * Takes array of usernames and returns array of user IDs
 */
export async function mapUsernamesToIds(usernames: string[]): Promise<string[]> {
  if (usernames.length === 0) return [];

  const users = await fetchUsers();
  const userIds: string[] = [];

  for (const username of usernames) {
    const user = users.find(
      (u) =>
        u.name.toLowerCase() === username.toLowerCase() ||
        u.email.split('@')[0].toLowerCase() === username.toLowerCase()
    );
    if (user) {
      userIds.push(user.id);
    }
  }

  return userIds;
}

/**
 * Create mention notifications for mentioned users
 * Saves to comment_mentions table and creates notifications
 */
export async function createMentionNotifications(
  commentId: string,
  ticketId: string,
  ticketNumber: string,
  mentionedUserIds: string[],
  mentionedByUserId: string,
  mentionedByName: string,
  commentPreview: string
) {
  if (mentionedUserIds.length === 0) return { success: true, created: 0 };

  const supabase = createClient();

  try {
    // 1. Save to comment_mentions table
    const mentionRecords = mentionedUserIds.map((userId) => ({
      comment_id: commentId,
      user_id: userId,
    }));

    const { error: mentionsError } = await supabase
      .from('comment_mentions')
      .insert(mentionRecords);

    if (mentionsError) {
      console.error('Error saving comment mentions:', mentionsError);
      // Continue to create notifications even if mentions table fails
    }

    // 2. Create notifications for each mentioned user (excluding the author)
    const uniqueUserIds = Array.from(
      new Set(mentionedUserIds.filter((id) => id !== mentionedByUserId))
    );

    if (uniqueUserIds.length === 0) {
      return { success: true, created: 0 };
    }

    const notifications = uniqueUserIds.map((userId) => ({
      user_id: userId,
      ticket_id: ticketId,
      type: 'mention' as const,
      message: `${mentionedByName} mentioned you in ${ticketNumber}: ${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}`,
      is_read: false,
    }));

    const { error: notificationsError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationsError) {
      console.error('Error creating mention notifications:', notificationsError);
      throw notificationsError;
    }

    return { success: true, created: uniqueUserIds.length };
  } catch (error) {
    console.error('Error in createMentionNotifications:', error);
    return { success: false, created: 0, error };
  }
}

/**
 * Get users mentioned in a comment
 * Returns list of user details for mentioned users
 */
export async function getMentionedUsers(commentId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('comment_mentions')
      .select('user_id')
      .eq('comment_id', commentId);

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Fetch user details for each mentioned user
    const userIds = data.map((m) => m.user_id);
    const users = await fetchUsers();

    return users.filter((u) => userIds.includes(u.id));
  } catch (error) {
    console.error('Error getting mentioned users:', error);
    return [];
  }
}

/**
 * Check if a user was mentioned in a comment
 */
export async function wasUserMentioned(
  commentId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('comment_mentions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    return !error && data !== null;
  } catch (error) {
    console.error('Error checking mention:', error);
    return false;
  }
}

/**
 * Replace @mentions in text with formatted HTML/React elements
 * This is a helper for rendering mentions as pills
 */
export function formatMentionsInText(text: string): {
  parts: Array<{ type: 'text' | 'mention'; content: string }>;
} {
  const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
  const mentionPattern = /@(\w+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add mention
    parts.push({
      type: 'mention',
      content: match[1], // username without @
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return { parts };
}
