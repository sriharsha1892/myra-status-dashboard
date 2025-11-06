# Support Ticketing System - Enhancements Guide

## Overview

This document describes the major enhancements added to the myRA AI Support Ticketing System, including implementation details, usage, and configuration.

---

## 🔔 1. In-App Notifications

### What it does
Real-time notification system that alerts users about ticket activities:
- New ticket assignments
- Status changes on watched tickets
- New comments on tickets
- @mentions in comments (future)

### Features
- **Bell indicator** with unread count badge in navbar
- **Dropdown panel** showing recent notifications (limit: 50)
- **Mark as read** individually or all at once
- **Real-time updates** via Supabase subscriptions
- **Click to navigate** directly to related ticket

### Implementation
**Component:** `components/support/NotificationCenter.tsx`
**Hook:** `hooks/useNotifications.ts`
**Database:** `notifications` table

**Usage in code:**
```tsx
import { NotificationCenter } from '@/components/support/NotificationCenter';

// In header
<NotificationCenter />
```

**Database schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  ticket_id UUID REFERENCES tickets,
  type TEXT CHECK (type IN ('assigned', 'comment', 'mention', 'status_change')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Creating Notifications Programmatically
```typescript
// Example: Create notification when status changes
await supabase.from('notifications').insert({
  user_id: assignedUserId,
  ticket_id: ticketId,
  type: 'status_change',
  message: `Ticket ${ticketNumber} status changed to ${newStatus}`,
});
```

---

## 🏢 2. Organization Insights Panel

### What it does
Side panel that appears when clicking any organization name, showing:
- Trial status with days remaining
- Total tickets (open/closed counts)
- Average resolution time
- Top 5 ticket categories breakdown
- Recent tickets (last 5)

### Features
- **Slide-in animation** from right side
- **Click organization name** in dashboard table to open
- **Click ticket** in panel to open ticket detail
- **Click outside** or X button to close
- **Mobile-responsive** - full width on mobile, 480px on desktop

### Implementation
**Component:** `components/support/OrganizationPanel.tsx`

**Usage:**
```tsx
<OrganizationPanel
  organizationName="Acme Corp"
  isOpen={true}
  onClose={() => setSelectedOrganization(null)}
  onTicketClick={(ticket) => setSelectedTicket(ticket)}
/>
```

**Requirements:**
- Organization must exist in `organizations` table
- Requires `trial_start_date` and `trial_end_date` fields

### Calculations
- **Days Remaining:** `differenceInDays(trial_end_date, now)`
- **Open Tickets:** Status not in ['Resolved', 'Closed']
- **Avg Resolution Time:** Mock data currently (needs `resolved_at` timestamps)

---

## 💬 3. Status Change with Comment Prompts

### What it does
When changing ticket status, prompts user to add context:
- **Resolved** → "Add resolution note?"
- **Waiting on User** → "What info do you need?"
- **Closed** → "Add closing note?"
- **In Progress** → "Add a note about progress?"

### Features
- **Optional comments** - can skip if not needed
- **Auto-creates comment** with "Status changed to X: [comment]" format
- **Smooth modal** with textarea
- **Keyboard shortcuts** - Escape to cancel, Enter to submit

### Implementation
**Component:** `components/support/StatusChangeModal.tsx`

**Usage:**
```tsx
<StatusChangeModal
  isOpen={true}
  onClose={() => setModal({ isOpen: false })}
  currentStatus="New"
  newStatus="In Progress"
  onConfirm={(comment) => {
    await updateStatus(ticketId, newStatus, comment);
  }}
/>
```

**Database integration:**
```typescript
// Comment is automatically added if provided
if (comment) {
  await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    user_id: user.id,
    comment: `Status changed to ${newStatus}: ${comment}`,
  });
}
```

---

## 🔗 4. Ticket Dependencies/Links

### What it does
Link tickets together to show relationships:
- **Blocks** - This ticket blocks another
- **Blocked by** - This ticket is blocked by another
- **Related to** - General relationship
- **Duplicate of** - Marks duplicate tickets

### Features
- **Search tickets** by number or description
- **Color-coded badges** for link types
- **Add/remove links** easily
- **Shows in ticket detail** modal
- **Prevents self-linking** via database constraint

### Implementation
**Component:** `components/support/TicketLinks.tsx`

**Usage:**
```tsx
<TicketLinks
  ticketId="uuid-123"
  ticketNumber="TKT-001"
/>
```

**Database schema:**
```sql
CREATE TABLE ticket_links (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES tickets,
  related_ticket_id UUID REFERENCES tickets,
  link_type TEXT CHECK (link_type IN ('blocks', 'blocked_by', 'related', 'duplicate')),
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_link CHECK (ticket_id != related_ticket_id)
);
```

### Color Coding
- **Blocks**: Red (`bg-red-100 text-red-700`)
- **Blocked by**: Orange (`bg-orange-100 text-orange-700`)
- **Related**: Blue (`bg-blue-100 text-blue-700`)
- **Duplicate**: Purple (`bg-purple-100 text-purple-700`)

---

## ⚡ 5. Smart Ticket Preview Cards

### What it does
Hover over any ticket row for 300ms → instant preview appears showing:
- Full ticket description
- Last 2 comments
- Quick action buttons (change status)
- "Open Full View" button

### Features
- **300ms delay** prevents accidental triggers
- **Positions near cursor** but stays in viewport
- **Click outside to close** or press Escape
- **Quick actions** - change status without opening full modal
- **Smooth animations** - scale in/fade in

### Implementation
**Component:** `components/support/TicketPreviewCard.tsx`

**Usage in dashboard:**
```tsx
// On table row
<tr
  onMouseEnter={(e) => handleTicketHover(ticket, e)}
  onMouseLeave={handleTicketLeave}
>
  {/* ... */}
</tr>

// Render preview
{previewTicket && (
  <TicketPreviewCard
    ticket={previewTicket}
    onClose={() => setPreviewTicket(null)}
    onOpenFull={() => setSelectedTicket(previewTicket)}
    onStatusChange={(newStatus) => handleStatusChange(newStatus)}
    position={previewPosition}
  />
)}
```

**Hover logic:**
```typescript
const handleTicketHover = (ticket: Ticket, event: React.MouseEvent) => {
  hoverTimeoutRef.current = setTimeout(() => {
    setPreviewPosition({ x: event.clientX, y: event.clientY });
    setPreviewTicket(ticket);
  }, 300);
};
```

### Why 300ms?
- Prevents accidental hovers when scrolling
- Feels intentional when user pauses on row
- Industry standard (similar to Superhuman, Linear)

---

## 📱 6. Mobile-First Optimizations

### Responsive Breakpoints
- **Mobile**: `< 768px` (sm breakpoint)
- **Tablet**: `768px - 1024px` (md to lg)
- **Desktop**: `> 1024px` (xl)

### Mobile Enhancements

**Dashboard**
- Stats cards: 2x2 grid on mobile, 4x1 on desktop
- Filters: Stack vertically on mobile
- Table: Horizontal scroll if needed
- All buttons: Minimum 48px touch targets

**Modals & Panels**
- Ticket detail: Full width on mobile, lg width on desktop
- Organization panel: Full width on mobile, 480px on desktop
- Notification dropdown: Fits within viewport width

**Typography**
- Maintained readable font sizes (14px minimum)
- Proper truncation with `max-w-[X]` classes
- No text overflow anywhere

### Touch Interactions
- All interactive elements: `min-h-[48px]` for touch
- Hover states disabled on mobile (`:hover` only on desktop)
- Long-press for ticket preview (future enhancement)

---

## 🎨 7. Polish & Micro-interactions

### Animations (All 200-300ms)
```css
transition-colors duration-200 /* Button hovers */
transition-all duration-200 /* Card hovers */
animate-fadeIn /* Dropdowns, modals */
animate-slideIn /* Side panels */
animate-scaleIn /* Preview cards */
```

### Loading States
- Dashboard: Centered "Loading..." text
- Skeletons: Gray animated boxes (not implemented, simple text used)
- Spinners: On buttons during async actions

### Empty States
Friendly, helpful messages:
- "All caught up!" (no tickets)
- "No matches found. Try different filters?" (no search results)
- "You're up to date!" (no notifications)
- "No linked tickets" (no dependencies)

### Toast Notifications
- Position: `bottom-right`
- Auto-dismiss: `3 seconds`
- Success: Green with checkmark
- Error: Red with error icon

### Focus States
- All interactive elements have visible focus rings
- Keyboard navigation works throughout
- Modals can be closed with Escape key
- Forms can be submitted with Enter key

---

## 🔧 Technical Implementation

### State Management
- React hooks (`useState`, `useEffect`)
- Custom hook: `useNotifications` for notification logic
- No external state management library (Zustand mentioned but not implemented)

### Real-time Subscriptions
```typescript
const channel = supabase
  .channel('tickets-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tickets'
  }, (payload) => {
    fetchTickets(); // Refresh data
  })
  .subscribe();
```

### Optimistic Updates
Status changes update UI immediately, then rollback on error:
```typescript
// Optimistic update
setTickets(prev => prev.map(t =>
  t.id === ticketId ? { ...t, status: newStatus } : t
));

// Then save
const { error } = await supabase.from('tickets').update(...);
if (error) {
  // Rollback
  fetchTickets();
}
```

---

## 📊 Database Schema Changes

### New Tables

**notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  ticket_id UUID REFERENCES tickets,
  type TEXT NOT NULL CHECK (type IN ('assigned', 'comment', 'mention', 'status_change')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

**ticket_links**
```sql
CREATE TABLE ticket_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets NOT NULL,
  related_ticket_id UUID REFERENCES tickets NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('blocks', 'blocked_by', 'related', 'duplicate')),
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_link CHECK (ticket_id != related_ticket_id)
);

CREATE INDEX idx_ticket_links_ticket ON ticket_links(ticket_id);
CREATE INDEX idx_ticket_links_related ON ticket_links(related_ticket_id);
```

**ticket_comments** (if not exists)
```sql
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
```

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Users can view their own notifications
- Anyone can view ticket links
- Authenticated users can create comments and links

---

## 🚀 Getting Started

### 1. Run Database Migration
```sql
-- In Supabase Dashboard > SQL Editor
-- Paste contents of: supabase/migrations/003_notifications_and_links.sql
-- Execute
```

### 2. Verify Tables
Check that tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'ticket_links', 'ticket_comments');
```

### 3. Start Dev Server
```bash
npm run dev
```

### 4. Test Features
Open http://localhost:3000/support/login and follow the testing checklist.

---

## 🎯 Usage Patterns

### Pattern 1: CEO Scanning Tickets Fast
1. Login → Dashboard
2. Hover over tickets quickly
3. Preview cards appear instantly
4. Read description + comments
5. No need to click into every ticket

### Pattern 2: Team Member Triaging
1. See notification badge
2. Click to see new assignments
3. Click notification → opens ticket
4. Add status change comment
5. Link related tickets if needed

### Pattern 3: Account Manager Checking Org Health
1. Click organization name in table
2. Panel shows trial days remaining
3. See ticket volume at a glance
4. Identify top issue categories
5. Click into problematic tickets

---

## 🔮 Future Enhancements

1. **Mobile long-press** for ticket previews (currently desktop hover only)
2. **@mentions** in comments with notifications
3. **Ticket templates** for common issues
4. **Saved filters** and custom views
5. **Keyboard shortcuts** (Cmd+K command palette)
6. **Email notifications** for critical updates
7. **Batch operations** (bulk status change)
8. **SLA tracking** with countdown timers
9. **Ticket resolution time tracking** (requires resolved_at field)
10. **Attachment support** for tickets

---

## 📝 Notes

- All animations use `duration-200` or `duration-300` for smoothness
- All micro-interactions are subtle and non-distracting
- No emoji used (as per requirements)
- Text-only labels throughout (no icon-only buttons)
- Mobile-first CSS approach (mobile styles first, then desktop overrides)
- All TypeScript types are in `lib/supabase/types.ts`

---

## 🐛 Known Issues

1. **Avg Resolution Time**: Shows mock "2.5 days" - needs `resolved_at` field added to tickets table
2. **Mobile Long-Press**: Not implemented yet for ticket previews
3. **Notification Creation**: Currently manual - needs triggers or application logic

---

## 📞 Support

For issues or questions:
1. Check TESTING_CHECKLIST.md for testing procedures
2. Review component source code for implementation details
3. Check Supabase logs for database errors
4. Verify RLS policies if data not showing
