# myRA AI Support Ticketing System - Setup Guide

## Overview

The myRA AI Support Ticketing System is a fully integrated support platform built with Next.js, Supabase, and TypeScript. It enables Account Managers (AMs) to submit support tickets and allows Team members and Admins to manage, track, and respond to those tickets in real-time.

## Features

- **Role-Based Access Control**: Three user roles (AM, Team, Admin) with different permissions
- **Ticket Management**: Create, view, update, and track support tickets
- **Real-Time Updates**: Live synchronization using Supabase subscriptions
- **Analytics Dashboard**: Comprehensive reporting with charts and metrics
- **Search & Filtering**: Advanced filtering by status, priority, and text search
- **Organization Management**: Track tickets across 20+ trial organizations

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Charts**: Recharts
- **State Management**: Zustand, React Hooks
- **Notifications**: react-hot-toast

## Prerequisites

1. Node.js 18+ and npm installed
2. A Supabase account and project created at [supabase.com](https://supabase.com)
3. Git (optional, for version control)

## Installation Steps

### 1. Install Dependencies

All required dependencies have already been installed:

```bash
npm install
```

Key packages added:
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support
- `date-fns` - Date formatting
- `recharts` - Data visualization
- `react-hot-toast` - Toast notifications
- `zustand` - State management
- `clsx` - Conditional CSS classes

### 2. Configure Supabase

#### A. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (public key safe for browser use)
   - **Service Role Key** (server-side only, keep secret)

#### B. Set Up Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Supabase credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### 3. Set Up Database Schema

#### A. Run Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the entire contents of `supabase/migrations/20250102000000_initial_schema.sql`
4. Execute the query

This will create:
- `organizations` table
- `tickets` table
- `ticket_comments` table
- Auto-increment ticket numbering (MYR-0001, MYR-0002, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for auto-updating timestamps

#### B. Verify Tables

In Supabase dashboard, go to **Table Editor** and verify you see:
- organizations
- tickets
- ticket_comments

### 4. Seed Initial Data

#### A. Add Organizations

1. In Supabase SQL Editor, run the contents of `supabase/seed.sql`
2. This adds 20 trial organizations (mix of Active and Expired status)

#### B. Create Test Users

In Supabase dashboard, go to **Authentication** > **Users**:

1. **Create AM User** (for submitting tickets):
   - Email: `am@test.com`
   - Password: (choose a secure password)
   - After creation, click on the user and set **User Metadata**:
     ```json
     {
       "role": "AM",
       "full_name": "Test AM User"
     }
     ```

2. **Create Team User** (for managing tickets):
   - Email: `team@test.com`
   - Password: (choose a secure password)
   - User Metadata:
     ```json
     {
       "role": "Team",
       "full_name": "Test Team User"
     }
     ```

3. **Create Admin User** (full access):
   - Email: `admin@test.com`
   - Password: (choose a secure password)
   - User Metadata:
     ```json
     {
       "role": "Admin",
       "full_name": "Test Admin User"
     }
     ```

### 5. Run the Application

```bash
npm run dev
```

The app will start at `http://localhost:3000`

## Using the Support System

### Routes

1. **Login**: `/support/login`
   - All users start here
   - Email/password authentication

2. **Submit Ticket** (AM only): `/support/submit`
   - Form to create new support tickets
   - Select organization, category, priority
   - Provide description

3. **Dashboard** (Team/Admin): `/support/dashboard`
   - View all tickets
   - Real-time updates
   - Filter by status, priority
   - Search by ticket number, organization, or description
   - Quick status updates

4. **Reports** (Team/Admin): `/support/reports`
   - Analytics with charts
   - Tickets by status, priority, category
   - Trends over time

### User Roles & Permissions

| Feature | AM | Team | Admin |
|---------|-----|------|-------|
| Submit tickets | ✓ | ✓ | ✓ |
| View all tickets | ✗ | ✓ | ✓ |
| Update ticket status | ✗ | ✓ | ✓ |
| Add comments | ✗ | ✓ | ✓ |
| View reports | ✗ | ✓ | ✓ |
| Delete tickets | ✗ | ✗ | ✓ |
| Manage organizations | ✗ | ✗ | ✓ |

### Ticket Workflow

1. **New** → Ticket just created
2. **In Progress** → Team is working on it
3. **Waiting on User** → Requires response from submitter
4. **Resolved** → Issue fixed, awaiting confirmation
5. **Closed** → Ticket completed and closed

### Priority Levels

- **Critical**: System down, urgent attention needed
- **High**: Major issue affecting work
- **Medium**: Issue with workaround available
- **Low**: Minor issue or enhancement request

## Database Schema

### organizations
- `id` (UUID, primary key)
- `name` (text, unique)
- `trial_start_date` (date)
- `trial_end_date` (date)
- `status` (text: Active | Expired)
- `created_at` (timestamp)

### tickets
- `id` (UUID, primary key)
- `ticket_number` (text, unique, auto-generated: MYR-0001)
- `organization` (text)
- `user_name` (text)
- `user_email` (text)
- `category` (enum: 9 categories)
- `priority` (enum: Low | Medium | High | Critical)
- `status` (enum: New | In Progress | Waiting on User | Resolved | Closed)
- `description` (text)
- `assigned_to` (UUID, references auth.users)
- `created_at`, `updated_at`, `resolved_at` (timestamps)

### ticket_comments
- `id` (UUID, primary key)
- `ticket_id` (UUID, references tickets)
- `user_id` (UUID, references auth.users)
- `comment` (text)
- `is_internal` (boolean)
- `created_at` (timestamp)

## Security

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**Organizations:**
- All authenticated users can read
- Only Admins can modify

**Tickets:**
- AMs, Team, Admin can insert tickets
- Team and Admin can view all tickets
- Team and Admin can update tickets
- Only Admin can delete tickets

**Comments:**
- Team and Admin can view and create comments
- Users can update/delete their own comments
- Admins can update/delete any comment

### Authentication

- Uses Supabase Auth with email/password
- Middleware protects `/support/*` routes
- Role-based access enforced at middleware and database levels
- Sessions persist via secure HTTP-only cookies

## Real-Time Features

The dashboard subscribes to Supabase real-time changes on the `tickets` table. When any ticket is:
- Created
- Updated
- Deleted

All connected clients automatically refresh their ticket list and statistics.

## Customization

### Adding New Categories

Edit `supabase/migrations/20250102000000_initial_schema.sql`:

```sql
category TEXT NOT NULL CHECK (category IN (
  'Security',
  'Tool Functioning',
  -- Add your new category here
  'Your New Category',
  'Other'
))
```

Then run the migration update in Supabase SQL Editor.

### Changing Ticket Number Format

Edit the `generate_ticket_number()` function in the migration file:

```sql
ticket_num := 'MYR-' || LPAD(next_number::TEXT, 4, '0');
-- Change 'MYR-' prefix or number padding as needed
```

### Adding More Organizations

Run INSERT queries in Supabase SQL Editor:

```sql
INSERT INTO organizations (name, trial_start_date, trial_end_date, status) VALUES
  ('New Org Name', '2025-01-01', '2025-01-31', 'Active');
```

## Troubleshooting

### Authentication Issues

**Problem**: Can't log in
**Solutions**:
- Verify Supabase credentials in `.env.local`
- Check user exists in Supabase Auth dashboard
- Verify user has correct `role` in user_metadata
- Clear browser cookies and try again

### Database Errors

**Problem**: "relation does not exist"
**Solutions**:
- Ensure migration script was run successfully
- Check Supabase dashboard > Table Editor for tables
- Verify project URL is correct in `.env.local`

**Problem**: "new row violates row-level security policy"
**Solutions**:
- Check user's role in user_metadata
- Verify RLS policies are enabled
- Ensure user is authenticated

### Real-Time Not Working

**Problem**: Tickets don't update automatically
**Solutions**:
- Check browser console for errors
- Verify Supabase project has real-time enabled
- Check network tab for WebSocket connection
- Ensure anon key has correct permissions

## File Structure

```
myra-status-dashboard/
├── app/
│   └── support/
│       ├── login/page.tsx          # Login page
│       ├── submit/page.tsx         # Ticket submission form
│       ├── dashboard/page.tsx      # Main dashboard
│       └── reports/page.tsx        # Analytics page
├── components/
│   └── support/
│       └── ui/                     # Reusable UI components
│           ├── Button.tsx
│           ├── Input.tsx
│           ├── Textarea.tsx
│           ├── Select.tsx
│           ├── Badge.tsx
│           ├── Modal.tsx
│           └── index.ts
├── hooks/
│   ├── useAuth.ts                  # Authentication hook
│   └── useUser.ts                  # User data hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── types.ts                # Database types
│   └── support/
│       └── auth.ts                 # Auth utility functions
├── supabase/
│   ├── migrations/
│   │   └── 20250102000000_initial_schema.sql
│   └── seed.sql
├── middleware.ts                   # Auth & route protection
└── SUPPORT_SETUP.md               # This file
```

## Next Steps

1. **Test the System**: Log in with each role and test functionality
2. **Add Real Users**: Create accounts for your AMs and Team members
3. **Customize Branding**: Update colors, logo, and styling
4. **Add Email Notifications**: Set up Supabase email triggers
5. **Deploy to Production**: Deploy to Vercel with production Supabase project

## Support

For issues related to:
- **Supabase**: https://supabase.com/docs
- **Next.js**: https://nextjs.org/docs
- **This Implementation**: Check code comments or review this documentation

## License

This support ticketing system is part of the myRA AI Status Dashboard project.
