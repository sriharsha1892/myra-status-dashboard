# Error Reporting System

## Overview

The application now includes an automated error reporting system that allows users to easily report bugs and errors directly to the support team.

## Features

### 1. **Automatic Error Detection**
Errors are automatically categorized by type:
- Network errors (connection issues)
- Authentication errors (session expired, unauthorized)
- Duplicate errors (email already exists, etc.)
- Validation errors (missing fields)
- Permission errors (access denied)
- Database errors (server issues)
- Timeout errors

### 2. **User-Friendly Error Messages**
All errors now show:
- Clear, relatable message (no tech jargon)
- Helpful suggestion for what to do next
- Technical details (in development mode only)

### 3. **Report to Support**
When errors occur, users can:
- Click "Report to Support" button in the error message
- Automatically creates a high-priority ticket for admins
- Includes full error details, stack trace, and context
- Notifies all super admins immediately

## How It Works

### For Users

When an error occurs:
1. **Error appears**: User sees a friendly error message
2. **Report option**: "Report to Support" button is shown
3. **One click**: User clicks the button
4. **Ticket created**: System creates a support ticket automatically
5. **Confirmation**: User sees ticket number

### For Admins

When a user reports an error:
1. **Ticket created**: A new ticket with category "bug" is created
2. **Notification sent**: All super admins receive a notification
3. **Full context included**: Ticket includes:
   - Error message and stack trace
   - Page URL where error occurred
   - User information
   - Timestamp (in IST)
   - Browser/device info
   - Additional context

## Implementation

### Using Error Reporting in Components

```tsx
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { getErrorMessage } from '@/lib/errorHandler';

// In your error handler
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

### Error Contexts

Available error contexts:
- `trial_org_create` - Creating trial organizations
- `trial_org_update` - Updating trial organizations
- `user_create` - Creating users
- `user_update` - Updating users
- `note_create` - Creating notes
- `login` - Authentication
- `api_call` - General API calls
- `generic` - Fallback for other errors

## Error Flow

```
User Action
    ↓
Error Occurs
    ↓
Friendly Error Message Shown
    ↓
User Clicks "Report to Support"
    ↓
POST /api/error-reports
    ↓
Ticket Created (status: open, priority: high)
    ↓
Notifications Sent to Super Admins
    ↓
Admin Investigates & Resolves
```

## Database Schema

Error reports are stored as tickets with:
- `title`: Short description of the error
- `description`: Full error details (HTML formatted)
- `status`: 'open'
- `priority`: 'high'
- `category`: 'bug'
- `source`: 'error_report'

## Benefits

1. **For Users**:
   - Easy bug reporting (one click)
   - No need to explain technical details
   - Get confirmation that issue is reported

2. **For Admins**:
   - Full error context automatically captured
   - High priority notifications
   - Faster debugging with complete stack traces
   - Track error patterns

3. **For Product**:
   - Better error tracking
   - Improved user experience
   - Faster issue resolution
   - Data-driven bug fixing

## Example Error Messages

### Network Error
```
Oops! Can't reach the server right now 🌐
Check your internet connection and try again

[Report to Support]
```

### Duplicate Error
```
This email is already registered 👥
Please use a different email address

[Report to Support]
```

### Authentication Error
```
Session expired ⏰
Please log in again to continue

[Report to Support]
```

## Testing

To test error reporting:
1. Trigger any error in the application
2. Error toast should appear with report button
3. Click "Report to Support"
4. Check notifications for new error report
5. Verify ticket was created in /support/tickets

## Future Enhancements

- Error analytics dashboard
- Automatic error grouping/deduplication
- User-facing error history
- Integration with external error tracking services
