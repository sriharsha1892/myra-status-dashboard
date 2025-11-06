# Feature #8: Activity Timeline

Complete implementation of the Activity Timeline feature for the myRA AI Support System.

## Overview

The Activity Timeline provides a comprehensive audit trail for all ticket activities, with visual timeline representation, date grouping, and export capabilities.

## Components Created

### 1. **TimelineEvent.tsx** (`/components/support/TimelineEvent.tsx`)

Single event component with expandable details.

**Features:**
- Color-coded event types with icons
- User avatar display
- Expandable details section
- Smart descriptions for each activity type
- Responsive hover states

**Event Types:**
- `created` → PlusCircle icon (blue)
- `status_changed` → ArrowRight icon (purple)
- `assigned` → UserPlus icon (green)
- `commented` → MessageSquare icon (gray)
- `linked` → Link2 icon (orange)
- `watched` → Eye icon (teal)

**Props:**
```typescript
interface TimelineEventProps {
  type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched';
  user: {
    name: string;
    avatar?: string;
  };
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
  timestamp: string;
}
```

### 2. **ActivityTimeline.tsx** (`/components/support/ActivityTimeline.tsx`)

Main timeline component with date grouping and real-time updates.

**Features:**
- Vertical timeline with connecting lines
- Date-based grouping: "Today", "Yesterday", "This Week", "This Month", etc.
- Real-time updates via Supabase subscriptions
- Export to PDF/CSV
- Refresh functionality
- Loading and empty states

**Props:**
```typescript
interface ActivityTimelineProps {
  ticketId: string;
  ticketNumber: string;
}
```

**Usage:**
```tsx
import { ActivityTimeline } from '@/components/support/ActivityTimeline';

<ActivityTimeline
  ticketId="uuid-here"
  ticketNumber="TKT-001"
/>
```

### 3. **exportTimeline.ts** (`/lib/exportTimeline.ts`)

Export utilities for generating PDF and CSV audit logs.

**Functions:**

- `exportTimelineToCSV(activities, ticketNumber)` - Downloads CSV file
- `exportTimelineToPDF(activities, ticketNumber)` - Opens print dialog for PDF
- `generatePrintableHTML(activities, ticketNumber)` - Creates formatted HTML
- `getActivityDescription(activity)` - Generates human-readable descriptions
- `formatActivityType(type)` - Formats activity type for display

**CSV Format:**
```csv
Timestamp,Activity Type,User,Old Value,New Value,Details
2024-01-15 10:30:00,Created,John Doe,,,{"user_name":"John Doe"}
2024-01-15 10:35:00,Status Changed,Jane Smith,New,In Progress,{"user_name":"Jane Smith"}
```

**PDF Features:**
- Professional formatting with color-coded event types
- Complete metadata display
- Branded header and footer
- Print-optimized layout
- Page break handling

### 4. **activityLogger.ts** (`/lib/support/activityLogger.ts`)

Helper functions for manually logging activities.

**Functions:**

- `logTicketActivity()` - Generic activity logger
- `logCommentActivity()` - Log comment events
- `logLinkActivity()` - Log ticket linking
- `logWatcherActivity()` - Log watcher additions
- `bulkLogActivities()` - Batch logging for migrations

**Usage:**
```typescript
import { logCommentActivity, logWatcherActivity } from '@/lib/support/activityLogger';

// Log a comment
await logCommentActivity(ticketId, userId, commentText);

// Log a watcher
await logWatcherActivity(ticketId, userId);

// Log a link
await logLinkActivity(ticketId, userId, 'TKT-002', 'blocks');
```

## Database Schema

The `ticket_activities` table is defined in `/supabase/migrations/004_advanced_features.sql`:

```sql
CREATE TABLE IF NOT EXISTS ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  activity_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_ticket_activities_ticket_id` - Fast lookup by ticket
- `idx_ticket_activities_created_at` - Chronological ordering

## Activity Types

### Auto-Logged (via Database Triggers)

These are automatically logged by the database:

1. **created** - When a ticket is created
2. **status_changed** - When ticket status changes
3. **assigned** - When ticket is assigned to someone

### Manual Logging Required

Use `activityLogger.ts` functions for these:

4. **commented** - When a comment is added
5. **linked** - When tickets are linked
6. **watched** - When a user starts watching

## Visual Design

### Colors
- Blue (`bg-blue-500`) - Created
- Purple (`bg-purple-500`) - Status Changed
- Green (`bg-green-500`) - Assigned
- Gray (`bg-gray-500`) - Commented
- Orange (`bg-orange-500`) - Linked
- Teal (`bg-teal-500`) - Watched

### Layout
- Timeline line: `border-l-2 border-gray-200`
- Event dots: `w-8 h-8 rounded-full` with bg color
- Icons: `w-4 h-4` inside dots (white)
- Spacing: `gap-4` between events
- Date headers: `text-xs font-medium text-gray-500 uppercase`

### Interactions
- Click event to expand/collapse details
- Hover effects on cards
- Real-time updates animate in
- Export buttons in header

## Integration Example

See `/components/support/TicketDetailWithTimeline.tsx` for a complete example showing:

- Loading ticket data
- Displaying ticket details
- Adding comments with activity logging
- Watch/unwatch functionality
- Tab navigation between details and timeline

## Real-time Updates

The timeline automatically updates when new activities are created:

```typescript
const channel = supabase
  .channel(`ticket-activities-${ticketId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ticket_activities',
    filter: `ticket_id=eq.${ticketId}`,
  }, (payload) => {
    // Handle new activity
  })
  .subscribe();
```

## Export Functionality

### CSV Export
- Downloads immediately
- Includes all activity data
- Machine-readable format
- Filename: `{ticketNumber}_activity_log_{date}.csv`

### PDF Export
- Opens browser print dialog
- Professional formatting
- Human-readable format
- Includes branding and metadata
- User can save as PDF or print

## Type Definitions

Updated `/lib/supabase/types.ts` to include:

```typescript
ticket_activities: {
  Row: {
    id: string
    ticket_id: string
    user_id: string | null
    activity_type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched'
    old_value: string | null
    new_value: string | null
    metadata: Record<string, any> | null
    created_at: string
  }
  // ... Insert and Update types
}
```

## Metadata Structure

Activities can include enriched metadata:

```typescript
{
  user_name: "John Doe",          // Display name
  user_avatar: "https://...",     // Avatar URL
  comment_preview: "First 100...", // For comments
  linked_ticket: "TKT-002",       // For links
  link_type: "blocks",            // Relationship type
  // ... any custom fields
}
```

## Best Practices

1. **Always log manual activities**: Use the helper functions for `commented`, `linked`, and `watched` events
2. **Include metadata**: Add context to help future debugging
3. **Keep comments preview**: Store first 200 chars in `new_value` for quick display
4. **Use transactions**: When updating tickets and logging activities together
5. **Handle errors**: Activity logging should not block main operations

## Testing Checklist

- [ ] Timeline displays all activity types correctly
- [ ] Date grouping works (Today, Yesterday, etc.)
- [ ] Expandable details show/hide properly
- [ ] Real-time updates appear immediately
- [ ] CSV export downloads with correct data
- [ ] PDF export formats properly
- [ ] Empty state shows when no activities
- [ ] Loading state displays during fetch
- [ ] Refresh button updates timeline
- [ ] Icons and colors match specifications
- [ ] Dark mode works correctly
- [ ] Mobile responsive layout

## Files Created

1. `/components/support/TimelineEvent.tsx` - Single event component
2. `/components/support/ActivityTimeline.tsx` - Main timeline component
3. `/lib/exportTimeline.ts` - Export utilities
4. `/lib/support/activityLogger.ts` - Activity logging helpers
5. `/components/support/TicketDetailWithTimeline.tsx` - Integration example
6. `/ACTIVITY_TIMELINE_FEATURE.md` - This documentation

## Files Modified

1. `/lib/supabase/types.ts` - Added `ticket_activities` table types

## Dependencies Used

- `lucide-react` (v0.552.0) - Icons
- `date-fns` - Date formatting and grouping
- `@supabase/supabase-js` - Database and real-time
- `clsx` - Class name utilities

## Next Steps

1. Integrate into ticket detail pages
2. Add activity logging to comment submission handlers
3. Add activity logging to ticket linking features
4. Add activity logging to watcher functionality
5. Test export functionality across browsers
6. Add activity filtering options (future enhancement)
7. Add activity search (future enhancement)

## Support

For questions or issues with the Activity Timeline feature, refer to:
- Database schema: `/supabase/migrations/004_advanced_features.sql`
- Main documentation: `/SUPPORT_SETUP.md`
- Type definitions: `/lib/supabase/types.ts`
