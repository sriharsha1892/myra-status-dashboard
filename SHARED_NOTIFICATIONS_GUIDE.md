# Shared Notification Completion System

## 🎯 Overview

The shared notification completion feature allows multiple admins to receive the same notification, and when one admin handles it, all other admins automatically see it as completed. This prevents duplicate work and ensures everyone stays in sync.

## ✨ Key Features

1. **Thread-Based Grouping**: All notifications about the same event share a `thread_key`
2. **Single-Handler Updates All**: When one admin marks a notification as complete, all related notifications are updated
3. **Handler Attribution**: Shows who handled the notification in the completion message
4. **Automatic Archiving**: Completed notifications are automatically archived with a reason

## 🏗️ Architecture

### Database Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,              -- Which admin receives this
  entity_type TEXT NOT NULL,           -- 'trial_org', 'ticket', etc.
  entity_id UUID NOT NULL,             -- ID of the entity
  notification_type TEXT NOT NULL,     -- 'assigned', 'mention', etc.
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT NOT NULL,
  priority_score INTEGER DEFAULT 50,
  thread_key TEXT NOT NULL,            -- Format: {entity_type}:{entity_id}
  status TEXT DEFAULT 'unread',        -- 'unread', 'read', 'archived'
  archived_reason TEXT,                -- Who handled it and how
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Thread Key Format

```
{entity_type}:{entity_id}
```

Examples:
- `trial_org:123e4567-e89b-12d3-a456-426614174000`
- `ticket:abc12345-6789-0123-4567-890abcdef012`
- `roadmap_item:def45678-9abc-def0-1234-567890abcdef`

## 📡 API Endpoints

### Mark Thread as Complete

**Endpoint**: `PATCH /api/unified-notifications/{id}`

**Request Body**:
```json
{
  "mark_thread_complete": true,
  "completion_note": "Assigned to John Doe - Trial approved"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Marked 7 notification(s) in thread as completed",
  "notifications": [...],
  "handler": "admin@myra.ai"
}
```

### Send to All Super Admins

**Endpoint**: `POST /api/unified-notifications`

**Request Body**:
```json
{
  "entity_type": "trial_org",
  "entity_id": "123e4567-e89b-12d3-a456-426614174000",
  "entity_title": "Acme Corp - Trial Request",
  "notification_type": "assigned",
  "title": "New Trial Request Needs Attention",
  "message": "Acme Corp has requested a trial",
  "action_url": "/support/trials/123e4567-e89b-12d3-a456-426614174000",
  "mentioned_user_ids": ["user1", "user2", "user3"],
  "priority_score": 85
}
```

## 💻 Usage Examples

### 1. Send Notification to All Admins

```typescript
import { notifyAllSuperAdmins } from '@/lib/notifications/sharedActions';

// When a new trial is created
async function handleNewTrial(trial: Trial) {
  const result = await notifyAllSuperAdmins({
    entity_type: 'trial_org',
    entity_id: trial.id,
    entity_title: `${trial.org_name} - Trial Request`,
    notification_type: 'assigned',
    title: '🚨 New Trial Request',
    message: `${trial.org_name} needs an account manager assigned`,
    action_url: `/support/trials/${trial.id}`,
    priority_score: 90
  });

  if (result.success) {
    toast.success(`Notified ${result.count} admins`);
  }
}
```

### 2. Mark as Complete in UI

```typescript
import { markNotificationThreadComplete } from '@/lib/notifications/sharedActions';

function NotificationItem({ notification }) {
  const handleComplete = async () => {
    const result = await markNotificationThreadComplete(
      notification.id,
      `Assigned to ${assignee.name} - Trial approved`
    );

    if (result.success) {
      toast.success(`Handled by ${result.handler}`);
      refreshNotifications();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div>
      <h3>{notification.title}</h3>
      <p>{notification.message}</p>
      <button onClick={handleComplete}>
        Mark as Complete
      </button>
    </div>
  );
}
```

### 3. Check Notification Status

```typescript
// All notifications in a thread will have the same status
// Check archived_reason to see who handled it

const notification = await fetchNotification(id);

if (notification.status === 'archived') {
  console.log(notification.archived_reason);
  // Output: "Handled by admin@myra.ai - Assigned to Sarah Johnson"
}
```

## 🧪 Testing Scripts

### 1. Comprehensive Test Suite

```bash
npx tsx scripts/test-shared-notifications.ts
```

**What it tests**:
- ✅ Fetches all super admins
- ✅ Creates a test entity
- ✅ Sends notifications to all admins
- ✅ Verifies all notifications created
- ✅ Marks thread as complete
- ✅ Verifies all notifications updated
- ✅ Checks completion message
- ✅ Cleans up test data

### 2. Send Demo Notification

```bash
npx tsx scripts/send-demo-notification.ts
```

**What it does**:
- Sends a real notification to all admins
- Provides thread_key for manual testing
- Lists all notification IDs

### 3. Test Mark Complete

```bash
npx tsx scripts/test-mark-complete.ts <thread_key>
```

**Example**:
```bash
npx tsx scripts/test-mark-complete.ts trial_org:8400279c-e5a2-4d7f-acb2-b4b4788031da
```

## 📊 Test Results

### Comprehensive Test (test-shared-notifications.ts)

```
🎉 All tests passed! Shared notification completion is working correctly.

Key Features Verified:
  ✓ Notifications sent to all super admins (7)
  ✓ Thread-based grouping working
  ✓ One admin marking complete updates all
  ✓ Completion message shows who handled it
  ✓ All admins see the same completion status

Test Summary:
   Total Steps: 8
   ✅ Successful: 8
   ❌ Failed: 0
```

### Live Demo Test

```
✨ Demo Notification Sent Successfully!

Sent to 7 admins:
  1. reddy@mordorintelligence.com
  2. vivek.sikaria@mordorintelligence.com
  3. sai.teja@mordorintelligence.com
  4. abin.zacharia@mordorintelligence.com
  5. adi@mordorintelligence.com
  6. admin@myra.ai
  7. admin@test.com

Thread Key: trial_org:8400279c-e5a2-4d7f-acb2-b4b4788031da
```

### Mark Complete Test

```
✨ Test Complete!

Key Observations:
  • Started with 7 unread notifications
  • Marked entire thread as complete
  • All 7 notifications now show as handled
  • Completion message: "Handled by reddy@mordorintelligence.com - Demo trial approved and assigned"
```

## 🎨 UI Integration

### Notification Bell Component

```typescript
// components/NotificationBell.tsx

import { markNotificationThreadComplete } from '@/lib/notifications/sharedActions';

export function NotificationBell() {
  const { notifications, refresh } = useNotifications();

  const handleComplete = async (notification: Notification) => {
    // Show modal to get completion note
    const note = await promptCompletionNote();

    const result = await markNotificationThreadComplete(
      notification.id,
      note
    );

    if (result.success) {
      toast.success(`Marked as handled by ${result.handler}`);
      refresh();
    }
  };

  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>
          <span>{notification.title}</span>
          {notification.status === 'unread' && (
            <button onClick={() => handleComplete(notification)}>
              Mark as Complete
            </button>
          )}
          {notification.status === 'archived' && (
            <span className="text-xs text-gray-500">
              {notification.archived_reason}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

## 🔄 Real-Time Updates

For real-time updates when another admin marks a notification complete, consider:

### Option 1: Polling (Simple)

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    refreshNotifications();
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, []);
```

### Option 2: Supabase Realtime (Recommended)

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Notification was updated
      updateNotificationInState(payload.new);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [userId]);
```

## 🎯 Use Cases

### 1. Trial Requests

When a new trial is requested:
```typescript
await notifyAllSuperAdmins({
  entity_type: 'trial_org',
  entity_id: trialId,
  entity_title: 'Acme Corp',
  notification_type: 'assigned',
  title: 'New Trial Request',
  message: 'Acme Corp needs an account manager',
  action_url: `/support/trials/${trialId}`
});
```

First admin to handle it:
```typescript
await markNotificationThreadComplete(
  notificationId,
  'Assigned to Sarah Johnson - Trial approved'
);
```

### 2. Urgent Tickets

```typescript
await notifyAllSuperAdmins({
  entity_type: 'ticket',
  entity_id: ticketId,
  entity_title: 'Production Down',
  notification_type: 'assigned',
  title: '🚨 URGENT: Production Issue',
  message: 'Production system is down, needs immediate attention',
  action_url: `/support/tickets/${ticketId}`,
  priority_score: 100
});
```

### 3. Roadmap Updates

```typescript
await notifyAllSuperAdmins({
  entity_type: 'roadmap_item',
  entity_id: itemId,
  entity_title: 'Q4 Feature Release',
  notification_type: 'status_change',
  title: 'Roadmap Item Needs Review',
  message: 'Q4 feature release date needs approval',
  action_url: `/support/roadmap/${itemId}`
});
```

## 📈 Benefits

1. **No Duplicate Work**: Prevents multiple admins from handling the same issue
2. **Clear Ownership**: Shows who handled what
3. **Better Coordination**: Everyone stays in sync
4. **Audit Trail**: Archived reason provides history
5. **Faster Response**: Any admin can handle urgent issues

## 🔧 Helper Functions

All helper functions are in `/lib/notifications/sharedActions.ts`:

- `markNotificationThreadComplete()` - Mark entire thread as done
- `markNotificationRead()` - Mark single notification as read
- `notifyAllSuperAdmins()` - Send notification to all admins

## 🐛 Troubleshooting

### Notifications not updating for all users?

Check the `thread_key` is consistent:
```sql
SELECT DISTINCT thread_key FROM notifications WHERE entity_id = 'your-id';
```

### Need to manually fix a notification?

```sql
UPDATE notifications
SET status = 'archived',
    archived_reason = 'Manual fix',
    archived_at = NOW()
WHERE thread_key = 'trial_org:some-id';
```

### Check notification status

```sql
SELECT
  user_id,
  status,
  archived_reason,
  created_at
FROM notifications
WHERE thread_key = 'trial_org:some-id'
ORDER BY created_at;
```

## 📝 Summary

The shared notification completion system successfully:

✅ Sends notifications to all super admins (7 in production)
✅ Groups notifications by thread_key
✅ Updates all notifications when one is marked complete
✅ Shows who handled it in the archived_reason
✅ Prevents duplicate work across the team
✅ Provides a complete audit trail

**Test Results**: All 8 test steps passed ✅
**Live Demo**: Successfully sent and completed notifications ✅
**Ready for Production**: Yes ✅
