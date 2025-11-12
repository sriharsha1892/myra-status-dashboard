# Potential 403 Error Locations

## Fixed ✅
- **app/support/admin/users/page.tsx** - All 4 API calls now use `authenticatedFetch()`

## Needs Authentication (High Priority) 🔴

### 1. app/support/users/page.tsx
- **Lines**: 3 fetch calls to `/api/admin/users`
- **Impact**: User management page will fail
- **Fix**: Import and use `authenticatedFetch` from `@/lib/api-client`

### 2. app/support/admin/trial-orgs-import/page.tsx
- **Line**: fetch to `/api/admin/users`
- **Impact**: Trial org import will fail when fetching account managers
- **Fix**: Import and use `authenticatedFetch`

### 3. app/support/reports/engagement/page.tsx
- **Line**: fetch to `/api/account-managers`
- **Impact**: Engagement reports won't load account manager list
- **Fix**: Import and use `authenticatedFetch`

## Likely Needs Authentication (Medium Priority) 🟡

### 4. app/support/trials/page.tsx
- **Line**: fetch to `/api/account-managers`
- **Impact**: Trials page dropdown won't populate
- **Fix**: Import and use `authenticatedFetch`

### 5. app/support/trials/[id]/page.tsx
- **Line**: fetch to `/api/account-managers`
- **Impact**: Trial detail page manager dropdown won't populate
- **Fix**: Import and use `authenticatedFetch`

### 6. app/support/trials/bulk-edit/page.tsx
- **Line**: fetch to `/api/account-managers`
- **Impact**: Bulk edit won't load managers
- **Fix**: Import and use `authenticatedFetch`

### 7. app/support/trials/parse/page.tsx
- **Line**: fetch to `/api/trials/parse-text`
- **Impact**: Trial parsing functionality may fail
- **Fix**: Check if endpoint requires auth, then use `authenticatedFetch` if needed

## Probably Public (Low Priority) ⚪

### 8. app/support/help/page.tsx
- **Line**: fetch to `/api/support-tickets`
- **Impact**: Creating support tickets from help page
- **Fix**: May be intentionally public - verify before changing

### 9. app/support/login/page.tsx
- **Line**: fetch to `/api/forgot-password-notify`
- **Impact**: Forgot password functionality
- **Fix**: Should be public (pre-auth) - no change needed

### 10. app/support/signup/page.tsx
- **Lines**: 2 fetches to auth endpoints
- **Impact**: User signup flow
- **Fix**: Should be public (pre-auth) - no change needed

### 11. app/support/tickets/[id]/page.tsx
- **Line**: fetch to `/api/calendar/events`
- **Impact**: Calendar integration
- **Fix**: Check if endpoint requires auth

## Backend Routes That Require Authentication

Based on code analysis, these API routes use `verifyAdminAccess` or similar:

1. ✅ `/api/admin/users` - FIXED
2. `/api/account-managers` - Needs auth (fetches users table)
3. `/api/trials/*` - May need auth depending on route
4. `/api/timeline/*` - May need auth
5. `/api/unified-notes/*` - May need auth
6. `/api/todos` - Needs auth (user-specific)
7. `/api/unified-notifications/*` - Needs auth (user-specific)

## Quick Fix Pattern

For any component that needs fixing:

```typescript
// 1. Import the utility
import { authenticatedFetch } from '@/lib/api-client';

// 2. Replace fetch with authenticatedFetch
// BEFORE:
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// AFTER:
const response = await authenticatedFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

## Testing Strategy

1. Test each page that makes API calls
2. Check browser console for 403 errors
3. Verify functionality works after login
4. Check that public endpoints (login, signup) still work without auth

## Next Steps

1. Fix high priority items (users, admin pages)
2. Test medium priority items (trials, reports)
3. Verify low priority items are intentionally public
4. Update this document as fixes are applied
