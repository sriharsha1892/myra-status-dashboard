# Error Handling Guide

This guide explains how to implement graceful error handling throughout the application.

## Quick Start

Import and use the `handleError` function for consistent error handling:

```typescript
import { handleError } from '@/lib/utils/errorHandler';

try {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) throw error;

  // Use data...
} catch (error: any) {
  handleError(error, {
    context: 'fetching users',
    additionalContext: {
      userId: currentUserId,
      // Any other relevant context
    }
  });
}
```

## Why Use handleError?

**Before** (bad):
```typescript
catch (error) {
  console.error('Error:', error);  // Logs "{}" - not helpful!
  toast.error('Failed');           // Generic message
}
```

**After** (good):
```typescript
catch (error: any) {
  handleError(error, {
    context: 'creating todo',
    additionalContext: { todoTitle: title }
  });
}
```

**Benefits:**
- ✅ Detailed error logging (message, code, details, hint, timestamp)
- ✅ User-friendly error messages
- ✅ Automatic error type detection (permission, not-found, validation)
- ✅ Consistent error handling across the app
- ✅ Better debugging with context

## API Reference

### `handleError(error, options)`

Main error handler that logs details and shows user-friendly messages.

**Parameters:**
- `error`: The error object
- `options`: Configuration object
  - `context` (string): What was being done (e.g., 'creating todo', 'fetching ticket')
  - `showToast` (boolean): Whether to show toast notification (default: true)
  - `customToastMessage` (string): Override the auto-generated message
  - `additionalContext` (object): Extra data to log for debugging
  - `onError` (function): Callback to execute after error handling

**Example:**
```typescript
handleError(error, {
  context: 'updating user profile',
  additionalContext: {
    userId: user.id,
    fields: ['name', 'email']
  },
  onError: () => {
    // Additional cleanup or logging
  }
});
```

### `withErrorHandling(fn, options)`

Async wrapper that catches and handles errors automatically.

**Example:**
```typescript
const data = await withErrorHandling(
  async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*');
    if (error) throw error;
    return data;
  },
  { context: 'fetching todos' }
);

// data will be null if error occurred
if (data) {
  setTodos(data);
}
```

### Error Type Checkers

Check for specific error types:

```typescript
import { isPermissionError, isNotFoundError, isValidationError } from '@/lib/utils/errorHandler';

try {
  // ...
} catch (error: any) {
  if (isPermissionError(error)) {
    // Handle permission errors differently
    router.push('/login');
  } else if (isNotFoundError(error)) {
    // Handle not found
    router.push('/404');
  } else {
    handleError(error, { context: 'loading data' });
  }
}
```

## Common Patterns

### 1. Supabase Queries

```typescript
try {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data;
} catch (error: any) {
  handleError(error, {
    context: 'fetching record',
    additionalContext: { id }
  });
  return null;
}
```

### 2. Form Submissions

```typescript
const handleSubmit = async () => {
  if (!formData.title.trim()) {
    toast.error('Title is required');
    return;
  }

  try {
    const { error } = await supabase
      .from('items')
      .insert(formData);

    if (error) throw error;

    toast.success('Item created successfully');
    onSuccess();
  } catch (error: any) {
    handleError(error, {
      context: 'creating item',
      additionalContext: {
        itemType: formData.type,
        hasAttachments: formData.files?.length > 0
      }
    });
  }
};
```

### 3. API Routes

```typescript
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*');

    if (error) throw error;

    return Response.json({ data });
  } catch (error: any) {
    const { extractErrorDetails } = await import('@/lib/utils/errorHandler');
    const details = extractErrorDetails(error);

    console.error('API Error:', details);

    return Response.json(
      { error: details.message || 'Internal server error' },
      { status: details.status || 500 }
    );
  }
}
```

### 4. Multiple Operations

```typescript
try {
  // First operation
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  // Second operation
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ last_login: new Date() })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  return user;
} catch (error: any) {
  handleError(error, {
    context: 'loading user profile',
    additionalContext: { userId, step: 'multi-step operation' }
  });
  return null;
}
```

## Error Messages

The error handler automatically provides user-friendly messages for common scenarios:

| Error Type | User Sees |
|------------|-----------|
| Permission denied (42501, policy) | "You don't have permission to [action]" |
| Not found (PGRST116) | "The requested item was not found" |
| Duplicate key (23505) | "This item already exists" |
| Foreign key violation (23503) | "Invalid reference. Please ensure all related items exist" |
| Not null violation (23502) | "Missing required information" |
| Network errors | "Network error. Please check your connection" |

## Best Practices

1. **Always provide context:**
   ```typescript
   // Bad
   handleError(error);

   // Good
   handleError(error, { context: 'deleting comment' });
   ```

2. **Add relevant context data:**
   ```typescript
   handleError(error, {
     context: 'updating roadmap item',
     additionalContext: {
       itemId,
       status: newStatus,
       previousStatus: oldStatus
     }
   });
   ```

3. **Validate before submitting:**
   ```typescript
   // Check required fields before making API calls
   if (!title.trim()) {
     toast.error('Title is required');
     return;
   }
   ```

4. **Handle specific errors when needed:**
   ```typescript
   try {
     // ...
   } catch (error: any) {
     if (isPermissionError(error)) {
       router.push('/login');
       return;
     }
     handleError(error, { context: 'loading data' });
   }
   ```

5. **Use type assertion:**
   ```typescript
   // Always use `error: any` to access error properties
   } catch (error: any) {
     handleError(error, { context: 'action' });
   }
   ```

## Migration Guide

### Converting Existing Code

**Old Pattern:**
```typescript
try {
  // ... database operation
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to save');
}
```

**New Pattern:**
```typescript
try {
  // ... database operation
} catch (error: any) {
  const { handleError } = await import('@/lib/utils/errorHandler');
  handleError(error, {
    context: 'saving data',
    additionalContext: { /* relevant data */ }
  });
}
```

### Finding Code to Update

Search for these patterns in your codebase:
```bash
# Find empty error objects
grep -r "console.error.*error.*)" --include="*.tsx" --include="*.ts"

# Find generic error messages
grep -r "toast.error('Failed" --include="*.tsx" --include="*.ts"

# Find catch blocks
grep -r "} catch.*error.*{" --include="*.tsx" --include="*.ts"
```

## Examples in Codebase

- ✅ `components/support/TodosWidget.tsx` - Todo creation error handling
- ✅ `app/support/tickets/[id]/page.tsx` - Ticket fetching error handling

## Support

For questions or issues with error handling:
1. Check the examples in this guide
2. Look at the implemented patterns in the files listed above
3. Review the `errorHandler.ts` source code for additional utilities
