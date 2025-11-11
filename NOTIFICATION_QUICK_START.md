# Shared Notifications - Quick Start Guide

## 🚀 Quick Commands

```bash
# Test the full system
npx tsx scripts/test-shared-notifications.ts

# Send a demo notification to all admins
npx tsx scripts/send-demo-notification.ts

# Mark a notification thread as complete
npx tsx scripts/test-mark-complete.ts <thread_key>
```

## 📋 How It Works

1. **Send to all admins**: When something needs attention, notify everyone
2. **Any admin can handle**: First one to respond handles it
3. **Updates everyone**: When marked complete, all admins see it's handled
4. **Shows who handled it**: Completion message includes handler name

## 💻 Code Examples

### Send Notification to All Admins

```typescript
import { notifyAllSuperAdmins } from '@/lib/notifications/sharedActions';

await notifyAllSuperAdmins({
  entity_type: 'trial_org',
  entity_id: trialId,
  entity_title: 'Acme Corp',
  notification_type: 'assigned',
  title: 'New Trial Request',
  message: 'Acme Corp needs attention',
  action_url: `/support/trials/${trialId}`,
  priority_score: 90
});
```

### Mark as Complete

```typescript
import { markNotificationThreadComplete } from '@/lib/notifications/sharedActions';

const result = await markNotificationThreadComplete(
  notificationId,
  'Assigned to John Doe - Trial approved'
);

if (result.success) {
  console.log(`Handled by ${result.handler}`);
}
```

## 🧪 Test Results

✅ **All Tests Passed** (8/8 steps)

### What Was Tested

1. ✅ Sent notification to 7 super admins
2. ✅ Created test entity with unique thread_key
3. ✅ Verified all notifications created
4. ✅ Simulated one admin handling it
5. ✅ Marked entire thread as complete
6. ✅ Verified all 7 notifications updated
7. ✅ Confirmed completion message visible to all
8. ✅ Cleaned up test data

### Live Demo Results

```
📧 Sent to 7 admins:
   reddy@mordorintelligence.com
   vivek.sikaria@mordorintelligence.com
   sai.teja@mordorintelligence.com
   abin.zacharia@mordorintelligence.com
   adi@mordorintelligence.com
   admin@myra.ai
   admin@test.com

✅ All marked complete by reddy@mordorintelligence.com
✅ Completion visible to all 7 admins
```

## 🎯 Common Use Cases

### 1. New Trial Request
```typescript
// When trial is created
await notifyAllSuperAdmins({
  entity_type: 'trial_org',
  entity_id: trial.id,
  title: '🚨 New Trial Request',
  message: `${trial.org_name} needs assignment`,
  ...
});

// When handled
await markNotificationThreadComplete(
  notificationId,
  'Assigned to Sarah - Trial approved'
);
```

### 2. Urgent Ticket
```typescript
await notifyAllSuperAdmins({
  entity_type: 'ticket',
  entity_id: ticket.id,
  title: '🚨 URGENT: Production Down',
  priority_score: 100,
  ...
});
```

### 3. Roadmap Review
```typescript
await notifyAllSuperAdmins({
  entity_type: 'roadmap_item',
  entity_id: item.id,
  title: 'Roadmap Item Needs Approval',
  ...
});
```

## 📊 Key Metrics

- **Admins in System**: 7
- **Response Options**: Any admin can handle
- **Update Speed**: Instant (via thread_key)
- **Test Success Rate**: 100% (8/8)

## 🔑 Important Files

```
/app/api/unified-notifications/
  ├── route.ts                    # POST to create notifications
  └── [id]/route.ts               # PATCH to mark complete

/lib/notifications/
  └── sharedActions.ts            # Helper functions

/scripts/
  ├── test-shared-notifications.ts   # Full test suite
  ├── send-demo-notification.ts      # Send demo
  └── test-mark-complete.ts          # Test completion

/SHARED_NOTIFICATIONS_GUIDE.md     # Full documentation
```

## ⚡ Quick Troubleshooting

**Q: Notifications not updating for all users?**
A: Check the thread_key is consistent

**Q: How do I know who handled it?**
A: Check `notification.archived_reason`

**Q: Can I undo a completion?**
A: Yes, manually update the notification status

## 📈 Next Steps

1. Integrate into UI notification bell
2. Add real-time updates (Supabase Realtime)
3. Create notification preferences
4. Add email notifications for high-priority items

---

**Need Help?** See full documentation in `SHARED_NOTIFICATIONS_GUIDE.md`
