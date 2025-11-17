# Email Notification System

## Overview

The email notification system provides flexible, user-configurable email delivery for all notification types in the platform. Users can control both **what** notifications they receive and **when** they receive them.

## Current Implementation Status

### ✅ Completed

1. **Email Infrastructure**
   - Brevo API integration (300 emails/day free tier)
   - React Email templates for all notification types
   - Async email sending (non-blocking)
   - Error handling and logging

2. **Email Types**
   - Mention notifications
   - Trial handoff notifications
   - Account manager note notifications
   - Daily digest (template ready)
   - Weekly digest (template ready)

3. **User Preferences System**
   - Database schema for email delivery frequency per notification type
   - Preference checking logic before sending instant emails
   - Backward compatible (defaults to instant delivery)

4. **Integration Points**
   - Activity note mentions (`lib/notifications/activity-notes.ts`)
   - Account manager notifications (`lib/notifications/activity-notes.ts`)
   - Trial handoffs (`app/api/trials/[id]/handoff/route.ts`)

### 🚧 Remaining Work

1. **Digest Generation Logic**
   - Aggregate notifications based on user preferences
   - Group by priority (high/medium/low)
   - Calculate digest stats

2. **Cron Job Endpoints**
   - `/api/cron/send-daily-digest`
   - `/api/cron/send-weekly-digest`
   - Secured with `CRON_SECRET`

3. **UI Updates**
   - Update `NotificationPreferencesModal.tsx` to include email frequency dropdown
   - Add frequency options: Instant, Daily Digest, Weekly Digest, Never

4. **Admin Digest Triggers**
   - Manual digest send UI for testing
   - Digest history viewing

5. **Email Preview Tool**
   - Development page to preview all email templates
   - Test email sending

## User Configuration Options

### Email Delivery Frequency

Users can configure email delivery frequency **per notification type**:

- **Instant** (default): Send email immediately when notification is created
- **Daily Digest**: Bundle notifications into a daily summary (sent once per day)
- **Weekly Digest**: Bundle notifications into a weekly summary (sent once per week)
- **Never**: Do not send emails (in-app notifications only)

### Database Schema

```sql
-- user_notification_preferences table
CREATE TABLE user_notification_preferences (
  user_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  email_delivery_frequency TEXT DEFAULT 'instant'
    CHECK (email_delivery_frequency IN ('instant', 'daily_digest', 'weekly_digest', 'never')),
  PRIMARY KEY (user_email, notification_type)
);

-- user_digest_history table (tracks when digests were sent)
CREATE TABLE user_digest_history (
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  notification_count INTEGER DEFAULT 0
);
```

## How It Works

### Instant Emails

1. Notification created in database
2. System checks user preferences via `shouldSendInstantEmail()`
3. If preference is `'instant'` and notification is enabled:
   - Email sent asynchronously via Brevo
4. If preference is `'daily_digest'` or `'weekly_digest'`:
   - Email skipped (will be included in digest)
5. If preference is `'never'`:
   - Email skipped (in-app notification only)

### Digest Emails (To Be Implemented)

1. Cron job runs at scheduled time
2. Query all notifications since last digest
3. Group by user and priority
4. Render digest template with aggregated data
5. Send digest email via Brevo
6. Record in `user_digest_history`

## Configuration

### Environment Variables

```env
# Required
BREVO_API_KEY=xkeysib-...

# Email sender configuration
FROM_EMAIL=sriharsha@mordorintelligence.com
FROM_NAME=myRA AI Support

# Base URL for email links
NEXT_PUBLIC_URL=http://localhost:3000

# Cron job security
CRON_SECRET=<random-secret>
```

### Email Frequency Customization Example

```typescript
// User wants daily digests for mentions, instant for handoffs
await supabase.from('user_notification_preferences').upsert([
  {
    user_email: 'user@example.com',
    notification_type: 'mention',
    enabled: true,
    email_delivery_frequency: 'daily_digest'
  },
  {
    user_email: 'user@example.com',
    notification_type: 'assigned', // trial handoffs
    enabled: true,
    email_delivery_frequency: 'instant'
  }
]);
```

## Testing

Run the email system test:

```bash
npx tsx scripts/test-email-system.js your-email@example.com
```

This sends test emails for:
- Mention notification
- Trial handoff notification

## Future Enhancements

1. **Custom Email Templates**
   - Allow users to customize email subject lines
   - Support for custom email signatures
   - Organization-level branding

2. **Smart Digest Timing**
   - User-selected digest send time (e.g., 9 AM daily)
   - Timezone-aware scheduling

3. **Email Analytics**
   - Track open rates
   - Track click-through rates
   - User engagement metrics

4. **Batch Operations**
   - Unsubscribe all emails option
   - Bulk preference updates

## Architecture Decisions

### Why Async Email Sending?

Emails are sent asynchronously (fire-and-forget) to avoid blocking the main request flow. If an email fails to send, the notification is still created in the database.

### Why Per-Type Preferences?

Different notification types have different urgency levels. Users may want instant emails for critical events (handoffs) but daily digests for less urgent updates (mentions).

### Why Default to Instant?

Backward compatibility - existing users expect immediate notifications. New users can opt into digests if they prefer less frequent emails.

## Support

For issues or questions:
- Check Brevo dashboard for email delivery status
- Review server logs for email sending errors
- Verify `BREVO_API_KEY` is set correctly
- Test with `scripts/test-email-system.js`
