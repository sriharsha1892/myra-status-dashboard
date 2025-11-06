# Feature #7: Internal vs External Comments

This document describes the implementation of internal vs external comments for the myRA AI Support System.

## Overview

The internal comments feature allows Team and Admin users to add private notes to tickets that are not visible to AM (Account Manager) users. This enables internal discussions and notes without exposing them to customers.

## Database Schema

The `ticket_comments` table includes an `is_internal` boolean column:

```sql
-- Column already exists in database (via migration 004_advanced_features.sql)
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;
```

## Row Level Security (RLS) Policies

RLS policies ensure proper access control:

```sql
-- Team and Admin can view all comments (including internal)
CREATE POLICY "Team and Admin can view all comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- AM users can only view external comments (not internal)
CREATE POLICY "AM users can view external comments only"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'AM'
    AND is_internal = false
  );
```

## Components

### 1. CommentForm

Location: `/components/support/CommentForm.tsx`

A form component for adding comments with an internal note toggle.

**Features:**
- Toggle switch for "Internal note" (only visible to Team/Admin)
- Preview of internal note with gray background and lock icon
- Visual feedback showing who can see the comment
- Disabled for AM users (no internal toggle shown)

**Props:**
```typescript
interface CommentFormProps {
  ticketId: string;
  onCommentAdded: () => void;
  userRole: 'AM' | 'Team' | 'Admin' | null;
}
```

**Usage:**
```tsx
<CommentForm
  ticketId={ticketId}
  onCommentAdded={() => setRefreshTrigger(prev => prev + 1)}
  userRole={role}
/>
```

### 2. Comment

Location: `/components/support/Comment.tsx`

Displays an individual comment with proper styling for internal notes.

**Features:**
- Gray background (bg-gray-100) for internal comments
- Lock icon and "INTERNAL" badge for internal comments
- Border-left highlight (border-l-4 border-gray-400) for internal comments
- Automatically hidden for AM users (fallback protection)

**Props:**
```typescript
interface CommentProps {
  comment: TicketComment;
  userName?: string;
  userRole: 'AM' | 'Team' | 'Admin' | null;
}
```

**Usage:**
```tsx
<Comment
  comment={comment}
  userName="John Doe"
  userRole={role}
/>
```

### 3. CommentList

Location: `/components/support/CommentList.tsx`

Displays a list of comments with filtering and role-based visibility.

**Features:**
- Filter dropdown: "All comments" / "External only" / "Internal only" (Team/Admin only)
- Groups comments by date (Today, Yesterday, specific dates)
- Server-side filtering for AM users (they never see internal comments)
- Real-time updates via refreshTrigger
- Loading states and empty states

**Props:**
```typescript
interface CommentListProps {
  ticketId: string;
  userRole: 'AM' | 'Team' | 'Admin' | null;
  refreshTrigger?: number;
}
```

**Usage:**
```tsx
const [refreshTrigger, setRefreshTrigger] = useState(0);

<CommentList
  ticketId={ticketId}
  userRole={role}
  refreshTrigger={refreshTrigger}
/>
```

## API Endpoint

### POST /api/comments

Creates a new comment.

**Request Body:**
```json
{
  "ticket_id": "uuid",
  "comment": "Comment text",
  "is_internal": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticket_id": "uuid",
    "user_id": "uuid",
    "comment": "Comment text",
    "is_internal": false,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Security:**
- AM users cannot create internal comments (server-side enforcement)
- Authentication required
- User role validated from JWT metadata

## Types

Updated type definitions in `/lib/supabase/types.ts`:

```typescript
ticket_comments: {
  Row: {
    id: string
    ticket_id: string
    user_id: string
    comment: string
    is_internal: boolean  // Added
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    ticket_id: string
    user_id: string
    comment: string
    is_internal?: boolean  // Added, defaults to false
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    ticket_id?: string
    user_id?: string
    comment?: string
    is_internal?: boolean  // Added
    created_at?: string
    updated_at?: string
  }
}
```

## Visual Design

### Internal Comment Badge
- Background: `bg-gray-200`
- Text: `text-gray-700`
- Font size: `text-xs`
- Padding: `px-2 py-1`
- Border radius: `rounded`
- Icon: Lock icon, 12px (w-3 h-3), gray-500

### Internal Comment Container
- Background: `bg-gray-100`
- Border: `border-gray-300`
- Left border: `border-l-4 border-l-gray-400`

### Toggle Switch (CommentForm)
- Off state: `bg-gray-300`
- On state: `bg-gray-600`
- Focus ring: `focus:ring-2 focus:ring-gray-400`

## Integration Example

Complete example of integrating all components on a ticket detail page:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { CommentForm } from '@/components/support/CommentForm';
import { CommentList } from '@/components/support/CommentList';
import toast from 'react-hot-toast';

export default function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const { user, role } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const supabase = createClient();

  // Set up real-time subscription for comments
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-comments-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          setRefreshTrigger((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const handleCommentAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.success('Comment added');
  };

  return (
    <div className="space-y-6">
      {/* Comments Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Comments
        </h3>

        {/* Comments List */}
        <div className="mb-6">
          <CommentList
            ticketId={ticketId}
            userRole={role}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Add Comment Form (only for Team/Admin) */}
        {(role === 'Team' || role === 'Admin') && (
          <CommentForm
            ticketId={ticketId}
            onCommentAdded={handleCommentAdded}
            userRole={role}
          />
        )}
      </div>
    </div>
  );
}
```

## Security Considerations

1. **Server-Side Filtering**: AM users never receive internal comments from the database (RLS policy enforcement)
2. **Client-Side Protection**: Components check user role and hide internal comments as a fallback
3. **API Validation**: The API endpoint validates user role and prevents AM users from creating internal comments
4. **Type Safety**: TypeScript ensures `is_internal` is properly handled throughout the application

## Testing Checklist

- [ ] Team user can create internal comments
- [ ] Admin user can create internal comments
- [ ] AM user cannot see internal toggle
- [ ] AM user cannot see internal comments
- [ ] Internal comments show lock icon and badge
- [ ] Internal comments have gray background
- [ ] Filter dropdown works (Team/Admin only)
- [ ] Real-time updates work for new comments
- [ ] RLS policies prevent AM users from querying internal comments
- [ ] API endpoint prevents AM users from creating internal comments

## Migration

To apply the RLS policies, run the migration:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration file directly
psql -f supabase/migrations/005_internal_comments_rls.sql
```

## Files Modified/Created

### Created:
- `/components/support/CommentForm.tsx`
- `/components/support/Comment.tsx`
- `/components/support/CommentList.tsx`
- `/app/api/comments/route.ts`
- `/supabase/migrations/005_internal_comments_rls.sql`

### Modified:
- `/lib/supabase/types.ts` - Added `is_internal` field to `ticket_comments`
- `/components/support/TicketPreviewCard.tsx` - Added internal badge display
- `/app/support/tickets/[id]/page.tsx` - Integrated new comment components
