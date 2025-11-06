# SYSTEM AUDIT REPORT
**Date:** November 4, 2025
**Status:** DO NOT BUILD - AUDIT ONLY

═══════════════════════════════════════════════════════════

## STEP 1: DATABASE AUDIT

### Core Tables

#### 1. **trial_organizations** ✅ EXISTS
**Columns:**
- org_id (uuid, PRIMARY KEY)
- org_name (text, NOT NULL)
- org_domain (text)
- account_manager (text)
- org_lifecycle_stage (text, CHECK constraint) - values: 'prospect', 'demo_scheduled', 'trial_active', 'converted', 'churned'
- trial_start_date (date)
- trial_end_date (date)
- engagement_score (integer, 0-100)
- last_activity_date (timestamptz)
- comments (text)
- description (text) ✅ EXISTS
- logo_url (text) ✅ EXISTS
- domain (text) - CHECK: 'TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD'
- sales_poc_id (uuid, FK → sales_pocs)
- account_manager_id (uuid, FK → users)
- trial_request_date (timestamptz)
- trial_access_provided_date (timestamptz)
- trial_expiry_date (timestamptz)
- trial_status (text) - values: 'requested', 'approved', 'in_progress', 'active', 'extended', 'completed', 'closed'
- access_provided_by (uuid, FK → users)
- access_provided_by_role (text) - 'product' or 'admin'
- created_at (timestamptz)
- updated_at (timestamptz)

**Missing columns needed:**
- ❌ org_url (text) - for organization website
- ❌ org_image_url (text) - different from logo_url?
- ❌ org_description (text, max 300) - description already exists but no max constraint

**Indexes:**
- ✅ idx_trial_orgs_lifecycle
- ✅ idx_trial_orgs_engagement
- ✅ idx_trial_orgs_sales_poc
- ✅ idx_trial_orgs_account_manager
- ✅ idx_trial_orgs_domain
- ✅ idx_trial_orgs_status

#### 2. **trial_users** ✅ EXISTS
**Columns:**
- user_id (uuid, PRIMARY KEY)
- org_id (uuid, FK → trial_organizations, CASCADE)
- name/full_name (text, NOT NULL)
- email (text, NOT NULL)
- role (text) - User's company role
- title_role (text) - CONFLICT: uses "title_role" not "designation"
- phone (text)
- salesforce_id (text)
- freshsales_id (text) ✅ EXISTS
- is_primary_contact (boolean) ✅ EXISTS
- user_designation (text) ✅ EXISTS
- current_stage (text) - 'invited'
- user_status (text) - 'invited', 'access_enabled', 'active', 'inactive'
- account_manager (text)
- sales_poc (text)
- first_login_date (timestamptz)
- last_login_date (timestamptz)
- last_login_at (timestamptz) ✅ EXISTS
- last_active_at (timestamptz)
- invited_at (timestamptz)
- login_count (integer)
- queries_executed (integer)
- is_champion (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)

**Column naming conflict:**
- ⚠️ BOTH "title_role" AND "user_designation" exist - should standardize to "designation"

**Indexes:**
- ✅ idx_trial_users_org_id
- ✅ idx_trial_users_email
- ✅ idx_trial_users_stage
- ✅ idx_trial_users_account_manager
- ✅ idx_trial_users_freshsales
- ✅ idx_trial_users_primary_contact

#### 3. **users** (auth table) - for team members
**Purpose:** Team members (Admin, AM, Product, etc.)
**Queried by:** OrgUsersTab.tsx (FAILS - looking for managed_org_ids column)
**Issues:**
- ❌ No "managed_org_ids" column (causes "Failed to load users" error)
- Structure unclear - may be using auth.users or custom users table

#### 4. **tickets** ✅ EXISTS
**Columns:**
- id (uuid, PRIMARY KEY)
- ticket_number (text, UNIQUE)
- organization (text, NOT NULL)
- trial_org_id (uuid, FK → trial_organizations)
- user_name (text)
- user_email (text)
- category (text, CHECK constraint)
- priority (text, CHECK constraint) - 'Low', 'Medium', 'High', 'Critical'
- status (text, CHECK constraint) - 'New', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'
- description (text)
- assigned_to (uuid, FK → auth.users)
- created_at (timestamptz)
- updated_at (timestamptz)
- resolved_at (timestamptz)

#### 5. **sales_pocs** ✅ EXISTS
**Columns:**
- id (uuid, PRIMARY KEY)
- name (text, NOT NULL)
- email (text, UNIQUE, NOT NULL)
- phone (text)
- account_manager_id (uuid, FK → users)
- created_at (timestamptz)
- updated_at (timestamptz)

#### 6. Other Supporting Tables ✅ EXIST
- trial_support_queries
- trial_engagement_log
- trial_extensions
- user_stage_history
- user_activities
- user_topics
- user_issues
- user_progress_metrics
- user_interactions
- followup_schedules
- org_product_roadmap
- feature_requests
- feature_roadmap_links
- meeting_notes
- demo_events
- org_deal_tracking
- trial_research_actions
- product_roadmap (admin roadmap)
- ticket_comments
- ticket_watchers
- email_threads
- activity_note_notifications
- org_activity_notes

═══════════════════════════════════════════════════════════

## STEP 2: FEATURES AUDIT

### Existing Pages & Features

#### ✅ WORKING Features:

1. **Login** (`/support/login`) - ✅ Working
   - Role: Anyone
   - Status: Working

2. **Dashboard** (`/support/dashboard`) - ✅ Working
   - Role: Team, Admin
   - Shows ticket metrics
   - Lists all tickets
   - Status/Priority inline editing works
   - Issue: Shows ALL tickets regardless of user role

3. **Trial Organizations List** (`/support/trials`) - ✅ Working
   - Role: All authenticated users
   - Shows all trial orgs in a table
   - Has search, filters
   - Issue: Shows ALL orgs to everyone (no role-based filtering)
   - Missing: Create Org button for AMs

4. **Trial Org Detail** (`/support/trials/[id]`) - ✅ Working
   - Multi-tab interface (Overview, Users, Roadmap, Features, Deal Tracking, etc.)
   - Overview tab working
   - Users tab shows trial_users from that org
   - Has "Users" tab that FAILS (OrgUsersTab component)
   - Roadmap tab working
   - Feature requests working

5. **Roadmap Pages** - ✅ Working
   - `/support/trials/roadmap` - Trial org roadmap view
   - `/support/admin/roadmap` - Admin roadmap management (role: admin only)
   - Status: Working but NOT in sidebar navigation

6. **Users List** (`/support/users`) - ✅ Working
   - Role: All authenticated
   - Shows trial users across all orgs
   - Bulk edit functionality

7. **Reports** (`/support/reports`) - ✅ Working
   - Role: All authenticated
   - Basic ticket reports

8. **Submit Ticket** (`/support/submit`) - ⚠️ EXISTS (Should be removed per user request)
   - Allows external users to submit tickets
   - User requested this be removed

9. **Settings Pages** - ✅ Working
   - `/support/settings/teams` - Teams integration
   - `/support/settings/templates` - Ticket templates
   - `/support/settings/users` - User management

10. **Meetings** - ✅ Working
    - `/support/trials/meetings` - Meeting list
    - `/support/trials/meetings/[id]` - Meeting details

11. **Follow-ups** (`/support/trials/follow-ups`) - ✅ Working

12. **Demos** - ✅ Working
    - `/support/trials/demos` - Demo events list
    - `/support/trials/demos/[id]` - Demo detail

#### ❌ MISSING Features:

1. **Create Organization Flow** - ❌ DOESN'T EXIST
   - No `/support/trials/new` page
   - No "Create Org" button visible to AMs
   - AMs cannot create trial orgs

2. **Role-Based Dashboard** - ❌ DOESN'T EXIST
   - Dashboard shows same view to everyone
   - No AM vs Admin separation
   - No filtering by assigned orgs

3. **Role-Based Org Filtering** - ❌ DOESN'T EXIST
   - Trial orgs list shows ALL orgs to everyone
   - Should filter based on account_manager_id for AMs
   - Admins should see all

4. **Delete Organization** - ❌ DOESN'T EXIST
   - No way to delete/archive trial orgs

5. **Primary Contact Enforcement** - ⚠️ PARTIALLY EXISTS
   - Column exists (is_primary_contact)
   - No UI enforcement that exactly 1 user must be primary

#### ⚠️ BROKEN Features:

1. **OrgUsersTab Component** - ❌ BROKEN
   - Error: "Failed to load users"
   - Tries to query `users` table with `.contains('managed_org_ids', [orgId])`
   - Column "managed_org_ids" doesn't exist
   - Location: components/OrgUsersTab.tsx:54-56

2. **Submit Ticket Page** - ⚠️ Should be hidden/removed
   - User requested it be removed from sidebar
   - Currently accessible

3. **Sidebar Navigation** - ⚠️ INCOMPLETE
   - Missing Roadmap link (just added)
   - Missing Submit Ticket removal (per user request)

═══════════════════════════════════════════════════════════

## STEP 3: GAP ANALYSIS

### Database Changes Needed:

**Quick fixes:**
- [ ] Add org_url column to trial_organizations
- [ ] Rename title_role → designation in trial_users (or remove user_designation if duplicate)
- [ ] Add managed_org_ids column to users table OR fix OrgUsersTab query

**Not needed (already exist):**
- ✅ org_description exists (as "description")
- ✅ org_image_url exists (as "logo_url")
- ✅ designation exists (as "user_designation")
- ✅ Primary contact field exists (is_primary_contact)

### Features to Build:

**Critical (blocking AMs):**
- [ ] Create Trial Org flow (`/support/trials/new`)
  - Form with: org_name, org_domain, description, logo_url, domain (dropdown), sales_poc (dropdown), account_manager (auto-assign to current user if AM)
  - Primary contact creation in same flow
  - Trial dates setup

- [ ] Role-based filtering on Trial Orgs list
  - If user.role = 'account_manager': filter by account_manager_id = user.id
  - If user.role = 'admin': show all
  - If user.role = 'product': show all

- [ ] Role-based Dashboard
  - AM view: Show only tickets for MY assigned orgs
  - Admin/Product view: Show all tickets

**Medium priority:**
- [ ] Delete/Archive Organization feature
- [ ] Primary contact enforcement (UI validation)
- [ ] Edit organization details
- [ ] Reassign organization to different AM

**Low priority:**
- [ ] Bulk organization import
- [ ] Organization analytics dashboard
- [ ] Trial extension workflow UI

### Features to Fix:

**Immediate:**
- [ ] Fix OrgUsersTab component
  - Option A: Add managed_org_ids column to users table
  - Option B: Change query logic to use different relationship
  - Option C: Remove this tab entirely

- [ ] Remove Submit Ticket from sidebar/navigation
  - Hide the page or remove from public access
  - Keep for admins only if needed

**Nice to have:**
- [ ] Add Roadmap to sidebar navigation ✅ DONE
- [ ] Improve error handling across components

### Features Already Working (Keep as-is):

- ✅ Trial org detail page with tabs
- ✅ Trial users management
- ✅ Feature requests & roadmap
- ✅ Deal tracking
- ✅ Meeting notes
- ✅ Follow-up scheduling
- ✅ Demo event tracking
- ✅ Ticket system
- ✅ Reports
- ✅ Settings pages

═══════════════════════════════════════════════════════════

## STEP 4: RECOMMENDATIONS

### 1. Quick Wins (< 2 hours)

**A. Fix OrgUsersTab Error**
- Time: 30 min
- Change: Update query or remove tab
- Impact: Removes error when viewing org detail

**B. Remove Submit Ticket from Sidebar**
- Time: 15 min
- Change: Hide nav link in layout.tsx
- Impact: Cleaner UX per user request

**C. Add org_url column**
- Time: 15 min
- SQL: `ALTER TABLE trial_organizations ADD COLUMN org_url TEXT;`
- Impact: Enables org website tracking

**D. Standardize designation field**
- Time: 30 min
- Decide: Keep user_designation, remove title_role OR vice versa
- Update all references
- Impact: Cleaner schema

### 2. Medium Tasks (2-8 hours)

**A. Build Create Organization Flow** (4-6 hours)
- New page: `/support/trials/new`
- Form with all required fields
- Primary contact creation
- Validation (org name unique, required fields)
- Success redirect to org detail page

**B. Implement Role-Based Filtering** (3-4 hours)
- Update trial orgs list query to filter by account_manager_id
- Update dashboard to filter tickets by user's assigned orgs
- Add role check logic in useAuth or API routes

**C. Add Delete Organization Feature** (2-3 hours)
- Add delete button to org detail page
- Confirmation modal
- Cascade delete or soft delete (status = 'deleted')
- Admin-only permission

### 3. Complex Tasks (8+ hours)

**A. Rebuild Dashboard with Role Separation** (8-12 hours)
- Create separate AM dashboard component
- Create admin/product dashboard component
- Different metrics for each role
- Role-based ticket filtering
- My Orgs widget for AMs

**B. Full Permission System** (12-16 hours)
- Define role hierarchy (AM < Product < Admin)
- Implement RLS policies properly
- Create permission middleware
- Update all queries to respect permissions
- Test thoroughly

**C. Comprehensive Org Management** (16-24 hours)
- Edit org details
- Reassign AM
- Extend trial dates
- Archive/unarchive
- Org lifecycle transitions
- Activity timeline
- Audit log

### 4. Estimated Total Time

**Phase 1: Critical Fixes** (4-6 hours)
- Fix OrgUsersTab
- Remove Submit Ticket
- Add org_url column
- Standardize designation

**Phase 2: Core AM Features** (6-10 hours)
- Create Organization flow
- Role-based filtering (orgs list)
- Role-based filtering (dashboard)

**Phase 3: Complete System** (12-20 hours)
- Delete org
- Primary contact enforcement
- Edit org details
- Advanced dashboards
- Permission system refinement

**TOTAL: 22-36 hours** to complete full transformation

═══════════════════════════════════════════════════════════

## IMMEDIATE ACTION ITEMS

### Fix Now (Blocking Errors):
1. ❌ **OrgUsersTab Error** - "Failed to load users"
   - File: `/components/OrgUsersTab.tsx:54-56`
   - Issue: Queries non-existent column `managed_org_ids`
   - Fix: Remove tab OR change query

### Build Next (Critical for AMs):
2. 🔨 **Create Organization Flow**
   - Page: `/app/support/trials/new/page.tsx`
   - Components needed: CreateOrganizationForm, PrimaryContactForm
   - Validation: org_name unique, required fields

3. 🔨 **Role-Based Filtering**
   - Files: `/app/support/trials/page.tsx`, `/app/support/dashboard/page.tsx`
   - Logic: Filter by account_manager_id for AMs

### Polish (User Requests):
4. ✅ **Remove Submit Ticket** - User requested
5. ✅ **Add Roadmap to Sidebar** - DONE

═══════════════════════════════════════════════════════════

## AWAITING USER APPROVAL

**DO NOT BUILD ANYTHING YET**

Please review this audit and:
1. Confirm the priorities
2. Approve which features to build first
3. Clarify any questions about the existing system

Ready to proceed when you give the go-ahead.
