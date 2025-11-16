# Trial Organization Page - Actual Forms, Modals & Interactive Features

## IMPORTANT: Real Features That Exist

Based on thorough code analysis of the trial organization detail page, here are the ACTUAL forms, modals, and interactive features:

---

## Main Page Structure

**File:** `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx`

**Tabs (4 total):**
1. **Overview** - Trial details & health metrics
2. **People & Engagement** - Stakeholders, users & activity tracking
3. **Activity & Insights** - Unified timeline with events and notes
4. **Support & Success** - Customer support queries and tickets

---

## ACTUAL MODALS & FORMS

### 1. Edit Organization Modal
**Trigger:** "Edit Details" button in header
**Fields:**
- Organization Name (text)
- Domain (dropdown: AAD, AF&B, E&C, HC, NEO, TMT, Unassigned)
- Account Manager (dropdown)
- Lifecycle Stage (dropdown: prospect, trial_pending, trial_active, trial_expired, customer, lost)
- Trial Start (date picker)
- Trial End (date picker)
- Organization URL (text)
- Logo URL (text with preview)
- Sales POC (text)
- Description (textarea)
- Save Changes button

**Database Table:** `trial_organizations`

---

### 2. Add User Modal
**Trigger:** "Add Contact" button in People & Engagement tab (or "Add User" in header)
**Fields:**
- Full Name (text, required)
- Email (email, required)
- Role (text, optional)
- Stage (dropdown: invited, low_activity, active, power_user, dormant)
- Freshsales URL (text, optional)
- Add User button

**Database Table:** `trial_users`

---

### 3. Edit User Modal
**Trigger:** Edit button on user cards in People section
**Fields:** Same as Add User (Full Name, Email, Role, Stage, Freshsales URL)
**Button:** Save Changes

---

### 4. Delete Organization Modal
**Trigger:** "Delete Organization" button in header
**Features:**
- 3-step confirmation process:
  1. Confirmation - Shows what will be deleted
  2. Warning - Final warning about irreversibility
  3. Deletion - Requires typing "DELETE [OrgName]"
- Deletes:
  - Organization profile
  - All users (admin and platform)
  - All activities, topics, issues
  - All demo records
  - All related metadata

---

### 5. Log Activity Modal
**Trigger:** "+" button in Activity & Insights tab (Activity & Insights header)
**Fields:**
- Activity Type (grid selection, required):
  - User Logged In (LogIn icon)
  - Usage Observed (BarChart icon)
  - Feedback Received (MessageCircle icon)
  - Learning Captured (BookOpen icon)
  - Follow-up Note (FileText icon)
  - Trial Access Provided (CheckCircle icon)
  - Trial Access Requested (ClipboardList icon)
  - Trial Extended (Clock icon)
- User (dropdown, optional)
- Description (textarea, required)
- Detailed Observations (textarea, optional)
- Log Activity button

**Database Table:** `trial_engagement_log`

---

### 6. Add Support Query Modal
**Trigger:** "Log Query" button in Support & Success tab
**Fields:**
- Query Type (dropdown, required):
  - General Support
  - Security Related
  - Functionality Related
  - Onboard More Users
  - Technical Guidance
  - Other
- Query Title (text, required)
- Description (rich text editor)
- Query Level (radio buttons):
  - Organization Level (default)
  - User Level (shows user selector)
- Select User (dropdown, if user level selected)
- Status Info (info box showing "Initial Status: Open")
- Log Query button

**Database Table:** `trial_support_queries`

---

### 7. Extend Trial Modal
**Trigger:** "Extend Trial" button in Overview tab (Trial Extensions section)
**Fields:**
- Current Expiry (display only)
- Extend By Days (quick buttons: 7, 14, 30 + custom number input)
- New Expiry Date (preview, auto-calculated)
- Reason for Extension (textarea, optional but recommended)
- Extend by X Days button

**Database Tables:** `trial_extensions`, updates `trial_organizations`

---

### 8. Update Deal Status Modal
**Trigger:** "Update Status" button in Overview tab (Deal Status widget - only shows if deal exists)
**Fields:**
- Deal Status (radio button grid):
  - 🎯 Prospect (Initial stage, evaluating fit)
  - 💼 Negotiating (Active negotiation in progress)
  - 🎉 Won (Deal closed successfully)
  - ❌ Lost (Deal did not close)
  - ⏸️ Deferred (Postponed for future follow-up)

**Conditional Fields Based on Status:**

**Won Deal:**
- Final Deal Value (number, required)
- Currency dropdown (USD, EUR, GBP, INR, AUD)

**Lost Deal:**
- Primary Loss Reason (dropdown, required):
  - Pricing too high
  - Missing critical features
  - Went with competitor
  - Budget constraints
  - Timing not right
  - No executive buy-in
  - Champion left organization
  - Poor product-market fit
  - Implementation too complex
  - Security/compliance concerns
  - Other (shows text field if selected)

**Deferred Deal:**
- Reason for Deferring (rich text editor, required)
- Expected Follow-up Date (date picker, required)

**Always Available:**
- Opportunity Value (number, optional)
- Currency (USD, EUR, GBP, INR, AUD)
- Additional Notes (rich text editor)

**Database Table:** `org_deal_tracking`

---

## OVERVIEW TAB - Features

**Components:**
1. **Trial Health Dashboard**
   - Days Remaining (metric card)
   - Trial Status (metric card)
   - Expiry Date (metric card)

2. **Quick Actions Links** (no modals, just navigation):
   - Demos - Links to `/support/trials/demos?org_id={orgId}`
   - Follow-ups - Links to `/support/trials/follow-ups?org_id={orgId}`
   - Meetings - Links to `/support/trials/meetings?org_id={orgId}`
   - AI Parser - Links to `/support/trials/parse?org_id={orgId}`

3. **Deal Status Widget** (if exists):
   - Shows current deal status
   - Opportunity Value
   - Final Deal Value (if won)
   - Follow-up Date (if deferred)
   - "Update Status" button

4. **Organization Details**
   - Display-only section showing org info
   - No editing from here (use "Edit Details" button)

5. **Trial Extensions Section**
   - Collapsible "View All" section
   - Shows extension history
   - "Extend Trial" button

---

## PEOPLE & ENGAGEMENT TAB - Features

**Section Toggle:** People / User Activity

**People Section:**
- Grid of contact cards (3 columns on large screens)
- Each card shows:
  - Avatar with initials
  - Name
  - Email
  - Role badge
  - Current Stage badge
  - Active User badge (if platform user)
  - Edit/Delete buttons (appear on hover)
- "Add Contact" button at top
- Empty state with "Add First Contact" button if no contacts

**User Activity Section:**
- Component: `UpdatesTab` (shows user activity logs)

---

## ACTIVITY & INSIGHTS TAB - Features

**Component:** `UnifiedTimelineTab` → `TimelineView`

**View Modes (4 tabs):**
1. **List View** - Default list of timeline events
2. **Grouped View** - Events grouped by category/date
3. **Calendar View** - Calendar-based view of events
4. **Board View** - Kanban/board style view

**Features:**
- Search bar
- Filter panel with:
  - Event Types (multi-select)
  - Event Categories (multi-select):
    - Onboarding
    - Engagement
    - Communication
    - Feedback
    - Support
    - Milestone
    - Sales
  - Sentiment (multi-select): Positive, Neutral, Negative
  - Severity (multi-select): Low, Medium, High, Critical
  - Tags (multi-select)
  - Mentioned People (multi-select)
  - Logged By (dropdown of account managers)
  - Follow-up Only (checkbox)
  - Date Range (from/to dates)
  - Clear Filters button

**Action Buttons:**
- "+" Quick Entry button (shows QuickEntryForm)
- "Upload/Bulk Import" button (shows BulkImportModal)
- "AI Parser" banner with close option

**AI Banner:**
- Closeable banner about AI-powered import
- Links to AI parser functionality

---

## SUPPORT & SUCCESS TAB - Features

**Component:** `SupportQueriesTab`

**Header:**
- "Log Query" button (opens AddSupportQueryModal)
- Count of filtered queries

**Filters:**
- Status dropdown: All, Open, In Progress, Resolved, Closed
- Level dropdown: All, Organization Level, User Level

**Query Display:**
- For each query:
  - Query Type badge with color
  - Level indicator (👤 User Level or 🏢 Org Level)
  - Title
  - Description (first 2 lines)
  - User name or "Organization Level"
  - Created date
  - Status dropdown (can update status inline)
  - Product notes (if exist) in blue box

---

## BUTTON LOCATIONS & TEXT

### Header Buttons
- **"Edit Details"** - Opens Edit Organization Modal
- **"Delete Organization"** - Opens Delete Organization Modal

### Overview Tab Buttons
- **"Update Status"** - Opens Update Deal Status Modal (on Deal Status widget)
- **"View All" / "Hide"** - Toggles Trial Extensions section
- **"Extend Trial"** - Opens Extend Trial Modal

### People & Engagement Tab Buttons
- **"Add Contact"** - Opens Add User Modal

### Activity & Insights Tab Buttons
- **"+"** (Quick Entry) - Shows quick entry form
- **"Upload"** (Bulk Import) - Opens Bulk Import Modal
- View mode buttons: List, Grouped, Calendar, Board

### Support & Success Tab Buttons
- **"Log Query"** - Opens Add Support Query Modal

---

## FORM VALIDATION RULES

### Edit Organization
- Organization Name: Required
- Domain: Required
- Account Manager: Required
- Lifecycle Stage: Required
- Trial Start: Required
- Trial End: Required
- Other fields: Optional

### Add/Edit User
- Name: Required
- Email: Required
- Role: Optional
- Stage: Has default (invited)
- Freshsales URL: Optional

### Log Activity
- Activity Type: Required
- Description: Required
- User: Optional
- Observations: Optional

### Log Support Query
- Query Title: Required
- Query Type: Required (defaults to general_support)
- Description: Optional
- User (if user-level): Required

### Extend Trial
- Extend By Days: Required (1-90), defaults to 7
- Reason: Optional but recommended

### Update Deal Status
- Deal Status: Required
- Won Deal: Deal Value required
- Lost Deal: Loss Reason required (required if "Other", specify reason)
- Deferred: Reason required + Expected Follow-up Date required
- Opportunity Value: Optional
- Notes: Optional

---

## DATABASE TABLES USED

1. **trial_organizations** - Main org data
2. **trial_users** - Users in trial org
3. **trial_engagement_log** - Activity logs
4. **trial_support_queries** - Support queries
5. **trial_extensions** - Trial extension history
6. **org_deal_tracking** - Deal tracking info
7. **meeting_notes** - Meeting records
8. **demo_events** - Demo tracking
9. **user_progress_metrics** - User metrics
10. **user_activities** - User activity tracking
11. **user_topics** - User topics
12. **user_issues** - User issues
13. **user_interactions** - User interactions

---

## KEY INSIGHTS FOR E2E TESTING

1. **Rich Text Editor** - Description fields in some modals use `MentionTextEditor` component
2. **Modal Structure** - All modals use fixed positioning with overlay
3. **Toast Notifications** - Success/error messages use react-hot-toast
4. **Form Validation** - Client-side validation before submission
5. **Dependent Fields** - Deal Status modal shows different fields based on selected status
6. **Multi-step Process** - Delete Organization has 3-step confirmation
7. **Quick Select Options** - Extend Trial has quick buttons for common durations
8. **Inline Status Updates** - Support Queries allow status change via dropdown
9. **Filter Persistence** - Filters can be applied and cleared separately
10. **Empty States** - Most sections have custom empty state UI

