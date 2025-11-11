# Comprehensive Application Test Plan

## 🎯 Testing Strategy

This document outlines a complete end-to-end testing plan for the myRA AI Status Dashboard, covering all user flows, features, and edge cases.

---

## 📋 PRE-TEST CHECKLIST

- [ ] Dev server is running (`npm run dev`)
- [ ] Database is accessible (Supabase connection working)
- [ ] Test user accounts available:
  - [ ] Super Admin account
  - [ ] Account Manager account
  - [ ] Regular user account
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Note any console errors or warnings

---

## 🧪 PHASE 1: AUTHENTICATION & AUTHORIZATION

### Test 1.1: Login Flow
```
URL: http://localhost:3000/support/login
```

**Steps:**
- [ ] Navigate to login page
- [ ] Enter valid credentials
- [ ] Click "Sign In"
- [ ] **Expected**: Redirect to `/support/dashboard`
- [ ] **Verify**: User email displayed in sidebar
- [ ] **Verify**: No console errors

**Test Invalid Login:**
- [ ] Enter wrong password
- [ ] **Expected**: Error message displayed
- [ ] **Verify**: Stays on login page

### Test 1.2: Role-Based Access
```
Test with different user roles
```

**As Admin:**
- [ ] Can access `/support/users`
- [ ] Can access `/support/admin/roadmap`
- [ ] Can access `/support/admin/announcements`
- [ ] Can see "Users", "Roadmap", "Announcements" in nav

**As Account Manager:**
- [ ] Cannot access `/support/users`
- [ ] Cannot access admin pages
- [ ] Does NOT see admin nav items
- [ ] Can access all trial org features

### Test 1.3: Logout & Session
- [ ] Click "Sign Out" button
- [ ] **Expected**: Redirect to login page
- [ ] **Verify**: Cannot access protected pages
- [ ] Navigate to `/support/dashboard` directly
- [ ] **Expected**: Redirect to login

---

## 🧪 PHASE 2: TRIAL ORGANIZATIONS (Core Feature)

### Test 2.1: View Trial Organizations
```
URL: /support/trials
```

**Visual Verification:**
- [ ] Quick Capture Hub visible with 4 actions
- [ ] "Add New Trial" card visible (primary action)
- [ ] "Parse Text", "Import CSV", "Bulk Edit" visible
- [ ] Trial cards display correctly
- [ ] Card shows: Org name, domain, stage, company
- [ ] Left border color matches stage
- [ ] Hover effects working

**Functionality:**
- [ ] Search bar filters trials
- [ ] Stage filter dropdown works
- [ ] Company filter works (Admin only)
- [ ] Checkbox selection works
- [ ] Bulk Edit appears when trials selected (Admin only)

### Test 2.2: Create New Trial (Standard Form)
```
Click: "Add New Trial" button
URL: /support/trials/new
```

**Required Fields:**
- [ ] Organization Name (text)
- [ ] Domain (dropdown: AAD, AF&B, E&C, HC, NEO, TMT, Unassigned)
- [ ] Website URL (auto-formats)
- [ ] Logo URL (with preview)
- [ ] Description (max 300 chars with counter)
- [ ] Account Manager (dropdown, auto-selected for AMs)
- [ ] Contact Name
- [ ] Contact Email

**Test Scenarios:**
1. **Happy Path:**
   - [ ] Fill all required fields
   - [ ] Click "Create Organization"
   - [ ] **Expected**: Success message
   - [ ] **Expected**: Redirect to trial detail page
   - [ ] **Verify**: Trial appears in trials list

2. **Validation:**
   - [ ] Try to submit without Org Name
   - [ ] **Expected**: "Organization name is required" error
   - [ ] Try invalid email format
   - [ ] **Expected**: "Invalid email format" error
   - [ ] Enter description > 300 chars
   - [ ] **Expected**: Character count turns red, error message

3. **URL Auto-formatting:**
   - [ ] Enter "example.com" in Website URL
   - [ ] **Expected**: Preview shows "https://example.com"
   - [ ] Enter "https://example.com"
   - [ ] **Expected**: No change, accepted as-is

4. **Logo Preview:**
   - [ ] Paste valid image URL
   - [ ] **Expected**: Logo preview appears
   - [ ] Paste invalid URL
   - [ ] **Expected**: Initials shown instead

### Test 2.3: Parse Text (AI Feature)
```
Click: "Parse Text" button
URL: /support/trials/parse
```

**Test Input:**
```
Had a great demo with Acme Corp (acmecorp.com) today. Sarah Johnson
(sarah@acmecorp.com) and Mike Chen from their product team attended.
They loved the presentation builder and asked 12 questions about web
scout features. Currently using GPT-4. Trial extended by 2 weeks.
```

**Steps:**
1. **Parse Text:**
   - [ ] Paste test input in textarea
   - [ ] Select source type: "Meeting Notes"
   - [ ] Click "Parse with AI"
   - [ ] **Expected**: Loading spinner appears
   - [ ] **Expected**: Results appear in right panel

2. **Verify Extracted Data:**
   - [ ] Organization detected: "Acme Corp"
   - [ ] Website auto-detected: "acmecorp.com"
   - [ ] Logo auto-generated
   - [ ] Description generated from context
   - [ ] Contact name: "Sarah Johnson"
   - [ ] Contact email: "sarah@acmecorp.com"
   - [ ] Additional contact: "Mike Chen"
   - [ ] AI Insights show: Activities, Product Usage, Metrics

3. **Edit Extracted Data:**
   - [ ] Modify organization name
   - [ ] Change domain
   - [ ] Edit website URL
   - [ ] Update description
   - [ ] Select account manager
   - [ ] Modify contact details

4. **Save:**
   - [ ] Click "Save Trial" button
   - [ ] **Expected**: Success message with count
   - [ ] **Expected**: Redirect to trial detail page
   - [ ] **Verify**: All data saved correctly
   - [ ] **Verify**: Additional contacts saved

### Test 2.4: View Trial Detail
```
Click on any trial card
URL: /support/trials/[id]
```

**Verify Displayed:**
- [ ] Organization header with logo
- [ ] Organization name and domain
- [ ] Status badges (stage, trial status)
- [ ] Account manager info
- [ ] Primary contact info
- [ ] Description
- [ ] Key metrics/stats
- [ ] Activity timeline (if any)
- [ ] Edit button visible

**Actions:**
- [ ] Click "Edit" button
- [ ] **Expected**: Enter edit mode or open edit modal
- [ ] Update organization details
- [ ] Save changes
- [ ] **Expected**: Changes reflected immediately

### Test 2.5: Bulk Edit Trials (Admin Only)
```
URL: /support/trials
```

**Steps:**
- [ ] Select multiple trials (checkboxes)
- [ ] **Expected**: "Bulk Edit" card appears
- [ ] Click "Bulk Edit"
- [ ] **Expected**: Bulk edit form appears

**Bulk Actions:**
- [ ] Change stage for all selected
- [ ] Assign account manager to all
- [ ] Update trial status
- [ ] Apply changes
- [ ] **Expected**: Success message with count
- [ ] **Verify**: Changes applied to all selected trials

### Test 2.6: Import Trial Organizations (Admin Only)
```
Click: "Import CSV" button
URL: /support/admin/trial-orgs-import
```

**Prepare Test CSV:**
```csv
org_name,domain,org_url,description,account_manager_email,salesPOC
TestOrg1,TMT,https://test1.com,Test org 1,admin@myra.ai,
TestOrg2,HC,https://test2.com,Test org 2,admin@myra.ai,Prachi Sharma
```

**Steps:**
- [ ] Upload CSV file
- [ ] **Expected**: Preview shows parsed data
- [ ] **Verify**: Column mapping correct
- [ ] **Verify**: Account manager emails recognized
- [ ] Click "Import"
- [ ] **Expected**: Progress indicator
- [ ] **Expected**: Success message with count
- [ ] **Verify**: Trials appear in trials list

---

## 🧪 PHASE 3: REPORTS & ANALYTICS

### Test 3.1: Reports Hub
```
URL: /support/reports
```

**Verify:**
- [ ] Report cards displayed
- [ ] Click "Engagement Report" card
- [ ] **Expected**: Navigate to engagement report

### Test 3.2: Engagement Report
```
URL: /support/reports/engagement
```

**Visual Verification:**
- [ ] Header with filters and "Show Data" toggle
- [ ] Filters collapsed by default
- [ ] Click "Filters" button
- [ ] **Expected**: Filters expand with animation
- [ ] Charts visible and loading data:
  - [ ] Line chart (time series) - 400px height
  - [ ] Bar chart (by stage) - 320px height
  - [ ] Pie chart (by company) - 320px height
  - [ ] Area chart (cumulative) - 320px height

**Functionality:**
- [ ] Click "Show Data" button
- [ ] **Expected**: Data table appears
- [ ] **Verify**: Table shows trial data
- [ ] Click "Hide Data"
- [ ] **Expected**: Table hidden
- [ ] Apply filters (date range, stage, etc.)
- [ ] **Expected**: Charts update

**Interaction:**
- [ ] Hover over chart elements
- [ ] **Expected**: Tooltips appear
- [ ] Charts responsive to window resize

---

## 🧪 PHASE 4: RESOURCES/DOCUMENTS

### Test 4.1: Documents Page
```
URL: /support/documents
```

**Verify:**
- [ ] Document categories displayed
- [ ] Upload button visible (if enabled)
- [ ] Documents list loads
- [ ] Search/filter functionality
- [ ] Click document
- [ ] **Expected**: Document preview or download

---

## 🧪 PHASE 5: TICKETS

### Test 5.1: Tickets List
```
URL: /support/tickets
```

**Verify:**
- [ ] Tickets list displayed
- [ ] Filter by status (Open, In Progress, Closed)
- [ ] Filter by assignee
- [ ] Search tickets
- [ ] "Create Ticket" button visible

### Test 5.2: Create Ticket
```
Click: "Create Ticket" or "New Ticket" button
```

**Fill Form:**
- [ ] Title (required)
- [ ] Description (required)
- [ ] Category/Type
- [ ] Priority
- [ ] Assign to user
- [ ] Submit

**Verify:**
- [ ] Success message
- [ ] Ticket appears in list
- [ ] Redirect to ticket detail

### Test 5.3: Ticket Detail & Comments
```
URL: /support/tickets/[id]
```

**Verify:**
- [ ] Ticket details displayed
- [ ] Status badge
- [ ] Assignee info
- [ ] Comments section
- [ ] Add comment form

**Add Comment:**
- [ ] Type comment text
- [ ] Mention user with @
- [ ] Submit comment
- [ ] **Expected**: Comment appears
- [ ] **Expected**: Mentioned user gets notification

**Update Status:**
- [ ] Change status dropdown
- [ ] **Expected**: Status updates
- [ ] **Expected**: Activity logged

---

## 🧪 PHASE 6: NOTIFICATIONS

### Test 6.1: Notification Center
```
URL: /support/notifications
```

**Verify:**
- [ ] Notification bell icon in header
- [ ] Unread count badge visible
- [ ] Click bell icon
- [ ] **Expected**: Dropdown opens

**Notification Actions:**
- [ ] Click notification
- [ ] **Expected**: Navigate to relevant page
- [ ] **Expected**: Notification marked as read
- [ ] "Mark all as read" button
- [ ] Click "Mark all as read"
- [ ] **Expected**: All notifications marked read

### Test 6.2: Shared Notification Completion
```
Test with 2 admin accounts in different browsers
```

**Setup:**
- [ ] Run test script: `npx tsx scripts/send-demo-notification.ts`
- [ ] Verify both admins receive notification

**Test:**
- [ ] Admin 1: Mark notification as complete
- [ ] Admin 2: Refresh notifications
- [ ] **Expected**: Notification shown as handled by Admin 1
- [ ] **Expected**: Completion message visible

---

## 🧪 PHASE 7: USER MANAGEMENT (Admin Only)

### Test 7.1: Users List
```
URL: /support/users
```

**Verify:**
- [ ] All users listed
- [ ] User roles displayed
- [ ] Search users
- [ ] Filter by role
- [ ] "Add User" or "Invite User" button

### Test 7.2: Invite User
```
Click: "Invite User" or "Add User"
```

**Fill Form:**
- [ ] Email (required)
- [ ] Full Name
- [ ] Role (dropdown)
- [ ] Send invite

**Verify:**
- [ ] Success message
- [ ] User appears in list
- [ ] User receives invite email (check logs)

---

## 🧪 PHASE 8: ROADMAP (Admin Only)

### Test 8.1: Roadmap View
```
URL: /support/admin/roadmap
```

**Verify:**
- [ ] Roadmap items displayed
- [ ] View options: List, Kanban, Timeline
- [ ] Switch between views
- [ ] Items grouped by quarter/status
- [ ] Drag-and-drop working (Kanban view)

### Test 8.2: Create Roadmap Item
```
Click: "Add Item" or "New Feature"
```

**Fill Form:**
- [ ] Title
- [ ] Description
- [ ] Status (Planned, In Progress, Completed)
- [ ] Quarter (Q1, Q2, Q3, Q4)
- [ ] Priority
- [ ] Submit

**Verify:**
- [ ] Item appears in roadmap
- [ ] Correct status column (Kanban)
- [ ] Correct quarter section

---

## 🧪 PHASE 9: ANNOUNCEMENTS (Admin Only)

### Test 9.1: View Announcements
```
URL: /support/admin/announcements
```

**Verify:**
- [ ] Announcements list displayed
- [ ] Active/Scheduled/Draft tabs
- [ ] Create announcement button

### Test 9.2: Create Announcement
```
Click: "Create Announcement" or "New Announcement"
```

**Fill Form:**
- [ ] Title
- [ ] Content/Message
- [ ] Target audience (All users, Specific roles)
- [ ] Schedule (Immediate or future date)
- [ ] Priority (Low, Normal, High)
- [ ] Publish

**Verify:**
- [ ] Announcement created
- [ ] Appears in correct tab (Active/Scheduled)
- [ ] Users see announcement (if immediate)

---

## 🧪 PHASE 10: PROFILE & SETTINGS

### Test 10.1: User Profile
```
URL: /support/profile
```

**Verify:**
- [ ] User info displayed
- [ ] Email
- [ ] Full name
- [ ] Role
- [ ] Edit profile button

**Update Profile:**
- [ ] Change full name
- [ ] Update preferences (if any)
- [ ] Save changes
- [ ] **Expected**: Success message
- [ ] **Verify**: Changes reflected in sidebar

### Test 10.2: Settings Pages (if linked)
```
URLs: /support/settings/teams, /support/settings/templates, /support/settings/users
```

- [ ] Access settings pages
- [ ] **Expected**: Settings interface loads
- [ ] Test basic functionality

---

## 🧪 PHASE 11: EDGE CASES & ERROR HANDLING

### Test 11.1: Network Errors
- [ ] Disconnect internet
- [ ] Try to create trial
- [ ] **Expected**: Graceful error message
- [ ] **Verify**: No app crash

### Test 11.2: Invalid Data
- [ ] Try to access non-existent trial: `/support/trials/invalid-id`
- [ ] **Expected**: 404 or "Not Found" message
- [ ] **Verify**: App doesn't crash

### Test 11.3: Concurrent Edits
- [ ] Open same trial in 2 tabs
- [ ] Edit in Tab 1, save
- [ ] Edit in Tab 2, save
- [ ] **Expected**: Last save wins or conflict warning

### Test 11.4: Long Content
- [ ] Create trial with very long description (500+ chars)
- [ ] **Verify**: Truncation or scrolling works
- [ ] Create ticket with 50+ comments
- [ ] **Verify**: Pagination or lazy loading

### Test 11.5: Special Characters
- [ ] Organization name with emoji: "Acme Corp 🚀"
- [ ] **Verify**: Displays correctly
- [ ] Email with +: "test+1@example.com"
- [ ] **Verify**: Validates correctly

---

## 🧪 PHASE 12: PERFORMANCE & UX

### Test 12.1: Load Times
- [ ] Dashboard loads < 3 seconds
- [ ] Trials list loads < 2 seconds
- [ ] Reports load < 5 seconds
- [ ] Navigation feels instant

### Test 12.2: Responsiveness
- [ ] Test on mobile viewport (375px)
- [ ] **Verify**: Mobile menu appears
- [ ] **Verify**: Tables scroll horizontally
- [ ] **Verify**: Forms stack vertically
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1920px)

### Test 12.3: Accessibility
- [ ] Tab through form fields
- [ ] **Verify**: Focus indicators visible
- [ ] **Verify**: Logical tab order
- [ ] Try keyboard shortcuts (if any)
- [ ] Use screen reader (if available)

---

## 🧪 PHASE 13: DATA INTEGRITY

### Test 13.1: Trial Organization Data
- [ ] Create trial via form
- [ ] **Verify**: All fields saved correctly in DB
- [ ] Create trial via Parse Text
- [ ] **Verify**: AI-extracted data saved
- [ ] Update trial
- [ ] **Verify**: Changes persisted

### Test 13.2: Relationships
- [ ] Create trial with contact
- [ ] **Verify**: Contact linked to trial
- [ ] View trial
- [ ] **Verify**: Contact appears
- [ ] Delete trial
- [ ] **Verify**: Related data handled (cascade or prevent)

---

## 📊 TEST RESULTS TEMPLATE

```
==========================================================
TEST RUN: [Date/Time]
TESTER: [Your Name]
BROWSER: [Chrome/Firefox/Safari] [Version]
ENVIRONMENT: [Local Dev / Staging / Production]
==========================================================

PHASE 1: AUTHENTICATION & AUTHORIZATION
  ✅ Test 1.1: Login Flow - PASSED
  ✅ Test 1.2: Role-Based Access - PASSED
  ✅ Test 1.3: Logout & Session - PASSED

PHASE 2: TRIAL ORGANIZATIONS
  ✅ Test 2.1: View Trial Organizations - PASSED
  ✅ Test 2.2: Create New Trial - PASSED
  ✅ Test 2.3: Parse Text - PASSED
  ⚠️  Test 2.4: View Trial Detail - PARTIAL (minor UI issue)
  ✅ Test 2.5: Bulk Edit - PASSED
  ✅ Test 2.6: Import CSV - PASSED

... (continue for all phases)

SUMMARY:
  Total Tests: 100
  Passed: 95
  Failed: 2
  Skipped: 3

ISSUES FOUND:
  1. [High] Parse Text: AI not extracting email correctly
  2. [Medium] Trial Detail: Logo not displaying
  3. [Low] Reports: Chart tooltip positioning off

NOTES:
  - Overall performance excellent
  - UI looks great, very polished
  - Minor issues with error messages
==========================================================
```

---

## 🚀 TESTING COMMANDS

```bash
# Start dev server
npm run dev

# Send test notification
npx tsx scripts/send-demo-notification.ts

# Test shared notifications
npx tsx scripts/test-shared-notifications.ts

# Verify account managers
npx tsx scripts/verify-all-account-managers.ts

# Check database
psql <connection-string>
```

---

## 🎯 TESTING PRIORITIES

### Must Test (Critical Path)
1. ✅ Login/Logout
2. ✅ Create Trial (both form and Parse Text)
3. ✅ View Trial List
4. ✅ View Trial Detail
5. ✅ Reports (at least one)

### Should Test (Important Features)
6. ✅ Bulk Edit
7. ✅ Import CSV
8. ✅ Tickets
9. ✅ Notifications
10. ✅ User Management

### Nice to Test (Secondary Features)
11. ⚠️ Roadmap
12. ⚠️ Announcements
13. ⚠️ Profile
14. ⚠️ Settings

---

## 📝 NOTES FOR TESTER

- Take screenshots of any bugs
- Record console errors
- Note browser and OS version
- Time critical operations
- Test with realistic data volumes
- Try to break things!

---

**Ready to start testing? Begin with Phase 1 and work your way through!**
