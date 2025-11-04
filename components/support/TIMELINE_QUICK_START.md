# Activity Timeline - Quick Start Guide

## Basic Usage

### 1. Display Activity Timeline

```tsx
import { ActivityTimeline } from '@/components/support/ActivityTimeline';

function TicketDetail({ ticketId, ticketNumber }) {
  return (
    <div>
      <h2>Ticket Activity</h2>
      <ActivityTimeline
        ticketId={ticketId}
        ticketNumber={ticketNumber}
      />
    </div>
  );
}
```

### 2. Log Manual Activities

```tsx
import {
  logCommentActivity,
  logLinkActivity,
  logWatcherActivity
} from '@/lib/support/activityLogger';

// After adding a comment
const handleAddComment = async (ticketId, userId, commentText) => {
  // 1. Save the comment to database
  await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    user_id: userId,
    comment: commentText,
  });

  // 2. Log the activity
  await logCommentActivity(ticketId, userId, commentText);
};

// After linking tickets
const handleLinkTicket = async (ticketId, userId, linkedTicket) => {
  // 1. Save the link to database
  await supabase.from('ticket_links').insert({
    ticket_id: ticketId,
    related_ticket_id: linkedTicket.id,
    link_type: 'blocks',
    created_by: userId,
  });

  // 2. Log the activity
  await logLinkActivity(ticketId, userId, linkedTicket.number, 'blocks');
};

// After adding watcher
const handleWatch = async (ticketId, userId) => {
  // 1. Save the watcher to database
  await supabase.from('ticket_watchers').insert({
    ticket_id: ticketId,
    user_id: userId,
  });

  // 2. Log the activity
  await logWatcherActivity(ticketId, userId);
};
```

### 3. Use Individual Timeline Event

```tsx
import { TimelineEvent } from '@/components/support/TimelineEvent';

function SingleEvent() {
  return (
    <TimelineEvent
      type="status_changed"
      user={{
        name: "John Doe",
        avatar: "https://example.com/avatar.jpg"
      }}
      oldValue="New"
      newValue="In Progress"
      timestamp="2024-01-15T10:30:00Z"
      metadata={{
        user_name: "John Doe",
        changed_by: "admin"
      }}
    />
  );
}
```

### 4. Export Timeline Data

```tsx
import { exportTimelineToPDF, exportTimelineToCSV } from '@/lib/exportTimeline';

// Export to PDF (opens print dialog)
const handleExportPDF = async (activities, ticketNumber) => {
  await exportTimelineToPDF(activities, ticketNumber);
};

// Export to CSV (downloads file)
const handleExportCSV = (activities, ticketNumber) => {
  exportTimelineToCSV(activities, ticketNumber);
};
```

## Activity Types

| Type | Auto-logged? | Icon | Color | When to Use |
|------|--------------|------|-------|-------------|
| `created` | ✅ Yes | PlusCircle | Blue | Ticket creation (automatic) |
| `status_changed` | ✅ Yes | ArrowRight | Purple | Status updates (automatic) |
| `assigned` | ✅ Yes | UserPlus | Green | Assignment changes (automatic) |
| `commented` | ❌ Manual | MessageSquare | Gray | When adding comments |
| `linked` | ❌ Manual | Link2 | Orange | When linking tickets |
| `watched` | ❌ Manual | Eye | Teal | When adding watchers |

## Common Patterns

### Pattern 1: Add Comment with Activity Logging

```tsx
const addComment = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  // Insert comment
  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    user_id: user.id,
    comment: commentText,
  });

  if (!error) {
    // Log activity
    await logCommentActivity(ticketId, user.id, commentText);
  }
};
```

### Pattern 2: Toggle Watch with Activity Logging

```tsx
const toggleWatch = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (isWatching) {
    // Remove watch
    await supabase
      .from('ticket_watchers')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('user_id', user.id);
  } else {
    // Add watch
    await supabase.from('ticket_watchers').insert({
      ticket_id: ticketId,
      user_id: user.id,
    });

    // Log activity
    await logWatcherActivity(ticketId, user.id);
  }
};
```

### Pattern 3: Link Tickets with Activity Logging

```tsx
const linkTickets = async (relatedTicketId, linkType) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Create link
  await supabase.from('ticket_links').insert({
    ticket_id: ticketId,
    related_ticket_id: relatedTicketId,
    link_type: linkType,
    created_by: user.id,
  });

  // Get related ticket number
  const { data: relatedTicket } = await supabase
    .from('tickets')
    .select('ticket_number')
    .eq('id', relatedTicketId)
    .single();

  // Log activity
  await logLinkActivity(
    ticketId,
    user.id,
    relatedTicket.ticket_number,
    linkType
  );
};
```

## Styling

### Custom Timeline Event Colors

```tsx
// In your component
const customEventConfig = {
  custom_event: {
    icon: Star,
    color: 'bg-pink-500',
    textColor: 'text-pink-500',
    borderColor: 'border-pink-500',
  }
};
```

### Dark Mode Support

All components support dark mode automatically:
- White backgrounds become `dark:bg-gray-800`
- Text colors switch to `dark:text-white` or `dark:text-gray-300`
- Borders use `dark:border-gray-700`

## Troubleshooting

### Timeline Not Updating in Real-time

Check Supabase subscription:
```tsx
// Make sure channel is subscribed
useEffect(() => {
  const channel = supabase
    .channel(`ticket-activities-${ticketId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ticket_activities',
      filter: `ticket_id=eq.${ticketId}`,
    }, handleUpdate)
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [ticketId]);
```

### Activities Not Appearing

1. Check database permissions (RLS policies)
2. Verify activity was inserted: Check `ticket_activities` table
3. Ensure `ticketId` matches
4. Check browser console for errors

### Export Not Working

1. **PDF**: Check if popup blocker is enabled
2. **CSV**: Verify data has valid characters
3. Check browser console for errors

## Performance Tips

1. **Limit Activities**: Add pagination for tickets with 100+ activities
2. **Optimize Queries**: Use appropriate indexes
3. **Cache User Data**: Cache user profiles to reduce metadata queries
4. **Debounce Real-time**: Don't update UI on every single change

## Complete Example

See `/components/support/TicketDetailWithTimeline.tsx` for a full working example including:
- Ticket details display
- Comment submission with activity logging
- Watch/unwatch functionality
- Tab navigation
- Loading states
- Error handling

## API Reference

### ActivityTimeline Props

```typescript
{
  ticketId: string;      // Ticket UUID
  ticketNumber: string;  // Display ticket number (e.g., "TKT-001")
}
```

### TimelineEvent Props

```typescript
{
  type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched';
  user: {
    name: string;
    avatar?: string;
  };
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
  timestamp: string;  // ISO 8601 format
}
```

### Activity Logger Functions

```typescript
logTicketActivity(params: {
  ticketId: string;
  userId: string;
  activityType: ActivityType;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }>

logCommentActivity(
  ticketId: string,
  userId: string,
  commentText: string
): Promise<{ success: boolean; error?: string }>

logLinkActivity(
  ticketId: string,
  userId: string,
  linkedTicketNumber: string,
  linkType: 'blocks' | 'blocked_by' | 'related' | 'duplicate'
): Promise<{ success: boolean; error?: string }>

logWatcherActivity(
  ticketId: string,
  userId: string
): Promise<{ success: boolean; error?: string }>
```

## Resources

- Full Documentation: `/ACTIVITY_TIMELINE_FEATURE.md`
- Database Schema: `/supabase/migrations/004_advanced_features.sql`
- Type Definitions: `/lib/supabase/types.ts`
- Example Integration: `/components/support/TicketDetailWithTimeline.tsx`
