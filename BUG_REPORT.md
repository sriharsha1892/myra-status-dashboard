# Bug Report - Comprehensive System Testing
**Generated:** 2025-11-27
**Test Script:** `scripts/comprehensive-bug-test.ts`

---

## Critical Bugs Found

### 1. Announcements - `posted_by` Required but Not Set
**Severity:** HIGH
**File:** `components/resources/AnnouncementManagementModal.tsx`
**Error:** `null value in column "posted_by" of relation "announcements" violates not-null constraint`

**Root Cause:** The form doesn't set `posted_by` when creating announcements, but the database requires it.

**Fix Required:**
```typescript
// In handleSubmit, add posted_by:
const { error } = await supabase
  .from('announcements')
  .insert([{
    ...formData,
    posted_by: 'admin', // or get from auth context
  }]);
```

---

### 2. Account Manager Role Case Mismatch
**Severity:** HIGH
**Files:** `components/CreateOrganizationModal.tsx:139`

**Problem:** Code queries for `role = 'account_manager'` but database has `role = 'Account Manager'`

**Code:**
```typescript
.eq('role', 'account_manager')  // Returns 0 results
```

**Database Values:**
- `Account Manager` (capital letters, space)

**Fix Required:** Change query to use correct role value:
```typescript
.eq('role', 'Account Manager')
```

---

### 3. Empty `sales_pocs` Table
**Severity:** MEDIUM
**File:** `components/CreateOrganizationModal.tsx:127-131`

**Problem:** The Sales POCs dropdown will always be empty because the `sales_pocs` table has no data.

**Impact:** Users can't select a Sales POC when creating organizations.

**Fix Options:**
1. Seed the `sales_pocs` table with data
2. Or remove/hide the dropdown if not needed

---

### 4. `organizations` vs `trial_organizations` Table Confusion
**Severity:** MEDIUM
**Files:** Multiple components

**Problem:** Two organization tables exist with different schemas:
- `organizations`: Basic (no `account_manager_id`)
- `trial_organizations`: Extended (has `account_manager_id`)

Some components query `organizations` for columns that only exist in `trial_organizations`.

**Affected Queries:**
- Any query for `organizations.account_manager_id` will fail

---

## Warnings Found

### 1. Non-Standard Organization Statuses
**Tables:** `organizations`
**Found:** `['Active', 'Expired']`
**Note:** Status values are uppercase. Code may expect lowercase (`active`, `trial`, `churned`).

### 2. Non-Standard User Roles
**Table:** `users`
**Found:** 3 users with role `Account Manager`
**Note:** Role has space and capitals. Some queries use `account_manager` (lowercase with underscore).

---

## Test Summary

| Category | Tests | Passed | Failed | Bugs |
|----------|-------|--------|--------|------|
| Database Tables | 15 | 10 | 5 | 0 |
| Announcements | 2 | 1 | 0 | 1 |
| Trial Users | 2 | 0 | 1 | 0 |
| Roadmap | 4 | 4 | 0 | 0 |
| Feature Requests | 2 | 2 | 0 | 0 |
| Notifications | 1 | 1 | 0 | 0 |
| Tickets | 2 | 2 | 0 | 0 |
| Users & Auth | 4 | 3 | 0 | 0 |
| Account Managers | 2 | 0 | 1 | 0 |
| Data Consistency | 3 | 3 | 0 | 0 |
| **TOTAL** | **37** | **26** | **8** | **1** |

**Pass Rate:** 70.3%

---

## Tables That Don't Exist (or have different schema)

These tables are referenced in code but don't exist or have wrong columns:
1. `user_activities` - Table doesn't exist
2. `todos` - Table doesn't exist
3. `activity_notes` - Table doesn't exist
4. `trial_users.id` - Column doesn't exist (use `user_id`)
5. `unified_notes.author_id` - Column doesn't exist

---

## Recommendations

### Immediate Fixes (Priority 1):
1. Fix `posted_by` in AnnouncementManagementModal
2. Fix role case mismatch in account manager queries

### Short-term Fixes (Priority 2):
1. Decide on `organizations` vs `trial_organizations` - standardize
2. Seed or remove `sales_pocs` table
3. Standardize role naming convention

### Long-term:
1. Add database schema validation tests
2. Generate and keep TypeScript types in sync with DB
3. Add pre-commit hooks to run tests

---

## Run Tests Again

```bash
npx tsx scripts/comprehensive-bug-test.ts
```
