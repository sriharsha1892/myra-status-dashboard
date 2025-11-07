# Time-Tracking Roadmap Redesign

## Philosophy: "Make Work Visible, Hold People Accountable"

Getting work done is okay, but just lazing around won't help. Every roadmap item will track:
- **When** work was done
- **Who** did it
- **How long** it took
- **What** changed

---

## Core Features

### 1. Time Tracking Per Item

**Estimated vs Actual:**
```
┌─────────────────────────────────────┐
│ Feature: User Authentication        │
│                                     │
│ 🕐 Estimated: 16h                   │
│ ⏱️  Actual: 12h (25% under!)        │
│ 📊 Progress: 75%                    │
│                                     │
│ [●●●●●●●○○○] 75% Complete          │
└─────────────────────────────────────┘
```

**Visual Indicators:**
- ✅ Under estimate = Green badge
- ⚠️ Over estimate = Amber badge
- 🔥 Significantly over = Red badge
- 📈 Velocity trend = Arrow (↗ fast, → steady, ↘ slow)

### 2. Activity Timeline (Per Item)

Every item has a detailed activity log:

```
Activity Log
───────────────────────────────────────
● 2h ago - John moved to In Progress
● 5h ago - Sarah added comment
● 1d ago - Mike updated estimate (8h → 16h)
● 2d ago - Sarah started work
● 3d ago - John created item

⚠️ Stale: No activity in 5 days
```

**Stale Item Warnings:**
- 3 days = Yellow dot
- 5 days = Orange dot + "Stale" badge
- 7+ days = Red dot + "Needs attention" alert

### 3. Work Distribution Dashboard

**Team Velocity Panel:**
```
┌─────────────────────────────────────┐
│ 📊 Team Velocity (Last 7 Days)      │
│                                     │
│ John:   24h logged  [●●●●●●○○○○]   │
│ Sarah:  18h logged  [●●●●●○○○○○]   │
│ Mike:   12h logged  [●●●○○○○○○○]   │
│ Lisa:    6h logged  [●●○○○○○○○○]   │
│                                     │
│ Team Total: 60h                     │
│ Avg per person: 15h                 │
│ Most productive: Mon-Wed 2-5pm      │
└─────────────────────────────────────┘
```

### 4. Productivity Metrics

**Dashboard Insights:**
- 🎯 Items completed this week: 8
- ⏱️ Average completion time: 18h
- 📈 Velocity trend: +15% vs last week
- ⚠️ 3 items stale (no activity 5+ days)
- 🔥 2 items overdue (past target date)
- 💡 Most productive day: Tuesday (22h logged)

### 5. Enhanced Item Card Design

**Compact View:**
```
┌───────────────────────────────────────────────────────┐
│ 🎯 User Authentication                    [In Progress]│
│                                                        │
│ 👤 John  •  Est: 16h  •  Act: 12h  •  ⏱️ 2h ago       │
│ [●●●●●●●○○○] 75%  •  🎯 Due: Dec 15  •  🏷️ Backend    │
│                                                        │
│ ⚠️ Over estimate by 4h  |  Last: "Updated schema"     │
└───────────────────────────────────────────────────────┘
```

**Hover Actions:**
```
[+ Log Time] [💬 Comment] [✏️ Edit] [📋 Duplicate] [🗑️ Delete]
```

### 6. Time Logging Modal

When clicking "+ Log Time":
```
┌────────────────────────────────┐
│ Log Time: User Authentication  │
│                                │
│ Hours spent: [___] h           │
│ Date: [Dec 10, 2024 ▼]        │
│ Who: [John ▼]                  │
│                                │
│ What did you do?               │
│ ┌────────────────────────────┐ │
│ │ Implemented JWT tokens     │ │
│ │ and session management     │ │
│ └────────────────────────────┘ │
│                                │
│ [Cancel]  [Log Time]           │
└────────────────────────────────┘
```

### 7. Velocity Chart

**Visual Graph:**
```
Items Completed Per Week
    ┌──────────────────────────┐
 12 │         ╭─╮              │
  8 │    ╭─╮  │ │  ╭─╮         │
  4 │ ╭─╮│ │  │ │  │ │  ╭─╮    │
  0 └─┴─┴┴─┴──┴─┴──┴─┴──┴─┴────┘
     W1 W2  W3   W4   W5   W6

Trend: +15% ↗
```

---

## Database Schema Additions

### New Tables:

**1. roadmap_time_logs**
```sql
CREATE TABLE roadmap_time_logs (
  id UUID PRIMARY KEY,
  roadmap_item_id UUID REFERENCES org_product_roadmap(id),
  user_id UUID REFERENCES auth.users(id),
  hours_logged DECIMAL(5,2),
  work_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**2. roadmap_activity_log**
```sql
CREATE TABLE roadmap_activity_log (
  id UUID PRIMARY KEY,
  roadmap_item_id UUID REFERENCES org_product_roadmap(id),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT, -- 'created', 'updated', 'commented', 'status_changed', 'time_logged'
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Modified Columns (org_product_roadmap):

```sql
ALTER TABLE org_product_roadmap ADD COLUMN estimated_hours DECIMAL(5,2);
ALTER TABLE org_product_roadmap ADD COLUMN actual_hours DECIMAL(5,2) DEFAULT 0;
ALTER TABLE org_product_roadmap ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE org_product_roadmap ADD COLUMN last_activity_at TIMESTAMP;
ALTER TABLE org_product_roadmap ADD COLUMN last_activity_by UUID REFERENCES auth.users(id);
```

---

## UI Components

### 1. TimeTrackingCard (Roadmap Item)
- Displays estimated vs actual hours
- Progress bar with percentage
- Last activity timestamp
- Stale warning indicator
- Assignee avatar with name
- Quick "Log Time" button

### 2. ActivityTimeline (Per Item Detail)
- Chronological log of all changes
- User avatars + names
- Action descriptions
- Timestamps (relative: "2h ago")
- Filter by action type

### 3. VelocityDashboard (Top of Roadmap)
- Team velocity metrics
- Individual contributor breakdowns
- Trend charts (weekly/monthly)
- Most productive times
- Stale items count

### 4. TimeLoggingModal
- Input: hours, date, description
- User selector (if admin logging for someone)
- Auto-calculates actual vs estimated
- Updates progress percentage

### 5. ProductivityInsights (Sidebar Widget)
- Items at risk (no activity 5+ days)
- Over-estimate warnings
- Velocity trends
- Team leaderboard (most hours logged)

---

## Business Rules

### Time Tracking:
1. **Auto-calculate actual hours** from time logs
2. **Progress ≠ time spent** (can be manually adjusted)
3. **Stale after 5 days** of no activity
4. **Overdue** if past target_date and not completed

### Activity Logging (Automatic):
- Item created → Log with "created" action
- Status changed → Log with old/new status
- Assignee changed → Log with old/new assignee
- Time logged → Log with hours + description
- Comment added → Log with comment preview
- Estimate updated → Log with old/new estimate

### Notifications:
- **Stale item alert** (5 days no activity) → Assignee
- **Over-estimate warning** (actual > estimated) → Assignee + Manager
- **Completion milestone** (100% progress) → Team channel
- **Velocity drop** (20% decrease) → Manager

---

## Success Metrics

After implementing, we'll track:
- ✅ Average time to completion (should decrease)
- ✅ Estimate accuracy (actual vs estimated %)
- ✅ Stale item count (should be near 0)
- ✅ Team velocity trend (should increase)
- ✅ Items completed per week (should be consistent)
- ✅ Individual contribution visibility (accountability)

---

## Visual Mockup (Full Item Card)

```
┌────────────────────────────────────────────────────────────────┐
│ 🔥 High Priority                                    [+ Log Time]│
│                                                                 │
│ User Authentication & Session Management          [In Progress]│
│ ────────────────────────────────────────────────────────────── │
│                                                                 │
│ 👤 Assigned to: John Doe                    ⏰ Last: 2h ago    │
│                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│ │ 🕐 Estimated    │  │ ⏱️  Actual       │  │ 📊 Progress     │ │
│ │    16 hours     │  │    12 hours     │  │    75%          │ │
│ │                 │  │    ✅ 4h under  │  │                 │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│ [●●●●●●●○○○○○○○○] 75% complete                                 │
│                                                                 │
│ 🎯 Due: Dec 15, 2024 (5 days)       🏷️ Backend, Security      │
│                                                                 │
│ 📝 Recent Activity:                                             │
│ ──────────────────────────────────────────────────────────────│
│ ● 2h ago - John logged 3h: "Implemented JWT tokens"           │
│ ● 5h ago - Sarah commented: "Looks good, test edge cases"     │
│ ● 1d ago - John moved to In Progress                          │
│ ● 2d ago - Mike updated estimate: 8h → 16h                    │
│                                                                 │
│ [View All Activity (12)]                                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database & Backend (30 min)
- [ ] Create roadmap_time_logs table
- [ ] Create roadmap_activity_log table
- [ ] Add columns to org_product_roadmap
- [ ] Create API endpoints for time logging
- [ ] Create API endpoints for activity fetching

### Phase 2: Time Logging UI (45 min)
- [ ] Build TimeLoggingModal component
- [ ] Add "Log Time" button to item cards
- [ ] Display estimated vs actual hours
- [ ] Show progress percentage
- [ ] Add stale item indicators

### Phase 3: Activity Timeline (30 min)
- [ ] Build ActivityTimeline component
- [ ] Auto-log all item changes
- [ ] Display in item detail view
- [ ] Add "Last activity" timestamp

### Phase 4: Velocity Dashboard (45 min)
- [ ] Build VelocityDashboard component
- [ ] Calculate team metrics
- [ ] Show individual breakdowns
- [ ] Display trend charts
- [ ] Add productivity insights

### Phase 5: Polish & Testing (30 min)
- [ ] Stale item warnings
- [ ] Over-estimate badges
- [ ] Velocity trend indicators
- [ ] Responsive design
- [ ] Build & deploy

**Total Time: ~3 hours**

---

## Key Differentiators

❌ **NOT like Jira/Linear:**
- No complex sprint planning
- No story points
- No velocity calculations based on points
- No burndown charts

✅ **Focus on:**
- **Transparency**: Everyone sees who's working on what
- **Accountability**: Stale items are visible
- **Time awareness**: Estimates vs actuals
- **Activity visibility**: All changes logged
- **Simple**: Hours logged, work done, progress shown

---

## Anti-Lazing Mechanisms

1. **Stale Item Alerts**
   - Items with no activity for 5+ days get flagged
   - Visible to entire team
   - Assignee gets notified

2. **Activity Visibility**
   - Every action is logged with timestamp
   - "Last worked on: 5 days ago" is embarrassing
   - Managers see who's productive

3. **Time Logging Requirement**
   - Moving item to "In Progress" prompts time log
   - Completing item requires total hours logged
   - Missing time logs = incomplete picture

4. **Velocity Trends**
   - Individual contributions visible
   - Team can see who's carrying the load
   - Productivity drops are obvious

5. **Estimate Accountability**
   - Consistently over-estimating = visible
   - Consistently under-delivering = visible
   - Accurate estimators get recognized

---

This design makes laziness IMPOSSIBLE to hide. Every item tells a story of who did what, when, and how long it took.

Ready to implement?
