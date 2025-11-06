# MyRA Trials Management System - Complete Architecture

## System Overview

The MyRA Trials Management System is a comprehensive trial organization and deal tracking platform designed for B2B market research and sales operations. It serves as a "playground for features" that enables Account Managers, Sales Managers, and Product teams to collaborate on trial organizations, track engagement, manage support queries, conduct research, and ultimately convert trials into deals.

**Core Philosophy**: Track the complete trial lifecycle from prospect discovery through deal closure, with comprehensive engagement metrics and research support.

---

## System Hierarchy & Data Model

### 1. Organization Hierarchy

```
Trial Organization (trial_organizations)
├── Organization Details
│   ├── Organization Name
│   ├── Domain (Industry)
│   ├── Sales POC (Point of Contact)
│   ├── Account Manager (auto-assigned)
│   └── Trial Status (prospect, active, paused, expired)
│
├── Trial Users (trial_users)
│   ├── User Profiles
│   ├── Designation & Role
│   ├── Freshsales Integration ID
│   ├── Primary Contact Flag
│   └── User Status (invited, access_enabled, active, inactive)
│
├── Engagement Tracking (trial_engagement_log)
│   ├── Login Events
│   ├── Usage Observations
│   ├── Feedback Received
│   ├── Learning Captured
│   └── Trial Activity Notes
│
├── Support & Research
│   ├── Support Queries (trial_support_queries) - org or user level
│   ├── Query Types (6 types: general, security, functionality, onboarding, technical, other)
│   ├── Query Status (open → in_progress → resolved → closed)
│   └── Product Team Notes
│
└── Deal & Business Management
    ├── Deal Tracking (org_deal_tracking)
    │   ├── Deal Status (prospect → negotiating → won/lost/future)
    │   ├── Deal Value (for won deals)
    │   ├── Loss Reasons (for lost deals)
    │   └── Future Prospect Reasons
    │
    └── Research Actions (trial_research_actions)
        ├── Action Types (8 types: proposal, technical, pricing, analysis, etc.)
        ├── Action Status (open → in_progress → completed/on_hold/cancelled)
        ├── Priority Levels (low, medium, high, critical)
        └── Assignment to Research Team
```

---

## Core Features & Components

### Feature 1: Organization Management

**Purpose**: Create and manage trial organizations with smart defaults

**Components**:
- `CreateOrganizationModal.tsx` - Form to create new organizations
- `app/trials/page.tsx` - List all organizations with filtering

**Smart Defaults**:
- Auto-calculates trial end date (start + 14 days)
- Auto-assigns Account Manager based on Sales POC
- Pre-sets initial status as "requested"
- Pre-sets lifecycle stage as "prospect"

**User Roles Access**:
- **Admin**: Create any organization, edit all orgs
- **Account Manager**: Create orgs (assigned as primary contact), view/edit only their orgs
- **Sales Manager**: View all organizations, create orgs
- **Product**: View all organizations, full read access

---

### Feature 2: Trial User Management

**Purpose**: Invite users from customer organizations to trial the platform

**Components**:
- `AddTrialUserModal.tsx` - Invite new users
- `TrialUsersTab.tsx` - Manage all users in an organization

**User Attributes**:
- Full Name
- Email (validated for duplicates per org)
- Designation/Role
- Freshsales ID (for CRM sync)
- Primary Contact Flag
- User Status Lifecycle
  - **invited**: Email sent, awaiting acceptance
  - **access_enabled**: Account created, ready to use
  - **active**: Currently using the platform
  - **inactive**: No longer active

**User Status Transitions**:
Account Managers can transition users through statuses to track engagement phases.

---

### Feature 3: Engagement Timeline

**Purpose**: Track all user interactions and engagement activities within the trial

**Components**:
- `AddEngagementLogModal.tsx` - Log new engagement activities
- `EngagementTimelineTab.tsx` - Visual timeline of all activities

**Predefined Activity Types** (8 types):
- **🔓 User Logged In**: User login event
- **📊 Usage Observed**: Specific feature usage
- **💬 Feedback Received**: Customer feedback captured
- **📚 Learning Captured**: Team learning from interaction
- **📝 Follow-up Note**: Internal notes
- **✅ Trial Access Provided**: Granted new access/feature
- **📋 Trial Access Requested**: User requested additional access
- **⏱️ Trial Extended**: Trial period extended

**Key Features**:
- Color-coded activity types with icons
- Real-time formatting (e.g., "2 hours ago")
- User filter (see activities from specific trial users)
- Activity type filter (focus on specific events)
- Observations field for additional context
- Chronological timeline display

---

### Feature 4: Support Query Management

**Purpose**: Track support tickets and requests from both organizations and individual users

**Components**:
- `AddSupportQueryModal.tsx` - Log support queries
- `SupportQueriesTab.tsx` - Manage all queries

**Query Scope**:
- **Organization Level**: Org-wide questions/issues (e.g., "Can we integrate with Salesforce?")
- **User Level**: Individual user questions (e.g., "How do I export data?")

**Query Types** (6 predefined types):
- General Support
- Security Related
- Functionality Related
- Onboard More Users
- Technical Guidance
- Other

**Query Lifecycle**:
1. **Open**: Just created, awaiting attention
2. **In Progress**: Being worked on
3. **Resolved**: Issue resolved, details captured
4. **Closed**: Query archived

**Product Team Collaboration**:
- Product team can add technical notes to queries
- Notes visible to Account Managers for follow-up

---

### Feature 5: Organization Analytics Dashboard

**Purpose**: Aggregate engagement metrics across all users in an organization for executive visibility

**Components**:
- `OrgAnalyticsDashboard.tsx` - Central analytics hub

**Metrics Displayed**:

1. **Trial Health Score** (0-100)
   - Calculation: Base 50 + (Engagement Rate × 30) + (Query Resolution Rate × 20)
   - Status: Green (75+) / Yellow (50-74) / Red (<50)
   - Visual: Color-coded card with progress bar

2. **Engagement Metrics**
   - Total Users Invited
   - Total Activities Logged
   - Average Activities per User
   - Most Active Users (top 5 with activity counts)

3. **Support Query Summary**
   - Total Queries
   - Breakdown by Status (open, in_progress, resolved, closed)
   - Resolution Rate

4. **Activity Type Breakdown**
   - Horizontal bar chart showing activity distribution
   - Identifies where engagement is happening

**Use Cases**:
- Sales Manager views all org health scores to prioritize follow-ups
- Account Manager understands engagement patterns to improve support
- Admin evaluates trial program effectiveness

---

### Feature 6: Research Team Actions

**Purpose**: Track requests for internal research team support and involvement

**Components**:
- `AddResearchActionModal.tsx` - Create research actions
- `ResearchActionsTab.tsx` - Manage all research tasks

**Research Action Types** (8 types for B2B market research):
- **📄 Proposal Needed**: Formal proposal required
- **🔧 Technical Guidance Needed**: Technical requirements assessment
- **💰 Pricing Decision**: Custom pricing negotiation
- **📊 Competitive Analysis**: Market competitive assessment
- **🎯 Market Fit Assessment**: Evaluate product-market fit
- **⚙️ Customization Needs**: Custom feature or integration
- **🔗 Integration Assessment**: Evaluate technical integrations
- **📈 ROI Modeling**: Build ROI business case

**Action Lifecycle**:
1. **Open**: Action created, needs work
2. **In Progress**: Research team actively working
3. **Completed**: Action finished with outcome
4. **On Hold**: Paused/blocked
5. **Cancelled**: No longer needed

**Priority Levels**:
- Low, Medium, High, Critical

**Key Features**:
- Assign to specific research team member
- Set due dates
- Add outcome notes when completed
- Track status transition history

**Important**: Research actions are created by Account Managers, Product, and Admins for tracking purposes. Research team uses this as a tracking system (not their primary workflow system).

---

### Feature 7: Deal Tracking

**Purpose**: Manage trial-to-customer conversion and deal outcomes

**Components**:
- `UpdateDealStatusModal.tsx` - Change deal status and details
- `DealTrackingTab.tsx` - View and manage deal information

**Auto-Creation**: Deal tracking record created automatically when organization is created (status: "prospect")

**Deal Statuses**:
1. **🎯 Prospect**: Initial stage, evaluating fit
2. **💼 Negotiating**: Active negotiation in progress
3. **🎉 Won**: Deal closed successfully
   - Requires: Deal value + currency
   - Optional: Outcome notes
4. **❌ Lost**: Deal did not close
   - Requires: Loss reason (why deal didn't happen)
5. **📅 Future Prospect**: Potential future opportunity
   - Requires: Future opportunity reason

**Deal Value Tracking**:
- Currency Support: USD, EUR, GBP, INR, AUD
- Tracks total contract value for closed deals
- Enables revenue pipeline visibility

**Use Cases**:
- Account Manager marks org as "Won" with $50k ARR → Pipeline visibility
- Sales Manager sees all deal statuses and values → Forecasting
- Admin evaluates trial program ROI → Program effectiveness

---

## Role-Based Access Control

### User Roles & Permissions

#### Admin
- **View**: All organizations, all users, all data
- **Action**: Create orgs, manage all features, view analytics, manage research actions
- **Purpose**: Program oversight, executive visibility

#### Account Manager (Primary Operator)
- **View**: Only their assigned organizations
- **Action**:
  - Create/manage trial users
  - Log engagement activities
  - Create support queries
  - Create research actions
  - Update deal status
  - Manage follow-ups and notes
- **Purpose**: Day-to-day customer engagement

#### Sales Manager
- **View**: All organizations, high-level data
- **Action**: View analytics, filter by status, see deal pipeline
- **Purpose**: Sales forecasting, pipeline management

#### Product
- **View**: All organizations, analytics, research actions
- **Action**: Add technical notes to support queries, view all engagement data
- **Purpose**: Product decisions based on customer feedback

### Access Control Hook

`useRoleAccess()` hook returns `RolePermissions` interface:
```typescript
interface RolePermissions {
  canViewAllOrgs: boolean;        // Admin, Sales Manager, Product
  canViewAnalytics: boolean;      // Admin, Sales Manager, Product
  canManageRoadmap: boolean;      // Admin, Product
  canCreateQueries: boolean;      // Admin, Account Manager, Product
  canLogActivity: boolean;        // Admin, Account Manager, Product
  canEditTrialDates: boolean;     // Admin, Product
  canMarkDealOutcome: boolean;    // Admin, Account Manager
}
```

Additionally: `useCanViewOrganization(orgAccountManagerId)` checks if current user can view a specific org.

---

## Database Schema Overview

### Primary Tables

1. **trial_organizations**
   - Core org data (name, domain, dates, status, lifecycle stage)
   - Foreign key: sales_pocs (Sales POC assignment)
   - Relationships: trial_users, trial_engagement_log, trial_support_queries, org_deal_tracking, trial_research_actions

2. **trial_users**
   - Individual trial user profiles
   - Foreign key: trial_organizations
   - Relationships: trial_engagement_log, trial_support_queries

3. **trial_engagement_log**
   - Every user activity logged here
   - Foreign keys: trial_organizations, trial_users
   - ENUM: activity_type (8 predefined types)

4. **trial_support_queries**
   - Support requests (org-level or user-level)
   - Foreign keys: trial_organizations, trial_users (nullable)
   - ENUM: query_type (6 types), status (4 statuses)

5. **trial_research_actions**
   - Research team tasks
   - Foreign key: trial_organizations
   - ENUM: action_type (8 types), status (5 statuses)

6. **org_deal_tracking**
   - Deal outcome management
   - Foreign key: trial_organizations (unique - one per org)
   - ENUM: deal_status (5 statuses)
   - Tracks: deal_value, loss_reason, future_prospect_reason

### Security

- Row Level Security (RLS) enabled on all tables
- Current policy: Allow all (can be tightened based on authentication)
- All tables have CASCADE delete for data integrity
- Automatic timestamps (created_at, updated_at) on all records

---

## Navigation & Routes

### URL Structure
```
/trials                              - Organizations list page
  /trials/[id]                       - Organization detail page
    - Tabs:
      - Overview                     - Edit org details
      - Users                        - Admin user management
      - Trial Users                  - Trial user management
      - Support Queries              - Query tracking
      - Research                     - Research actions
      - Deals                        - Deal tracking
      - Analytics                    - Health dashboard
      - Activity                     - Engagement timeline
      - Demos                        - Demo events
      - Meetings                      - Meeting notes

/trials/demos                        - Demo events list
/trials/demos/[id]                  - Demo detail
/trials/meetings                     - Meeting notes list
/trials/meetings/[id]               - Meeting detail
/trials/meetings/actions            - Action items dashboard
/trials/import                       - Bulk data import wizard
/trials/import-demo-log             - Demo log import
```

### Key Navigation Patterns

**List View** → **Detail View** → **Multi-Tab Interface**
- Account Managers: /trials → /trials/[id] → Org-specific tabs
- Sales Managers: /trials → View all with filters → /trials/[id] for detail
- Admins: Full access to all views

---

## Workflow Examples

### Example 1: New Trial Onboarding

```
Sales creates new org
  ↓ (auto: Account Manager assigned, trial end date set)
Account Manager invites trial users
  ↓
Users receive email, create accounts
  ↓
Account Manager logs engagement activities:
  - User Logged In
  - Usage Observed
  - Feedback Received
  ↓
Product sees feedback via Research Actions
  ↓
Account Manager creates support queries as questions arise
  ↓
Account Manager schedules Research Actions if needed
  ↓
Monitor Trial Health Score on Analytics dashboard
```

### Example 2: Trial to Deal Conversion

```
After successful trial (high health score):
  ↓
Account Manager clicks "Update Status" on Deals tab
  ↓
Selects "Won" → Enters deal value $50k
  ↓
Deal appears in Sales Manager's pipeline
  ↓
Admin can see trial program ROI via analytics
```

### Example 3: Failed Negotiation

```
During trial negotiation:
  ↓
Account Manager marks as "Negotiating"
  ↓
Research team provides pricing + technical analysis
  ↓
Negotiation fails (e.g., budget constraints)
  ↓
Account Manager clicks "Update Status" → "Lost"
  ↓
Enters reason: "Budget constraints for FY"
  ↓
Future: Can reopen as "Future Prospect" when conditions change
```

---

## Component Architecture

### Component Hierarchy

```
app/trials/page.tsx (Organization List)
  ├── CreateOrganizationModal
  └── [Organization Cards]
      └── Interactive elements

app/trials/[id]/page.tsx (Organization Detail - Main Hub)
  ├── TrialUsersTab
  │   ├── AddTrialUserModal
  │   └── User list
  ├── SupportQueriesTab
  │   ├── AddSupportQueryModal
  │   └── Query list
  ├── EngagementTimelineTab
  │   ├── AddEngagementLogModal
  │   └── Timeline visualization
  ├── ResearchActionsTab
  │   ├── AddResearchActionModal
  │   └── Action list
  ├── DealTrackingTab
  │   ├── UpdateDealStatusModal
  │   └── Deal details
  ├── OrgAnalyticsDashboard
  │   └── Charts & metrics
  └── (Other existing tabs: demos, meetings, activity)
```

### Data Flow Pattern

All tabs follow consistent pattern:
1. **Fetch Data** on mount or when orgId changes
2. **Display List/Card** with data
3. **Modal for Actions** (Create/Update)
4. **Optimistic Updates** with error handling
5. **Toast Notifications** for user feedback
6. **Refresh on Success** to sync with database

---

## Key Design Decisions

### 1. Predefined Activity Types
**Decision**: Constrained to 8 predefined types instead of free-text
**Rationale**:
- Enables consistent analytics and reporting
- Makes timeline visual and scannable
- Prevents data quality issues from free-text
- Easier to build business intelligence

### 2. Org-Level vs User-Level Queries
**Decision**: Support queries can be logged at both organization and user levels
**Rationale**:
- Org-level: "Can you integrate with Salesforce?" (applies to whole org)
- User-level: "How do I export my data?" (specific to user)
- Allows flexibility while maintaining clarity

### 3. Research Actions for Tracking, Not Execution
**Decision**: Research actions created by Account Managers/Admins, viewed by research team
**Rationale**:
- Account Managers know what research is needed
- Provides audit trail of research requests
- Non-intrusive for research team (they have their own systems)
- Clear communication channel: AM → Research → AM

### 4. Automatic Deal Tracking Creation
**Decision**: Deal record auto-created when organization is created
**Rationale**:
- No risk of missing deal opportunity
- Always have baseline deal status
- Simplifies the data model (one-to-one relationship)

### 5. Auto-Assignment of Account Manager
**Decision**: Account Manager auto-assigned based on Sales POC
**Rationale**:
- Reduces manual setup
- Ensures org belongs to someone
- Can be overridden if needed
- Implicit permission boundary

---

## Analytics & Reporting

### Trial Health Score Calculation

```
Health Score = 50 (base)
             + min(EngagementRate × 30, 30)
             + ResolutionRate × 20

Where:
- EngagementRate = (Total Activities Logged) / (Total Users)
- ResolutionRate = (Resolved + Closed Queries) / (Total Queries)

Status:
- Green: 75-100 (Healthy trial)
- Yellow: 50-74 (Fair engagement)
- Red: 0-49 (At risk)
```

### Key Metrics for Different Roles

**Account Manager**:
- Health Score (personal focus)
- User engagement breakdown
- Query resolution rate
- Research action status

**Sales Manager**:
- All org health scores (prioritize high performers)
- Deal pipeline (Won + Negotiating + Future value)
- Win/Loss rate
- Average trial conversion time

**Admin**:
- Program-level health (aggregate across all orgs)
- Resource efficiency (research team capacity)
- Channel effectiveness (by Sales POC)
- Revenue impact

**Product**:
- Most-requested features (from support queries)
- Common pain points (from feedback)
- Feature usage patterns (from activity timeline)
- Integration requests (from research actions)

---

## Future Enhancement Opportunities

### Identified but Not Yet Implemented

1. **Product Roadmap Management**
   - Feature requests from trials
   - Voting/prioritization
   - Visibility to customers

2. **Follow-up Scheduling**
   - Calendar integration
   - Reminders for Account Managers
   - Next action tracking

3. **Advanced Deal Analytics**
   - Sales cycle length analysis
   - Win/Loss reason analysis
   - Revenue pipeline forecasting
   - Deal probability scoring

4. **Integration Ecosystem**
   - Freshsales CRM sync (2-way)
   - Slack notifications
   - Calendar invitations
   - Email templates

5. **Customization Engine**
   - Custom activity types per organization
   - Custom query types
   - White-labeled experience
   - Custom fields

---

## Technical Stack

### Frontend
- **Framework**: Next.js 14+ (React 18)
- **Language**: TypeScript
- **UI Component**: Tailwind CSS
- **State Management**: React Context + useState
- **Database Client**: Supabase JavaScript SDK
- **Notifications**: React Hot Toast
- **Date Formatting**: date-fns

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **API**: Supabase Realtime + REST
- **Row Security**: Supabase RLS

### Deployment
- **Hosting**: Vercel (optimal for Next.js)
- **Database Hosting**: Supabase (PostgreSQL managed)
- **Environment**: Production-ready with staging capability

---

## Getting Started

### Prerequisites
1. Supabase account with database
2. Node.js 18+
3. npm/yarn/pnpm

### Setup

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd myra-status-dashboard
   npm install
   ```

2. **Apply migrations**:
   ```bash
   # In Supabase dashboard, run migrations in order:
   # 1. 20250103_trials_system_schema.sql
   # 2. 20250103_research_team_actions.sql
   # 3. 20250103_deal_tracking.sql
   ```

3. **Set environment variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=<your-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
   ```

4. **Start development**:
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

---

## System Status

### ✅ Completed Features
- Organization management with smart defaults
- Trial user management and status tracking
- Engagement activity timeline (8 activity types)
- Support query management (6 query types)
- Organization analytics dashboard
- Research team action tracking (8 action types)
- Deal tracking system (5 deal statuses)
- Role-based access control
- Complete route rename (trial-orgs → trials)

### 📋 Future/Optional Features
- Product roadmap management
- Follow-up date scheduling
- Advanced deal analytics
- Integration ecosystem (Freshsales, Slack, etc.)
- Customization engine

---

## Support & Documentation

For questions or issues:
1. Check component-level comments
2. Review inline documentation in React components
3. Check migration files for schema definitions
4. Review role-based access control hook for permission logic
