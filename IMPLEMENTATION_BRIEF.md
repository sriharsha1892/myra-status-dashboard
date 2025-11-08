# Unified Notifications & Notes System - Implementation Brief

## Overview
Implement a cohesive, futuristic activity stream with unified notifications and threaded notes system across the entire application.

---

## 🔔 Part 1: Unified Notifications System

### Goal
Replace fragmented notification tables with a single, intelligent activity stream accessible via a sidebar.

### Database Schema

```sql
CREATE TABLE notifications (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Polymorphic Entity Reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('note', 'ticket', 'roadmap_item', 'meeting', 'trial_org')),
  entity_id UUID NOT NULL,
  entity_title TEXT, -- Cached for performance

  -- Notification Content
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'mention',
    'assigned',
    'comment',
    'status_change',
    'issue_linked',
    'watching_update'
  )),

  -- Actor & Message
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT NOT NULL, -- Where to navigate (includes #note-id anchor)

  -- AI Priority Scoring (0-100)
  priority_score INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'recent' CHECK (category IN ('priority', 'recent', 'archived')),

  -- Grouping/Threading
  thread_key TEXT NOT NULL, -- Format: "{entity_type}:{entity_id}"

  -- State
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_reason TEXT, -- 'auto', 'manual', 'entity_closed'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  INDEX idx_user_status_priority ON notifications(user_id, status, priority_score DESC, created_at DESC),
  INDEX idx_thread ON notifications(thread_key, created_at DESC)
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
```

### Priority Scoring Rules

```typescript
function calculatePriorityScore(notification: {
  type: string
  entity_type: string
  message?: string
}): number {
  let score = 50; // Base

  // Type-based
  const typeScores = {
    'assigned': 35,           // → 85 total
    'mention': 20,            // → 70 total
    'issue_linked': 30,       // → 80 total
    'comment': 0,             // → 50 total
    'status_change': -10,     // → 40 total
    'watching_update': -30,   // → 20 total
  };
  score += typeScores[notification.type] || 0;

  // Keyword boost
  if (notification.message) {
    const urgent = ['urgent', 'asap', 'blocker', 'critical', 'breaking'];
    if (urgent.some(word => notification.message.toLowerCase().includes(word))) {
      score += 20;
    }
  }

  // Entity boost
  if (notification.entity_type === 'ticket') score += 5;

  return Math.min(100, Math.max(0, score));
}

// Categorize: score >= 65 = 'priority', else 'recent'
```

### UI: Activity Sidebar

**Location:** Right side, collapsible
**Default State:** Collapsed when empty, shows count when has notifications

```
┌─────────────────────────────────────┐
│ Dashboard  Tickets  Roadmap  [≡ 7] │
└─────────────────────────────────────┘
                                   ↓
                    ┌──────────────────────┐
                    │ Activity        [×]  │
                    ├──────────────────────┤
                    │ ⚡ Priority (2)      │
                    │ ┌──────────────────┐ │
                    │ │ 🎫 Bug #234     │ │
                    │ │ ├─ Assigned 2m  │ │
                    │ │ └─ Sarah +issue │ │
                    │ │   [→] [Archive] │ │
                    │ └──────────────────┘ │
                    │                      │
                    │ 💬 Recent (5)       │
                    │ ...grouped threads   │
                    └──────────────────────┘
```

**Mobile:** Full-screen overlay (slide from right)

### Auto-Dismiss Logic (Moderate)

Cron job runs hourly:
- Archive notifications that are:
  - Status = 'read'
  - Priority < 30
  - Older than 24 hours
- Archive all notifications when entity is closed/deleted

### Real-time Integration

```typescript
// Subscribe to user's notifications (INSERT only)
const channel = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Prepend to list, update count
    // Show toast if priority_score >= 65
  })
  .subscribe();
```

### Migration

```sql
-- Migrate from activity_note_notifications
INSERT INTO notifications (user_id, entity_type, entity_id, notification_type, ...)
SELECT u.id, 'note', ann.note_id, ann.notification_type, ...
FROM activity_note_notifications ann
JOIN auth.users u ON u.email = ann.user_email;

-- Migrate from old notifications table
INSERT INTO notifications (user_id, entity_type, entity_id, notification_type, ...)
SELECT n.user_id, 'ticket', n.ticket_id, n.type, ...
FROM notifications_old_backup n;

-- Drop old tables after verification
```

---

## 📝 Part 2: Unified Notes System

### Goal
Single notes table supporting threaded conversations across all entities (trial orgs, meetings, roadmap, tickets).

### Database Schema

```sql
CREATE TABLE unified_notes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic Entity
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'trial_org', 'meeting', 'roadmap_item', 'ticket', 'todo'
  )),
  entity_id UUID NOT NULL,

  -- Content
  content TEXT NOT NULL, -- Rich HTML from TipTap
  content_sections JSONB, -- For meeting notes: {summary, pain_points, objections, positive_signals}
  note_type TEXT, -- Context-specific: 'issue', 'comment', 'blocker', 'internal', 'pain_point', etc.

  -- Threading (Hybrid Flat Model)
  parent_note_id UUID REFERENCES unified_notes(id) ON DELETE CASCADE,
  thread_root_id UUID REFERENCES unified_notes(id) ON DELETE CASCADE,
  replying_to_user_id UUID REFERENCES auth.users(id),
  quoted_content TEXT, -- First 200 chars of parent note
  reply_count INTEGER DEFAULT 0,

  -- Author
  author_id UUID NOT NULL REFERENCES auth.users(id),

  -- Mentions
  mentioned_user_ids UUID[] DEFAULT '{}',

  -- Visibility
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN (
    'team',     -- All team members
    'internal', -- Team + Admins only (not AMs)
    'private'   -- Author only
  )),

  -- Attachments (for later)
  attachments JSONB DEFAULT '[]', -- [{url, name, type, size}, ...]

  -- State
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE,

  -- Indexes
  INDEX idx_entity ON unified_notes(entity_type, entity_id, deleted, created_at DESC),
  INDEX idx_thread_root ON unified_notes(thread_root_id, created_at),
  INDEX idx_parent ON unified_notes(parent_note_id, created_at),
  INDEX idx_mentions ON unified_notes USING GIN(mentioned_user_ids),
  INDEX idx_author ON unified_notes(author_id, created_at DESC)
);

-- Mention Tracking
CREATE TABLE note_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES unified_notes(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(note_id, mentioned_user_id),
  INDEX idx_user_unread ON note_mentions(mentioned_user_id, is_read, created_at DESC)
);

-- Edit History
CREATE TABLE note_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES unified_notes(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  previous_mentioned_user_ids UUID[],
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edit_reason TEXT,

  INDEX idx_note_history ON note_edit_history(note_id, edited_at DESC)
);

-- Auto-increment reply count trigger
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_note_id IS NOT NULL THEN
    UPDATE unified_notes
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_note_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reply_count
AFTER INSERT ON unified_notes
FOR EACH ROW
EXECUTE FUNCTION increment_reply_count();

-- RLS
ALTER TABLE unified_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes visibility policy"
ON unified_notes FOR SELECT
USING (
  deleted = FALSE
  AND (
    visibility = 'team'
    OR (visibility = 'internal' AND NOT EXISTS (
      SELECT 1 FROM org_members
      WHERE user_id = auth.uid() AND role = 'AM'
    ))
    OR (visibility = 'private' AND author_id = auth.uid())
  )
);
```

### Threading Model: Hybrid Flat (Linear-style)

```
Root Note (parent_note_id = NULL)
├─ Reply 1 (shows "replying to @user")
├─ Reply 2 (shows quoted context)
└─ Reply 3 (flat list, preserves context)
```

**Why:** Simpler UI, faster queries, mobile-friendly, still maintains conversation context.

### Meeting Notes: Sectioned Structure

Meeting notes are ONE note with structured HTML sections:

```html
<h2>Meeting Summary</h2>
<p>Great demo with Acme Corp...</p>

<h2>Pain Points Discussed</h2>
<p>Struggling with Excel reports...</p>

<h2>Objections Raised</h2>
<p>Migration time concerns...</p>

<h2>Positive Signals</h2>
<p>CEO very excited about automation...</p>
```

Parsed into `content_sections` JSONB for querying:
```json
{
  "summary": "<p>Great demo...</p>",
  "pain_points": "<p>Struggling...</p>",
  "objections": "<p>Migration...</p>",
  "positive_signals": "<p>CEO very...</p>"
}
```

### Edit Tracking

When user edits a note:
1. Save current content to `note_edit_history`
2. Update note with new content
3. Set `edited = true`
4. Show "(edited)" badge in UI
5. Click badge → show edit history modal with diff view

### Notification Integration

When creating a note with mentions:
1. Insert note into `unified_notes`
2. Insert mention records into `note_mentions`
3. Create notifications for each mentioned user:

```typescript
for (const userId of mentionedUserIds) {
  await supabase.from('notifications').insert({
    user_id: userId,
    entity_type: 'note',
    entity_id: note.id,
    notification_type: 'mention',
    actor_id: currentUser.id,
    title: `Mentioned in ${entityTitle}`,
    action_url: `${entityUrl}#note-${note.id}`, // Anchor to note
    priority_score: 70, // Mentions = priority
    thread_key: `${entityType}:${entityId}`
  });
}
```

### Real-time Integration

```typescript
// Subscribe to notes on current entity
const channel = supabase
  .channel(`notes-${entityType}-${entityId}`)
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'unified_notes',
    filter: `entity_type=eq.${entityType},entity_id=eq.${entityId}`
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      // Prepend new note
    } else if (payload.eventType === 'UPDATE') {
      // Update existing note
    } else if (payload.eventType === 'DELETE') {
      // Remove note
    }
  })
  .subscribe();
```

### Migration

```sql
-- Activity notes
INSERT INTO unified_notes (entity_type, entity_id, content, note_type, mentioned_user_ids, author_id, created_at, edited, deleted)
SELECT
  'trial_org',
  org_id,
  note_text,
  note_category,
  ARRAY(SELECT u.id FROM auth.users u WHERE u.email = ANY(mentions)),
  (SELECT id FROM auth.users WHERE email = logged_by LIMIT 1),
  created_at,
  edited,
  deleted
FROM org_activity_notes;

-- Meeting notes (expand into sectioned note)
INSERT INTO unified_notes (entity_type, entity_id, content, content_sections, note_type, author_id, created_at)
SELECT
  'meeting',
  meeting_id,
  CONCAT(
    '<h2>Meeting Summary</h2>', COALESCE(meeting_summary, ''),
    '<h2>Pain Points Discussed</h2>', COALESCE(pain_points_discussed, ''),
    '<h2>Objections Raised</h2>', COALESCE(objections_raised, ''),
    '<h2>Positive Signals</h2>', COALESCE(positive_signals, '')
  ),
  jsonb_build_object(
    'summary', meeting_summary,
    'pain_points', pain_points_discussed,
    'objections', objections_raised,
    'positive_signals', positive_signals
  ),
  'meeting_summary',
  (SELECT id FROM auth.users WHERE email = conducted_by LIMIT 1),
  created_at
FROM meeting_notes;

-- Roadmap notes
INSERT INTO unified_notes (entity_type, entity_id, content, note_type, mentioned_user_ids, author_id, created_at)
SELECT
  'roadmap_item',
  roadmap_item_id,
  content,
  note_type,
  COALESCE(mentioned_users::UUID[], '{}'),
  author_id,
  created_at
FROM roadmap_notes;

-- Ticket comments
INSERT INTO unified_notes (entity_type, entity_id, content, note_type, visibility, mentioned_user_ids, author_id, created_at, updated_at)
SELECT
  'ticket',
  ticket_id,
  comment,
  CASE WHEN is_internal THEN 'internal_comment' ELSE 'comment' END,
  CASE WHEN is_internal THEN 'internal' ELSE 'team' END,
  COALESCE(
    ARRAY(SELECT cm.user_id FROM comment_mentions cm WHERE cm.comment_id = tc.id),
    '{}'
  ),
  user_id,
  created_at,
  updated_at
FROM ticket_comments tc;

-- Verify counts
SELECT 'activity_notes' as source, COUNT(*) FROM org_activity_notes
UNION ALL
SELECT 'meeting_notes', COUNT(*) FROM meeting_notes
UNION ALL
SELECT 'roadmap_notes', COUNT(*) FROM roadmap_notes
UNION ALL
SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
UNION ALL
SELECT 'unified_notes', COUNT(*) FROM unified_notes;

-- After verification, drop old tables
-- DROP TABLE org_activity_notes, meeting_notes, roadmap_notes, ticket_comments,
--            activity_note_notifications, comment_mentions;
```

---

## 🎨 Shared UI Components

### UnifiedNoteEditor (Universal)

Props:
```typescript
interface UnifiedNoteEditorProps {
  entityType: 'trial_org' | 'meeting' | 'roadmap_item' | 'ticket' | 'todo';
  entityId: string;
  noteType?: string;
  visibility?: 'team' | 'internal' | 'private';
  allowAttachments?: boolean;
  allowInternalToggle?: boolean;
  showNoteTypeSelector?: boolean;
  placeholder?: string;
  onSubmit: (content: string, mentions: string[]) => void;
  onCancel?: () => void;
}
```

Use existing TipTap editor (`MentionTextEditor.tsx`) as base, enhance with:
- Visibility toggle (team/internal)
- Note type selector (for roadmap: comment/blocker/update/decision)
- Pre-populated sections (for meetings)

### NoteCard (Display Root Note)

```typescript
<NoteCard note={note}>
  <NoteHeader author={note.author} timestamp={note.created_at} noteType={note.note_type} visibility={note.visibility} edited={note.edited} />
  <NoteContent html={note.content} mentions={note.mentioned_user_ids} />
  <NoteActions>
    <ReplyButton onClick={handleReply} />
    <EditButton onClick={handleEdit} />
    <DeleteButton onClick={handleDelete} />
  </NoteActions>

  {note.reply_count > 0 && (
    <ThreadPreview count={note.reply_count} onExpand={loadThread} />
  )}

  {threadExpanded && (
    <ReplyThread rootNoteId={note.id} replies={replies} />
  )}
</NoteCard>
```

### Navigation Flow: Notification → Note

When user clicks notification:
1. Navigate to `action_url` (e.g., `/support/tickets/234#note-abc123`)
2. Page scrolls to note with ID `note-abc123`
3. Note is highlighted (yellow background fade)
4. Thread auto-expands if collapsed
5. Reply box focuses after 500ms

Implementation:
```typescript
useEffect(() => {
  const noteId = window.location.hash.slice(6); // "note-abc123" → "abc123"
  if (noteId) {
    const element = document.getElementById(`note-${noteId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedNoteId(noteId);

    // Auto-expand thread
    const threadRootId = findThreadRoot(noteId);
    setExpandedThreads(prev => [...prev, threadRootId]);

    // Focus reply
    setTimeout(() => replyBoxRef.current?.focus(), 500);
  }
}, []);
```

---

## 📡 API Endpoints

### Notifications
```
GET    /api/notifications              - List user's notifications (grouped by thread_key)
PATCH  /api/notifications              - Mark as read/archived (batch: {notification_ids: []})
DELETE /api/notifications/:id          - Delete notification
```

### Notes
```
GET    /api/notes                      - List notes (?entity_type=ticket&entity_id=123&parent_note_id=null)
POST   /api/notes                      - Create note (auto-creates notifications for mentions)
PATCH  /api/notes/:id                  - Edit note (saves to history, notifies new mentions)
DELETE /api/notes/:id                  - Soft delete (sets deleted=true)
GET    /api/notes/:id/history          - Get edit history
GET    /api/notes/:id/thread           - Get full thread (root + all replies)
```

---

## 🚀 Implementation Phases

### Phase 1: Database (Days 1-2)
- [ ] Create `notifications` table
- [ ] Create `unified_notes`, `note_mentions`, `note_edit_history` tables
- [ ] Run migration scripts in transaction
- [ ] Verify data integrity (counts match)
- [ ] Backup old tables, then drop

### Phase 2: API Layer (Days 3-4)
- [ ] `/api/notifications` GET/PATCH/DELETE
- [ ] `/api/notes` GET/POST/PATCH/DELETE
- [ ] Priority scoring function
- [ ] Notification creation helpers
- [ ] Edit history tracking

### Phase 3: Shared Components (Days 5-7)
- [ ] Enhance `MentionTextEditor` → `UnifiedNoteEditor`
- [ ] Build `NoteCard` component
- [ ] Build `ReplyNote` component
- [ ] Build `ReplyThread` component
- [ ] Build `NotesList` with filters
- [ ] Build `EditHistoryModal`

### Phase 4: Activity Sidebar (Days 8-9)
- [ ] `ActivitySidebar` component
- [ ] `NotificationGroup` (priority/recent)
- [ ] `NotificationThread` (grouped display)
- [ ] `NotificationItem`
- [ ] Toggle button with count
- [ ] Mobile full-screen overlay

### Phase 5: Real-time Integration (Day 10)
- [ ] Supabase channel for user notifications
- [ ] Supabase channel for entity notes
- [ ] React Query optimistic updates
- [ ] Toast notifications for high priority
- [ ] Connection error handling + fallback

### Phase 6: Navigation & Polish (Days 11-12)
- [ ] Notification click → navigate + scroll + focus
- [ ] Note highlighting animation
- [ ] Thread auto-expand
- [ ] Mobile responsiveness
- [ ] Loading states, empty states
- [ ] Accessibility (ARIA, keyboard nav)

### Phase 7: Context-Specific Adaptations (Day 13)
- [ ] Meeting notes with sections (pre-populated H2 tags)
- [ ] Activity log with category filter
- [ ] Roadmap notes with type selector
- [ ] Ticket comments with internal toggle
- [ ] Auto-notify roadmap mentions (fix gap)

---

## ⚙️ Technical Decisions Summary

| Aspect | Decision |
|--------|----------|
| **Notifications UI** | Right sidebar, collapsible, full-screen on mobile |
| **Notification grouping** | By thread_key (entity), show count |
| **Priority scoring** | 0-100, rule-based (type + keywords) |
| **Auto-dismiss** | Moderate (24h for read + low priority) |
| **Threading model** | Hybrid flat (Linear-style) |
| **Meeting notes** | Single note with H2 sections |
| **Edit tracking** | Full history with diff view |
| **Mentions storage** | UUID arrays + relation table |
| **Visibility** | 3 levels (team/internal/private) |
| **Real-time** | Supabase channels (INSERT for notifications, * for notes) |
| **State management** | React Query + Zustand |
| **Migration** | All at once, transaction-wrapped |
| **Pagination** | Infinite scroll for feeds, load all for threads |
| **WYSIWYG** | TipTap (existing) |

---

## 🎯 Success Criteria

- ✅ Single notifications table (all old tables dropped)
- ✅ Single notes table (all old tables dropped)
- ✅ Real-time notifications (<1s delivery)
- ✅ Real-time note updates
- ✅ All contexts use UnifiedNoteEditor
- ✅ Clicking notification navigates + focuses note
- ✅ Threading works (reply → shows context)
- ✅ Edit history tracked
- ✅ Mobile responsive
- ✅ No data loss from migration

---

## 📋 Migration Rollback Plan

```sql
-- Pre-migration: Backup old tables
-- Migration runs in BEGIN/COMMIT transaction
-- Verification checks counts
-- If fails: automatic ROLLBACK
-- Old tables kept as *_old_backup for 1 week
-- Feature flag for gradual UI rollout if needed
```

---

## 🔗 Key Integrations

1. **Notification → Note:** Click notification → navigate to entity page + anchor to note ID
2. **Note → Notification:** Create note with mentions → auto-create notifications
3. **Edit → History:** Edit note → save to history, notify new mentions
4. **Reply → Thread:** Reply to note → flat thread with context preserved
5. **Entity Close → Archive:** Entity closed → auto-archive all notifications

---

## 📝 Notes

- Attachments infrastructure included in schema but implementation deferred
- Cron job needed for auto-dismiss (every hour)
- Consider Redis cache if performance issues with grouping
- Feature flag recommended even for "all at once" migration
- Monitor Supabase channel limits (100 per client)
