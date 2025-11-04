# Activity Timeline Components

## Component Hierarchy

```
ActivityTimeline
├── Header (Title, Event Count, Export Buttons)
├── Date Groups (Today, Yesterday, etc.)
│   └── TimelineEvent (repeated)
│       ├── Event Dot with Icon
│       ├── Event Card
│       │   ├── User Avatar
│       │   ├── Description
│       │   ├── Timestamp
│       │   └── Expand Button
│       └── Expandable Details (optional)
│           ├── Comment Text
│           ├── Linked Ticket Info
│           └── Metadata
└── Connecting Lines (between events)
```

## Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│  Activity Timeline                          🔄 📄 📊    │
│  12 events                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ──────────────── Today ────────────────                │
│                                                         │
│  ● ┌──────────────────────────────────────┐            │
│  │ │ 👤 John Doe added comment     10:30 AM│ ▼         │
│  │ └──────────────────────────────────────┘            │
│  │                                                      │
│  ● ┌──────────────────────────────────────┐            │
│  │ │ 👤 Jane Smith changed status   9:15 AM│           │
│  │ │ [New] → [In Progress]                 │           │
│  │ └──────────────────────────────────────┘            │
│  │                                                      │
│  ──────────────── Yesterday ──────────────              │
│  │                                                      │
│  ● ┌──────────────────────────────────────┐            │
│  │ │ 👤 Admin assigned to Jane   3:45 PM   │           │
│  │ └──────────────────────────────────────┘            │
│  │                                                      │
│  ● ┌──────────────────────────────────────┐            │
│    │ 👤 John Doe created ticket   2:00 PM  │           │
│    └──────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Color Guide

### Event Dots (8x8 rounded-full)

```
🔵 Blue    - Created      (bg-blue-500)
🟣 Purple  - Status Change (bg-purple-500)
🟢 Green   - Assigned     (bg-green-500)
⚪ Gray    - Commented     (bg-gray-500)
🟠 Orange  - Linked       (bg-orange-500)
🔵 Teal    - Watched      (bg-teal-500)
```

### Icons (4x4 white)

- Created: `<PlusCircle />`
- Status Changed: `<ArrowRight />`
- Assigned: `<UserPlus />`
- Commented: `<MessageSquare />`
- Linked: `<Link2 />`
- Watched: `<Eye />`

## State Variations

### Loading State
```
┌─────────────────────────────────────┐
│                                     │
│        🔄 Loading activity          │
│           timeline...               │
│                                     │
└─────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────┐
│                                     │
│           🔄                        │
│     No Activity Yet                 │
│  Activity will appear here as       │
│  changes are made to this ticket.   │
│                                     │
└─────────────────────────────────────┘
```

### Expanded Event
```
● ┌────────────────────────────────────┐
│ │ 👤 John Doe added comment   10:30 AM│ ▲
│ ├────────────────────────────────────┤
│ │ ┌────────────────────────────────┐ │
│ │ │ This is the full comment text  │ │
│ │ │ shown when expanded. It can be │ │
│ │ │ multiple lines long.           │ │
│ │ └────────────────────────────────┘ │
│ └────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (> 768px)
- Full width timeline
- Side-by-side export buttons
- Full timestamps

### Mobile (< 768px)
- Stacked layout
- Shortened timestamps
- Stacked export buttons
- Smaller event dots (6x6)

## File Locations

```
/components/support/
├── ActivityTimeline.tsx       # Main component
├── TimelineEvent.tsx          # Single event
├── TicketDetailWithTimeline.tsx # Integration example
├── TIMELINE_QUICK_START.md    # Quick reference
└── README_ACTIVITY_TIMELINE.md # This file

/lib/
├── exportTimeline.ts          # Export utilities
└── support/
    └── activityLogger.ts      # Logging helpers
```

## Import Paths

```typescript
// Main timeline
import { ActivityTimeline } from '@/components/support/ActivityTimeline';

// Single event (if needed separately)
import { TimelineEvent } from '@/components/support/TimelineEvent';

// Export functions
import { exportTimelineToPDF, exportTimelineToCSV } from '@/lib/exportTimeline';

// Activity logging
import {
  logCommentActivity,
  logLinkActivity,
  logWatcherActivity
} from '@/lib/support/activityLogger';
```

## Quick Integration

### Step 1: Add to Page
```tsx
'use client';

import { ActivityTimeline } from '@/components/support/ActivityTimeline';

export default function TicketPage({ params }) {
  return (
    <div className="container">
      <ActivityTimeline
        ticketId={params.id}
        ticketNumber="TKT-001"
      />
    </div>
  );
}
```

### Step 2: Log Activities
```tsx
// When adding a comment
await supabase.from('ticket_comments').insert({...});
await logCommentActivity(ticketId, userId, commentText);

// When linking tickets
await supabase.from('ticket_links').insert({...});
await logLinkActivity(ticketId, userId, linkedTicket, 'blocks');

// When watching
await supabase.from('ticket_watchers').insert({...});
await logWatcherActivity(ticketId, userId);
```

### Step 3: Export (Optional)
```tsx
// Export buttons are included in ActivityTimeline
// Users can click to export PDF or CSV
```

## Customization

### Custom Event Icons
```tsx
// In TimelineEvent.tsx
const customIcons = {
  custom_type: {
    icon: YourIcon,
    color: 'bg-custom-500',
    textColor: 'text-custom-500',
    borderColor: 'border-custom-500',
  }
};
```

### Custom Date Groups
```tsx
// In ActivityTimeline.tsx
const groupActivitiesByDate = () => {
  // Modify grouping logic
  // Add custom date ranges
};
```

## Styling Classes

### Timeline Container
```css
.space-y-6              /* Vertical spacing */
```

### Date Headers
```css
.text-xs                /* Small text */
.font-medium            /* Medium weight */
.text-gray-500          /* Gray color */
.uppercase              /* Uppercase text */
.tracking-wide          /* Letter spacing */
```

### Event Cards
```css
.bg-white               /* White background */
.dark:bg-gray-800       /* Dark mode */
.rounded-lg             /* Rounded corners */
.border                 /* Border */
.border-gray-200        /* Border color */
.shadow-sm              /* Small shadow */
.hover:shadow-md        /* Hover shadow */
.transition-shadow      /* Smooth transition */
```

### Event Dots
```css
.w-8 .h-8              /* Size */
.rounded-full          /* Circle */
.flex items-center     /* Center icon */
.justify-center        /* Center icon */
.shadow-md             /* Shadow */
.ring-4 .ring-white    /* White ring */
```

## Performance

### Optimization Tips
1. Use `React.memo()` for TimelineEvent
2. Virtualize long lists (100+ events)
3. Debounce real-time updates
4. Cache user profile data
5. Lazy load metadata

### Recommended Limits
- Display: 50 events initially
- Load more: Infinite scroll or pagination
- Real-time: 100 concurrent subscriptions
- Export: No limit (generates file)

## Accessibility

- `aria-label` on expand buttons
- Keyboard navigation (Tab, Enter, Space)
- Screen reader announcements
- Focus indicators
- Color + icon + text (not color alone)

## Browser Support

- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Edge: ✅ Full support
- Mobile: ✅ Responsive design

## Common Issues

### Timeline not updating
- Check Supabase subscription
- Verify RLS policies
- Check filter on `ticket_id`

### Export not working
- Check popup blocker (PDF)
- Verify data is valid (CSV)
- Check browser console

### Icons not showing
- Verify `lucide-react` installed
- Check icon imports
- Verify icon names

## Related Components

- `TicketPreviewCard` - Hover preview
- `StatusChangeModal` - Status updates
- `NotificationCenter` - Activity notifications
- `OrganizationPanel` - Organization view

## Further Reading

- Full Documentation: `/ACTIVITY_TIMELINE_FEATURE.md`
- Quick Start: `/TIMELINE_QUICK_START.md`
- Implementation: `/FEATURE_8_IMPLEMENTATION_SUMMARY.md`
- Database Schema: `/supabase/migrations/004_advanced_features.sql`
