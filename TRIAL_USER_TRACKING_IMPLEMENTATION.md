# Trial User Tracking System - Implementation Guide

## Overview
System for tracking **actual platform users** at trial organizations and their adoption journey with Myra AI.

## ✅ Completed: Database Schema

### Tables Created (7 total)

#### 1. **trial_users** - Core user tracking
```sql
- user_id (PK)
- org_id (FK to trial_organizations)
- name, email, role, phone
- salesforce_id
- current_stage (invited, onboarding, exploring, building, testing, integrating, pilot, evaluating, production_ready, blocked, stalled, inactive)
- account_manager (one of 8 AMs)
- sales_poc (one of 60 sales team members)
- created_at, last_active_at, invited_at
```

#### 2. **user_stage_history** - Journey progression
```sql
- history_id (PK)
- user_id, org_id
- from_stage, to_stage
- changed_by (AM name)
- notes
- changed_at
- Auto-populated via trigger when current_stage changes
```

#### 3. **user_activities** - Structured activity log
```sql
- activity_id (PK)
- user_id, org_id
- activity_type (topic, issue, milestone, interaction, progress_update, feedback)
- category (technical, feature_request, bug, usage, training, integration, business)
- title, description
- priority, status
- meeting_id (optional link to meeting_notes)
- created_by (AM name)
- created_at, updated_at, resolved_at
```

#### 4. **user_topics** - Use cases being explored
```sql
- topic_id (PK)
- user_id, org_id
- topic_name, description
- status (exploring, implementing, implemented, blocked, abandoned)
- priority
- created_at, updated_at
```

#### 5. **user_issues** - Blockers and problems
```sql
- issue_id (PK)
- user_id, org_id
- issue_type (technical, product, documentation, performance, integration, training)
- title, description
- severity (critical, high, medium, low)
- status (open, investigating, resolved, wont_fix, duplicate)
- meeting_id (optional link)
- assigned_to
- created_at, updated_at, resolved_at
```

#### 6. **user_progress_metrics** - Quantifiable adoption metrics
```sql
- metric_id (PK)
- user_id
- metric_name (agents_created, workflows_built, api_calls_made, integrations_setup, etc.)
- metric_value (numeric)
- metric_unit (count, hours, percentage, etc.)
- recorded_at, recorded_by
```

#### 7. **user_interactions** - Touchpoint history
```sql
- interaction_id (PK)
- user_id, org_id
- interaction_type (call, email, meeting, chat, training, demo, support)
- title, notes
- conducted_by (AM/Sales POC)
- meeting_id (optional link)
- interaction_date, duration_minutes
- created_at
```

## 📋 Pending: UI Components

### 1. Platform Users Tab (Org Detail Page)
**Location:** `/app/trials/[id]/page.tsx`

**Features Needed:**
- New "Platform Users" tab (separate from existing admin users tab)
- User list with cards showing:
  - Name, email, role
  - Current stage badge with color coding
  - Account Manager & Sales POC
  - Last active timestamp
  - Quick stats (topics, issues, progress)
- Filter by stage, AM, Sales POC
- Search by name/email
- "Add Platform User" button
- Click user card → navigates to User Detail page

**Stage Color Coding:**
```
invited: gray
onboarding: blue
exploring: cyan
building: purple
testing: yellow
integrating: orange
pilot: indigo
evaluating: pink
production_ready: green
blocked: red
stalled: amber
inactive: gray-400
```

### 2. Add Platform User Modal
**Component:** `/components/AddPlatformUserModal.tsx`

**Form Fields:**
- **Basic Info**
  - Name (required)
  - Email (required, unique per org)
  - Role (text input - their job title)
  - Phone (optional)

- **External IDs**
  - Salesforce ID (optional)

- **Journey Tracking**
  - Current Stage (dropdown, default: invited)

- **Account Management**
  - Account Manager (dropdown, required - 8 options)
  - Sales POC (dropdown, optional - 60 options)

- **Actions**
  - Cancel / Save User buttons

**Validation:**
- Email must be valid format
- Email must be unique within organization
- Name and Account Manager are required

### 3. User Detail Page
**Location:** `/app/trials/users/[userId]/page.tsx`

**Layout Sections:**

#### Header
- User avatar (initials)
- Name, Email, Role
- Current Stage badge (editable dropdown)
- Account Manager, Sales POC
- Salesforce ID
- Last Active timestamp
- Back to Org button

#### Stats Cards Row
- Topics Exploring: X active
- Open Issues: X (Y critical)
- Progress Metrics: Z completed
- Interactions: N in last 30 days

#### Tabs:
1. **Overview Tab**
   - Stage Timeline (visual journey progression)
   - Recent Activities (last 10)
   - Active Topics list
   - Open Issues list
   - Quick Actions: Add Activity, Add Topic, Add Issue

2. **Activities Tab**
   - Structured activity log
   - Filter by type, category, status
   - Add Activity button
   - Activity cards showing:
     - Type icon + Category badge
     - Title + Description
     - Priority, Status
     - Linked meeting (if any)
     - Created by, Created at
     - Quick actions: Edit, Resolve, Delete

3. **Topics Tab**
   - List of topics/use cases
   - Status badges
   - Add Topic button
   - Topic cards:
     - Topic name
     - Description
     - Status (exploring → implementing → implemented)
     - Priority
     - Created/Updated dates
     - Actions: Update Status, Edit, Delete

4. **Issues Tab**
   - List of issues/blockers
   - Filter by severity, status, type
   - Add Issue button
   - Issue cards:
     - Severity badge
     - Title + Description
     - Issue type
     - Status
     - Assigned to
     - Linked meeting
     - Created/Resolved dates
     - Actions: Update Status, Assign, Resolve, Delete

5. **Progress Tab**
   - Line chart showing metrics over time
   - Metric cards:
     - Metric name
     - Current value
     - Trend indicator
   - Add Metric button
   - Metric history table

6. **Interactions Tab**
   - Timeline of all touchpoints
   - Filter by type
   - Interaction cards:
     - Type icon
     - Title + Notes
     - Conducted by
     - Date + Duration
     - Linked meeting
   - Add Interaction button

### 4. Activity Logging Modal
**Component:** `/components/LogUserActivityModal.tsx`

**Form Fields:**
- Activity Type (dropdown: topic, issue, milestone, interaction, progress_update, feedback)
- Category (dropdown: technical, feature_request, bug, usage, training, integration, business)
- Title (required)
- Description (textarea)
- Priority (dropdown: critical, high, medium, low)
- Link to Meeting (optional dropdown of recent meetings)
- Created By (auto-filled with current AM)

### 5. Add Topic/Issue/Interaction Modals
Similar structured forms for each entity type with appropriate fields.

## 🔗 Integration Points

### Meeting Notes Integration
When creating/viewing meeting notes:
- **Attendees section**: Multi-select dropdown of platform users from this org
- **Action Items**: Option to assign to specific platform users
- **Meeting Summary**: Auto-create user activities for topics/issues mentioned
- Link user_activities, user_issues, user_interactions back to meeting_id

### Organization Overview Integration
Add stats card showing:
- Total Platform Users: X
- Active Users (last 7 days): Y
- Users by Stage (donut chart)
- Critical Issues: Z

## 📊 Reporting & Analytics

### Global Platform Users Dashboard
**New Page:** `/app/platform-users`

**Features:**
- All users across all organizations
- Filters: Org, Stage, AM, Sales POC, Date Range
- Search by name/email
- Sortable table view
- Export to CSV
- Bulk actions: Change Stage, Assign AM/POC

**Metrics Cards:**
- Total Platform Users
- By Stage (bar chart)
- Conversion Rate (invited → production_ready)
- Average Time in Each Stage
- Top Account Managers (by users in production_ready)
- Critical Issues Count

## 🎯 User Journey Stages (12 total)

1. **invited** - User invited but hasn't logged in yet
2. **onboarding** - Initial setup, learning the platform basics
3. **exploring** - Trying out features, understanding capabilities
4. **building** - Actively creating their first workflows/solutions
5. **testing** - Testing their solutions, validating use cases
6. **integrating** - Connecting with their existing systems/APIs
7. **pilot** - Running pilot/POC with real business data
8. **evaluating** - Decision-making phase, internal stakeholder reviews
9. **production_ready** - Ready to convert from trial to paid subscription
10. **blocked** - Stuck on a critical issue, needs immediate help
11. **stalled** - Not actively engaging, needs follow-up/reactivation
12. **inactive** - No recent activity, at high risk of churning

## 🚀 Implementation Priority

### Phase 1: Basic User Tracking (MVP)
- [ ] Add Platform User modal
- [ ] Platform Users tab on org page (list view)
- [ ] User Detail page (basic info + stage change)

### Phase 2: Activity Tracking
- [ ] Activity logging modal
- [ ] Activities tab on user detail page
- [ ] Integration with meeting notes

### Phase 3: Topics & Issues
- [ ] Topics management
- [ ] Issues management
- [ ] Progress metrics tracking

### Phase 4: Analytics & Reporting
- [ ] User interactions timeline
- [ ] Global dashboard
- [ ] Reporting & exports
- [ ] Stage progression analytics

## 💡 Best Practices

### Structured Activity Logging
Always use structured fields rather than freeform notes:
```typescript
// Good ✅
{
  activity_type: 'issue',
  category: 'technical',
  title: 'API timeout errors on large datasets',
  description: '...',
  priority: 'high',
  meeting_id: 'xyz'
}

// Bad ❌
{
  notes: 'User mentioned some API issues in the call today'
}
```

### Stage Transitions
Common progression paths:
- **Happy Path**: invited → onboarding → exploring → building → testing → integrating → pilot → evaluating → production_ready
- **Blocked Path**: Any stage → blocked (temporarily) → resume previous stage
- **Stalled Path**: Any stage → stalled → needs reactivation → resume or inactive
- **Churn Path**: Any stage → inactive

### Account Manager vs Sales POC
- **Account Manager**: One of 8 senior managers, owns the relationship
- **Sales POC**: One of 60 salespeople reporting to AMs, day-to-day contact
- Users can have both assigned; AM is required, Sales POC is optional

## 📝 Sample API Usage

### Create a Platform User
```typescript
const { data, error } = await supabase
  .from('trial_users')
  .insert({
    org_id: 'org-uuid',
    name: 'Jane Smith',
    email: 'jane@acmecorp.com',
    role: 'Data Analyst',
    salesforce_id: 'SF-12345',
    current_stage: 'invited',
    account_manager: 'John Doe',
    sales_poc: 'Sarah Johnson',
  });
```

### Log an Activity
```typescript
const { data, error } = await supabase
  .from('user_activities')
  .insert({
    user_id: 'user-uuid',
    org_id: 'org-uuid',
    activity_type: 'topic',
    category: 'usage',
    title: 'Exploring invoice processing automation',
    description: 'User interested in automating their AP workflow',
    priority: 'high',
    status: 'open',
    meeting_id: 'meeting-uuid', // optional
    created_by: 'John Doe',
  });
```

### Update User Stage
```typescript
const { data, error } = await supabase
  .from('trial_users')
  .update({ current_stage: 'building' })
  .eq('user_id', 'user-uuid');

// Automatically creates entry in user_stage_history via trigger
```

### Query Users by Stage
```typescript
const { data, error } = await supabase
  .from('trial_users')
  .select('*, trial_organizations(org_name)')
  .eq('current_stage', 'production_ready')
  .eq('account_manager', 'John Doe')
  .order('last_active_at', { ascending: false });
```

## 🔧 Next Steps

1. Review this document with the team
2. Prioritize Phase 1 features for immediate implementation
3. Create reusable components (modal templates, stage badges, stat cards)
4. Build out UI following the designs above
5. Test with sample data
6. Train Account Managers on the system
7. Roll out gradually (pilot with 1-2 AMs first)

---

**Status:** Database schema completed ✅ | UI implementation pending 🚧
**Created:** 2025-01-03
**Updated:** 2025-01-03
