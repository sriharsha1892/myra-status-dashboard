# E2E Testing Quick Reference - Trial Organization Pages

## Real Features Exist - Not Imaginary

### Modal Forms You Can Test (8 Total)

| # | Modal Name | Trigger Button | Location | Key Fields | DB Table |
|---|---|---|---|---|---|
| 1 | Edit Organization | "Edit Details" | Header | Name, Domain, AM, Lifecycle Stage, Dates, URL, Logo, POC, Description | trial_organizations |
| 2 | Add User | "Add Contact" | People & Engagement tab | Name*, Email*, Role, Stage, Freshsales URL | trial_users |
| 3 | Edit User | Edit (on user card) | People & Engagement tab | Name*, Email*, Role, Stage, Freshsales URL | trial_users |
| 4 | Delete Organization | "Delete Organization" | Header | 3-step confirmation + typed confirmation | trial_organizations + cascading |
| 5 | Log Activity | "+" button | Activity & Insights header | Type*, User, Description*, Observations | trial_engagement_log |
| 6 | Log Support Query | "Log Query" | Support & Success tab | Type*, Title*, Desc, Level, User (conditional) | trial_support_queries |
| 7 | Extend Trial | "Extend Trial" | Overview tab (in Trial Extensions) | Days (7/14/30/custom)*, Reason | trial_extensions |
| 8 | Update Deal Status | "Update Status" | Overview tab (Deal widget) | Status*, conditional fields (Deal Value/Loss Reason/Deferred Date) | org_deal_tracking |

---

## Quick Test Scenarios

### Test 1: Edit Organization Details
```
1. Navigate to trial org detail page
2. Click "Edit Details" button in header
3. Modify Organization Name, Domain, Account Manager, Lifecycle Stage
4. Update Trial dates and optional fields
5. Click "Save Changes"
6. Verify changes persisted
```

### Test 2: Add Contact to Organization
```
1. Go to "People & Engagement" tab
2. Click "Add Contact" button
3. Fill: Name (required), Email (required), Role, Stage, Freshsales URL
4. Click "Add User"
5. Verify user appears in grid
6. Check in UpdatesTab for activity
```

### Test 3: Log Activity
```
1. Go to "Activity & Insights" tab
2. Click "+" button
3. Select Activity Type from 8 options:
   - User Logged In
   - Usage Observed
   - Feedback Received
   - Learning Captured
   - Follow-up Note
   - Trial Access Provided
   - Trial Access Requested
   - Trial Extended
4. Fill Description (required)
5. Optional: Select User, add Observations
6. Click "Log Activity"
7. Verify appears in timeline
```

### Test 4: Create Support Query
```
1. Go to "Support & Success" tab
2. Click "Log Query" button
3. Select Query Type (6 options: General, Security, Functionality, Onboard More, Technical, Other)
4. Enter Query Title (required)
5. Add Description (optional)
6. Choose level: Organization or User
7. If User level, select specific user
8. Click "Log Query"
9. Verify query appears with "Open" status
10. Test inline status change dropdown
```

### Test 5: Extend Trial Period
```
1. Go to "Overview" tab
2. Scroll to "Trial Extensions" section
3. Click "Extend Trial" button
4. See current expiry date
5. Click quick button (7, 14, or 30 days) OR enter custom days
6. Verify "New Expiry Date" updates
7. Optional: Add reason
8. Click "Extend by X Days"
9. Verify extension added to history
10. Verify organization trial_expiry_date updated
```

### Test 6: Update Deal Status
```
1. Go to "Overview" tab (only if deal exists)
2. Scroll to "Deal Status" widget
3. Click "Update Status"
4. Select status:
   - Prospect (initial stage)
   - Negotiating (active negotiation)
   - Won (closed) -> requires Final Deal Value
   - Lost (didn't close) -> requires Loss Reason
   - Deferred (postponed) -> requires Reason + Follow-up Date
5. Fill conditional fields based on status
6. Optional: Add Opportunity Value, Notes
7. Click "Update Deal Status"
8. Verify status persisted and widget updates
```

### Test 7: Delete Organization (Multi-step)
```
Step 1: Confirmation
1. Click "Delete Organization" button
2. Review what will be deleted (users, activities, demos, etc.)
3. Click "Continue"

Step 2: Warning
4. Read final warning
5. Click "Proceed"

Step 3: Confirmation Text
6. See required text: "DELETE [OrgName]"
7. Type exact text in input
8. Verify "Confirmation text matches" message
9. Click "Delete Permanently"
10. Verify redirect to trials list
```

### Test 8: Timeline Features (Activity & Insights Tab)
```
1. Go to "Activity & Insights" tab
2. Test View Modes: List, Grouped, Calendar, Board
3. Search for events
4. Apply filters:
   - Event Categories (7 types)
   - Sentiment (Positive, Neutral, Negative)
   - Severity (Low, Medium, High, Critical)
   - Date Range
5. Quick Entry (+) button
6. Bulk Import button
7. Close AI banner
```

---

## Form Validation to Test

### Required Fields
- Organization Name (Edit Org)
- Domain (Edit Org)
- Account Manager (Edit Org)
- Trial Start/End dates (Edit Org)
- User Name & Email (Add/Edit User)
- Activity Type & Description (Log Activity)
- Query Title & Type (Log Support Query)
- Extend By Days (Extend Trial) - default 7, min 1, max 90
- Deal Status (Update Deal)
- Deal Value (if status = Won)
- Loss Reason (if status = Lost)
- Deferred Reason & Date (if status = Deferred)

### Field Types
- Text inputs: Organization Name, Sales POC, URLs
- Date pickers: Trial dates, Expected Follow-up
- Dropdowns: Domain, Lifecycle Stage, Account Manager, User Stage, Query Type, Loss Reason, Currency
- Textareas: Description, Observations, Deferred Reason, Notes
- Radio buttons: Query Level (Org/User), Deal Status
- Rich text editor: Support Query Description, Deal Deferred Reason, Additional Notes
- Grid selection: Activity Type (8 visual options)

---

## Database Tables to Verify

After each test, verify data in:
- `trial_organizations` - Main org record
- `trial_users` - Users in org
- `trial_engagement_log` - Activity logs
- `trial_support_queries` - Support queries with status
- `trial_extensions` - Trial extension records
- `org_deal_tracking` - Deal status and value

---

## UI Elements to Test

### Buttons (should exist)
- Header: "Edit Details", "Delete Organization"
- Overview: "Update Status" (conditional), "Extend Trial"
- People: "Add Contact"
- Activity: "+" (Quick Entry), "Upload" (Bulk Import)
- Support: "Log Query"

### Dropdowns (should have options)
- Domain: AAD, AF&B, E&C, HC, NEO, TMT, Unassigned
- Lifecycle Stage: prospect, trial_pending, trial_active, trial_expired, customer, lost
- User Stage: invited, low_activity, active, power_user, dormant
- Query Type: 6 types
- Query Level: Organization Level, User Level
- Deal Status: 5 options with icons
- Loss Reasons: 10 predefined + Other option
- Currency: USD, EUR, GBP, INR, AUD

### Cards/Displays
- People cards: Avatar, Name, Email, Role badge, Stage badge, Active User badge
- Support Query cards: Type badge, Level indicator, Title, Description, Created date, Status dropdown
- Trial Extension cards: Number, Extension days, Date range, Reason (if provided)
- Deal Status widget: Current status, Values, Follow-up date (if deferred)

### Empty States
- No users: "No contacts yet" + "Add First Contact"
- No queries: "No support queries"
- No extensions: "No trial extensions"

---

## Toast Messages to Expect

- "Organization updated successfully"
- "User added/updated successfully"
- "User deleted successfully"
- "Activity logged successfully"
- "Support query logged successfully"
- "Trial extended by X days successfully"
- "Deal status updated to [Status]"
- "Organization deleted successfully"
- "Query status updated to [Status]"

---

## Error Scenarios to Test

- Submit form with missing required fields
- Type incorrect confirmation text in delete modal
- Try to set trial end date before start date
- Add user with duplicate email
- Update deal status to "Won" without final deal value
- Update deal status to "Lost" without loss reason
- Update deal status to "Deferred" without follow-up date
- Invalid URL formats (logo, org URL, freshsales)
- Extend trial beyond reasonable limit (>90 days)

---

## Key Component Files to Reference

- Main Page: `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx`
- Modals: See `TRIAL_ORG_COMPONENT_PATHS.md` for all modal files
- Tab Components: OverviewTab, PeopleEngagementTab, UnifiedTimelineTab, SupportQueriesTab

---

## Testing Environment Setup

1. Ensure trial organization exists in database
2. Ensure test user has proper authentication
3. Ensure account managers are seeded in `users` table
4. Use Supabase client directly to verify data persistence
5. Check browser console for errors during modal operations
6. Verify react-hot-toast notifications appear and disappear

---

## Common Test Assertions

```
- Modal should be visible when button clicked
- Modal should close when "Cancel" or "X" is clicked
- Form data should be sent to correct database table
- Success toast should appear after submission
- Page should refresh/reload after successful operation
- Validation errors should appear for required fields
- Dropdown values should match database enum values
- Rich text editor should accept formatted input
- Date pickers should work on all browsers
- Modal overlay should prevent background interaction
```
