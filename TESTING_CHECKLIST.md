# Support Ticketing System - Testing Checklist

## Pre-Testing Setup

### 1. Database Migration
Run the migration SQL in your Supabase dashboard:
```sql
-- Navigate to: Supabase Dashboard > SQL Editor
-- Copy and paste contents from: supabase/migrations/003_notifications_and_links.sql
-- Execute the SQL
```

### 2. Verify Tables Created
Check that these tables exist in Supabase:
- [ ] notifications
- [ ] ticket_links
- [ ] ticket_comments (if not already present)

### 3. Test Users
Ensure you have test users with different roles:
- [ ] Admin user (role: 'Admin')
- [ ] Team user (role: 'Team')
- [ ] Account Manager user (role: 'AM')

---

## Feature Testing

### 1. Notification Center
**Desktop (>1024px)**
- [ ] Click "Notifications" button in header
- [ ] Dropdown appears below button
- [ ] Unread count badge shows correct number
- [ ] Notifications list displays correctly
- [ ] "Mark all read" button works
- [ ] Click notification navigates to ticket
- [ ] Unread notifications have blue indicator
- [ ] Empty state shows "You're up to date!"
- [ ] Real-time: Create ticket in another window, notification appears

**Mobile (<768px)**
- [ ] Notifications button is visible and tappable
- [ ] Dropdown fits screen width properly
- [ ] Scrolling works in notification list

### 2. Organization Insights Panel
**Desktop**
- [ ] Click organization name in dashboard table
- [ ] Side panel slides in from right
- [ ] Trial status displays with days remaining
- [ ] Open/closed ticket counts are correct
- [ ] Top categories chart shows data
- [ ] Recent tickets list (up to 5) displays
- [ ] Click ticket in panel opens ticket detail
- [ ] Click outside panel closes it
- [ ] Click X button closes panel

**Mobile (<768px)**
- [ ] Panel takes full width on mobile
- [ ] All content is readable and scrollable
- [ ] Close button is easily tappable (48px hit area)

### 3. Status Change with Comments
**Workflow**
- [ ] Open ticket detail modal
- [ ] Click "Resolved" status button
- [ ] Status change modal appears
- [ ] Prompt shows: "Add resolution note?"
- [ ] Text area allows typing comment
- [ ] "Skip" button changes status without comment
- [ ] "Update Status" button adds comment and changes status
- [ ] Comment appears as ticket comment with "Status changed to..." prefix
- [ ] Test with: "Waiting on User" - shows "What info do you need?"
- [ ] Test with: "Closed" - shows "Add closing note?"

### 4. Ticket Dependencies
**Adding Links**
- [ ] Open ticket detail modal
- [ ] Find "Related Tickets" section
- [ ] Click "Add Link" button
- [ ] Select link type dropdown (Blocks, Blocked by, Related to, Duplicate of)
- [ ] Search for ticket by number or description
- [ ] Results appear as you type (after 2 chars)
- [ ] Click result adds link immediately
- [ ] Link appears in list with colored badge

**Managing Links**
- [ ] Added link shows with correct type badge
- [ ] Color coding: Blocks (red), Blocked by (orange), Related (blue), Duplicate (purple)
- [ ] Click X on link removes it
- [ ] Empty state shows "No linked tickets"

### 5. Smart Ticket Preview Cards
**Desktop Hover**
- [ ] Hover over ticket row in table
- [ ] Wait 300ms
- [ ] Preview card appears near cursor
- [ ] Card shows full description
- [ ] Last 2 comments display
- [ ] Quick action buttons visible
- [ ] Click "In Progress" button works
- [ ] "Open Full View" button opens modal
- [ ] Move mouse away - card stays open
- [ ] Click outside card closes it
- [ ] Press Escape key closes card

**Mobile Long-Press** (if implemented)
- [ ] Long press on ticket row
- [ ] Preview appears after delay
- [ ] All touch interactions work

### 6. Mobile Responsiveness

**375px width (iPhone SE)**
- [ ] Login page: Form centered and readable
- [ ] Dashboard: Stats cards stack 2x2
- [ ] Dashboard: Filters stack vertically
- [ ] Dashboard: Table scrolls horizontally if needed
- [ ] Dashboard: All text is readable (no overflow)
- [ ] Ticket modal: Full width, scrollable
- [ ] Organization panel: Full width overlay
- [ ] Notification dropdown: Fits screen width
- [ ] All buttons have 48px min touch target

**768px width (iPad)**
- [ ] Stats cards show 2x2 or 4x1
- [ ] Filters show in single row
- [ ] Table shows all columns comfortably
- [ ] Modals use medium width (not full width)
- [ ] Organization panel uses set width (480px)

**1440px width (Desktop)**
- [ ] All elements use max-w-7xl container
- [ ] Stats cards show 4x1
- [ ] Table is wide and spacious
- [ ] Hover states work smoothly
- [ ] Preview cards position correctly

---

## Polish & Micro-interactions

### Animations (200-300ms)
- [ ] Ticket row hover: Smooth background change
- [ ] Stat cards hover: Smooth border color change
- [ ] Notification dropdown: Fade in animation
- [ ] Organization panel: Slide in from right
- [ ] Status change modal: Fade in
- [ ] Preview card: Scale in animation
- [ ] Empty states: Fade in with friendly text

### Loading States
- [ ] Dashboard shows "Loading..." centered
- [ ] Notification center shows skeleton/spinner
- [ ] Organization panel shows loading text
- [ ] Ticket preview shows "Loading comments..."

### Empty States
- [ ] No tickets: "All caught up!"
- [ ] No search results: "No matches found. Try different filters?"
- [ ] No notifications: "You're up to date!"
- [ ] No linked tickets: "No linked tickets"
- [ ] No categories: (doesn't show section)

### Toast Notifications
- [ ] Appear in bottom-right
- [ ] Auto-dismiss after 3 seconds
- [ ] Success: Green "Ticket status updated"
- [ ] Error: Red "Failed to update ticket"
- [ ] Link added: "Ticket link added"
- [ ] Link removed: "Ticket link removed"

### Focus States
- [ ] All interactive elements have visible focus ring
- [ ] Keyboard navigation works (Tab key)
- [ ] Can close modals with Escape key
- [ ] Can submit forms with Enter key

---

## Performance Testing

### Real-time Updates
- [ ] Open dashboard in two browser windows
- [ ] Create ticket in window 1
- [ ] Ticket appears in window 2 automatically
- [ ] Stats update in window 2
- [ ] Change status in window 1
- [ ] Status updates in window 2

### Search Performance
- [ ] Search with 1 character: Fast
- [ ] Search with 50+ tickets: Results instant
- [ ] Filter by status: Instant
- [ ] Filter by priority: Instant
- [ ] Combine search + filters: Works correctly

---

## Browser Testing

**Desktop Browsers**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile Browsers**
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility

- [ ] All buttons have descriptive text (no icon-only)
- [ ] Color contrast meets WCAG AA standards
- [ ] Can navigate entire app with keyboard
- [ ] Screen reader: Test with VoiceOver/NVDA
- [ ] Focus never gets trapped in modals

---

## Edge Cases

- [ ] Very long ticket descriptions (1000+ chars)
- [ ] Very long organization names
- [ ] Very long email addresses
- [ ] 100+ notifications
- [ ] 50+ ticket links
- [ ] Organization with 0 tickets
- [ ] No organizations in dropdown
- [ ] Network offline: Error handling

---

## Final Checks

- [ ] No console errors in browser
- [ ] No React warnings
- [ ] All images/assets load
- [ ] No TypeScript errors (`npm run build`)
- [ ] Lighthouse score >90 for Performance
- [ ] Lighthouse score >90 for Accessibility

---

## Known Limitations

1. **Mobile Long-Press**: Desktop hover preview works; mobile may need additional touch event handling
2. **Avg Resolution Time**: Currently shows mock data "2.5 days" - needs ticket resolved_at timestamps
3. **Notifications**: Must be created programmatically or via triggers (not in UI yet)

---

## Test Scenarios

### Scenario 1: CEO Scanning Tickets
1. Login as Team user
2. Hover over 5 different tickets quickly
3. Preview cards should appear after 300ms delay
4. Cards should show full description and recent comments
5. Click "Open Full View" on one ticket
6. Verify all details load correctly

### Scenario 2: Organization Health Check
1. Click "Acme Corp" organization in table
2. Panel opens showing trial status
3. Verify days remaining calculation is correct
4. Check open/closed ticket counts match table
5. Click a recent ticket from panel
6. Should open ticket detail modal

### Scenario 3: Ticket Workflow
1. Create new ticket via submit form
2. Notification appears for assigned user
3. Click notification, opens ticket
4. Add dependency: "Blocks" another ticket
5. Change status to "In Progress" with comment
6. Comment should appear in ticket comments table
7. Change status to "Resolved" with resolution note
8. Verify toast notifications appear

---

## Success Criteria

✅ All features work on desktop (Chrome, Safari, Firefox)
✅ All features work on mobile (375px, 768px, 1440px)
✅ No text overflow anywhere
✅ All animations smooth (60fps)
✅ Real-time updates work within 1 second
✅ No console errors or warnings
✅ Keyboard navigation works completely
✅ Empty states are friendly and helpful
