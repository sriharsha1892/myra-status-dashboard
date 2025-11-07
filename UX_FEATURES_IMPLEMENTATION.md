# UX Features Implementation Guide

## Overview

Five new UX components have been created to improve myRA AI's user experience:

1. **RelativeTime** - Smart timestamp formatting with hover tooltips
2. **CopyButton** - One-click copy to clipboard with feedback
3. **AutoComplete** - Fuzzy search autocomplete for forms
4. **RecentItems** - Floating sidebar with recently viewed items
5. **Smart Defaults** - Context-aware form pre-filling (to be implemented)

---

## ✅ Components Created

### 1. RelativeTime Component

**File:** `components/ui/RelativeTime.tsx`

**Features:**
- Smart formatting based on age
- Hover shows absolute time
- Prevents hydration mismatches
- Handles invalid dates gracefully

**Usage:**

```tsx
import RelativeTime from '@/components/ui/RelativeTime';

// In your component:
<RelativeTime date={user.created_at} />
<RelativeTime date={activity.timestamp} className="text-sm text-gray-500" />
```

**Output Examples:**
- < 1 hour: "23 minutes ago"
- < 24 hours: "5 hours ago"
- Today: "Today at 3:45 PM"
- Yesterday: "Yesterday at 2:30 PM"
- This week: "3 days ago"
- < 30 days: "2 weeks ago (Jan 8)"
- This year: "Jan 15"
- Older: "Jan 15, 2025"

**Hover tooltip:** "January 15, 2025 at 3:45 PM"

---

### 2. CopyButton Component

**File:** `components/ui/CopyButton.tsx`

**Features:**
- One-click copy to clipboard
- Visual feedback (checkmark on success)
- Two variants: full button and inline icon
- Prevents event bubbling

**Usage:**

```tsx
import CopyButton, { CopyButtonInline } from '@/components/ui/CopyButton';

// Full button with label:
<CopyButton text="user@example.com" label="Email" showLabel />

// Inline icon only:
<CopyButtonInline text={orgId} />

// With custom styling:
<CopyButton
  text="ORG-12345"
  label="Org ID"
  className="ml-2"
  iconSize={14}
/>
```

**Where to Add:**
- Organization ID
- Email addresses
- URLs (website, report links)
- Salesforce IDs
- Any copyable text

---

### 3. AutoComplete Component

**File:** `components/ui/AutoComplete.tsx`

**Features:**
- Fuzzy search matching
- Keyboard navigation (↑↓ Enter Esc)
- Shows subtitles and tags
- Clearable
- Loading state support

**Usage:**

```tsx
import AutoComplete, { AutoCompleteOption } from '@/components/ui/AutoComplete';

// Prepare options:
const orgOptions: AutoCompleteOption[] = organizations.map(org => ({
  value: org.id,
  label: org.name,
  subtitle: org.email,
  tag: org.domain,
  metadata: org
}));

// In your component:
const [selectedOrg, setSelectedOrg] = useState('');

<AutoComplete
  options={orgOptions}
  value={selectedOrg}
  onChange={(value, option) => {
    setSelectedOrg(value);
    // option contains full metadata
  }}
  placeholder="Search organizations..."
  label="Organization"
  required
  allowClear
  minChars={2}
  maxResults={10}
/>
```

**Fuzzy Matching:**
- "ac" matches "Acme Corp"
- "hc" matches "Healthcare Analytics"
- "abc" matches "Alpha Beta Corp"

---

### 4. RecentItems Component

**File:** `components/ui/RecentItems.tsx`

**Features:**
- Floating button (bottom-right)
- Sidebar panel on click
- Pin important items
- LocalStorage persistence
- Auto-tracks viewed items

**Already Integrated:** Added to `app/support/layout.tsx`

**To Track Views:**

```tsx
import { trackRecentItem } from '@/components/ui/RecentItems';

// When user views an organization:
useEffect(() => {
  if (organization) {
    trackRecentItem({
      id: organization.id,
      label: organization.name,
      type: 'organization',
      path: `/support/trials/${organization.id}`,
      metadata: {
        domain: organization.domain,
        status: organization.status
      }
    });
  }
}, [organization]);

// When user views a ticket:
trackRecentItem({
  id: ticket.id,
  label: `${ticket.ticket_number} - ${ticket.title}`,
  type: 'ticket',
  path: `/support/tickets/${ticket.id}`,
  metadata: {
    priority: ticket.priority,
    status: ticket.status
  }
});

// When user views a meeting:
trackRecentItem({
  id: meeting.id,
  label: meeting.title || 'Meeting',
  type: 'meeting',
  path: `/support/trials/meetings/${meeting.id}`,
  metadata: {
    date: meeting.meeting_date
  }
});
```

**Storage:**
- Max 10 recent items
- Max 5 pinned items
- Survives page refresh
- "Clear all" button available

---

## 📋 Implementation Checklist

### Phase 1: Organization Detail Page

**File:** `app/support/trials/[id]/page.tsx`

#### Add Copy Buttons:

```tsx
import { CopyButtonInline } from '@/components/ui/CopyButton';

// In organization details section:
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-700">{organization.email}</span>
  <CopyButtonInline text={organization.email} />
</div>

<div className="flex items-center gap-2">
  <span className="text-sm font-mono text-gray-600">{organization.id}</span>
  <CopyButtonInline text={organization.id} />
</div>

<div className="flex items-center gap-2">
  <a href={organization.website} target="_blank" className="text-sm text-blue-600">
    {organization.website}
  </a>
  <CopyButtonInline text={organization.website} />
</div>
```

#### Add Relative Timestamps:

```tsx
import RelativeTime from '@/components/ui/RelativeTime';

// Replace this:
<p>Created: {format(new Date(org.created_at), 'MMM d, yyyy')}</p>

// With this:
<p>Created: <RelativeTime date={org.created_at} /></p>

// In activity timeline:
{activities.map(activity => (
  <div key={activity.id}>
    <RelativeTime date={activity.timestamp} className="text-sm text-gray-500" />
    <p>{activity.description}</p>
  </div>
))}
```

#### Track Page View:

```tsx
import { trackRecentItem } from '@/components/ui/RecentItems';

// In useEffect after fetching organization:
useEffect(() => {
  if (organization) {
    trackRecentItem({
      id: organization.id,
      label: organization.name,
      type: 'organization',
      path: `/support/trials/${organization.id}`,
      metadata: {
        domain: organization.domain,
        status: organization.status
      }
    });
  }
}, [organization]);
```

---

### Phase 2: Trial Organizations List

**File:** `app/support/trials/page.tsx`

#### Add Copy Buttons to Each Row:

```tsx
import { CopyButtonInline } from '@/components/ui/CopyButton';

// In table row:
<td className="py-4 px-6">
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">{org.email}</span>
    <CopyButtonInline text={org.email} />
  </div>
</td>
```

#### Add Relative Timestamps:

```tsx
import RelativeTime from '@/components/ui/RelativeTime';

<td className="py-4 px-6">
  <RelativeTime date={org.created_at} className="text-sm text-gray-600" />
</td>
```

---

### Phase 3: Activity Log

**File:** `components/ActivityLogTab.tsx`

#### Replace All Timestamps:

```tsx
import RelativeTime from '@/components/ui/RelativeTime';

// Before:
{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}

// After:
<RelativeTime date={activity.created_at} />
```

#### Add Copy for Linked Items:

```tsx
import { CopyButtonInline } from '@/components/ui/CopyButton';

{activity.roadmap_item_id && (
  <div className="flex items-center gap-2">
    <span>Roadmap: {activity.roadmap_item_title}</span>
    <CopyButtonInline text={activity.roadmap_item_id} />
  </div>
)}
```

---

### Phase 4: Forms with AutoComplete

#### Example: Activity Log Form

**File:** `components/ActivityLogTab.tsx`

```tsx
import AutoComplete, { AutoCompleteOption } from '@/components/ui/AutoComplete';

// Prepare organization options:
const [organizations, setOrganizations] = useState<any[]>([]);
const [selectedOrgId, setSelectedOrgId] = useState('');

const orgOptions: AutoCompleteOption[] = organizations.map(org => ({
  value: org.id,
  label: org.name,
  subtitle: org.email,
  tag: org.domain,
  metadata: org
}));

// In form:
<AutoComplete
  options={orgOptions}
  value={selectedOrgId}
  onChange={(value, option) => {
    setSelectedOrgId(value);
    // Auto-fill related fields based on org:
    if (option?.metadata) {
      setFormData(prev => ({
        ...prev,
        org_id: value,
        domain: option.metadata.domain
      }));
    }
  }}
  placeholder="Search organizations..."
  label="Organization"
  required
/>
```

#### Example: User Selection

```tsx
const userOptions: AutoCompleteOption[] = users.map(user => ({
  value: user.id,
  label: user.name,
  subtitle: user.email,
  tag: user.role,
  metadata: user
}));

<AutoComplete
  options={userOptions}
  value={selectedUserId}
  onChange={(value) => setSelectedUserId(value)}
  placeholder="Search users..."
  label="Assign to"
/>
```

---

### Phase 5: Smart Defaults (To Implement)

**Concept:** Forms auto-fill based on context

#### Example 1: New Activity for Organization

```tsx
// When on org detail page, auto-fill org:
const [formData, setFormData] = useState({
  org_id: currentOrgId, // Pre-filled from URL
  activity_type: lastActivityType, // User's last choice
  domain: currentOrg?.domain, // From org data
  follow_up_date: addDays(new Date(), 3) // 3 days from now (common)
});
```

#### Example 2: New User for Organization

```tsx
// Pre-fill from organization:
const [formData, setFormData] = useState({
  org_id: currentOrgId,
  domain: organization.domain, // Inherited
  account_manager: organization.account_manager, // Inherited
  trial_duration: 14 // Default from org settings
});
```

#### Example 3: Feature Request

```tsx
// If org is Healthcare domain:
const [formData, setFormData] = useState({
  org_id: currentOrgId,
  related_reports: suggestHealthcareReports(), // Auto-suggest
  priority: orgHealthScore < 60 ? 'high' : 'medium' // Auto from health
});
```

---

## 🎨 Styling Guide

All components use Tailwind CSS and match myRA AI's design system:

**Colors:**
- Primary: `blue-600`, `blue-700`
- Success: `green-600`, `emerald-500`
- Warning: `orange-500`, `amber-500`
- Error: `red-600`
- Gray scale: `gray-50` to `gray-900`, `slate-50` to `slate-900`

**Transitions:**
- Duration: `duration-200`, `duration-300`
- Properties: `transition-colors`, `transition-all`

**Shadows:**
- Small: `shadow-sm`
- Medium: `shadow-lg`
- Large: `shadow-2xl`

**Rounded Corners:**
- Small: `rounded-md`
- Medium: `rounded-lg`
- Large: `rounded-xl`
- Circle: `rounded-full`

---

## 🧪 Testing Checklist

### RelativeTime
- [ ] Shows "X minutes ago" for recent items
- [ ] Shows "Today at X:XX PM" for today
- [ ] Shows "Yesterday at X:XX PM" for yesterday
- [ ] Hover shows absolute time tooltip
- [ ] Handles invalid dates gracefully

### CopyButton
- [ ] Click copies to clipboard
- [ ] Shows checkmark on success
- [ ] Resets to copy icon after 2 seconds
- [ ] Works with long text
- [ ] Doesn't trigger parent click handlers

### AutoComplete
- [ ] Fuzzy search works ("ac" finds "Acme")
- [ ] Keyboard navigation (↑↓ arrows)
- [ ] Enter selects highlighted item
- [ ] Esc closes dropdown
- [ ] Click outside closes dropdown
- [ ] Shows "No results" when no matches
- [ ] Clear button works

### RecentItems
- [ ] Floating button appears bottom-right
- [ ] Shows count badge
- [ ] Panel opens on click
- [ ] Backdrop closes panel
- [ ] Items persist after page refresh
- [ ] Pin/unpin works
- [ ] Remove item works
- [ ] Clear all works
- [ ] Navigation works
- [ ] Relative timestamps in list

### Smart Defaults
- [ ] Org pre-fills from context
- [ ] Domain inherits from org
- [ ] Account manager inherits
- [ ] Dates suggest smart defaults
- [ ] Last-used values remembered

---

## 📊 Performance Notes

**RelativeTime:**
- Lightweight, no performance impact
- Uses memoization where needed
- Prevents hydration mismatches

**CopyButton:**
- No dependencies, minimal bundle size
- Event handlers properly cleaned up

**AutoComplete:**
- Fuzzy matching is O(n*m) but fast for <1000 items
- Limits results to 10 by default
- Dropdown virtualization not needed for small lists

**RecentItems:**
- LocalStorage access is synchronous (minimal impact)
- Max 10 items tracked (bounded memory)
- Event listeners cleaned up on unmount

---

## 🚀 Next Steps for Terminal Claude

### 1. Test Components (Priority: HIGH)

```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/support/login
# Log in
# Navigate to any trial organization
# Verify:
# - Floating clock icon appears bottom-right
# - Click shows recent items sidebar
```

### 2. Add Copy Buttons (Priority: HIGH)

Pick one page to start (e.g., org detail page):

```tsx
// app/support/trials/[id]/page.tsx
import { CopyButtonInline } from '@/components/ui/CopyButton';

// Find organization email display
// Add after email:
<CopyButtonInline text={organization.email} />
```

### 3. Replace Timestamps (Priority: MEDIUM)

```tsx
// Replace in org list, activity log, etc:
import RelativeTime from '@/components/ui/RelativeTime';

// Before:
{formatDistanceToNow(new Date(item.created_at))}

// After:
<RelativeTime date={item.created_at} />
```

### 4. Track Page Views (Priority: MEDIUM)

```tsx
// In org detail page useEffect:
import { trackRecentItem } from '@/components/ui/RecentItems';

useEffect(() => {
  if (organization) {
    trackRecentItem({
      id: organization.id,
      label: organization.name,
      type: 'organization',
      path: `/support/trials/${organization.id}`,
      metadata: { domain: organization.domain }
    });
  }
}, [organization]);
```

### 5. Add AutoComplete (Priority: LOW - COMPLEX)

Wait for feedback on components above before tackling this.

---

## ⚠️ Known Limitations

1. **AutoComplete** - Not optimized for >1000 items (add virtualization if needed)
2. **RecentItems** - LocalStorage has ~5MB limit (not an issue with 10 items)
3. **RelativeTime** - Updates on mount, not live (acceptable for this use case)
4. **CopyButton** - Requires HTTPS in production (clipboard API restriction)
5. **Smart Defaults** - Requires manual implementation per form (no magic auto-detection)

---

## 📖 Documentation

**Component Props:**
- See inline JSDoc comments in each component file
- TypeScript provides autocomplete and type safety

**Examples:**
- Check this file for usage examples
- See integration in `app/support/layout.tsx` for RecentItems

**Support:**
- All components are self-contained
- No external dependencies beyond date-fns and lucide-react
- Easy to remove if not needed

---

**Created:** 2025-11-07
**Author:** Web Claude
**Session:** claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
**Branch:** claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
