# Support System Documentation

## Overview

The myRA AI Support Portal has a comprehensive support system that allows users to get help, report issues, and request password resets.

## Support Features

### 1. **Contact Support** (`/support/help`)

A full-featured ticket submission form with:

#### Features:
- **WYSIWYG Editor**: Rich text editor for detailed issue descriptions
  - Format text (bold, italic, lists, headings)
  - Add code blocks for error messages
  - Structure content clearly

- **File Attachments**: Upload multiple files
  - Screenshots (PNG, JPG, GIF)
  - Error logs (.log, .txt)
  - Documents (PDF, JSON)
  - Max 10MB per file
  - Automatic image preview in tickets

- **Categorization**:
  - General Inquiry
  - Bug Report
  - Feature Request
  - Account Issue
  - Technical Support

- **Priority Levels**:
  - Low: General questions
  - Medium: Standard issues
  - High: Blocking issues
  - Urgent: Critical/production issues

#### How It Works:

1. **User submits ticket** → Fills form with issue details
2. **Files uploaded** → Attachments stored in Supabase storage
3. **Ticket created** → Stored in `tickets` table
4. **Admins notified** → All super admins get instant notification
5. **Email confirmation** → User receives ticket number
6. **Support team responds** → Via ticket system

#### Example Use Cases:

- Report a bug with screenshot
- Share error logs from console
- Request help with a specific feature
- Report login issues with details

---

### 2. **Automated Error Reporting** (Built-in)

When errors occur in the application, users can report them with one click:

#### Features:
- Automatic error context capture
- Stack traces included
- Page URL where error occurred
- User session information
- Browser/device details

#### Flow:
```
Error Occurs → User sees error toast
              ↓
User clicks "Report to Support"
              ↓
Error report sent to /api/error-reports
              ↓
Ticket created with full context
              ↓
Super admins notified
```

#### What's Captured:
- Error message and stack trace
- Page URL
- User email and ID
- Timestamp (IST)
- Browser user agent
- Additional context (if available)

---

### 3. **Forgot Password** (Login Page)

Located at `/support/login`, accessed via "Forgot password?" link.

#### Current Implementation:

**How it works:**
1. User clicks "Forgot password?"
2. Modal opens requesting email
3. User enters their email
4. System notifies admin at `sriharsha@mordorintelligence.com`
5. Admin manually resets password using script
6. Admin sends new password to user via email

**Admin Process:**
```bash
node scripts/reset-user-password.js user@example.com NewPassword123!
```

#### What User Sees:
```
✅ Request submitted successfully!
   Support team has been notified for user@example.com
   You'll receive a new password via email shortly
```

#### What Admin Sees (Console Log):
```
📧 FORGOT PASSWORD NOTIFICATION
To: sriharsha@mordorintelligence.com
Subject: Password Reset Request: user@example.com

User user@example.com requested a password reset.

To reset their password manually, run:
node scripts/reset-user-password.js user@example.com NewPassword123!

Then send them their new temporary password.
```

#### Future Enhancement (TODO):
- Automatic email with reset link
- Self-service password reset
- Requires Supabase email configuration

---

## Database Schema

### Tickets Table
```sql
CREATE TABLE tickets (
  ticket_id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,  -- HTML content with images/attachments
  status TEXT,       -- open, in_progress, resolved, closed
  priority TEXT,     -- low, medium, high, urgent
  category TEXT,     -- general, bug, feature, account, technical
  created_by UUID,
  assigned_to UUID,
  source TEXT,       -- 'support_form', 'error_report', etc.
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT,      -- 'ticket'
  entity_id UUID,        -- ticket_id
  entity_title TEXT,     -- ticket subject
  notification_type TEXT, -- 'support_ticket', 'error_report'
  title TEXT,
  message TEXT,
  action_url TEXT,       -- /support/tickets?id=xxx
  priority_score INTEGER,
  thread_key TEXT,       -- 'support_ticket:uuid'
  status TEXT,           -- 'unread', 'read'
  created_at TIMESTAMP
);
```

## API Endpoints

### POST /api/support-tickets
Create a new support ticket

**Request:**
```json
{
  "subject": "Cannot login to dashboard",
  "description": "<p>I'm getting error 500...</p>",
  "category": "technical",
  "priority": "high",
  "attachments": [
    {
      "name": "screenshot.png",
      "url": "https://...",
      "type": "image/png",
      "size": 45678
    }
  ],
  "user_email": "user@example.com",
  "user_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "ticketId": "uuid-here",
  "message": "Support ticket created successfully"
}
```

### POST /api/error-reports
Report an application error

**Request:**
```json
{
  "error_message": "Failed to create organization",
  "error_stack": "Error: ...\n  at ...",
  "context": "trial_org_create",
  "user_email": "user@example.com",
  "user_id": "uuid",
  "page_url": "https://app.myra.ai/support/trials",
  "timestamp": "2025-01-10T10:30:00Z",
  "user_agent": "Mozilla/5.0...",
  "additional_info": {}
}
```

**Response:**
```json
{
  "success": true,
  "ticketId": "uuid-here",
  "message": "Error report submitted successfully"
}
```

### POST /api/forgot-password-notify
Notify admin of password reset request

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin has been notified. You will receive a new password via email shortly."
}
```

## User Flows

### Submit Support Ticket

1. Navigate to `/support/help`
2. Fill in:
   - Email (required)
   - Name (optional)
   - Subject (required)
   - Category
   - Priority
   - Description (WYSIWYG)
   - Attachments (optional)
3. Click "Submit Ticket"
4. Receive confirmation with ticket number
5. Admin gets notified
6. Admin responds to ticket
7. User receives email update

### Report Error

1. Error occurs in application
2. Error toast appears with "Report to Support" button
3. Click button
4. Error details automatically sent
5. Ticket created with full context
6. Admin investigates and fixes
7. Admin closes ticket

### Reset Password

1. Go to login page
2. Click "Forgot password?"
3. Enter email
4. Submit request
5. Admin receives notification
6. Admin runs reset script
7. Admin emails new password
8. User logs in with new password

## Notification System

### Priority Scores:
- Urgent: 95
- High: 85
- Error Reports: 90
- Medium: 75
- Low: 60

### Notification Recipients:
- **Support Tickets**: All super admins
- **Error Reports**: All super admins
- **Password Resets**: sriharsha@mordorintelligence.com

## File Storage

Attachments are stored in Supabase Storage:

**Bucket:** `public`
**Path:** `support-attachments/{timestamp}-{random}.{ext}`
**Access:** Public read access
**Max Size:** 10MB per file

**Supported Formats:**
- Images: PNG, JPG, GIF, WebP
- Documents: PDF
- Logs: TXT, LOG, JSON

## Best Practices

### For Users:
1. **Be Specific**: Include exact error messages
2. **Add Screenshots**: Visual context helps
3. **Include Steps**: How to reproduce the issue
4. **Set Priority Correctly**: Don't mark everything urgent
5. **One Issue Per Ticket**: Don't combine multiple problems

### For Admins:
1. **Respond Quickly**: Acknowledge within 24h
2. **Update Status**: Keep ticket status current
3. **Ask for Clarification**: If details are missing
4. **Close When Done**: Mark resolved tickets as closed
5. **Follow Up**: Check if issue is truly fixed

## Analytics & Metrics

Track support performance:
- Response time (time to first admin response)
- Resolution time (time to close)
- Ticket volume by category
- Common issues
- User satisfaction

## Future Enhancements

- [ ] Self-service password reset
- [ ] Email notifications to users
- [ ] In-app chat support
- [ ] Knowledge base / FAQs
- [ ] Ticket status tracking for users
- [ ] SLA monitoring
- [ ] Support analytics dashboard
