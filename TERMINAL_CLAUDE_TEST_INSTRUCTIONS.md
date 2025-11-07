# Terminal Claude Testing Instructions

## Overview
Web Claude has made critical fixes to authentication and UX issues in the last hour. Please test and verify all changes work correctly.

---

## What Was Changed

### 1. **Authentication System - CRITICAL FIX**
- **Problem Fixed:** Sign up links hitting errors, left sidebar showing before login, emails not delivered
- **Solution:** Direct password creation (no email required), improved loading states
- **Files Modified:**
  - `.env.local` - Added `NEXT_PUBLIC_APP_URL`
  - `app/api/admin/users/route.ts` - Changed to direct user creation
  - `app/support/admin/users/page.tsx` - Updated user form
  - `app/support/layout.tsx` - Enhanced loading guards
  - `AUTH_SETUP_GUIDE.md` - New comprehensive documentation

### 2. **Domain Dropdown - UX FIX**
- **Problem Fixed:** Domain was text input (treated as URL)
- **Solution:** Changed to dropdown with research domains
- **Files Modified:**
  - `app/support/trials/new/page.tsx` - Dropdown with AAD, AF&B, E&C, HC, NEO, TMT, Unassigned
  - `app/support/trials/[id]/page.tsx` - Same dropdown on edit page

### 3. **Customer Health Dashboard** (from earlier in session)
- Created AtRiskCustomers widget for dashboard
- Enhanced CustomerHealthCard (icon-free design)
- Full health scoring system

---

## Testing Checklist

### **CRITICAL: Test Authentication Flow**

#### Step 1: Review Git Changes
```bash
cd /home/user/myra-status-dashboard

# Check current branch
git branch

# Should be on: claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j

# View recent commits
git log --oneline -5

# Should see:
# 9203a79 Fix authentication flow and simplify user onboarding
# e34ea6e Add Customer Health Scoring System - One-Page Health View
# a702301 Remove visual icons from CustomerHealthCard, enhance UI design

# Review changes
git show 9203a79 --stat
```

#### Step 2: Verify Environment Configuration
```bash
# Check .env.local exists and has required variables
cat .env.local

# Should contain:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# NEXT_PUBLIC_APP_URL=http://localhost:3000  # <-- NEW!
```

**⚠️ IMPORTANT:** If deploying to production, update `NEXT_PUBLIC_APP_URL` to your production domain.

#### Step 3: Start Development Server
```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# Should start on http://localhost:3000
```

#### Step 4: Test User Creation Flow (Admin)

**Scenario:** Admin creates a new user

1. **Navigate to:** `http://localhost:3000/support/login`
2. **Log in** as an admin user (you should have admin credentials)
3. **Navigate to:** `http://localhost:3000/support/admin/users`
4. **Click:** "Add User" button

**Verify the form shows:**
- ✅ Blue info banner: "Simple Setup: User will be created immediately with the password you set..."
- ✅ Email field
- ✅ **Name field** (NEW - this should be present)
- ✅ "Temporary Password" field with helper text
- ✅ Role dropdown

5. **Fill out the form:**
   - Email: `test-user-$(date +%s)@example.com` (unique email)
   - Name: `Test User`
   - Temporary Password: `TestPass123`
   - Role: `Team`

6. **Click:** "Create User"

**Expected Results:**
- ✅ Success toast: "User created successfully. Share the login credentials with them."
- ✅ User appears in the users list
- ✅ User status shows "Active" (not "Invited")
- ✅ **NO EMAIL IS SENT** (this is intentional - direct creation)

#### Step 5: Test New User Login

**Scenario:** New user logs in immediately

1. **Open incognito/private browser window**
2. **Navigate to:** `http://localhost:3000/support/login`
3. **Enter credentials:**
   - Email: (the email you used in Step 4)
   - Password: `TestPass123`
4. **Click:** "Sign In"

**Expected Results:**
- ✅ Loading screen shows (with branded logo, "Signing in..." text)
- ✅ **NO LEFT SIDEBAR VISIBLE** during loading (CRITICAL FIX)
- ✅ Redirected to dashboard within <15 seconds
- ✅ Dashboard loads with sidebar now visible (after auth complete)

**❌ FAILURE INDICATORS:**
- Left sidebar flashes before login completes
- Error: "Invalid login credentials"
- Stuck on login page
- Email confirmation required

#### Step 6: Test Loading States (Sidebar Flash Prevention)

**Scenario:** Verify sidebar never shows before auth

1. **Clear browser cache** (important!)
2. **Navigate to:** `http://localhost:3000/support/dashboard` (without being logged in)

**Expected Results:**
- ✅ Immediately shows loading screen (branded logo)
- ✅ **NO LEFT SIDEBAR VISIBLE** at any point
- ✅ Redirects to `/support/login`

3. **Log in again**

**Expected Results:**
- ✅ Loading screen shows "Signing in..."
- ✅ **NO LEFT SIDEBAR FLASHING**
- ✅ Smooth transition to dashboard with sidebar

---

### **Test Domain Dropdown**

#### Step 7: Test New Organization Creation

1. **Navigate to:** `http://localhost:3000/support/trials/new`
2. **Scroll to "Domain" field**

**Verify:**
- ✅ Field is a **dropdown** (not text input)
- ✅ Options available:
  - AAD
  - AF&B
  - E&C
  - HC
  - NEO
  - TMT
  - Unassigned
- ✅ Labels are SHORT (just "AAD", not "AAD - Architecture, Art & Design")
- ✅ Options are alphabetically sorted

3. **Select a domain** (e.g., "TMT")
4. **Fill out other required fields**
5. **Submit form**

**Expected Results:**
- ✅ Organization created successfully
- ✅ Domain saved as "TMT"

#### Step 8: Test Organization Editing

1. **Navigate to an existing organization:** `http://localhost:3000/support/trials/[any-org-id]`
2. **Click "Edit" button** (in Overview tab)
3. **Scroll to "Domain" field**

**Verify:**
- ✅ Field is a **dropdown** (not text input)
- ✅ Current domain is pre-selected
- ✅ Same options as Step 7

4. **Change domain** to different value
5. **Click "Save"**

**Expected Results:**
- ✅ Domain updated successfully
- ✅ New domain value displays correctly

---

### **Test Customer Health Dashboard** (Optional - from earlier work)

#### Step 9: Test At-Risk Customers Widget

1. **Navigate to:** `http://localhost:3000/support/dashboard`

**Verify:**
- ✅ "At-Risk Customers" section appears between metric cards and tickets table
- ✅ Shows top 5 customers with health score < 70
- ✅ Each customer shows:
  - Rank badge (colored)
  - Organization name
  - Health score with trend arrow (↗ ↘ →)
  - Issues count
  - Trial status badge (if trial)

2. **Click on any at-risk customer**

**Expected Results:**
- ✅ Navigates to `/support/organizations/[id]/health`
- ✅ Full health page loads with CustomerHealthCard
- ✅ **NO ICONS** visible (Phone, Mail, Calendar, etc. should be removed)
- ✅ Clean typography-based design

---

## Known Issues to Watch For

### Issue 1: User Creation Fails
**Symptoms:**
- Error: "Failed to create user"
- Error: "Email already exists"

**Troubleshooting:**
```bash
# Check Supabase service role key is set
echo $SUPABASE_SERVICE_ROLE_KEY

# If empty, check .env.local:
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY

# Restart dev server after .env changes:
npm run dev
```

### Issue 2: Sidebar Still Flashes Before Login
**Symptoms:**
- Left navigation visible during loading

**Troubleshooting:**
1. Clear browser cache completely
2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. Check browser console for errors
4. Verify you're on latest commit: `git log -1`

### Issue 3: Login Fails with Correct Credentials
**Symptoms:**
- "Invalid login credentials" error
- User created but can't log in

**Troubleshooting:**
```bash
# Check Supabase dashboard → Authentication → Users
# Verify user shows "Email Confirmed" = true

# If not confirmed, run in Supabase SQL Editor:
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-test-email@example.com';
```

### Issue 4: Domain Dropdown Not Showing
**Symptoms:**
- Still shows text input

**Troubleshooting:**
1. Verify you're on correct branch
2. Check file was actually modified:
```bash
git diff HEAD~1 app/support/trials/new/page.tsx | grep -A5 "DOMAIN_OPTIONS"
```
3. Restart dev server

---

## Security Verification

### Password Encryption Check

**Question:** Are passwords secure?

**Answer:** YES - Supabase handles encryption automatically.

**To Verify:**
1. Go to Supabase Dashboard → Authentication → Users
2. Find the test user you created
3. Look at the user details

**What You'll See:**
- ✅ Email address (visible)
- ✅ Created date (visible)
- ✅ Last sign-in (visible)
- ❌ Password (NOT visible - encrypted with bcrypt)

**What You WON'T See:**
- Password field in user details
- Hashed password in database queries
- Any way to retrieve the password

**Confirmation:**
- Passwords are **bcrypt-hashed** by Supabase
- Passwords are **never** stored in plain text
- Passwords **cannot** be retrieved (even by admins with service role key)

---

## Documentation Review

### Step 10: Review Setup Guide

```bash
# Open the comprehensive auth guide
cat AUTH_SETUP_GUIDE.md

# Should contain:
# - Setup instructions
# - User management workflow
# - Security details
# - Troubleshooting guide
# - API reference
```

**Verify guide includes:**
- ✅ Environment variable setup
- ✅ User creation flow (admin side)
- ✅ User login flow (user side)
- ✅ Password security explanation
- ✅ Troubleshooting section
- ✅ Deployment checklist

---

## Reporting Results

### Success Criteria

**ALL MUST PASS:**
- [ ] User created with name, email, password
- [ ] Success message shows: "Share the login credentials with them"
- [ ] New user can log in immediately with provided password
- [ ] Loading screen shows (no sidebar flash) before login
- [ ] Dashboard loads correctly after login
- [ ] Domain dropdown shows in new org form
- [ ] Domain dropdown shows in edit org form
- [ ] All 7 domain options available (AAD, AF&B, E&C, HC, NEO, TMT, Unassigned)
- [ ] At-Risk Customers widget displays on dashboard
- [ ] No console errors during any workflow

### If Tests Fail

**Report back with:**
1. Which step failed
2. Exact error message
3. Browser console errors (if any)
4. Screenshot (if helpful)

**Example:**
```
Step 4 Failed: User creation
Error: "Failed to create user: User already exists"
Console: No errors
```

---

## Quick Test Script (Optional)

If you want to automate basic checks:

```bash
#!/bin/bash

echo "=== Authentication Fix Verification ==="

# Check files were modified
echo "1. Checking modified files..."
git diff HEAD~1 --name-only | grep -E "(api/admin/users|layout.tsx|trials/new)" && echo "✅ Files modified" || echo "❌ Files not found"

# Check .env.local has new variable
echo "2. Checking environment config..."
grep "NEXT_PUBLIC_APP_URL" .env.local && echo "✅ APP_URL configured" || echo "❌ APP_URL missing"

# Check auth guide exists
echo "3. Checking documentation..."
[ -f "AUTH_SETUP_GUIDE.md" ] && echo "✅ Auth guide created" || echo "❌ Auth guide missing"

# Check domain options updated
echo "4. Checking domain dropdown..."
grep -q "Unassigned" app/support/trials/new/page.tsx && echo "✅ Domain dropdown updated" || echo "❌ Domain still old format"

echo ""
echo "=== Next: Manual Testing Required ==="
echo "1. Start dev server: npm run dev"
echo "2. Test user creation at /support/admin/users"
echo "3. Test new user login"
echo "4. Verify no sidebar flash"
echo "5. Test domain dropdown in /support/trials/new"
```

---

## Summary

**Total Time Estimate:** 20-30 minutes

**Priority Tests:**
1. **CRITICAL:** User creation and login (Steps 4-6)
2. **HIGH:** Sidebar flash prevention (Step 6)
3. **MEDIUM:** Domain dropdown (Steps 7-8)
4. **LOW:** Customer health dashboard (Step 9)

**Expected Outcome:**
- ✅ Authentication works in <15 seconds (CEO requirement met)
- ✅ No UI flashing before login (professional UX)
- ✅ Domain selection simplified (dropdown vs free text)
- ✅ All functionality preserved, UX improved

---

**Built by:** Web Claude
**Session:** claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
**Commit:** 9203a79
**Date:** 2025-11-07
**Branch:** claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
