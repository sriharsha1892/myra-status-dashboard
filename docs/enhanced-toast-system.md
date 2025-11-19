# Enhanced Toast System Documentation

**Status:** Production Ready
**Last Updated:** 2025-11-19

## Overview

The Enhanced Toast System provides a sophisticated notification framework with advanced features including:
- Smart deduplication (prevents duplicate toasts)
- Automatic grouping and collapsing
- Progressive disclosure for technical details
- Contextual actions (retry, undo, custom buttons)
- localStorage persistence across sessions
- Priority-based styling
- Integration with error reporting

## Architecture

### Core Components

1. **Toast Manager** (`/lib/toast/manager.ts`)
   - Singleton pattern for global state management
   - Handles deduplication, grouping, and lifecycle
   - Integrates with react-hot-toast

2. **Toast Components** (`/components/toast/`)
   - `EnhancedToast.tsx` - Main toast UI with progressive disclosure
   - `ToastActions.tsx` - Action buttons (retry, undo, custom)
   - `ToastProvider.tsx` - React provider with configuration

3. **Persistence Layer** (`/lib/toast/persistence.ts`)
   - localStorage-based history and persistent toasts
   - Automatic TTL cleanup (7 days default)
   - Analytics and statistics

4. **Type Definitions** (`/lib/toast/types.ts`)
   - Comprehensive TypeScript types
   - Toast metadata and configuration interfaces

## Quick Start

### Basic Usage

```typescript
import { enhancedToast } from '@/lib/toast/manager';

// Success toast
enhancedToast.success('User created successfully');

// Error toast (doesn't auto-dismiss by default)
enhancedToast.error('Failed to save changes');

// Warning toast
enhancedToast.warning('Connection is unstable');

// Info toast
enhancedToast.info('System maintenance scheduled for tomorrow');

// Loading toast
const loadingId = enhancedToast.loading('Processing your request...');

// Update loading toast
enhancedToast.resolveLoading(loadingId, 'Request completed successfully');

// Or reject loading toast
enhancedToast.rejectLoading(loadingId, 'Request failed');
```

### Advanced Usage

#### Toast with Description

```typescript
enhancedToast.success('Organization created', {
  description: 'The organization has been successfully created and is now active',
  duration: 5000,
});
```

#### Toast with Retry Action

```typescript
enhancedToast.error('Failed to fetch data', {
  description: 'Unable to load user information',
  onRetry: async () => {
    // Retry logic here
    await fetchUserData();
  },
});
```

#### Toast with Custom Actions

```typescript
enhancedToast.show({
  type: 'info',
  message: 'New feature available',
  description: 'Try our new dashboard analytics',
  actions: [
    {
      label: 'View Now',
      variant: 'primary',
      onClick: () => {
        router.push('/analytics');
      },
    },
    {
      label: 'Learn More',
      variant: 'secondary',
      onClick: () => {
        window.open('/docs/analytics', '_blank');
      },
    },
  ],
});
```

#### Toast with Progressive Disclosure

```typescript
enhancedToast.show({
  type: 'error',
  message: 'Database connection failed',
  description: 'Unable to connect to the database server',
  expandable: true,
  metadata: {
    technicalDetails: 'Connection timeout after 30s. Host: db.example.com:5432',
    errorCode: 'ECONNREFUSED',
    context: 'database_connection',
  },
});
```

#### Persistent Toast (Survives Page Refresh)

```typescript
enhancedToast.show({
  type: 'warning',
  message: 'Trial period ending soon',
  description: 'Your trial expires in 3 days',
  metadata: {
    persist: true,
    persistKey: 'trial_expiry_warning',
  },
  duration: 0, // Won't auto-dismiss
});
```

## Deduplication

Prevents showing the same toast multiple times within a configurable time window (5 seconds by default).

### How It Works

```typescript
// Same message within 5 seconds will be deduplicated
enhancedToast.success('User saved', {
  metadata: {
    dedupeKey: 'save_user_123', // Unique key for this operation
  },
});

// If called again within 5 seconds, count will increment
// Toast will show: "User saved (2)"
```

### Deduplication Strategies

1. **ignore** - Ignore subsequent toasts
2. **update** - Replace existing toast with new message
3. **increment** - Show count of duplicate toasts (default)

## Grouping

Automatically groups similar toasts and collapses them when threshold is reached.

```typescript
// Multiple error toasts with the same groupKey
for (let i = 0; i < 5; i++) {
  enhancedToast.error(`Failed to process item ${i}`, {
    metadata: {
      groupKey: 'batch_processing_errors',
    },
  });
}

// When 3+ toasts in a group, automatically collapses to:
// "5 error notifications"
```

## Integration with Error Handler

The Enhanced Toast System is integrated with the error handler for seamless error reporting:

```typescript
import { showEnhancedError } from '@/lib/errorHandler';

try {
  await createUser(userData);
} catch (error) {
  showEnhancedError(error, 'user_create', {
    onRetry: async () => {
      // Retry the operation
      await createUser(userData);
    },
    userEmail: user.email,
    userId: user.id,
    priority: 'high',
  });
}
```

### Features of Enhanced Error Toasts:

- Automatic priority assignment based on error type
- Progressive disclosure of technical details (dev mode only)
- Built-in "Report to Support" button
- Optional retry action
- Context-aware error messages
- Automatic deduplication

## Toast Types and Styling

### Success
- Green theme
- Checkmark icon
- Auto-dismisses after 5 seconds (configurable)

### Error
- Red theme
- X icon
- Does NOT auto-dismiss (requires manual dismissal)
- Supports retry action
- Often includes "Report to Support" button

### Warning
- Amber theme
- Warning icon
- Auto-dismisses after 5 seconds

### Info
- Gray theme
- Info icon
- Auto-dismisses after 5 seconds

### Loading
- Blue theme
- Spinning icon
- Never auto-dismisses (must be manually resolved/rejected)

## Priority Levels

Toasts can have priority levels that affect styling:

- **critical** - Red left border
- **high** - Amber left border
- **normal** - No border
- **low** - Thin gray border

```typescript
enhancedToast.error('System failure detected', {
  priority: 'critical',
});
```

## Persistence & History

### Viewing Toast History

```typescript
import { getHistory, getToastStats } from '@/lib/toast/persistence';

// Get all dismissed toasts (last 7 days)
const history = getHistory();

// Get statistics
const stats = getToastStats();
console.log(stats);
// {
//   totalDismissed: 45,
//   byType: { success: 20, error: 15, warning: 10 },
//   byDismissedBy: { user: 30, auto: 15 },
//   last24h: 12
// }
```

### Clearing History

```typescript
import { clearHistory } from '@/lib/toast/persistence';

clearHistory(); // Removes all toast history
```

## Configuration

The toast manager can be configured globally:

```typescript
import { ToastManager } from '@/lib/toast/manager';

const manager = new ToastManager({
  maxToasts: 5, // Maximum concurrent toasts
  defaultDuration: 5000, // Default auto-dismiss time (ms)

  deduplication: {
    enabled: true,
    window: 5000, // Deduplication time window
    strategy: 'increment', // 'ignore' | 'update' | 'increment'
  },

  grouping: {
    enabled: true,
    maxGroupSize: 10,
    collapseThreshold: 3, // Collapse when 3+ toasts
  },

  persistence: {
    enabled: true,
    storageKey: 'toast_persistent',
    maxItems: 20,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});
```

## Best Practices

### When to Use Each Toast Type

- **Success** - Confirm successful operations (save, create, update, delete)
- **Error** - Show operation failures that need attention
- **Warning** - Alert users to potential issues or important information
- **Info** - Provide general information or tips
- **Loading** - Indicate ongoing operations

### Toast Message Guidelines

1. **Be Concise** - Keep messages short and clear
   - Good: "User created successfully"
   - Bad: "The user has been successfully created and added to the database"

2. **Be Specific** - Provide context
   - Good: "Failed to update profile"
   - Bad: "Something went wrong"

3. **Provide Actions** - When applicable
   - Add "Retry" for network errors
   - Add "Undo" for destructive operations
   - Add "View Details" for complex operations

4. **Use Descriptions** - For additional context
   ```typescript
   enhancedToast.success('Email sent', {
     description: 'Notification sent to john@example.com',
   });
   ```

### Progressive Disclosure

Only show technical details when helpful:
- Use `expandable: true` for errors with technical information
- Store stack traces in `metadata.technicalDetails`
- Show in development, hide in production

```typescript
enhancedToast.error('API request failed', {
  description: 'Unable to fetch user data',
  expandable: true,
  metadata: {
    technicalDetails: process.env.NODE_ENV === 'development'
      ? error.stack
      : undefined,
  },
});
```

## API Reference

### enhancedToast.show(options)

Main method to show a toast with full control.

```typescript
enhancedToast.show({
  type: 'success' | 'error' | 'warning' | 'info' | 'loading',
  message: string,
  description?: string,
  duration?: number, // ms, 0 = infinite
  autoDismiss?: boolean,
  priority?: 'low' | 'normal' | 'high' | 'critical',
  expandable?: boolean,
  expanded?: boolean,

  // Actions
  actions?: Array<{
    label: string,
    onClick: () => void | Promise<void>,
    variant?: 'primary' | 'secondary' | 'danger',
    loading?: boolean,
  }>,
  onRetry?: () => void | Promise<void>,
  onUndo?: () => void | Promise<void>,
  onViewDetails?: () => void,
  onDismiss?: () => void,

  // Metadata
  metadata?: {
    dedupeKey?: string,
    groupKey?: string,
    persist?: boolean,
    persistKey?: string,
    technicalDetails?: string,
    errorCode?: string,
    context?: string,
    data?: Record<string, any>,
  },
});
```

### Convenience Methods

```typescript
// Success
enhancedToast.success(message, options?)

// Error (autoDismiss: false by default)
enhancedToast.error(message, options?)

// Warning
enhancedToast.warning(message, options?)

// Info
enhancedToast.info(message, options?)

// Loading (duration: 0 by default)
enhancedToast.loading(message, options?)

// Dismiss
enhancedToast.dismiss(id)
enhancedToast.dismissAll()

// Loading state management
enhancedToast.updateLoading(id, message)
enhancedToast.resolveLoading(id, message)
enhancedToast.rejectLoading(id, message)
```

## Examples

### Example 1: Form Submission with Retry

```typescript
async function handleSubmit(data) {
  const loadingId = enhancedToast.loading('Saving changes...');

  try {
    await api.updateProfile(data);
    enhancedToast.resolveLoading(loadingId, 'Profile updated successfully');
  } catch (error) {
    enhancedToast.rejectLoading(loadingId, 'Failed to update profile');

    showEnhancedError(error, 'user_update', {
      onRetry: () => handleSubmit(data),
      userEmail: user.email,
      userId: user.id,
    });
  }
}
```

### Example 2: Batch Operation with Grouping

```typescript
async function processBatch(items) {
  const results = await Promise.allSettled(
    items.map(item => processItem(item))
  );

  const failures = results.filter(r => r.status === 'rejected');

  if (failures.length > 0) {
    failures.forEach((failure, index) => {
      enhancedToast.error(`Failed to process item ${index + 1}`, {
        description: failure.reason?.message,
        metadata: {
          groupKey: 'batch_processing',
        },
      });
    });
  } else {
    enhancedToast.success('All items processed successfully', {
      description: `${items.length} items completed`,
    });
  }
}
```

### Example 3: Persistent Warning

```typescript
// Show trial expiry warning that persists across page reloads
function showTrialWarning(daysRemaining) {
  enhancedToast.show({
    type: 'warning',
    message: 'Trial period ending soon',
    description: `Your trial expires in ${daysRemaining} days`,
    priority: 'high',
    metadata: {
      persist: true,
      persistKey: 'trial_expiry_warning',
      data: { daysRemaining },
    },
    actions: [
      {
        label: 'Upgrade Now',
        variant: 'primary',
        onClick: () => router.push('/billing/upgrade'),
      },
    ],
    duration: 0, // Don't auto-dismiss
  });
}
```

## Troubleshooting

### Toast Not Appearing

1. Ensure `ToastProvider` is included in your app layout
2. Check browser console for errors
3. Verify react-hot-toast is installed: `npm list react-hot-toast`

### Toasts Overlapping

- Reduce `maxToasts` in configuration
- Enable `grouping` to collapse similar toasts

### Deduplication Not Working

- Ensure you're setting a consistent `dedupeKey` in metadata
- Check deduplication window (default 5 seconds)
- Verify deduplication is enabled in configuration

### Persistent Toasts Not Surviving Reload

- Ensure both `persist: true` and unique `persistKey` are set
- Check localStorage is enabled in browser
- Verify TTL hasn't expired (default 7 days)

## Migration from Basic Toasts

If you're currently using basic react-hot-toast:

```typescript
// Before (basic toast)
import toast from 'react-hot-toast';
toast.success('Operation completed');

// After (enhanced toast)
import { enhancedToast } from '@/lib/toast/manager';
enhancedToast.success('Operation completed');

// Or keep using basic toasts - both systems coexist!
// Basic toasts continue to work unchanged
```

The enhanced toast system is fully backward compatible. Existing toast calls continue to work.

## Related Documentation

- [Error Handling Enhancement](./error-handling-enhancement-progress.md)
- [Zod Migration Enhancement Plan](./zod-migration-enhancement-plan.md)

---

**For questions or issues:** Report at `/support/admin/errors` or create a support ticket
