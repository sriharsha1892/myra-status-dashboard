# Resource Community Platform Setup Guide

## Overview
This guide will help you set up the new Resource Community Platform with external/internal tabs and discussion features.

## Step 1: Run the Database Migration

### Option A: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/migrations/20251112_resource_community_platform.sql`
5. Paste and click **Run**

### Option B: Supabase CLI
```bash
npx supabase db push
```

## What the Migration Does

### 1. Adds New Features to Existing Tables
- **document_library**: Adds `visibility` ('external' | 'internal') and `folder_id` columns
- All existing resources are set to 'internal' by default

### 2. Creates New Tables

#### **resource_folders**
- Hierarchical folder organization
- Supports both external and internal folders
- Pre-populated with 6 default folders:
  - Client Help Center (external)
  - Getting Started (external)
  - FAQs (external)
  - Account Management (internal)
  - Product Knowledge (internal)
  - Team Discussions (internal)

#### **resource_discussions**
- Discussion threads, questions, and answers
- Supports nested replies (threaded conversations)
- Types: comment, question, answer
- Features: pinning, accepted answers, @mentions

#### **resource_discussion_reactions**
- Voting system: upvote, downvote, helpful, solved
- One reaction per user per discussion per type

### 3. Creates Helper Functions

#### **toggle_discussion_reaction(discussion_id, reaction_type)**
- Adds or removes reactions (upvote/downvote/helpful)
- Automatically handles opposite reactions (can't upvote and downvote same post)

#### **mark_answer_accepted(answer_id)**
- Marks an answer as accepted (question author or admin only)
- Automatically unmarks other accepted answers for the same question

#### **create_resource_discussion(resource_id, parent_id, type, content, mentioned_users)**
- Creates new discussion/question/answer
- Handles @mentions
- Returns discussion with author info

### 4. Sets Up RLS Policies
- Folders: Anyone can view, authenticated users can create/edit/delete their own (admins can do all)
- Discussions: Anyone can view, authenticated users can create/edit/delete their own (admins can do all)
- Reactions: Anyone can view, authenticated users can add/remove their own

## Step 2: Verify Migration Success

Run this query in Supabase SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('resource_folders', 'resource_discussions', 'resource_discussion_reactions');

-- Check default folders
SELECT * FROM resource_folders ORDER BY sort_order;

-- Verify visibility column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'document_library'
  AND column_name IN ('visibility', 'folder_id');
```

Expected result:
- 3 tables found
- 6 default folders created
- visibility and folder_id columns exist

## Step 3: Test the Functions

```sql
-- Test creating a discussion (replace UUIDs with real ones from your database)
SELECT create_resource_discussion(
  '<resource_id>'::UUID,
  NULL, -- parent_discussion_id (NULL for top-level)
  'question', -- discussion_type
  '<p>How do I use this feature?</p>', -- HTML content
  ARRAY[]::UUID[] -- mentioned_user_ids
);

-- Test toggling a reaction
SELECT toggle_discussion_reaction(
  '<discussion_id>'::UUID,
  'upvote'
);
```

## Step 4: Development Server

The components are already being built and will automatically hot-reload:

```bash
# If not running, start dev server
npm run dev
```

Navigate to: `http://localhost:3000/support/resources`

## Architecture Overview

### Frontend Components (Being Built)
```
/app/support/resources/page.tsx (new main page)
├── /components/resources/
│   ├── ExternalResourcesTab.tsx
│   ├── InternalResourcesTab.tsx
│   ├── ResourceCard.tsx (enhanced)
│   ├── DiscussionThread.tsx (new)
│   ├── QuestionCard.tsx (new)
│   ├── AISearchBar.tsx (new)
│   └── CommunityFeed.tsx (new)
```

### Database Schema
```
document_library (existing, enhanced)
  ├── visibility: 'external' | 'internal'
  ├── folder_id → resource_folders
  └── discussions → resource_discussions

resource_folders
  ├── parent_folder_id (self-referencing)
  └── visibility: 'external' | 'internal'

resource_discussions
  ├── resource_id → document_library
  ├── parent_discussion_id (self-referencing)
  ├── discussion_type: 'comment' | 'question' | 'answer'
  └── reactions → resource_discussion_reactions

resource_discussion_reactions
  ├── discussion_id → resource_discussions
  ├── user_id → auth.users
  └── reaction_type: 'upvote' | 'downvote' | 'helpful' | 'solved'
```

## Features Enabled

### External Tab (Client-Facing)
- ✅ Clean documentation view
- ✅ Client help docs, guides, FAQs
- ✅ No discussions visible
- ✅ Search functionality
- ✅ Folder organization

### Internal Tab (Team-Only)
- ✅ Account playbooks and strategies
- ✅ Discussion threads with replies
- ✅ Q&A with voting and accepted answers
- ✅ @mentions with notifications
- ✅ Community feed (recent/trending)
- ✅ Folder management
- ✅ AI-powered search

## Next Steps

1. ✅ Run migration (Step 1)
2. ⏳ Wait for UI components to be built
3. ⏳ Test external tab functionality
4. ⏳ Test internal tab with discussions
5. ⏳ Test Q&A features
6. ⏳ Customize folders and categories as needed

## Rollback (If Needed)

To rollback this migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS resource_discussion_reactions CASCADE;
DROP TABLE IF EXISTS resource_discussions CASCADE;
DROP TABLE IF EXISTS resource_folders CASCADE;

-- Remove new columns from document_library
ALTER TABLE document_library DROP COLUMN IF EXISTS visibility;
ALTER TABLE document_library DROP COLUMN IF EXISTS folder_id;

-- Drop functions
DROP FUNCTION IF EXISTS toggle_discussion_reaction CASCADE;
DROP FUNCTION IF EXISTS mark_answer_accepted CASCADE;
DROP FUNCTION IF EXISTS create_resource_discussion CASCADE;
DROP VIEW IF EXISTS resource_discussion_stats CASCADE;
```

## Troubleshooting

### Error: "relation already exists"
- Tables may have been partially created
- Run the rollback SQL above, then re-run the migration

### Error: "column already exists"
- The migration was partially run before
- Safe to ignore - migration uses `IF NOT EXISTS`

### RLS Policy Errors
- Check if user is authenticated
- Verify user role in the `users` table
- Admins have special permissions for all operations

## Support

For questions or issues, check the discussion thread in the new Internal Resources tab under "Team Discussions" folder!

---

**Migration Status**: Ready to run ✅
**UI Components**: Building in progress ⏳
**Documentation**: Complete ✅
