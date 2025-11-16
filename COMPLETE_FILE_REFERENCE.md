# Complete File Reference - Trial Organization Page Components

## Documentation Files Created
- `/Users/sriharsha/myra-status-dashboard/ACTUAL_TRIAL_ORG_FEATURES.md` - Complete feature list
- `/Users/sriharsha/myra-status-dashboard/TRIAL_ORG_COMPONENT_PATHS.md` - Component file paths
- `/Users/sriharsha/myra-status-dashboard/E2E_TESTING_QUICK_REFERENCE.md` - E2E test guide
- `/Users/sriharsha/myra-status-dashboard/COMPLETE_FILE_REFERENCE.md` - This file

---

## Main Page Files

### Trial Organization Detail Page
- **Path:** `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx`
- **Lines:** ~976 lines
- **Contains:** Main component, 4 tabs, 2 inline modals (Edit Org, Add User, Edit User, Log Activity, Delete Organization)
- **Key imports:**
  - OverviewTab
  - PeopleEngagementTab
  - UnifiedTimelineTab
  - SupportQueriesTab
  - LogActivityModal
  - DeleteOrganizationModal

---

## Tab Components

### 1. OverviewTab
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/OverviewTab.tsx`
- **Purpose:** Trial health, quick actions, deal status, organization details, trial extensions
- **Imports:**
  - TrialExtensionsTab
  - UpdateDealStatusModal
- **Features:** Trial Health Dashboard, Quick Actions, Deal Status Widget, Organization Details, Trial Extensions

### 2. PeopleEngagementTab
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/PeopleEngagementTab.tsx`
- **Purpose:** Contact management and user activity tracking
- **Imports:**
  - UpdatesTab
- **Features:** People section, User Activity section, Contact cards with edit/delete

### 3. UnifiedTimelineTab
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/UnifiedTimelineTab.tsx`
- **Purpose:** Wrapper for TimelineView
- **Imports:**
  - TimelineView
- **Features:** Unified timeline display

### 4. SupportQueriesTab
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/SupportQueriesTab.tsx`
- **Purpose:** Support query management
- **Imports:**
  - AddSupportQueryModal
- **Features:** Query list, status filtering, inline status updates

---

## Modal Components

### LogActivityModal
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/LogActivityModal.tsx`
- **Type:** Standalone Modal
- **Props:** isOpen, onClose, orgId, users, onActivityLogged
- **Activity Types:** 8 types with icons
- **Database:** trial_engagement_log

### AddSupportQueryModal
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/AddSupportQueryModal.tsx`
- **Type:** Standalone Modal
- **Props:** orgId, isOpen, onClose, onSuccess, userId (optional)
- **Query Types:** 6 types
- **Features:** Rich text editor, user selection, query level toggle
- **Database:** trial_support_queries

### DeleteOrganizationModal
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/DeleteOrganizationModal.tsx`
- **Type:** Standalone Modal
- **Props:** isOpen, orgId, orgName, userCount, onClose, onSuccess
- **Steps:** 3-step confirmation process
- **Deletes:** Organization + cascading (users, activities, demos, etc.)
- **Database:** trial_organizations + cascading tables

### AddTrialExtensionModal
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/AddTrialExtensionModal.tsx`
- **Type:** Standalone Modal
- **Props:** orgId, currentExpiryDate, isOpen, onClose, onSuccess
- **Features:** Quick buttons (7, 14, 30 days), custom input, new date preview
- **Database:** trial_extensions, trial_organizations

### UpdateDealStatusModal
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/UpdateDealStatusModal.tsx`
- **Type:** Standalone Modal
- **Props:** orgId, isOpen, onClose, onSuccess, currentDealStatus
- **Deal Statuses:** 5 options with icons and conditional fields
- **Conditional Fields:** Deal Value (Won), Loss Reason (Lost), Deferred Reason + Date (Deferred)
- **Database:** org_deal_tracking

---

## Support Components

### TrialExtensionsTab
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/TrialExtensionsTab.tsx`
- **Purpose:** Display trial extension history and allow new extensions
- **Imports:**
  - AddTrialExtensionModal
- **Features:** Extension stats, extension cards, history timeline

---

## Timeline Components

### TimelineView (Main)
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/TimelineView.tsx`
- **Purpose:** Main timeline view with multiple view modes
- **View Modes:** List, Grouped, Calendar, Board
- **Imports:**
  - ListView
  - GroupedView
  - CalendarView
  - BoardView
  - QuickEntryForm
  - BulkImportModal
- **Features:** 4 view modes, advanced filters, search, bulk import, quick entry

### ListView
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/ListView.tsx`
- **Purpose:** List view of timeline events

### GroupedView
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/GroupedView.tsx`
- **Purpose:** Grouped view of timeline events (by category/date)

### CalendarView
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/CalendarView.tsx`
- **Purpose:** Calendar-based view of timeline events

### BoardView
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/BoardView.tsx`
- **Purpose:** Kanban/board view of timeline events

### QuickEntryForm
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/QuickEntryForm.tsx`
- **Purpose:** Quick form for adding timeline events

### BulkImportModal
- **Path:** `/Users/sriharsha/myra-status-dashboard/components/timeline/BulkImportModal.tsx`
- **Purpose:** Modal for bulk importing timeline events

---

## Inline Components (Defined in Main Page)

### Modal Component
- **Location:** `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx` (lines 958-975)
- **Purpose:** Generic modal wrapper
- **Props:** title, children, onClose

### UsersTab Component
- **Location:** `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx` (lines 816-897)
- **Purpose:** Users display (legacy, now integrated in PeopleEngagementTab)

### DetailsTab Component
- **Location:** `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx` (lines 901-955)
- **Purpose:** Organization details display (legacy)

---

## Related Components (Used in Modals)

### MentionTextEditor
- **Purpose:** Rich text editor used in multiple modals
- **Used in:**
  - AddSupportQueryModal (Description field)
  - UpdateDealStatusModal (Deferred Reason, Additional Notes)

### UpdatesTab
- **Purpose:** User activity logs display
- **Used in:** PeopleEngagementTab (User Activity section)

---

## API Routes

### Account Managers API
- **Path:** `/Users/sriharsha/myra-status-dashboard/app/api/account-managers`
- **Purpose:** Fetch list of account managers
- **Used in:** Edit Org Modal, TimelineView filters

### Trial APIs
- **Path:** `/Users/sriharsha/myra-status-dashboard/app/api/trials/*`
- **Routes:**
  - `/api/trials/calculate-scores/route.ts`
  - `/api/trials/review-queue/route.ts`
  - `/api/trials/bulk-operations/*`
  - `/api/trials/smart-import/route.ts`
  - `/api/trials/save-parsed/route.ts`
  - `/api/trials/parse-text/route.ts`

---

## Database Tables

### Primary Tables (Used in Modals)
1. **trial_organizations** - Main org data
2. **trial_users** - Users in trial org
3. **trial_engagement_log** - Activity logs
4. **trial_support_queries** - Support queries
5. **trial_extensions** - Trial extension history
6. **org_deal_tracking** - Deal tracking info

### Related Tables (Cascading Deletes)
7. **meeting_notes** - Meeting records
8. **demo_events** - Demo tracking
9. **user_progress_metrics** - User metrics
10. **user_activities** - User activity tracking
11. **user_topics** - User topics
12. **user_issues** - User issues
13. **user_interactions** - User interactions

---

## Key Dependencies

### External Libraries
- `react-hot-toast` - Toast notifications
- `lucide-react` - Icons
- `date-fns` - Date formatting and calculations
- `framer-motion` - Animations (in timeline components)

### Internal Utilities
- `@/lib/supabase/client` - Supabase client
- `@/hooks/useAuth` - Authentication hook
- `@/lib/api-client` - Authenticated fetch wrapper
- `@/components/Avatar` - Avatar component
- `@/components/Breadcrumbs` - Breadcrumb navigation
- `@/components/LoadingState` - Loading indicator
- `@/components/MentionTextEditor` - Rich text editor

---

## File Sizes and Line Counts

| File | Type | Approx Lines | Size |
|------|------|--------------|------|
| [id]/page.tsx | Page | 976 | 30KB |
| OverviewTab.tsx | Component | 405 | 12KB |
| PeopleEngagementTab.tsx | Component | 242 | 7KB |
| UnifiedTimelineTab.tsx | Component | 29 | 1KB |
| SupportQueriesTab.tsx | Component | 296 | 9KB |
| LogActivityModal.tsx | Modal | 191 | 6KB |
| AddSupportQueryModal.tsx | Modal | 316 | 10KB |
| DeleteOrganizationModal.tsx | Modal | 281 | 9KB |
| AddTrialExtensionModal.tsx | Modal | 236 | 7KB |
| UpdateDealStatusModal.tsx | Modal | 406 | 13KB |
| TrialExtensionsTab.tsx | Component | 227 | 7KB |
| TimelineView.tsx | Component | 300+ | 10KB+ |

---

## Quick Navigation

To test a specific feature, use this mapping:

| Feature | Component File | Modal File |
|---------|---|---|
| Edit Organization | [id]/page.tsx | In-page Modal |
| Add/Edit User | PeopleEngagementTab | In-page Modal |
| Delete Organization | [id]/page.tsx | DeleteOrganizationModal |
| Log Activity | UnifiedTimelineTab | LogActivityModal |
| Log Support Query | SupportQueriesTab | AddSupportQueryModal |
| Extend Trial | OverviewTab | AddTrialExtensionModal |
| Update Deal Status | OverviewTab | UpdateDealStatusModal |
| Timeline View | UnifiedTimelineTab | TimelineView + sub-components |

