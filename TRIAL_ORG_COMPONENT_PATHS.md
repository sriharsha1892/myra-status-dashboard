# Component File Paths - Trial Organization Page

## Main Page Component
- **Detail Page:** `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx`

## Tab Components
- **OverviewTab:** `/Users/sriharsha/myra-status-dashboard/components/OverviewTab.tsx`
- **PeopleEngagementTab:** `/Users/sriharsha/myra-status-dashboard/components/PeopleEngagementTab.tsx`
- **UnifiedTimelineTab:** `/Users/sriharsha/myra-status-dashboard/components/UnifiedTimelineTab.tsx`
- **SupportQueriesTab:** `/Users/sriharsha/myra-status-dashboard/components/SupportQueriesTab.tsx`

## Modal Components
- **LogActivityModal:** `/Users/sriharsha/myra-status-dashboard/components/LogActivityModal.tsx`
- **AddSupportQueryModal:** `/Users/sriharsha/myra-status-dashboard/components/AddSupportQueryModal.tsx`
- **DeleteOrganizationModal:** `/Users/sriharsha/myra-status-dashboard/components/DeleteOrganizationModal.tsx`
- **AddTrialExtensionModal:** `/Users/sriharsha/myra-status-dashboard/components/AddTrialExtensionModal.tsx`
- **UpdateDealStatusModal:** `/Users/sriharsha/myra-status-dashboard/components/UpdateDealStatusModal.tsx`

## Support Components
- **TrialExtensionsTab:** `/Users/sriharsha/myra-status-dashboard/components/TrialExtensionsTab.tsx`

## Timeline Components (Activity & Insights)
- **TimelineView:** `/Users/sriharsha/myra-status-dashboard/components/timeline/TimelineView.tsx`
- **ListView:** `/Users/sriharsha/myra-status-dashboard/components/timeline/ListView.tsx`
- **GroupedView:** `/Users/sriharsha/myra-status-dashboard/components/timeline/GroupedView.tsx`
- **CalendarView:** `/Users/sriharsha/myra-status-dashboard/components/timeline/CalendarView.tsx`
- **BoardView:** `/Users/sriharsha/myra-status-dashboard/components/timeline/BoardView.tsx`
- **QuickEntryForm:** `/Users/sriharsha/myra-status-dashboard/components/timeline/QuickEntryForm.tsx`
- **BulkImportModal:** `/Users/sriharsha/myra-status-dashboard/components/timeline/BulkImportModal.tsx`

## Inline Modal Components (in main page)
- **Modal** function: Defined in-page (lines 958-975 of [id]/page.tsx)
- **UsersTab** function: Defined in-page (lines 816-897)
- **DetailsTab** function: Defined in-page (lines 901-955)

## Related Support Components
- **UpdatesTab:** (imported in PeopleEngagementTab, shows user activity)
- **MentionTextEditor:** Used in various modals for rich text (support queries, deal status, etc.)

## API Routes
- **Account Managers API:** `/Users/sriharsha/myra-status-dashboard/app/api/account-managers`
- **Trial API Routes:** `/Users/sriharsha/myra-status-dashboard/app/api/trials/*`

---

## Key Component Dependencies

All modals use:
- `react-hot-toast` - For success/error notifications
- `lucide-react` - For icons
- Supabase client - For database operations
- Authentication hooks - For user context

Rich text editing modals use:
- `MentionTextEditor` - Custom component for rich text with mentions
