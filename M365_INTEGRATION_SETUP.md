# Microsoft 365 Integration Setup Guide

This guide explains how to set up Microsoft Calendar and Teams integration for the myRA AI Support Portal.

## Features

### 1. Microsoft Calendar (Outlook) Integration
- OAuth2 authentication with Microsoft Identity Platform
- Create calendar events directly from tickets
- Automatic Teams Meeting link generation
- View upcoming and past events
- Delete calendar events
- Sync with Outlook Calendar

### 2. Microsoft Teams Integration
- Send ticket notifications to Teams channels
- Adaptive Cards with rich ticket information
- Status change notifications
- Custom webhook configuration
- Real-time updates

## Prerequisites

- Microsoft 365 account with admin access
- Azure AD tenant
- Teams workspace with permissions to add connectors

## Database Setup

Run the migration that was already created (`006_email_calendar_features.sql`) in your Supabase SQL editor. The migration creates these tables:
- `calendar_integrations` - Stores user calendar OAuth tokens
- `ticket_calendar_events` - Stores calendar events linked to tickets
- `teams_integration` - Stores Teams webhook configuration
- `teams_messages` - Logs Teams notifications

## Microsoft Calendar Setup

### Step 1: Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure your app:
   - Name: `myRA AI Support Portal`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI:
     - Platform: **Web**
     - URL: `https://your-domain.com/api/calendar/callback`
     - For local development: `http://localhost:3000/api/calendar/callback`

### Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `Calendars.ReadWrite` - Read and write to user calendars
   - `offline_access` - Maintain access to data
   - `User.Read` - Sign in and read user profile
4. Click **Grant admin consent** for your organization

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: "myRA Support Portal"
4. Set expiration (recommend: 24 months)
5. Click **Add**
6. **Copy the secret value immediately** (you won't see it again)

### Step 4: Configure Environment Variables

Add these to your `.env.local`:

```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/callback

# Production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 5: User Authorization

Users need to connect their calendar once:

1. Navigate to any ticket detail page
2. Click "Schedule Event" in the Calendar Events section
3. System will redirect to Microsoft login
4. User signs in and grants permissions
5. User is redirected back to the portal
6. Calendar is now connected and ready to use

## Microsoft Teams Setup

### Step 1: Create Incoming Webhook in Teams

1. Open Microsoft Teams
2. Navigate to the channel where you want notifications
3. Click the three dots (**...**) next to the channel name
4. Select **Connectors** (or **Workflows** in newer Teams)
5. Search for "Incoming Webhook"
6. Click **Configure** or **Add**
7. Provide a name: "myRA Support Notifications"
8. Upload an image (optional)
9. Click **Create**
10. **Copy the webhook URL**

### Step 2: Configure in Support Portal

1. Navigate to the Teams configuration page in your support portal
2. Paste the webhook URL
3. Enter Team Name (optional)
4. Enter Channel Name (optional)
5. Click **Save Configuration**

### Step 3: Test the Integration

Create a new ticket and verify:
1. Adaptive card appears in Teams channel
2. Card shows ticket number, priority, category, description
3. "View Ticket" button links to ticket detail page

## Usage Examples

### Creating a Calendar Event

1. Open any ticket detail page
2. Find "Calendar Events" section in right sidebar
3. Click "Schedule Event"
4. Fill in event details:
   - Title (pre-filled with ticket number)
   - Description
   - Start/End time
   - Attendees (email addresses)
   - Include Teams Meeting checkbox
5. Click "Create Event"
6. Event appears in:
   - Outlook Calendar
   - Ticket sidebar
   - Attendees receive email invitations
   - Teams meeting link is generated (if checkbox was checked)

### Viewing Calendar Events

- **Upcoming Events**: Shows all future events for the ticket
- **Past Events**: Shows completed events (dimmed)
- **Teams Meeting Link**: Click "Join Teams Meeting" for online meetings
- **Outlook Link**: Click "View in Outlook" to open in Outlook Calendar

### Teams Notifications

Automatic notifications are sent for:
- **New Ticket Created**: Shows ticket details with adaptive card
- **Status Changed**: Shows old → new status with who made the change

To manually send a notification:
```typescript
await fetch('/api/teams/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticketId: 'ticket-uuid',
    notificationType: 'new_ticket', // or 'status_change'
    data: { /* notification-specific data */ }
  })
});
```

## Token Refresh

The system automatically handles token refresh:
- Access tokens expire after 1 hour
- Refresh tokens are stored securely in database
- Before each API call, system checks token expiration
- If expired, automatically refreshes using refresh token
- New tokens are saved to database

## Troubleshooting

### Calendar Authorization Fails

**Issue**: Error during OAuth flow

**Solutions**:
- Verify redirect URI matches exactly in Azure AD
- Check client ID and secret are correct
- Ensure `Calendars.ReadWrite` permission is granted
- Clear browser cache and try again

### Tokens Not Refreshing

**Issue**: "Token expired" errors

**Solutions**:
- Check refresh token exists in database
- Verify client secret hasn't expired in Azure AD
- User may need to re-authorize (disconnect and reconnect)

### Teams Notifications Not Sending

**Issue**: No messages appear in Teams channel

**Solutions**:
- Verify webhook URL is correct
- Check webhook hasn't been deleted in Teams
- Test webhook with curl:
  ```bash
  curl -H "Content-Type: application/json" -d '{"text": "Test"}' YOUR_WEBHOOK_URL
  ```
- Check `teams_integration` table has correct webhook URL

### Calendar Events Not Creating

**Issue**: Error when creating calendar event

**Solutions**:
- Verify user has connected their calendar
- Check `calendar_integrations` table for valid tokens
- Ensure attendee emails are valid
- Check start time is before end time
- Review browser console for specific error messages

## Security Best Practices

1. **Token Storage**
   - Tokens are encrypted in database
   - Row-level security enforces access control
   - Tokens never exposed to client-side code

2. **Webhook Security**
   - Store webhooks server-side only
   - Validate webhook URLs before saving
   - Limit access to Teams configuration page

3. **OAuth Scopes**
   - Only request minimal required permissions
   - Users must explicitly grant consent
   - Refresh tokens allow long-term access

4. **Client Secrets**
   - Rotate secrets every 12-24 months
   - Use environment variables (never commit to git)
   - Different secrets for dev/staging/production

## API Reference

### Calendar APIs

```
GET    /api/calendar/auth                    # Initiate OAuth flow
GET    /api/calendar/callback                # OAuth callback handler
POST   /api/calendar/events                  # Create calendar event
GET    /api/calendar/events                  # List user's calendar events
GET    /api/tickets/:id/calendar-events      # Get events for specific ticket
DELETE /api/tickets/:id/calendar-events/:eventId  # Delete event
```

### Teams APIs

```
GET  /api/teams/webhook       # Get Teams webhook configuration
POST /api/teams/webhook       # Save Teams webhook configuration
POST /api/teams/notify        # Send notification to Teams channel
```

## Next Steps

1. **Automatic Notifications**
   - Configure automatic Teams notifications for ticket events
   - Add to ticket creation workflow
   - Send status change notifications

2. **Calendar Sync**
   - Two-way sync with Outlook Calendar
   - Update events when ticket status changes
   - Delete events when tickets are closed

3. **Enhanced Adaptive Cards**
   - Add action buttons to Teams cards
   - Allow status updates from Teams
   - Show real-time ticket updates

4. **Multi-tenant Support**
   - Support multiple Teams workspaces
   - Per-organization webhook configuration
   - Team-specific calendar integrations
