# Email Notification System - Setup Guide

## Overview

This email system uses **Brevo** (formerly Sendinblue) for sending transactional emails and digests.

### Why Brevo?
- **Free Tier**: 300 emails/day (9,000/month)
- **Unlimited Contacts**: No contact limits
- **All-in-One**: Transactional + marketing emails
- **Great for Digests**: Built-in automation features
- **Easy Integration**: Good Node.js SDK

## Setup Instructions

### 1. Create Brevo Account

1. Go to [https://www.brevo.com](https://www.brevo.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key

1. Log in to Brevo dashboard
2. Go to **Settings** → **SMTP & API**
3. Click **Generate a new API key**
4. Copy the API key (starts with `xkeysib-`)

### 3. Verify Email Domain

1. Go to **Senders & IP** → **Senders**
2. Add your domain (e.g., `yourdomain.com`)
3. Add the required DNS records (SPF, DKIM)
4. Wait for verification (usually < 24 hours)

### 4. Configure Environment Variables

Add to `.env.local`:

```env
# Brevo Configuration
BREVO_API_KEY=xkeysib-your-api-key-here

# Email Sender Details
FROM_EMAIL=notifications@yourdomain.com
FROM_NAME=Myra Status Dashboard

# Base URL for email links
NEXT_PUBLIC_URL=https://yourdomain.com

# Optional: Cron job secret for scheduled digests
CRON_SECRET=your-random-secret-here
```

### 5. Install Dependencies

```bash
npm install @getbrevo/brevo react-email @react-email/components
```

### 6. Test Email Sending

Use the email preview tool (once built):
```
http://localhost:3000/dev/email-preview
```

## Email Types

### Individual Notifications
- **Mention Notification** - When user is @mentioned in a note
- **Trial Handoff** - When trial is assigned to a new account manager
- **Account Manager Note** - New note in managed trial

### Digest Emails
- **Daily Digest** - Summary of last 24 hours (sent at 8 AM)
- **Weekly Digest** - Weekly rollup (sent Monday 8 AM)

## Email Templates

Templates are built with React Email and located in `/emails` directory:

- `MentionNotification.tsx`
- `TrialHandoffNotification.tsx`
- `AccountManagerNote.tsx`
- `DailyDigest.tsx`
- `WeeklyDigest.tsx`

## Testing

### Development Mode
```bash
# Preview emails without sending
npm run dev
# Visit: http://localhost:3000/dev/email-preview
```

### Send Test Email
```typescript
import { sendNotificationEmail } from '@/lib/email/send-notification-email';

await sendNotificationEmail({
  to: 'test@example.com',
  type: 'mention',
  data: {
    actorName: 'John Doe',
    orgName: 'Test Org',
    notePreview: 'This is a test mention',
    actionUrl: '/support/trials/123'
  }
});
```

## Monitoring

### Brevo Dashboard
- View sending statistics
- Monitor delivery rates
- Check bounce/spam rates
- View email logs

### Key Metrics
- Delivery rate > 95%
- Open rate > 20%
- Bounce rate < 2%

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `BREVO_API_KEY` is correct
2. **Domain Verification**: Ensure domain is verified in Brevo
3. **Check Logs**: Look for errors in server logs
4. **Rate Limits**: Free tier = 300 emails/day

### Emails Going to Spam

1. **SPF/DKIM**: Verify DNS records are correct
2. **Sender Reputation**: Warm up domain gradually
3. **Content**: Avoid spam trigger words
4. **Unsubscribe Link**: Include in all emails

### Email Delivery Failures

Check Brevo dashboard for specific error codes:
- `invalid_email`: Email address format is wrong
- `blocked_domain`: Recipient domain blocks emails
- `hard_bounce`: Permanent delivery failure
- `soft_bounce`: Temporary issue (retry)

## Scaling

### Free Tier Limits
- 300 emails/day
- 9,000 emails/month
- Unlimited contacts

### Paid Plans
- **Starter**: $9/month for 5,000 emails
- **Business**: $18/month for 20,000 emails + automation
- **Enterprise**: Custom pricing

### Best Practices
1. Start with daily digests only
2. Monitor sending volume
3. Use digest emails to reduce individual sends
4. Implement user preferences for email frequency

## Security

- Never commit API keys to git
- Use environment variables
- Rotate API keys periodically
- Monitor for unusual activity

## Support

- Brevo Docs: https://developers.brevo.com/docs
- Brevo Support: support@brevo.com
- Internal: See `/lib/email` documentation
