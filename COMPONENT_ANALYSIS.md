# Component Structure Analysis: FeatureRequestsTab & ProductRoadmapTabEnhanced

## 1. FEATUREREQUESTSTAB COMPONENT ANALYSIS

### Data Structure (FeatureRequest Interface)
```typescript
interface FeatureRequest {
  id: string;
  org_id: string;
  user_id?: string;
  title: string;
  description: string;
  use_case?: string;
  status: 'submitted' | 'reviewed' | 'planned' | 'in_progress' | 'completed' | 'rejected' | 'duplicate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  votes: number;
  product_response?: string;
  product_responded_at?: string;
  product_responded_by?: string;
  expected_availability_date?: string;
  created_at: string;
  updated_at: string;
}
```

### Component Structure
- **Type**: Card/List hybrid view
- **Layout**: Vertical stack of colored cards
- **Each Card Contains**:
  - Status icon and request title
  - Description text
  - Use case (if available)
  - Priority badge with icon
  - Vote count
  - Product response section (if available)
  - Submission date and expected availability date

### Data Source
- **Table**: `feature_requests`
- **Query Type**: Simple SELECT with filtering
- **Current Query**:
  ```
  SELECT * FROM feature_requests 
  WHERE org_id = ?
  ORDER BY votes/created_at
  ```

### Props Accepted
```typescript
interface FeatureRequestsTabProps {
  orgId: string;
}
```

### Features & Display Logic
1. **Filtering**: By status (7 statuses: submitted, reviewed, planned, in_progress, completed, rejected, duplicate)
2. **Sorting**: By votes (descending) or date (descending)
3. **Display Fields**:
   - Status with icon and color-coded background
   - Priority with icon
   - Vote count with thumbs-up indicator
   - Product response section (expandable/visible when present)
   - Creation date and expected availability date
4. **Add/Manage**: "New Request" button opens AddFeatureRequestModal

### Status Configuration
- 📬 Submitted (blue)
- 👀 Reviewed (purple)
- 📋 Planned (yellow)
- 🚀 In Progress (orange)
- ✅ Completed (green)
- ❌ Rejected (red)
- ⚡ Duplicate (gray)

---

## 2. PRODUCTROADMAPTABENHANCED COMPONENT ANALYSIS

### Data Structure (RoadmapItem Interface)
```typescript
interface RoadmapItem {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date?: string;
  estimated_completion_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

### Component Structure
- **Type**: Multi-view (List, Kanban, Timeline)
- **Views Available**:
  1. **List View**: Card-based vertical layout with checkboxes
  2. **Kanban View**: 4-column layout (Planned, In Progress, Completed, Cancelled)
  3. **Timeline View**: Chronological view sorted by target_date

### Data Source
- **Table**: `org_product_roadmap`
- **Query Type**: SELECT with ordering
- **Current Query**:
  ```
  SELECT * FROM org_product_roadmap
  WHERE org_id = ?
  ORDER BY target_date ASC (nulls last)
  ```

### Props Accepted
```typescript
interface ProductRoadmapTabEnhancedProps {
  orgId: string;
}
```

### Features & Display Logic
1. **View Switching**: Tabs for List, Kanban, Timeline
2. **Filtering**: 
   - By status (4 statuses: planned, in_progress, completed, cancelled)
   - By priority (4 priorities: low, medium, high, critical)
3. **Sorting**: 
   - Timeline view: Auto-sorted by target_date
   - List/Kanban: Filtered by status and priority
4. **Bulk Actions** (List View):
   - Change status for multiple items
   - Change priority for multiple items
   - Delete multiple items
5. **Display Fields in List View**:
   - Status with icon
   - Title with priority badge
   - Description
   - Target date and estimated completion date
   - Selection checkboxes
6. **Display Fields in Kanban View**:
   - Title
   - Priority badge
   - Target date (short format)
7. **Display Fields in Timeline View**:
   - Status and title
   - Target date (full format)
   - Days until/overdue indicator
   - Priority and status badges
8. **Add/Manage**: "Add Item" button opens AddRoadmapItemModal

### Status Configuration
- 📋 Planned (blue)
- 🚀 In Progress (yellow)
- ✅ Completed (green)
- ⛔ Cancelled (gray)

---

## 3. CURRENT DATABASE SCHEMA

### feature_requests Table
```sql
CREATE TABLE feature_requests (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL (FK: trial_organizations),
  user_id UUID (FK: trial_users),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  use_case TEXT,
  status feature_request_status NOT NULL DEFAULT 'submitted',
  priority roadmap_priority NOT NULL DEFAULT 'medium',
  votes INTEGER DEFAULT 0,
  product_response TEXT,
  product_responded_at TIMESTAMP,
  product_responded_by TEXT,
  expected_availability_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### org_product_roadmap Table
```sql
CREATE TABLE org_product_roadmap (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL (FK: trial_organizations),
  title TEXT NOT NULL,
  description TEXT,
  status roadmap_status NOT NULL DEFAULT 'planned',
  priority roadmap_priority NOT NULL DEFAULT 'medium',
  target_date DATE,
  estimated_completion_date DATE,
  created_by TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Current Relationships
- NO direct linking between `feature_requests` and `org_product_roadmap`
- Both tables have `org_id` (organizational link)
- Both have independent status and priority enums

---

## 4. EXISTING LINKING INFRASTRUCTURE

### Similar Pattern: ticket_links Table (References)
```sql
CREATE TABLE ticket_links (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL (FK: tickets),
  related_ticket_id UUID NOT NULL (FK: tickets),
  link_type TEXT CHECK (link_type IN ('blocks', 'blocked_by', 'related', 'duplicate')),
  created_by UUID NOT NULL (FK: auth.users),
  created_at TIMESTAMP,
  CONSTRAINT no_self_link CHECK (ticket_id != related_ticket_id)
);
```

This pattern can be adapted for feature_request ↔ roadmap_item linking.

---

## 5. CROSS-LINKING OPPORTUNITIES & IMPLEMENTATION STRATEGY

### Proposed Linking Scenarios:
1. **Feature Request → Roadmap Item**: When a feature request is "planned", it could link to a roadmap item
2. **Roadmap Item → Feature Requests**: Show which customer requests contributed to a roadmap item
3. **Display Integration**: 
   - In FeatureRequestsTab: Show linked roadmap item (if status = 'planned')
   - In ProductRoadmapTab: Show linked feature requests

### Option A: New Junction Table (Recommended)
```sql
CREATE TABLE feature_roadmap_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'addresses' CHECK (link_type IN ('addresses', 'blocked_by', 'blocked_by_same_priority')),
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT no_duplicate_links UNIQUE(feature_request_id, roadmap_item_id)
);

CREATE INDEX idx_feature_roadmap_feature ON feature_roadmap_links(feature_request_id);
CREATE INDEX idx_feature_roadmap_roadmap ON feature_roadmap_links(roadmap_item_id);
```

### Option B: Foreign Key Column (Simpler)
Add column to `org_product_roadmap`:
```sql
ALTER TABLE org_product_roadmap ADD COLUMN 
  linked_feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL;
```

**Pros**: Simpler, one-to-one relationship
**Cons**: Only one feature request per roadmap item

### Option C: Foreign Key Column in Reverse
Add column to `feature_requests`:
```sql
ALTER TABLE feature_requests ADD COLUMN 
  linked_roadmap_item_id UUID REFERENCES org_product_roadmap(id) ON DELETE SET NULL;
```

---

## 6. WHERE TO ADD LINKING LOGIC

### Component-Level Integration Points

#### FeatureRequestsTab Enhancements:
1. **Modify Query**: Include linked roadmap item data
   ```typescript
   // Add to select:
   .select(`
     *,
     roadmap_item:linked_roadmap_item_id(id, title, status, target_date)
   `)
   ```

2. **Update Interface**:
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

3. **Add Display Section**: Show linked roadmap item in feature request card
   ```
   If status = 'planned' or linked_roadmap_item exists:
   - Show "Linked Roadmap Item" section
   - Display roadmap title, status, target date
   - Add click-to-view or tooltip
   ```

4. **Add Link/Unlink Modal**: When feature status changes to 'planned'
   ```
   - Offer to link to existing roadmap item
   - Or create new roadmap item
   ```

#### ProductRoadmapTabEnhanced Enhancements:
1. **Modify Query**: Include linked feature requests
   ```typescript
   // For each roadmap item, fetch related features:
   .select(`
     *
   `)
   // Then supplement with:
   // SELECT * FROM feature_requests WHERE linked_roadmap_item_id = ?
   ```

2. **Update Interface**:
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

3. **Add Display Section**: Show count/list of linked features
   ```
   In list view footer:
   - Show badge: "5 linked feature requests"
   - Expandable list on hover/click
   
   In kanban view:
   - Add small pill showing count
   
   In timeline view:
   - Add feature count indicator
   ```

### Page-Level Integration (Alternative)

Instead of modifying components, create a wrapper page component that:
1. Fetches both tables independently
2. Merges data client-side
3. Passes enriched data to components
4. Handles linking logic at page level

**Location**: `/app/support/trials/[id]/page.tsx` (if both shown together)

---

## 7. IMPLEMENTATION RECOMMENDATIONS

### Phase 1: Database
1. Create `feature_roadmap_links` junction table OR add foreign key to one table
2. Add RLS policies for the new table
3. Create indexes for performance

### Phase 2: Component Updates
1. **FeatureRequestsTab**: 
   - Update Supabase query with linked data
   - Add UI section to display roadmap link
   - Add link/unlink functionality
   
2. **ProductRoadmapTabEnhanced**:
   - Add linked feature requests fetching (separate query or join)
   - Display feature count/list in each view type
   - Add filtering by linked feature requests

### Phase 3: Modal Updates
1. **AddFeatureRequestModal**: Add optional roadmap item linking
2. **AddRoadmapItemModal**: Add optional feature request linking
3. Create new modals for managing links (LinkRoadmapModal, etc.)

### Phase 4: Navigation
1. Add links between related items (click roadmap title → view in roadmap page)
2. Add breadcrumb showing linked item
3. Add "view all related" functionality

---

## 8. QUERYING PATTERNS

### Get Feature Request with Linked Roadmap Item
```typescript
const { data: request } = await supabase
  .from('feature_requests')
  .select(`
    *,
    roadmap_item:linked_roadmap_item_id(id, title, status, target_date)
  `)
  .eq('id', featureId)
  .single();
```

### Get Roadmap Item with Linked Feature Requests
```typescript
// Two-step approach if using Option A (junction table):
const { data: roadmapItem } = await supabase
  .from('org_product_roadmap')
  .select('*')
  .eq('id', roadmapId)
  .single();

const { data: links } = await supabase
  .from('feature_roadmap_links')
  .select(`
    feature_request_id,
    feature_requests(id, title, priority, votes, status)
  `)
  .eq('roadmap_item_id', roadmapId);
```

### Get All Roadmap Items with Feature Counts
```typescript
const { data: items } = await supabase
  .from('org_product_roadmap')
  .select(`
    *,
    feature_count:feature_roadmap_links(count)
  `)
  .eq('org_id', orgId);
```

---

## 9. KEY CONSIDERATIONS

### Status Mapping Issues
- FeatureRequest statuses: 'submitted', 'reviewed', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate'
- RoadmapItem statuses: 'planned', 'in_progress', 'completed', 'cancelled'
- **Missing**: 'submitted' and 'reviewed' in roadmap → feature can exist in these states without roadmap item
- **Missing**: 'rejected' and 'duplicate' in roadmap → rejected/duplicate features shouldn't link to roadmap items
- **Missing**: 'cancelled' in feature requests → roadmap can be cancelled without affecting feature status

**Recommendation**: Only link features with status 'planned', 'in_progress', or 'completed' to roadmap items

### Data Flow
1. User submits feature request (status: 'submitted')
2. Product team reviews (status: 'reviewed')
3. Accepted for roadmap (status: 'planned') → **LINK TO ROADMAP ITEM**
4. Development starts (status: 'in_progress') → roadmap item also 'in_progress'
5. Released (status: 'completed') → roadmap item 'completed'

### Performance Considerations
- Add indexes on foreign key columns
- Consider lazy-loading linked data if volume is high
- Cache related items at component level with useMemo
- Use pagination if showing many linked items

---

## 10. SUMMARY TABLE

| Aspect | FeatureRequestsTab | ProductRoadmapTabEnhanced |
|--------|-------------------|---------------------------|
| Data Table | feature_requests | org_product_roadmap |
| Status Options | 7 | 4 |
| Priority Options | 4 | 4 |
| View Types | 1 (List/Card) | 3 (List, Kanban, Timeline) |
| Filtering | Status | Status + Priority |
| Sorting | Votes/Date | Target Date |
| Current Linking | None | None |
| Suggested Linking | ← Link to roadmap item | Link to → feature requests |
| Best Junction Location | feature_roadmap_links table | (Same table) |
| Display Pattern | Small badge or expandable section | Count badge with expandable list |

---

## 11. PROPOSED FINAL IMPLEMENTATION

### Recommended Approach:
1. **Use Option A** (junction table `feature_roadmap_links`)
2. **Keep components mostly unchanged** - update queries to fetch linked data
3. **Add minimal UI sections** to show links
4. **Handle linking** in separate modals to reduce component complexity
5. **Page-level state** to manage navigation between linked items

### Files to Create/Modify:
- CREATE: `/supabase/migrations/[timestamp]_feature_roadmap_links.sql`
- CREATE: `/components/LinkFeatureRoadmapModal.tsx`
- MODIFY: `/components/FeatureRequestsTab.tsx` (queries + display)
- MODIFY: `/components/ProductRoadmapTabEnhanced.tsx` (queries + display)
- MODIFY: `/app/support/trials/features/page.tsx` (add linking handlers)
- MODIFY: `/app/support/trials/roadmap/page.tsx` (add linking handlers)
