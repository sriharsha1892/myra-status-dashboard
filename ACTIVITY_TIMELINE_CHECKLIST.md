# Activity Timeline - Integration Checklist

## Pre-Integration Verification ✅

### Files Created (5 components)
- [x] `/components/support/ActivityTimeline.tsx` (268 lines)
- [x] `/components/support/TimelineEvent.tsx` (225 lines)
- [x] `/lib/exportTimeline.ts` (375 lines)
- [x] `/lib/support/activityLogger.ts` (162 lines)
- [x] `/components/support/TicketDetailWithTimeline.tsx` (281 lines)

### Documentation Created (4 files)
- [x] `/ACTIVITY_TIMELINE_FEATURE.md` - Complete feature documentation
- [x] `/components/support/TIMELINE_QUICK_START.md` - Quick reference
- [x] `/components/support/README_ACTIVITY_TIMELINE.md` - Visual guide
- [x] `/FEATURE_8_IMPLEMENTATION_SUMMARY.md` - Implementation summary

### Types Updated (1 file)
- [x] `/lib/supabase/types.ts` - Added `ticket_activities` table types

### Total: 10 files created/modified

---

## Integration Steps

### Step 1: Verify Database Setup
- [ ] Run migration: `004_advanced_features.sql`
- [ ] Verify table exists: `ticket_activities`
- [ ] Check indexes: `idx_ticket_activities_ticket_id`, `idx_ticket_activities_created_at`
- [ ] Test RLS policies are enabled
- [ ] Verify triggers are active (for auto-logging)

### Step 2: Test Components Independently

#### Test TimelineEvent
```tsx
import { TimelineEvent } from '@/components/support/TimelineEvent';

<TimelineEvent
  type="created"
  user={{ name: "Test User" }}
  newValue="Test"
  timestamp={new Date().toISOString()}
/>
```
- [ ] Renders correctly
- [ ] Icon displays
- [ ] Color is correct
- [ ] Expands/collapses

#### Test ActivityTimeline
```tsx
import { ActivityTimeline } from '@/components/support/ActivityTimeline';

<ActivityTimeline
  ticketId="existing-ticket-uuid"
  ticketNumber="TKT-001"
/>
```
- [ ] Loads activities
- [ ] Groups by date
- [ ] Shows loading state
- [ ] Shows empty state
- [ ] Export buttons work

### Step 3: Add Activity Logging

#### Comment Logging
```tsx
import { logCommentActivity } from '@/lib/support/activityLogger';

// In your comment handler
const handleAddComment = async () => {
  // 1. Insert comment
  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    user_id: userId,
    comment: commentText,
  });

  // 2. Log activity
  if (!error) {
    await logCommentActivity(ticketId, userId, commentText);
  }
};
```
- [ ] Comment activity logs correctly
- [ ] Timeline updates in real-time
- [ ] Metadata includes user info

#### Link Logging
```tsx
import { logLinkActivity } from '@/lib/support/activityLogger';

// In your link handler
const handleLinkTicket = async () => {
  await supabase.from('ticket_links').insert({...});
  await logLinkActivity(ticketId, userId, linkedTicketNumber, 'blocks');
};
```
- [ ] Link activity logs correctly
- [ ] Shows linked ticket info
- [ ] Displays link type

#### Watcher Logging
```tsx
import { logWatcherActivity } from '@/lib/support/activityLogger';

// In your watch handler
const handleWatch = async () => {
  await supabase.from('ticket_watchers').insert({...});
  await logWatcherActivity(ticketId, userId);
};
```
- [ ] Watcher activity logs correctly
- [ ] Displays user who started watching

### Step 4: Integrate into Ticket Pages

- [ ] Add ActivityTimeline to ticket detail page
- [ ] Add tab for "Activity" vs "Details"
- [ ] Connect to real ticket data
- [ ] Test real-time updates
- [ ] Verify all event types display

### Step 5: Test Export Functionality

#### CSV Export
- [ ] Click "CSV" button
- [ ] File downloads automatically
- [ ] Filename includes ticket number and date
- [ ] All activities included
- [ ] Data is properly formatted
- [ ] Special characters handled

#### PDF Export
- [ ] Click "PDF" button
- [ ] Print dialog opens
- [ ] Preview shows formatted timeline
- [ ] All activities included
- [ ] Colors and styling applied
- [ ] Can save as PDF

### Step 6: Test Real-time Updates

- [ ] Open timeline in two browser windows
- [ ] Add comment in one window
- [ ] Verify activity appears in other window
- [ ] Check timing is reasonable (< 1 second)
- [ ] Verify animations work

### Step 7: Test Edge Cases

#### Empty States
- [ ] New ticket with no activities shows empty state
- [ ] Empty state message is clear
- [ ] Empty state styling correct

#### Loading States
- [ ] Loading spinner shows while fetching
- [ ] Loading text displays
- [ ] No flickering/jumping

#### Error Handling
- [ ] Network error shows graceful message
- [ ] Permission error handled
- [ ] Invalid ticket ID handled
- [ ] Export failure shows alert

#### Large Datasets
- [ ] Test with 50+ activities
- [ ] Test with 100+ activities
- [ ] Check performance
- [ ] Consider pagination if needed

### Step 8: Test Responsive Design

#### Desktop (1920px)
- [ ] Timeline displays full width
- [ ] All elements visible
- [ ] Export buttons side-by-side
- [ ] Hover states work

#### Tablet (768px)
- [ ] Timeline adjusts properly
- [ ] Text remains readable
- [ ] Buttons stack if needed

#### Mobile (375px)
- [ ] Timeline is scrollable
- [ ] Event cards stack
- [ ] Timestamps shortened
- [ ] Touch interactions work

### Step 9: Test Dark Mode

- [ ] Toggle dark mode
- [ ] All colors invert correctly
- [ ] Text remains readable
- [ ] Event dots visible
- [ ] Borders visible
- [ ] Cards have proper contrast

### Step 10: Test Accessibility

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Enter/Space expand details
- [ ] Focus indicators visible
- [ ] Screen reader announces changes
- [ ] ARIA labels present

---

## Verification Commands

### Check Database
```sql
-- Verify table exists
SELECT * FROM ticket_activities LIMIT 5;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'ticket_activities';

-- Test query performance
EXPLAIN ANALYZE SELECT * FROM ticket_activities WHERE ticket_id = 'uuid' ORDER BY created_at DESC;
```

### Check Types
```bash
npx tsc --noEmit
```

### Check Build
```bash
npm run build
```

### Check Linting
```bash
npm run lint
```

---

## Performance Checklist

- [ ] Database queries use indexes
- [ ] Real-time subscriptions filtered by ticket_id
- [ ] User metadata cached in activity records
- [ ] Export doesn't block UI
- [ ] Large lists considered for pagination
- [ ] Images/avatars lazy loaded

---

## Security Checklist

- [ ] RLS policies prevent unauthorized access
- [ ] User IDs validated before logging
- [ ] Export includes only authorized data
- [ ] SQL injection not possible (using Supabase SDK)
- [ ] XSS prevented (React auto-escapes)
- [ ] Metadata sanitized before display

---

## Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Post-Integration

### Documentation Updates
- [ ] Update main README with Activity Timeline info
- [ ] Add to feature list
- [ ] Update API documentation
- [ ] Create video tutorial (optional)

### Monitoring
- [ ] Set up error tracking for activity logging
- [ ] Monitor real-time subscription count
- [ ] Track export usage
- [ ] Monitor database query performance

### User Training
- [ ] Update user guide
- [ ] Create help articles
- [ ] Add tooltips/hints in UI
- [ ] Prepare FAQ

---

## Common Issues & Solutions

### Issue: Timeline not loading
**Check:**
- Database table exists
- RLS policies allow read
- Ticket ID is valid
- Network connectivity

**Solution:**
```tsx
// Add error handling
try {
  const { data, error } = await supabase.from('ticket_activities')...
  if (error) console.error('Error:', error);
} catch (e) {
  console.error('Exception:', e);
}
```

### Issue: Real-time not working
**Check:**
- Supabase subscription created
- Channel is subscribed
- Filter is correct
- WebSocket connection active

**Solution:**
```tsx
// Debug subscription
const channel = supabase.channel('debug')
  .on('postgres_changes', {...}, (payload) => {
    console.log('Received:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

### Issue: Export failing
**Check:**
- Popup blocker disabled
- Data is valid
- Browser supports Blob API

**Solution:**
```tsx
// Add try-catch
try {
  await exportTimelineToPDF(activities, ticketNumber);
} catch (error) {
  console.error('Export failed:', error);
  alert('Export failed. Please try again.');
}
```

### Issue: Activities duplicating
**Check:**
- Triggers not firing multiple times
- Logging not called twice
- Real-time not adding duplicates

**Solution:**
```tsx
// Use unique IDs and deduplicate
const uniqueActivities = activities.filter((activity, index, self) =>
  index === self.findIndex((a) => a.id === activity.id)
);
```

---

## Sign-off Checklist

### Development
- [x] All components created
- [x] All types defined
- [x] All utilities implemented
- [x] Example integration provided
- [x] Documentation complete

### Testing
- [ ] Unit tests pass (if applicable)
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Cross-browser testing done
- [ ] Mobile testing done

### Performance
- [ ] Load time < 2 seconds
- [ ] Real-time latency < 1 second
- [ ] Export completes < 5 seconds
- [ ] No memory leaks
- [ ] No infinite loops

### Accessibility
- [ ] WCAG 2.1 Level AA compliant
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Color contrast sufficient

### Security
- [ ] No sensitive data exposed
- [ ] Authorization checks in place
- [ ] Input validation complete
- [ ] SQL injection prevented
- [ ] XSS prevented

### Documentation
- [x] Feature documentation complete
- [x] API reference complete
- [x] Integration guide complete
- [x] Examples provided
- [ ] User guide updated

---

## Final Approval

- [ ] Code review completed
- [ ] QA testing completed
- [ ] Security review completed
- [ ] Performance review completed
- [ ] Documentation review completed
- [ ] Stakeholder approval obtained

**Approved by:** _________________
**Date:** _________________
**Version:** 1.0.0

---

## Deployment

- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Verify in production
- [ ] Monitor for issues

---

## Success Metrics

Track these metrics post-deployment:
- Activity Timeline page views
- Export usage (PDF vs CSV)
- Real-time update latency
- Error rates
- User feedback
- Performance metrics

**Target:**
- Page load < 2s
- Real-time latency < 1s
- Error rate < 0.1%
- User satisfaction > 90%
