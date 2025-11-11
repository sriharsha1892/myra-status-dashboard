# Support System Setup Guide

## Overview

The Support System requires three components to be configured:
1. **Database Schema** - tickets and notifications tables
2. **Storage Bucket** - for file attachments
3. **Super Admin** - to receive support notifications

## Current Status

✅ **Storage Bucket**: Created successfully
⚠️ **Database Schema**: Migration needs to be applied
⚠️ **Super Admin**: Needs to be configured

---

## Step-by-Step Setup

### 1. Apply Database Migration

The database migration updates the `tickets` table to support the new support system features.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of:
   ```
   supabase/migrations/20251110_support_system_schema.sql
   ```
6. Click **Run** or press `Ctrl/Cmd + Enter`
7. Verify all statements executed successfully

**Option B: Using Supabase CLI**

If you have Supabase CLI installed and linked:

```bash
npx supabase db push
```

**What this migration does:**
- Adds `ticket_id`, `title`, `source`, and `created_by` columns to tickets table
- Updates status values: 'New' → 'open', 'In Progress' → 'in_progress', etc.
- Updates priority values: 'Low' → 'low', 'High' → 'high', etc.
- Maps categories to support system categories
- Updates CHECK constraints
- Adds RLS policy for public support form submissions
- Adds indexes for better performance

---

### 2. Configure Super Admin

At least one user needs to be set as a super admin to receive support ticket notifications.

**Method 1: Using SQL Editor**

1. Go to Supabase Dashboard > SQL Editor
2. Run this query (replace with your email):

```sql
UPDATE users
SET is_super_admin = true
WHERE email = 'your-email@example.com';
```

**Method 2: Using a Script**

```bash
# Check current super admins
node scripts/check-support-db.js

# Set a user as super admin (if you have a script for this)
# Or use the SQL method above
```

**Verify Super Admins:**

```sql
SELECT id, email, is_super_admin
FROM users
WHERE is_super_admin = true;
```

---

### 3. Verify Setup

Run the verification script to check all components:

```bash
node scripts/check-support-db.js
```

**Expected output when everything is configured:**

```
✅ Tickets table exists and is accessible
✅ Notifications table exists and is accessible
✅ Public storage bucket exists
✅ Found 1 super admin(s) who will receive support notifications
   - your-email@example.com

============================================================
✅ ALL CHECKS PASSED - Database is ready for support system!
============================================================
```

---

## Support Features

Once setup is complete, these features will be available:

### 1. Contact Support (`/support/help`)

A public form where users can:
- Submit support tickets with WYSIWYG editor
- Upload screenshots and files (up to 10MB)
- Select category and priority
- Attach error logs

**How it works:**
1. User fills out the form
2. Files are uploaded to `public/support-attachments/`
3. Ticket is created with `source='support_form'`
4. All super admins receive notifications

### 2. Automated Error Reporting

When errors occur in the application:
- User sees error toast with "Report to Support" button
- Clicking the button creates a ticket with full error context
- Ticket includes: error message, stack trace, page URL, user info
- Created with `source='error_report'` and `priority='high'`

**Example usage in code:**

```typescript
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { getErrorMessage } from '@/lib/errorHandler';

try {
  // Your code
} catch (error: any) {
  const { data: { user } } = await supabase.auth.getUser();
  const errorDetails = getErrorMessage(error, 'trial_org_create');

  showErrorWithReport(
    error,
    'trial_org_create',
    errorDetails.message,
    errorDetails.suggestion,
    user?.email,
    user?.id
  );
}
```

### 3. Forgot Password (`/support/login`)

Currently a manual process:
1. User requests password reset
2. Admin is notified at `sriharsha@mordorintelligence.com`
3. Admin runs: `node scripts/reset-user-password.js user@example.com NewPassword123!`
4. Admin emails user the new password

**Future enhancement**: Automatic email with reset link

---

## Database Schema

### Tickets Table (Updated)

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  ticket_id UUID,              -- NEW: Public-facing ID
  ticket_number TEXT UNIQUE,
  title TEXT,                  -- NEW: Ticket subject
  description TEXT,
  status TEXT,                 -- Updated: 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT,               -- Updated: 'low', 'medium', 'high', 'urgent'
  category TEXT,               -- Updated: 'general', 'bug', 'feature', 'account', 'technical'
  source TEXT,                 -- NEW: 'support_form', 'error_report', 'manual', 'api'
  created_by UUID,             -- NEW: User ID (nullable)
  assigned_to UUID,
  organization TEXT,
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT,            -- 'ticket', 'note', etc.
  entity_id UUID,
  entity_title TEXT,
  notification_type TEXT,      -- Updated: includes 'support_ticket', 'error_report'
  actor_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT NOT NULL,
  priority_score INTEGER,      -- 0-100
  thread_key TEXT,
  status TEXT,                 -- 'unread', 'read', 'archived'
  created_at TIMESTAMPTZ
);
```

### Storage

**Bucket:** `public`
**Path:** `support-attachments/{timestamp}-{random}.{ext}`
**Allowed Types:** Images (PNG, JPG, GIF, WebP), PDF, TXT, LOG, JSON
**Max Size:** 10MB per file
**Access:** Public read

---

## API Endpoints

### POST `/api/support-tickets`

Create a support ticket from the contact form.

**Request:**
```json
{
  "subject": "Cannot login",
  "description": "<p>Error details...</p>",
  "category": "technical",
  "priority": "high",
  "attachments": [
    {
      "name": "screenshot.png",
      "url": "https://...",
      "type": "image/png",
      "size": 12345
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

### POST `/api/error-reports`

Submit an automated error report.

**Request:**
```json
{
  "error_message": "Failed to load data",
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

### POST `/api/forgot-password-notify`

Notify admin of password reset request (currently logs to console).

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
  "message": "Admin has been notified..."
}
```

---

## Troubleshooting

### Issue: Tickets table column errors

**Symptom:** API returns column errors like "column 'ticket_id' does not exist"

**Solution:** Apply the migration SQL from step 1

### Issue: Storage upload fails

**Symptom:** "Bucket not found" or upload errors

**Solution:**
1. Check if bucket exists: `node scripts/setup-support-system.js`
2. Create bucket manually in Supabase Dashboard > Storage > Create bucket "public"

### Issue: No notifications received

**Symptom:** Tickets created but admins don't get notified

**Solution:** Set at least one user as super admin (see step 2)

### Issue: RLS policy errors

**Symptom:** "new row violates row-level security policy"

**Solution:** The migration includes updated RLS policies. Ensure they're applied:

```sql
-- Allow public to create support tickets
CREATE POLICY "Public can create support tickets"
  ON tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (source IN ('support_form', 'error_report'));
```

---

## Testing

### Test Contact Support Form

1. Go to `/support/help`
2. Fill out the form:
   - Email: test@example.com
   - Subject: Test ticket
   - Category: General
   - Priority: Low
   - Description: Testing support system
3. Upload a test image
4. Submit
5. Check:
   - Ticket created in database
   - File uploaded to storage
   - Super admin received notification

### Test Error Reporting

1. Trigger any error in the application
2. Click "Report to Support" in error toast
3. Check:
   - Ticket created with `source='error_report'`
   - Priority set to 'high'
   - Error details captured

### Test Forgot Password

1. Go to `/support/login`
2. Click "Forgot password?"
3. Enter test email
4. Check console logs for notification

---

## Next Steps After Setup

1. **Email Configuration**: Set up Supabase Auth emails for automatic password reset
2. **Knowledge Base**: Add FAQ section to reduce support tickets
3. **Ticket Management**: Build admin interface to view and respond to tickets
4. **Analytics**: Track support metrics (response time, resolution time, etc.)
5. **User Notifications**: Email users when their tickets are updated

---

## Support

For issues with this setup, check:
- `/docs/SUPPORT_SYSTEM.md` - Detailed feature documentation
- `/docs/ERROR_REPORTING.md` - Error reporting system docs
- Scripts in `/scripts/` - Helper scripts for management
