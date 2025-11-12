# Access Control Analysis Report

**Date:** 2025-11-12
**Status:** 🚨 CRITICAL ISSUES FOUND

---

## Executive Summary

Analysis of the role-based access control system has identified **3 critical issues** that need immediate attention:

1. **CRITICAL**: Account managers have wrong role assignment
2. **HIGH**: Data filtering not working for account managers
3. **MEDIUM**: Inconsistent role naming across codebase

---

## Current System State

### User Distribution

| Role | Count | Super Admins |
|------|-------|--------------|
| admin | 3 | 2 |
| viewer | 13 | 0 |
| account_manager | 0 | 0 |

### Account Manager Assignments

All 13 account managers are assigned as "account managers" in the `trial_organizations.account_manager` field, but their **user role is "viewer"**, not "account_manager".

**Account Managers (all with role="viewer"):**
- Satish Boini: 9 orgs
- Kartheek: 8 orgs
- Sudeshana: 4 orgs
- Satyanath: 4 orgs
- Krati: 3 orgs
- Kirandeep Kaur: 2 orgs
- Nikita: 2 orgs
- Rupak Dalapathi: 2 orgs

---

## 🚨 CRITICAL ISSUE #1: Role Mismatch

### Problem
All 13 account managers have `role = "viewer"` in the database, but the code expects `role = "account_manager"` to apply proper data filtering.

### Location
`app/support/trials/page.tsx:98-100`

```typescript
// If Account Manager: only show their orgs
if (role?.toLowerCase() === 'account_manager') {
  query = query.eq('account_manager_id', user?.id);
}
```

### Impact
**Account managers can see ALL trial organizations**, not just the ones assigned to them. This is a data privacy and security concern.

### Evidence
- User "Kartheek" has role="viewer"
- Kartheek is assigned as account_manager for 8 organizations
- When Kartheek logs in, they see ALL 34 trial orgs instead of just their 8

### Severity: 🚨 CRITICAL

### Recommended Fix

**Option 1 (Recommended):** Update all account manager roles to "account_manager"
```sql
UPDATE users
SET role = 'account_manager'
WHERE id IN (
  SELECT DISTINCT account_manager
  FROM trial_organizations
  WHERE account_manager IS NOT NULL
);
```

**Option 2:** Update code to check for account manager field instead of role
```typescript
// Check if user is assigned as account manager to any org
const { data: assignedOrgs } = await supabase
  .from('trial_organizations')
  .select('org_id')
  .eq('account_manager', user.id)
  .limit(1);

if (assignedOrgs && assignedOrgs.length > 0 && role !== 'admin') {
  query = query.eq('account_manager', user.id);
}
```

---

## ⚠️ HIGH ISSUE #2: Access Control Gaps

### Problem
Several features lack proper access control checks:

1. **Trial Org Editing**: No code verification if viewers can edit trial org data
2. **Reports Access**: All users can see all reports (may expose sensitive data)
3. **Resources Access**: All users have full access to resources

### Locations to Review
- `app/support/trials/[id]/page.tsx` - Can viewers edit?
- `app/support/reports/page.tsx` - Should reports be filtered?
- `app/support/resources/page.tsx` - Resource access control?

### Severity: ⚠️ HIGH

### Recommended Actions
1. Audit each page for proper role-based access controls
2. Add edit restrictions for viewers on trial org detail pages
3. Consider filtering reports based on assigned orgs for account managers

---

## ⚠️ MEDIUM ISSUE #3: Role Naming Inconsistency

### Problem
The codebase uses inconsistent role naming:

| Location | Role Name | Mapped To |
|----------|-----------|-----------|
| Database | "viewer" | N/A |
| Database | "account_manager" | N/A |
| useAuth hook | "viewer" | "Team" |
| useAuth hook | "account_manager" | "AM" |
| Navigation | Checks for "admin" | N/A |

### Impact
Confusing for developers, makes code harder to maintain

### Severity: ⚠️ MEDIUM

### Recommended Fix
Standardize on one naming convention:
- Either use "viewer" everywhere OR
- Use "account_manager" everywhere

Update `hooks/useAuth.ts` to align with final decision.

---

## Access Level Matrix

### Admin Role (3 users)

**Pages:**
- ✅ Dashboard
- ✅ Notifications
- ✅ Trial Orgs (all)
- ✅ Reports (all)
- ✅ Resources
- ✅ Tickets
- ✅ Users
- ✅ Roadmap
- ✅ Customer Support
- ✅ Profile

**Capabilities:**
- Full access to all data
- User management
- Roadmap owner assignments
- Customer support management

### Viewer Role (13 users - Account Managers)

**Pages:**
- ✅ Dashboard
- ✅ Notifications
- ✅ Trial Orgs (currently ALL, should be assigned only)
- ✅ Reports (all)
- ✅ Resources
- ✅ Tickets
- ✅ Profile

**Capabilities:**
- 🚨 Currently: View ALL trial orgs
- ✅ Should: View only ASSIGNED trial orgs
- ❓ Unknown: Can they edit trial org data?
- ✅ Create tickets
- ✅ View all reports

---

## Recommended Action Plan

### IMMEDIATE (This Week)

1. **Fix Critical Role Issue**
   ```bash
   # Update all account managers to have correct role
   node scripts/update-account-manager-roles.js
   ```

2. **Verify Data Filtering Works**
   - Login as an account manager (e.g., Kartheek)
   - Verify they see only their 8 assigned orgs
   - Not all 34 orgs

3. **Test Edit Permissions**
   - Can viewers edit trial org details?
   - Should they be able to?
   - If not, add restrictions

### SHORT-TERM (This Month)

1. **Add Access Control Tests**
   - Create automated tests for each role
   - Verify proper data filtering
   - Test edit permissions

2. **Audit All Pages**
   - Review each page for proper access control
   - Document intended access levels
   - Add missing restrictions

3. **Standardize Role Names**
   - Choose: "viewer" or "account_manager"
   - Update all code to use consistent naming
   - Update documentation

### LONG-TERM (Next Quarter)

1. **Fine-Grained Permissions**
   - Consider implementing permission system
   - Separate "view" vs "edit" permissions
   - More flexible than role-based

2. **RLS Policies**
   - Add database-level access control
   - Prevent data leakage at DB level
   - Defense in depth

3. **Documentation**
   - Document all access levels clearly
   - Create onboarding guide for new users
   - Maintain access control matrix

---

## Testing Checklist

Before deploying fixes:

- [ ] Verify admin can see all 34 trial orgs
- [ ] Verify each account manager sees only their assigned orgs
- [ ] Verify account manager cannot see other AMs' orgs
- [ ] Verify admin can edit all orgs
- [ ] Verify account manager can/cannot edit orgs (decide policy)
- [ ] Verify viewer cannot access admin-only pages
- [ ] Test with each account manager user
- [ ] Document test results

---

## Scripts for Analysis

Created utility scripts:
- `scripts/check-unassigned-managers.js` - Check account manager assignments
- `scripts/check-access-roles.js` - View all user roles
- `scripts/analyze-access-control.js` - Comprehensive access analysis

Run these periodically to ensure access control remains correct.

---

## Contact for Questions

If you need clarification on any of these issues or recommendations, please reach out to the development team.

---

**Last Updated:** 2025-11-12
**Next Review:** After implementing fixes
