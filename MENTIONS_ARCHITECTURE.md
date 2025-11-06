# @Mentions System Architecture

## Component Hierarchy

```
CommentForm.tsx (Parent)
└── MentionInput.tsx
    ├── State: mentions tracking
    ├── User picker dropdown
    └── Fuzzy search logic

Comment.tsx (Display)
├── MentionPill.tsx (for each @mention)
│   └── Tooltip (on hover)
└── UserProfilePanel.tsx (modal)
    ├── User details
    ├── Statistics
    └── Recent activity
```

## Data Flow

### Creating a Comment with Mentions

```
┌─────────────────┐
│   User types @  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  MentionInput detects   │
│  trigger & shows picker │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ User selects from picker │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ @username inserted in text   │
│ userId tracked in state      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ User submits comment         │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ API receives:                        │
│ - comment text                       │
│ - mentioned_user_ids[]               │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 1. Save comment to DB                │
│ 2. Save mentions to comment_mentions │
│ 3. Create notifications              │
└──────────────────────────────────────┘
```

### Viewing a Comment with Mentions

```
┌────────────────────────┐
│ Comment.tsx renders    │
└──────────┬─────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ formatMentionsInText() parses   │
│ Returns: parts[]                │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Map over parts:                 │
│ - type='text' → <span>          │
│ - type='mention' → <MentionPill>│
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ User hovers MentionPill         │
│ → Tooltip shows                 │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ User clicks MentionPill         │
│ → UserProfilePanel opens        │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Panel fetches user details      │
│ Displays profile & stats         │
└──────────────────────────────────┘
```

## API Flow

### POST /api/comments

```
Request Body:
{
  ticket_id: "uuid",
  comment: "Hey @john, can you help?",
  is_internal: false,
  mentioned_user_ids: ["user-id-123"]
}

         │
         ▼

┌─────────────────────────────────┐
│ Validate user auth & role       │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Insert into ticket_comments     │
│ Returns: commentId              │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Fetch ticket_number             │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ createMentionNotifications()            │
│ ├── Insert into comment_mentions        │
│ └── Insert into notifications           │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Return success                  │
└──────────────────────────────────┘
```

## Database Schema Relations

```
ticket_comments
├── id (PK)
├── ticket_id (FK → tickets)
├── user_id (FK → auth.users)
├── comment (text)
└── is_internal (boolean)

comment_mentions
├── id (PK)
├── comment_id (FK → ticket_comments) [CASCADE DELETE]
├── user_id (user mentioned)
└── created_at

notifications
├── id (PK)
├── user_id (FK → auth.users)
├── ticket_id (FK → tickets)
├── type ('mention')
├── message (text)
└── is_read (boolean)
```

## State Management

### MentionInput Component

```typescript
State:
├── showPicker: boolean
├── users: User[]
├── filteredUsers: User[]
├── selectedIndex: number
├── mentionSearch: string
├── mentions: MentionData[]
└── pickerPosition: { top, left }

Props:
├── value: string
├── onChange: (value: string) => void
├── onMentionsChange: (userIds: string[]) => void
└── placeholder?: string
```

### CommentForm Component

```typescript
State:
├── comment: string
├── isInternal: boolean
├── isSubmitting: boolean
└── mentionedUserIds: string[] [NEW]
```

### Comment Component

```typescript
State:
├── selectedUserId: string | null [NEW]
└── showUserProfile: boolean [NEW]
```

## Event Handlers

### MentionInput Events

| Event | Handler | Action |
|-------|---------|--------|
| onChange | handleChange | Update text, parse mentions |
| onKeyDown | handleKeyDown | Navigate picker (↑↓), select (Enter), close (ESC) |
| User click | selectUser | Insert mention, update state |
| Click outside | handleClickOutside | Close picker |

### MentionPill Events

| Event | Handler | Action |
|-------|---------|--------|
| onMouseEnter | handleMouseEnter | Show tooltip |
| onMouseLeave | handleMouseLeave | Hide tooltip |
| onClick | handleClick | Open user profile panel |

### UserProfilePanel Events

| Event | Handler | Action |
|-------|---------|--------|
| Backdrop click | onClose | Close panel |
| Close button | onClose | Close panel |
| Email button | handleEmail | Open mailto: link |

## CSS Classes & Styling

### MentionInput
```css
textarea: w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500
picker: absolute z-50 w-80 bg-white border rounded-lg shadow-lg max-h-[200px]
user-item: px-3 py-2 h-[40px] hover:bg-gray-50
selected-item: bg-blue-50 text-blue-900
```

### MentionPill
```css
pill: inline-flex px-1.5 py-0.5 rounded text-sm bg-blue-100 text-blue-700
hover: bg-blue-200 cursor-pointer
tooltip: fixed z-[100] bg-gray-900 text-white text-xs rounded-md py-2 px-3
```

### UserProfilePanel
```css
backdrop: fixed inset-0 bg-black bg-opacity-50 z-50
panel: fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50
avatar: w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500
role-badge: Admin=purple, Team=blue, AM=green
stats-card: bg-blue-50 rounded-lg p-4
```

## Utility Functions

### mentions.ts

```
parseMentions(text)
├── Input: "Hey @john and @sarah"
└── Output: ["john", "sarah"]

fetchUsers()
├── Query: auth.users
└── Returns: [{ id, email, name, role }]

mapUsernamesToIds(usernames)
├── Input: ["john", "sarah"]
├── Lookup: users array
└── Output: ["user-id-1", "user-id-2"]

createMentionNotifications(...)
├── Insert: comment_mentions table
├── Insert: notifications table
└── Returns: { success, created }

formatMentionsInText(text)
├── Input: "Hello @john"
└── Output: { parts: [
    { type: 'text', content: 'Hello ' },
    { type: 'mention', content: 'john' }
  ]}
```

## Security Flow

```
Client Request
    │
    ▼
┌──────────────────────────┐
│ API: Auth Check          │
│ getUser() → user         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ API: Role Validation     │
│ AM | Team | Admin        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ API: Sanitize Input      │
│ trim(), validate IDs     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ DB: Parameterized Query  │
│ (Supabase handles)       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ React: Auto-escape       │
│ Prevent XSS              │
└───────────────────────────┘
```

## Performance Optimizations

```
User Search
├── Debounce: 200ms
├── Fuzzy match: O(n*m) simplified
└── Limit results: First 50 users

Mention Parsing
├── Single regex pass
├── Memoized parts array
└── Lazy profile loading

Database
├── Index on comment_mentions(user_id)
├── Cascade delete
└── Single transaction for mentions + notifications

React Rendering
├── Key props on map iterations
├── Conditional rendering
└── Event delegation
```

## Error Handling

```
┌─────────────────────────┐
│ User API fails          │
├─────────────────────────┤
│ Fallback: Current user  │
│ Show warning toast      │
└─────────────────────────┘

┌─────────────────────────┐
│ Mention save fails      │
├─────────────────────────┤
│ Comment still created   │
│ Log error, continue     │
└─────────────────────────┘

┌─────────────────────────┐
│ Notification fails      │
├─────────────────────────┤
│ Mention saved           │
│ Log error, don't block  │
└─────────────────────────┘

┌─────────────────────────┐
│ Profile fetch fails     │
├─────────────────────────┤
│ Show loading spinner    │
│ Retry or show error     │
└─────────────────────────┘
```

## Testing Strategy

### Unit Tests
- `parseMentions()` with various inputs
- `formatMentionsInText()` edge cases
- Fuzzy search algorithm accuracy
- User ID mapping

### Integration Tests
- Comment creation with mentions
- Notification creation
- Database cascade delete
- User picker keyboard navigation

### E2E Tests
- Full mention flow (create → notify → view)
- Profile panel interaction
- Multiple mentions in one comment
- Internal comment mentions

## Accessibility

```
MentionInput
├── aria-label="Comment input with mention support"
├── aria-expanded={showPicker}
└── aria-activedescendant={selectedUserId}

User Picker
├── role="listbox"
├── aria-label="Select user to mention"
└── Each item: role="option"

MentionPill
├── aria-label="@{username} (click to view profile)"
└── role="button"

UserProfilePanel
├── role="dialog"
├── aria-modal="true"
└── Focus trap on open
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid & Flexbox
- ES6+ features (transpiled by Next.js)
- React 18+ hooks
- Tailwind CSS 3+

---

This architecture provides a scalable, maintainable, and performant @mentions system fully integrated with the myRA Support System.
