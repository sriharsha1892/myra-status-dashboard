# Component Analysis Summary

This folder contains comprehensive documentation about the `FeatureRequestsTab` and `ProductRoadmapTabEnhanced` components, including their current structure, data handling, and recommended approach for implementing cross-linking features.

## Documents Included

### 1. **COMPONENT_ANALYSIS.md** (Main Document)
Detailed analysis covering:
- Component structure and data fields
- Current database schema
- Data fetching patterns
- Display logic and UI components
- Existing linking infrastructure (ticket_links pattern)
- Three options for implementing feature-roadmap linking
- Component-level vs page-level integration strategies
- Complete querying patterns
- Status compatibility matrix
- Key considerations and recommendations
- Implementation roadmap with phases

**Best for**: In-depth understanding of both components and detailed implementation planning

### 2. **ARCHITECTURE_SUMMARY.txt** (Visual Reference)
ASCII diagrams and visual layouts showing:
- Current architecture and page flow
- Component hierarchy
- Database schema visualizations
- Proposed linking architecture (Option A: Junction Table)
- Component enhancement plan with mockups
- Data flow illustrations
- Feature request lifecycle
- Status compatibility matrix
- Implementation checklist with phases
- Key takeaways

**Best for**: Quick visual understanding, presentations, and planning discussions

### 3. **QUICK_REFERENCE.md** (Lookup Guide)
Quick lookup information:
- Component file locations
- Data field tables
- Status/priority options with icons
- Component props
- Available filters and views
- Bulk action capabilities
- Current query syntax
- Current limitations
- Proposed enhancement approach
- TypeScript interface updates
- Query examples
- Performance tips
- Testing checklist

**Best for**: Quick lookups during development and implementation

## What You'll Learn

### About FeatureRequestsTab
- Displays customer feature requests in a card-list view
- Supports 7 different statuses (submitted → completed)
- Filterable by status and sortable by votes or date
- Shows priority badges, vote counts, and product responses
- Located at `/components/FeatureRequestsTab.tsx`

### About ProductRoadmapTabEnhanced
- Displays product roadmap items with multiple view options
- Three views: List, Kanban, and Timeline
- Supports 4 statuses and priority filtering
- Includes bulk action capabilities
- Supports target date and completion tracking
- Located at `/components/ProductRoadmapTabEnhanced.tsx`

### Current Situation
- **No linking** between feature requests and roadmap items
- Both tables are completely independent
- Both use org_id for organization scoping
- Similar status/priority enums (partially overlapping)

### Recommended Solution
- Create a `feature_roadmap_links` junction table
- Support many-to-many relationships (follows existing ticket_links pattern)
- Add UI to display linked items in both components
- Implement linking through dedicated modals
- Only allow linking for appropriate statuses (planned, in_progress, completed)

## Implementation Path

### Phase 1: Database
Create junction table with foreign keys, indexes, and RLS policies

### Phase 2: Component Updates
Update Supabase queries to fetch linked data and display in UI

### Phase 3: Modals & Interactions
Create linking/unlinking modals and integrate with existing modals

### Phase 4: Navigation & UX
Add cross-navigation and breadcrumbs between linked items

## Key Files to Modify
```
NEW:
  - supabase/migrations/[timestamp]_feature_roadmap_links.sql
  - components/LinkFeatureRoadmapModal.tsx

MODIFY:
  - components/FeatureRequestsTab.tsx
  - components/ProductRoadmapTabEnhanced.tsx
  - app/support/trials/features/page.tsx
  - app/support/trials/roadmap/page.tsx
```

## Navigation

Start with:
1. **QUICK_REFERENCE.md** - Get oriented with key info
2. **ARCHITECTURE_SUMMARY.txt** - Understand the visual layout
3. **COMPONENT_ANALYSIS.md** - Deep dive into specific areas

## Status Compatibility for Linking

| Feature Status | Can Link? | Notes |
|---|---|---|
| submitted | ✗ | Too early - not approved |
| reviewed | ✗ | Decision pending |
| **planned** | ✓ | Ready for roadmap |
| **in_progress** | ✓ | Currently being developed |
| **completed** | ✓ | Already shipped |
| rejected | ✗ | Won't be built |
| duplicate | ✗ | Primary feature should be linked |

## Data Flow Example

```
Customer submits feature request (submitted)
    ↓
Product team reviews (reviewed)
    ↓
Feature accepted for roadmap (planned) ← LINK HERE
    ↓
Creates/links roadmap item
    ↓
Development begins (in_progress)
    ↓
Feature released (completed)
```

## Component Structure Overview

```
Features Page (/support/trials/features)
└── FeatureRequestsTab
    ├── Query: feature_requests table
    ├── Filter: By status (7 options)
    ├── Sort: By votes or created_at
    └── Display: Card-list view

Roadmap Page (/support/trials/roadmap)
└── ProductRoadmapTabEnhanced
    ├── Query: org_product_roadmap table
    ├── Filter: By status + priority
    ├── Views: List, Kanban, Timeline
    └── Actions: Bulk update/delete
```

## Tables Overview

### feature_requests
- 14 fields including status, priority, votes
- 7 status options
- Links to: trial_organizations, trial_users

### org_product_roadmap
- 11 fields including status, priority, target dates
- 4 status options
- Links to: trial_organizations

### Proposed: feature_roadmap_links (NEW)
- 5 fields for linking two tables
- Many-to-many relationship
- Includes link_type and tracking info

## Performance Considerations

- Add indexes on org_id, status, and foreign keys
- Use lazy loading for linked feature lists
- Cache link counts at component level
- Paginate if showing many linked items

## Testing Guidance

- Verify junction table and RLS policies work
- Test bidirectional linking (feature→roadmap and vice versa)
- Validate status compatibility rules
- Test cascade deletes
- Verify UI updates on link changes

## Related Patterns in Codebase

- **ticket_links** table (003_notifications_and_links.sql) - Similar junction table pattern
- **ResearchActionsTab** - Similar component structure
- **SupportQueriesTab** - Similar filtering and modal patterns

## Questions to Answer Before Implementation

1. Should users link features manually or auto-link when status changes?
2. Do we need link_type customization or just track "addresses"?
3. Should deleting a feature remove the roadmap link?
4. Do we need notification when features are linked/unlinked?
5. Should we show link count/list by default or only on expand?
6. Do we need historical audit trail of link changes?

## Next Steps

1. Review ARCHITECTURE_SUMMARY.txt for the big picture
2. Check COMPONENT_ANALYSIS.md section 5 for linking options
3. Discuss with team which option (A, B, or C) is best
4. Use QUICK_REFERENCE.md as your coding reference
5. Start with database migration (Phase 1)
6. Gradually implement each phase

---

**Last Updated**: November 4, 2024
**Status**: Analysis Complete - Ready for Implementation Planning
**Format**: Markdown + ASCII Art
**Scope**: Two components + 2 pages + database schema + linking strategy

