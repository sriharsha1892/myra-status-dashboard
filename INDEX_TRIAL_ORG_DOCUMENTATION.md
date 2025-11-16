# Index - Trial Organization Page Documentation

This index guides you to all documentation about the actual forms, modals, and interactive features in the trial organization detail pages.

## Quick Start

1. **New to this codebase?** Start with:
   - `ACTUAL_TRIAL_ORG_FEATURES.md` - Overview of all features

2. **Ready to write E2E tests?** Use:
   - `E2E_TESTING_QUICK_REFERENCE.md` - Test scenarios and UI elements

3. **Need to find code?** Reference:
   - `COMPLETE_FILE_REFERENCE.md` - File locations and structure
   - `TRIAL_ORG_COMPONENT_PATHS.md` - Component file paths

---

## Documentation Files Overview

### 1. ACTUAL_TRIAL_ORG_FEATURES.md (11KB, 398 lines)
Comprehensive feature catalog including:
- 8 actual modals with all fields and validation rules
- 4 tabs with subsections and interactive elements
- Button locations and exact text labels
- Form validation rules (required fields, constraints)
- Database tables used and their relationships
- Key insights for E2E testing

**Best for:** Understanding the complete feature set

---

### 2. E2E_TESTING_QUICK_REFERENCE.md (8.9KB, 273 lines)
Step-by-step testing guide including:
- 8 test scenarios with detailed steps
- Form validation test cases
- UI elements checklist
- Expected toast messages
- Error scenarios to test
- Common test assertions

**Best for:** Writing E2E tests immediately

---

### 3. COMPLETE_FILE_REFERENCE.md (9.5KB, 277 lines)
Technical architecture document including:
- File organization and structure
- Component purposes and imports
- Modal component specifications
- Timeline component details
- Database tables and relationships
- External dependencies
- File sizes and line counts
- Quick navigation map

**Best for:** Understanding code structure and dependencies

---

### 4. TRIAL_ORG_COMPONENT_PATHS.md (2.9KB, 55 lines)
Quick file path reference including:
- Main page file path
- Tab component paths
- Modal component paths
- Support component paths
- Timeline component paths
- API routes
- Key dependencies

**Best for:** Quick lookups during development

---

## File Organization Map

```
/Users/sriharsha/myra-status-dashboard/
├── Documentation Files (NEW)
│   ├── ACTUAL_TRIAL_ORG_FEATURES.md
│   ├── E2E_TESTING_QUICK_REFERENCE.md
│   ├── COMPLETE_FILE_REFERENCE.md
│   ├── TRIAL_ORG_COMPONENT_PATHS.md
│   └── INDEX_TRIAL_ORG_DOCUMENTATION.md (this file)
│
├── app/support/trials/
│   └── [id]/
│       └── page.tsx (main component, 976 lines)
│
├── components/
│   ├── OverviewTab.tsx
│   ├── PeopleEngagementTab.tsx
│   ├── UnifiedTimelineTab.tsx
│   ├── SupportQueriesTab.tsx
│   ├── LogActivityModal.tsx
│   ├── AddSupportQueryModal.tsx
│   ├── DeleteOrganizationModal.tsx
│   ├── AddTrialExtensionModal.tsx
│   ├── UpdateDealStatusModal.tsx
│   ├── TrialExtensionsTab.tsx
│   └── timeline/
│       ├── TimelineView.tsx
│       ├── ListView.tsx
│       ├── GroupedView.tsx
│       ├── CalendarView.tsx
│       ├── BoardView.tsx
│       ├── QuickEntryForm.tsx
│       └── BulkImportModal.tsx
│
└── app/api/
    └── trials/ (various API routes)
```

---

## Features at a Glance

### Modals (8 Total)
| Modal | Trigger | Location | Fields | DB Table |
|-------|---------|----------|--------|----------|
| Edit Organization | "Edit Details" | Header | 10 fields | trial_organizations |
| Add User | "Add Contact" | People & Engagement | 5 fields | trial_users |
| Edit User | Edit button | User cards | 5 fields | trial_users |
| Delete Organization | "Delete Organization" | Header | 3-step confirmation | trial_organizations |
| Log Activity | "+" button | Activity & Insights | 8 type options | trial_engagement_log |
| Log Support Query | "Log Query" | Support & Success | 6 type options | trial_support_queries |
| Extend Trial | "Extend Trial" | Overview | Quick buttons + custom | trial_extensions |
| Update Deal Status | "Update Status" | Overview | 5 status options | org_deal_tracking |

### Tabs (4 Total)
| Tab | Purpose | Key Features |
|-----|---------|--------------|
| Overview | Trial health & status | Dashboard, quick actions, deal tracking, extensions |
| People & Engagement | Contact management | Contact grid, edit/delete, user activity |
| Activity & Insights | Timeline & events | 4 view modes, advanced filters, search |
| Support & Success | Support tracking | Query list, status updates, filtering |

### Buttons (15+)
- Header: "Edit Details", "Delete Organization"
- Overview: "Update Status", "Extend Trial", "View All"
- People: "Add Contact"
- Activity: "+", "Upload"
- Support: "Log Query"
- Plus modal action buttons

---

## How to Use This Documentation

### For Feature Understanding
1. Read `ACTUAL_TRIAL_ORG_FEATURES.md` top to bottom
2. Focus on the section for your area of interest
3. Note the button text, field names, and validation rules

### For E2E Test Writing
1. Open `E2E_TESTING_QUICK_REFERENCE.md`
2. Find the test scenario you want to write
3. Follow the step-by-step instructions
4. Reference the form validation and UI elements sections
5. Use the toast messages and error scenarios for assertions

### For Code Development
1. Use `COMPLETE_FILE_REFERENCE.md` to understand architecture
2. Use `TRIAL_ORG_COMPONENT_PATHS.md` for quick file lookups
3. Check the main page: `/Users/sriharsha/myra-status-dashboard/app/support/trials/[id]/page.tsx`
4. Reference component imports to find dependencies

### For Debugging
1. Use `COMPLETE_FILE_REFERENCE.md` to locate the right file
2. Check the component's database table in `ACTUAL_TRIAL_ORG_FEATURES.md`
3. Verify expected behavior in `E2E_TESTING_QUICK_REFERENCE.md`
4. Check dependencies and imports in `COMPLETE_FILE_REFERENCE.md`

---

## Key Points to Remember

1. **All features are real, not imaginary**
   - Every modal, button, and field mentioned is in the actual code
   - All are tested against actual source files

2. **Features are organized in 4 tabs**
   - Not scattered randomly
   - Each tab has clear purpose and features

3. **8 modals provide main functionality**
   - 2 inline modals in main page
   - 5 standalone modal components
   - 1 complex timeline view

4. **Rich text editing exists**
   - Some description fields use MentionTextEditor
   - Supports formatted input and mentions

5. **Validation is implemented**
   - All required fields enforced
   - Date range validation
   - Confirmation text matching for deletion

6. **Database operations are comprehensive**
   - 6 primary tables involved
   - 7 related tables with cascading deletes
   - All CRUD operations implemented

---

## Search Tips

### If you need to find:
- **A specific button**: Search `ACTUAL_TRIAL_ORG_FEATURES.md` for button text
- **Modal fields**: Look in the modal section in `ACTUAL_TRIAL_ORG_FEATURES.md`
- **Component file path**: Use `TRIAL_ORG_COMPONENT_PATHS.md` or `COMPLETE_FILE_REFERENCE.md`
- **Test steps**: See `E2E_TESTING_QUICK_REFERENCE.md`
- **Database table**: Search `ACTUAL_TRIAL_ORG_FEATURES.md` for "Database Table"
- **Validation rules**: See "Form Validation Rules" section in `ACTUAL_TRIAL_ORG_FEATURES.md`
- **Toast messages**: Check `E2E_TESTING_QUICK_REFERENCE.md` "Toast Messages to Expect"
- **Dependencies**: See `COMPLETE_FILE_REFERENCE.md` "Key Dependencies"

---

## Related Pages

These docs focus on:
- Trial organization detail page: `/support/trials/[id]`

Other trial-related pages you may find in:
- `/support/trials/` - Organization list
- `/support/trials/demos` - Demo tracking
- `/support/trials/follow-ups` - Follow-up management
- `/support/trials/meetings` - Meeting logs
- `/support/trials/parse` - AI parser
- And others listed in QUICK_REFERENCE

---

## Document Creation Date
November 15, 2025

## Last Updated
November 15, 2025

## Version
1.0 - Initial comprehensive documentation

---

## Questions?

Reference these in order:
1. `ACTUAL_TRIAL_ORG_FEATURES.md` - "What features exist?"
2. `E2E_TESTING_QUICK_REFERENCE.md` - "How do I test this?"
3. `COMPLETE_FILE_REFERENCE.md` - "Where is this code?"
4. Source files themselves - Ultimate truth

