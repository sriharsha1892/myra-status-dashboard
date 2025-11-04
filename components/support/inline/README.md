# Inline Editing Components

This directory contains reusable inline editing components for the myRA AI Support System dashboard.

## Components

### InlineStatusSelect
Dropdown for editing ticket status inline with Linear.app-inspired design.

**Features:**
- Click to open dropdown
- Colored status indicators
- Optimistic updates with rollback on error
- Loading state during save
- ESC to cancel, click outside to close
- Toast notifications

**Props:**
```typescript
{
  value: string;              // Current status value
  ticketId: string;          // Ticket ID
  onChange: (ticketId: string, newStatus: string) => Promise<void>;
  onCancel?: () => void;     // Optional callback when cancelled
}
```

**Status Options:**
- New (Blue)
- In Progress (Yellow)
- Waiting on User (Orange)
- Resolved (Green)
- Closed (Gray)

### InlinePrioritySelect
Dropdown for editing ticket priority inline.

**Features:**
- Click to open dropdown
- Colored priority indicators
- Optimistic updates with rollback on error
- Loading state during save
- ESC to cancel, click outside to close
- Toast notifications

**Props:**
```typescript
{
  value: string;              // Current priority value
  ticketId: string;          // Ticket ID
  onChange: (ticketId: string, newPriority: string) => Promise<void>;
  onCancel?: () => void;     // Optional callback when cancelled
}
```

**Priority Options:**
- Critical (Red)
- High (Orange)
- Medium (Yellow)
- Low (Gray)

### InlineAssigneeSelect
User picker with search for assigning tickets to team members.

**Features:**
- Click to open user picker
- Search functionality for filtering users
- Shows only Team and Admin roles
- Option to unassign
- User avatars with initials
- Optimistic updates with rollback on error
- Loading state during save
- Auto-focus on search input
- ESC to cancel, click outside to close
- Toast notifications

**Props:**
```typescript
{
  value: string | null;      // Current assignee user_id (null if unassigned)
  ticketId: string;          // Ticket ID
  onChange: (ticketId: string, newAssigneeId: string | null) => Promise<void>;
  onCancel?: () => void;     // Optional callback when cancelled
}
```

## Usage Example

```typescript
import InlineStatusSelect from '@/components/support/inline/InlineStatusSelect';
import InlinePrioritySelect from '@/components/support/inline/InlinePrioritySelect';
import InlineAssigneeSelect from '@/components/support/inline/InlineAssigneeSelect';

// In your component
const handleStatusChange = async (ticketId: string, newStatus: string) => {
  // Update ticket in database
  const { error } = await supabase
    .from('tickets')
    .update({ status: newStatus })
    .eq('id', ticketId);

  if (error) throw error;
};

// In your JSX
<InlineStatusSelect
  value={ticket.status}
  ticketId={ticket.id}
  onChange={handleStatusChange}
/>

<InlinePrioritySelect
  value={ticket.priority}
  ticketId={ticket.id}
  onChange={handlePriorityChange}
/>

<InlineAssigneeSelect
  value={ticket.assigned_to}
  ticketId={ticket.id}
  onChange={handleAssigneeChange}
/>
```

## Design Philosophy

These components follow Linear.app's design principles:
- **Clean & Minimal**: No unnecessary icons or decorations
- **Inline Editing**: Edit in place without modal dialogs
- **Optimistic Updates**: Immediate UI feedback
- **Graceful Degradation**: Rollback on errors
- **Keyboard Friendly**: ESC to cancel, Enter to save
- **Visual Feedback**: Loading states and toast notifications

## Styling

All components use Tailwind CSS classes and follow these patterns:
- Gray-50 background on hover
- Border with blue ring on focus
- Smooth transitions for all state changes
- Consistent padding and spacing
- Accessible color contrast ratios

## Error Handling

All components implement:
1. **Optimistic Updates**: UI updates immediately
2. **Error Rollback**: Reverts to previous value on error
3. **Toast Notifications**: Success/error messages via react-hot-toast
4. **Try-Catch Blocks**: Proper error handling and logging

## Dependencies

- React (useState, useRef, useEffect)
- @/lib/supabase/client (for InlineAssigneeSelect)
- Tailwind CSS
- react-hot-toast (for parent components)
