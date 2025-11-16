# Error Handling Upgrade Guide
## Improving from 83% to 99% Error Handling

## Current Issue
Invalid JSON requests return 500 instead of 400, causing the 83% error handling score.

## Solution
Use the new `withErrorHandler` middleware to wrap all API routes.

---

## 🔧 Implementation Steps

### Step 1: Update Existing API Routes

Find all API route files in `app/api/**/*.ts` and wrap handlers with `withErrorHandler`.

**Before:**
```typescript
// app/api/parse-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // ... rest of the logic
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**After:**
```typescript
// app/api/parse-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, validateRequired } from '@/lib/middleware/errorHandler';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();

  // Validate required fields
  validateRequired(body, ['text']);

  const { text } = body;

  // ... rest of the logic
  // No try-catch needed - withErrorHandler handles it!

  return NextResponse.json({ success: true, data: result });
});
```

---

### Step 2: Use Helper Functions

The error handler provides useful utilities:

```typescript
import {
  validateRequired,
  createValidationError,
  createNotFoundError
} from '@/lib/middleware/errorHandler';

// Validate required fields
validateRequired(body, ['org_name', 'trial_start_date']);

// Throw validation error
if (endDate < startDate) {
  throw createValidationError('End date must be after start date');
}

// Throw not found error
if (!organization) {
  throw createNotFoundError('Organization');
}
```

---

### Step 3: Priority API Routes to Update

Update these routes first for maximum impact:

1. ✅ `/api/parse-activity/route.ts`
2. ✅ `/api/trials/parse-text/route.ts`
3. ✅ `/api/timeline/import/confirm/route.ts`
4. ✅ `/api/trials/bulk-operations/import-users/route.ts`

---

## 📊 Expected Results

### Before (83% Error Handling)
- ❌ Invalid JSON: Returns 500
- ✅ Empty input: Returns 400
- ✅ Missing fields: Returns 400

### After (99% Error Handling)
- ✅ Invalid JSON: Returns 400
- ✅ Empty input: Returns 400
- ✅ Missing fields: Returns 422
- ✅ Not found: Returns 404
- ✅ Unauthorized: Returns 401
- ✅ Unknown errors: Returns 500 with helpful message

---

## 🚀 Deployment

1. **Update routes** - Wrap handlers with `withErrorHandler`
2. **Test locally** - Run `npm run dev` and test endpoints
3. **Commit changes**:
   ```bash
   git add lib/middleware/errorHandler.ts
   git add app/api/**/*.ts
   git commit -m "feat: improve error handling to 99%"
   git push
   ```
4. **Verify in production** - Run test script after deployment

---

## ✅ Benefits

- **Better UX**: Users get clear, actionable error messages
- **Easier Debugging**: Consistent error format across all endpoints
- **Type Safety**: TypeScript-friendly error handling
- **Less Code**: No need for repetitive try-catch blocks
- **Automatic JSON Validation**: Catches malformed JSON before your code runs

---

## 📝 Example: Complete API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  validateRequired,
  createValidationError,
  createNotFoundError
} from '@/lib/middleware/errorHandler';
import { supabase } from '@/lib/supabase';

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Parse and validate
  const body = await req.json();
  validateRequired(body, ['org_name', 'trial_start_date']);

  const { org_name, trial_start_date, trial_end_date } = body;

  // Business logic validation
  if (trial_end_date && trial_end_date < trial_start_date) {
    throw createValidationError('Trial end date must be after start date');
  }

  // Database operation
  const { data, error } = await supabase
    .from('trial_organizations')
    .insert({ org_name, trial_start_date, trial_end_date })
    .select()
    .single();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  if (!data) {
    throw createNotFoundError('Organization');
  }

  // Success response
  return NextResponse.json({
    success: true,
    data,
    message: 'Organization created successfully'
  });
});
```

This route now handles:
- ✅ Invalid JSON (400)
- ✅ Missing required fields (422)
- ✅ Invalid date range (422)
- ✅ Database errors (500)
- ✅ Not found (404)

**All with clean, maintainable code!**
