# Mention & Tagging System

This document describes the mention and tagging system for the Global Resources platform.

## Overview

The platform supports mentioning different entity types in discussions, Q&A, and comments:

- **@users**: Mention any user in the system
- **@trial-org**: Mention trial organizations
- **@account-manager**: Mention specific account managers

## Components

### 1. MentionTextEditor

**File:** `components/MentionTextEditor.tsx`

Basic rich text editor with user mentions using TipTap.

**Features:**
- Rich text editing (bold, italic, underline, lists, links, tables, code)
- User mentions with @ trigger
- Syntax highlighting for code blocks
- Markdown support
- Real-time mention detection
- Beautiful dropdown with user avatars

**Usage:**
```tsx
import MentionTextEditor from '@/components/MentionTextEditor';

<MentionTextEditor
  content={initialContent}
  placeholder="Type @ to mention someone..."
  onSubmit={(html, mentionedUserIds) => {
    // html: Rich HTML content
    // mentionedUserIds: Array of user IDs mentioned
  }}
  onChange={(html, mentionedUserIds) => {
    // Real-time updates
  }}
  minHeight="120px"
  showToolbar={true}
/>
```

### 2. EnhancedMentionTextEditor

**File:** `components/EnhancedMentionTextEditor.tsx`

Wrapper around MentionTextEditor that adds support for multiple entity types.

**Features:**
- All features of MentionTextEditor
- Support for @trial-org mentions
- Support for @account-manager mentions
- Visual hints showing available mention types
- Separates mentions by entity type in callbacks

**Usage:**
```tsx
import EnhancedMentionTextEditor from '@/components/EnhancedMentionTextEditor';

<EnhancedMentionTextEditor
  content={initialContent}
  placeholder="Type @ to mention users, trial orgs, or account managers..."
  onSubmit={(html, mentions) => {
    // mentions.users: Array of user IDs
    // mentions.trial_orgs: Array of trial org IDs
    // mentions.account_managers: Array of account manager IDs
  }}
  enableUserMentions={true}
  enableTrialOrgMentions={true}
  enableAccountManagerMentions={true}
  showToolbar={true}
/>
```

## Mention ID Format

To support multiple entity types with a single mention system, we use prefixed IDs:

```
user:123456          // Regular user
trial_org:org-789    // Trial organization
account_manager:am-456  // Account manager
```

## Database Schema

### Mention Storage

Mentions are stored in the `resource_discussions` table:

```sql
-- Example content structure
{
  "title": "Discussion Title",
  "content": "Hey @JohnDoe, can you check with @trial-org:Acme and @account-manager:SarahSmith?",
  "tags": ["question", "support"],
  "mentioned_entities": {
    "users": ["user-id-1"],
    "trial_orgs": ["org-id-1"],
    "account_managers": ["am-id-1"]
  }
}
```

### Notification Triggers

When an entity is mentioned:

1. **User Mention**: Create notification for the mentioned user
2. **Trial Org Mention**: Create notification for the org's account manager
3. **Account Manager Mention**: Create notification for that account manager

## Implementation Status

### Current Status

✅ **Completed:**
- MentionTextEditor with user mentions
- Rich text editing features
- TipTap integration
- Mention dropdown with user search
- EnhancedMentionTextEditor wrapper component
- Documentation

⏳ **In Progress:**
- Full multi-entity dropdown (requires custom TipTap extension)
- Trial organization search integration
- Account manager search integration

🔜 **Planned:**
- Separate @ triggers for different entity types (@, #, etc.)
- Visual distinction in mention pills (colors, icons)
- Mention analytics (who gets mentioned most)
- Mention permissions (who can mention whom)

### Current Implementation

The current system supports user mentions fully. To add trial org and account manager mentions:

**Approach 1: Unified Search (Recommended)**

Modify `fetchUsers()` in MentionTextEditor to also fetch trial orgs and account managers:

```tsx
const fetchEntities = async (query: string) => {
  // Fetch users
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(5);

  // Fetch trial orgs
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name')
    .ilike('org_name', `%${query}%`)
    .limit(5);

  // Fetch account managers
  const { data: ams } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('role', 'Account Manager')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(5);

  // Combine and format
  return [
    ...users.map(u => ({ id: `user:${u.id}`, label: u.full_name, type: 'user' })),
    ...orgs.map(o => ({ id: `trial_org:${o.org_id}`, label: o.org_name, type: 'trial_org' })),
    ...ams.map(a => ({ id: `account_manager:${a.id}`, label: a.full_name, type: 'account_manager' })),
  ];
};
```

**Approach 2: Multiple Triggers**

Create separate mention extensions for different triggers:
- `@` for users
- `#` for trial organizations
- `$` for account managers

This requires custom TipTap extension configuration.

## UI/UX Patterns

### Mention Pills

Current styling:
```css
.mention {
  background: #dbeafe;  /* Light blue */
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 500;
}
```

Proposed entity-specific styling:
```css
/* User mentions */
.mention[data-type="user"] {
  background: #dbeafe;
  color: #1e40af;
}

/* Trial org mentions */
.mention[data-type="trial_org"] {
  background: #dcfce7;
  color: #15803d;
}

/* Account manager mentions */
.mention[data-type="account_manager"] {
  background: #fef3c7;
  color: #b45309;
}
```

### Dropdown UI

Add visual icons to distinguish entity types:
- 👤 User
- 🏢 Trial Organization
- ⭐ Account Manager

## Backend Integration

### API Endpoints

**Create Discussion with Mentions:**

```typescript
// POST /api/resources/discussions
{
  "content": "...",
  "mentioned_entities": {
    "users": ["user-id-1", "user-id-2"],
    "trial_orgs": ["org-id-1"],
    "account_managers": ["am-id-1"]
  }
}
```

**Process Mentions:**

```typescript
// Backend processing
async function processMentions(discussionId, mentions) {
  // Create user notifications
  for (const userId of mentions.users) {
    await createNotification({
      userId,
      type: 'mention',
      entityId: discussionId,
      entityType: 'discussion',
    });
  }

  // Create org notifications (notify account manager)
  for (const orgId of mentions.trial_orgs) {
    const org = await getOrganization(orgId);
    if (org.account_manager_id) {
      await createNotification({
        userId: org.account_manager_id,
        type: 'org_mention',
        entityId: discussionId,
        entityType: 'discussion',
        metadata: { orgId },
      });
    }
  }

  // Create account manager notifications
  for (const amId of mentions.account_managers) {
    await createNotification({
      userId: amId,
      type: 'mention',
      entityId: discussionId,
      entityType: 'discussion',
    });
  }
}
```

## Testing

### Manual Testing

1. **User Mentions:**
   - Type @ in editor
   - Search for a user
   - Select user from dropdown
   - Verify mention pill appears
   - Submit and check notification created

2. **Trial Org Mentions:**
   - Type @ in editor
   - Search for an organization name
   - Select org from dropdown
   - Verify mention pill with org styling
   - Submit and check account manager notified

3. **Account Manager Mentions:**
   - Type @ in editor
   - Filter to account managers
   - Select account manager
   - Verify mention pill
   - Submit and check notification

### Automated Testing

```typescript
describe('Enhanced Mention System', () => {
  it('should detect user mentions', () => {
    const html = '<p>Hey <span class="mention" data-id="user:123">@John</span></p>';
    const mentions = extractMentionsFromHTML(html);
    expect(mentions.users).toContain('123');
  });

  it('should detect trial org mentions', () => {
    const html = '<p>Contact <span class="mention" data-id="trial_org:org-456">@Acme</span></p>';
    const mentions = extractMentionsFromHTML(html);
    expect(mentions.trial_orgs).toContain('org-456');
  });

  it('should create notifications for all mention types', async () => {
    await createDiscussion({
      content: 'Test',
      mentions: {
        users: ['user-1'],
        trial_orgs: ['org-1'],
        account_managers: ['am-1'],
      },
    });

    // Verify 3 notifications created
    const notifications = await getNotifications();
    expect(notifications).toHaveLength(3);
  });
});
```

## Best Practices

1. **Always validate mentioned entity exists** before creating notifications
2. **Check permissions** - can user mention this entity?
3. **Rate limit** mentions to prevent spam
4. **Group notifications** - don't spam users with multiple mentions in same thread
5. **Allow disabling** mention notifications in user preferences

## Future Enhancements

1. **Smart Suggestions**: Suggest relevant entities based on context
2. **Recent Mentions**: Show recently mentioned entities first
3. **Mention Analytics**: Track mention patterns for insights
4. **Bulk Mentions**: Mention multiple entities at once with special syntax
5. **Mention Templates**: Save common mention patterns (e.g., "escalation team")

## Resources

- [TipTap Documentation](https://tiptap.dev/)
- [TipTap Mention Extension](https://tiptap.dev/api/nodes/mention)
- [Tippy.js (Dropdown Library)](https://atomiks.github.io/tippyjs/)
