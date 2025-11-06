# Quick Reference: FeatureRequestsTab & ProductRoadmapTabEnhanced

## Component Locations
- **FeatureRequestsTab**: `/components/FeatureRequestsTab.tsx`
- **ProductRoadmapTabEnhanced**: `/components/ProductRoadmapTabEnhanced.tsx`
- **Features Page**: `/app/support/trials/features/page.tsx`
- **Roadmap Page**: `/app/support/trials/roadmap/page.tsx`

## Data Fields at a Glance

### Feature Request Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Auto-generated |
| org_id | UUID | Yes | Organization link |
| user_id | UUID | No | Customer who submitted |
| title | Text | Yes | Feature name |
| description | Text | Yes | What and why |
| use_case | Text | No | Business value |
| status | Enum | Yes | 7 options (see below) |
| priority | Enum | Yes | 4 levels |
| votes | Integer | Yes | Default: 0 |
| product_response | Text | No | Team's response |
| expected_availability_date | Date | No | When it'll be released |
| created_at | Timestamp | Auto | |
| updated_at | Timestamp | Auto | |

### Roadmap Item Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Auto-generated |
| org_id | UUID | Yes | Organization link |
| title | Text | Yes | Item name |
| description | Text | No | Details |
| status | Enum | Yes | 4 options (see below) |
| priority | Enum | Yes | 4 levels |
| target_date | Date | No | Target release |
| estimated_completion_date | Date | No | Estimated date |
| created_by | Text | No | Who created it |
| created_at | Timestamp | Auto | |
| updated_at | Timestamp | Auto | |

## Status Options

### Feature Request Statuses (7)
```
submitted     → Customer submitted, waiting for review
reviewed      → Product team reviewed
planned       → Accepted for roadmap
in_progress   → Currently being developed
completed     → Released/Shipped
rejected      → Won't be built
duplicate     → Already exists elsewhere
```

### Roadmap Item Statuses (4)
```
planned       → Future work
in_progress   → Currently being built
completed     → Finished and released
cancelled     → No longer planned
```

## Component Props

### FeatureRequestsTab
```typescript
interface FeatureRequestsTabProps {
  orgId: string;  // Required - which organization's features to show
}
```

### ProductRoadmapTabEnhanced
```typescript
interface ProductRoadmapTabEnhancedProps {
  orgId: string;  // Required - which organization's roadmap to show
}
```

## Available Filters & Views

### FeatureRequestsTab
- **Filtering**: By status (All, Submitted, Reviewed, Planned, In Progress, Completed, Rejected, Duplicate)
- **Sorting**: By votes (descending) or by date (descending)
- **View Type**: Single card/list view

### ProductRoadmapTabEnhanced
- **Filtering**: By status AND priority (can combine both)
- **Sorting**: By target date (automatic in timeline view)
- **View Types**: 
  1. **List View** - Cards with checkboxes
  2. **Kanban View** - 4-column status board
  3. **Timeline View** - Chronological by target_date

## Bulk Actions (Roadmap Only)

In **List View**, you can:
1. Select multiple items with checkboxes
2. **Change Status** - Move multiple items to new status
3. **Change Priority** - Update priority for multiple items
4. **Delete** - Remove multiple items (with confirmation)

## Tables & Queries

### Current Query: FeatureRequestsTab
```typescript
supabase
  .from('feature_requests')
  .select('*')
  .eq('org_id', orgId)
  .order(sortBy === 'votes' ? 'votes' : 'created_at', { ascending: false })
```

### Current Query: ProductRoadmapTabEnhanced
```typescript
supabase
  .from('org_product_roadmap')
  .select('*')
  .eq('org_id', orgId)
  .order('target_date', { ascending: true, nullsFirst: false })
```

## Current Limitations (No Linking)

- Features and roadmap items are **completely independent**
- No way to see which features are addressed by which roadmap items
- No historical tracking of feature→roadmap connections
- No cross-navigation between the two sections

## Proposed Enhancement: Linking

### Best Implementation Approach
1. Create `feature_roadmap_links` junction table
2. Support many-to-many relationships
3. Add UI to show linked items in both views
4. Implement in separate modals (LinkFeatureRoadmapModal)

### Where Links Make Sense
```
Feature Status          Can Link?    Reason
submitted               ✗            Not approved yet
reviewed                ✗            Decision pending
planned                 ✓            YES - Ready for roadmap
in_progress             ✓            YES - In development
completed               ✓            YES - Already shipped
rejected                ✗            Won't be built
duplicate               ✗            Shouldn't link
```

## UI Icons Reference

### Feature Status Icons
- 📬 Submitted
- 👀 Reviewed
- 📋 Planned
- 🚀 In Progress
- ✅ Completed
- ❌ Rejected
- ⚡ Duplicate

### Roadmap Status Icons
- 📋 Planned
- 🚀 In Progress
- ✅ Completed
- ⛔ Cancelled

### Priority Icons
- 🟢 Low
- 🟡 Medium
- 🔴 High
- 🚨 Critical

## Key Files to Modify for Linking Feature

```
supabase/migrations/
  [NEW] [timestamp]_feature_roadmap_links.sql
  
components/
  FeatureRequestsTab.tsx          [MODIFY] - Update query + UI
  ProductRoadmapTabEnhanced.tsx   [MODIFY] - Update query + UI
  [NEW] LinkFeatureRoadmapModal.tsx
  AddFeatureRequestModal.tsx      [OPTIONAL] - Add linking option
  AddRoadmapItemModal.tsx         [OPTIONAL] - Add linking option

app/support/trials/
  features/page.tsx               [MODIFY] - Add link handlers
  roadmap/page.tsx                [MODIFY] - Add link handlers
```

## TypeScript Interface Updates (For Linking)

### FeatureRequest with Link
```typescript
interface FeatureRequest {
  // ... existing fields
  linked_roadmap_item?: {
    id: string;
    title: string;
    status: string;
    target_date?: string;
  };
}
```

### RoadmapItem with Links
```typescript
interface RoadmapItem {
  // ... existing fields
  linked_feature_requests?: Array<{
    id: string;
    title: string;
    priority: string;
    votes: number;
    status: string;
  }>;
}
```

## Query Examples

### Get Feature with Linked Roadmap (After Implementation)
```typescript
const { data } = await supabase
  .from('feature_requests')
  .select(`
    *,
    roadmap_item:linked_roadmap_item_id(
      id, title, status, target_date
    )
  `)
  .eq('id', featureId)
  .single();
```

### Get Roadmap Item with Linked Features
```typescript
const { data } = await supabase
  .from('org_product_roadmap')
  .select(`
    *,
    linked_features:feature_roadmap_links(
      feature_requests(id, title, priority, votes)
    )
  `)
  .eq('id', roadmapId)
  .single();
```

## Performance Tips

1. **Indexes**: Create indexes on:
   - `feature_requests.org_id`
   - `feature_requests.status`
   - `feature_requests.votes` (DESC)
   - `org_product_roadmap.org_id`
   - `org_product_roadmap.target_date`
   - `feature_roadmap_links.feature_request_id`
   - `feature_roadmap_links.roadmap_item_id`

2. **Lazy Loading**: Load linked features on demand (hover/expand)

3. **Caching**: Use `useMemo` to cache link counts

4. **Pagination**: If linking many features, paginate the list

## Related Files

- RLS Policies: See `20250103_roadmap_features_followup.sql`
- Existing Link Pattern: Check `003_notifications_and_links.sql` (ticket_links table)
- Similar Components: ResearchActionsTab, SupportQueriesTab

## Testing Checklist

When implementing linking:
- [ ] Junction table created and migrations run
- [ ] RLS policies allow org-level access
- [ ] Feature→roadmap links work bidirectionally
- [ ] Roadmap→features links show correct counts
- [ ] Unlinking works and cleans up database
- [ ] Status validation (only link valid statuses)
- [ ] No duplicate links created
- [ ] Delete cascade works (deleting either item breaks link)
- [ ] UI updates when links change
- [ ] Mobile view shows links properly

## Status Code References

All status values are **string enums**:

Feature Requests:
```typescript
type FeatureStatus = 
  'submitted' | 'reviewed' | 'planned' | 
  'in_progress' | 'completed' | 'rejected' | 'duplicate';
```

Roadmap Items:
```typescript
type RoadmapStatus = 
  'planned' | 'in_progress' | 'completed' | 'cancelled';
```

Priority (both):
```typescript
type Priority = 'low' | 'medium' | 'high' | 'critical';
```

## Common Patterns in Codebase

### Filtering with Supabase
```typescript
let query = supabase.from('table').select('*').eq('org_id', orgId);
if (filterStatus) query = query.eq('status', filterStatus);
const { data } = await query;
```

### Color Mapping
```typescript
const getStatusColor = (status: string) => {
  const config = STATUS_CONFIG[status];
  return `text-${config.color}-600 bg-${config.color}-50`;
};
```

### Toast Notifications
```typescript
import toast from 'react-hot-toast';
toast.success('Action completed');
toast.error('Something went wrong');
```

## Resources

- Database Schema: `supabase/migrations/20250103_roadmap_features_followup.sql`
- Ticket Links Pattern: `supabase/migrations/003_notifications_and_links.sql`
- Component Examples: TrialUsersTab, ResearchActionsTab
- Page Examples: `/app/support/trials/[id]/page.tsx`

