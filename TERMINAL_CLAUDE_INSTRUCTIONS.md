# Terminal Claude Integration Instructions

## Overview
This document provides instructions for integrating and testing the **Customer Health Scoring System** and **Dashboard Enhancements** that were built in this session.

---

## What Was Built

### 1. Customer Health Scoring System
A comprehensive system for monitoring customer health and identifying at-risk accounts.

**Key Components:**
- `lib/health-scoring.ts` - Health scoring algorithm with 4 weighted metrics
- `components/support/CustomerHealthCard.tsx` - Full customer health view (icon-free, stellar UI)
- `app/support/organizations/[id]/health/page.tsx` - Standalone health page per organization
- `components/support/AtRiskCustomers.tsx` - Dashboard widget showing top 5 at-risk customers

**Health Metrics (Weighted Calculation):**
- **Engagement (35%)** - Login frequency, feature usage
- **Support (30%)** - Open tickets, critical issues
- **Feature Usage (20%)** - Feature adoption rate
- **Responsiveness (15%)** - Response to outreach

**Health Score Ranges:**
- 80-100: Healthy (Green)
- 60-79: Fair (Yellow)
- 40-59: Poor (Orange)
- 0-39: Critical (Red)

### 2. Dashboard Enhancements
Enhanced the main support dashboard with customer health integration.

**Changes to `/app/support/dashboard/page.tsx`:**
- Added `AtRiskCustomers` component import
- Integrated "At-Risk Customers" section between metric cards and tickets table
- Shows top 5 customers with health score < 70, sorted by severity
- Click any customer to navigate to full health page

**Visual Design:**
- Rank badges with color-coded backgrounds
- Health scores with trend indicators (↗ ↘ →)
- Critical issue counts highlighted in red
- Horizontal health bar visualization
- Clean, modern UI without icons (consistent with CustomerHealthCard redesign)

---

## Database Requirements

### Required Tables

The system expects these Supabase tables to exist:

1. **`organizations`** table:
   ```sql
   - id (uuid, primary key)
   - name (text)
   - status (text: 'trial' | 'paid' | 'cancelled')
   - trial_end_date (timestamp, nullable)
   - created_at (timestamp)
   - last_activity (timestamp, nullable)
   - last_outreach (timestamp, nullable)
   - last_response (timestamp, nullable)
   - account_manager (text, nullable)
   ```

2. **`support_tickets`** table:
   ```sql
   - id (uuid, primary key)
   - org_id (uuid, foreign key to organizations)
   - title (text)
   - priority (text: 'low' | 'medium' | 'high' | 'critical')
   - status (text: 'open' | 'in_progress' | 'resolved' | 'closed')
   - created_at (timestamp)
   - updated_at (timestamp)
   ```

3. **`user_activity_logs`** (optional, currently uses mock data):
   ```sql
   - date (date)
   - org_id (uuid, foreign key to organizations)
   - login_count (integer)
   - actions_count (integer)
   ```

### Database Schema Check
Run this query in Supabase SQL Editor to verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'support_tickets', 'user_activity_logs');
```

---

## Testing Instructions

### Step 1: Verify File Changes
```bash
cd /home/user/myra-status-dashboard

# Check git status
git status

# You should see these modified/new files:
# - components/support/CustomerHealthCard.tsx (modified - icons removed)
# - components/support/AtRiskCustomers.tsx (new)
# - app/support/dashboard/page.tsx (modified)
# - lib/health-scoring.ts (should exist from previous work)
# - app/support/organizations/[id]/health/page.tsx (should exist)
```

### Step 2: Install Dependencies
```bash
# Ensure all dependencies are installed
npm install
```

### Step 3: Run Development Server
```bash
npm run dev
```

### Step 4: Test Dashboard Integration
1. Navigate to `http://localhost:3000/support/dashboard`
2. Log in with account manager or admin credentials
3. Verify the dashboard loads successfully
4. **Check "At-Risk Customers" section:**
   - Should appear between metric cards and tickets table
   - Shows up to 5 customers with health score < 70
   - Each customer shows: rank badge, name, trial status, issues count, health score, trend
   - If no at-risk customers exist, should show "No at-risk customers found" message
5. **Test interaction:**
   - Click on any at-risk customer
   - Should navigate to `/support/organizations/[id]/health`

### Step 5: Test Full Health View
1. Navigate to a specific customer health page:
   - Click from At-Risk Customers widget, OR
   - Navigate directly to `/support/organizations/[org-id]/health`
2. **Verify CustomerHealthCard displays:**
   - ✅ Colored accent bar at top (emerald/amber/orange/red based on health)
   - ✅ Large health score percentage with trend (Improving/Stable/Declining)
   - ✅ Issues detected list (if any)
   - ✅ Recommended actions with numbered badges
   - ✅ Activity timeline (last 7 days) with gradient bars
   - ✅ Recent tickets with priority badges
   - ✅ Last interaction status
   - ✅ Health breakdown bars (Engagement, Support, Feature Use, Response, Overall)
   - ✅ Quick action buttons (Call, Email, Extend Trial, Schedule Meeting)
   - ✅ **NO Lucide React icons** (Phone, Mail, Calendar, etc. should be removed)
3. **Test quick actions:**
   - Click "Call Customer" - should trigger phone dialer
   - Click "Send Email" - should navigate to email page
   - Click "Extend Trial 7d" (if trial org) - should extend trial and show success toast
   - Click "Schedule Meeting" - should navigate to schedule page
   - Click "Assign" on any ticket - should navigate to ticket detail page

### Step 6: Verify Health Scoring Algorithm
Test with different data scenarios:

**Scenario A: Healthy Customer**
- Expected: Score 80+, green indicator, few/no issues
- Characteristics: Regular logins, low ticket count, responsive

**Scenario B: At-Risk Customer**
- Expected: Score 40-69, orange/yellow indicator, multiple issues
- Characteristics: Declining activity, open tickets, unresponsive

**Scenario C: Critical Customer**
- Expected: Score <40, red indicator, urgent recommendations
- Characteristics: No recent logins, critical tickets, no response to outreach

### Step 7: Check for Errors
Monitor browser console and terminal for:
- ❌ TypeScript compilation errors
- ❌ Runtime errors
- ❌ 404 errors for missing resources
- ❌ Supabase query errors
- ✅ Should see clean logs with no errors

### Step 8: Test Responsive Design
1. Open browser dev tools
2. Test at different viewport sizes:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1440px)
3. Verify layout adjusts appropriately

---

## Known Considerations

### Mock Data Usage
Currently using **mock activity logs** in both:
- `AtRiskCustomers.tsx` (line 93)
- `app/support/organizations/[id]/health/page.tsx` (line 77)

**In Production:**
Replace `generateMockActivityLogs()` with real data from `user_activity_logs` table:

```typescript
// Replace this:
const mockActivityLogs = generateMockActivityLogs();

// With this:
const { data: activityLogs } = await supabase
  .from('user_activity_logs')
  .select('date, login_count, actions_count')
  .eq('org_id', orgId)
  .order('date', { ascending: false })
  .limit(7);
```

### Performance Optimization
`AtRiskCustomers.tsx` currently fetches and analyzes **up to 20 organizations** on every dashboard load. For production with many customers:

**Option 1:** Implement server-side caching
```typescript
// Cache health scores in Redis/Supabase with TTL
// Refresh every 15-30 minutes
```

**Option 2:** Pre-compute health scores
```typescript
// Add `health_score` column to organizations table
// Update via scheduled job (cron/edge function)
```

**Option 3:** Implement pagination
```typescript
// Show "Load more" button for additional at-risk customers
```

### Styling Consistency
Both `CustomerHealthCard` and `AtRiskCustomers` use **icon-free design** with:
- Typography hierarchy (font sizes, weights, tracking)
- Strategic color (emerald/amber/orange/red at 500-weight)
- Generous spacing (px-6, py-4, gap-4)
- Subtle borders and backgrounds

If you add icons back, it will break the design consistency.

---

## Integration Checklist

Before deploying to production:

- [ ] Verify all database tables exist and have correct schema
- [ ] Replace mock activity logs with real data queries
- [ ] Test with real customer data (at least 10+ organizations)
- [ ] Implement performance optimizations (caching or pre-computation)
- [ ] Test quick actions (call, email, extend trial, schedule)
- [ ] Verify email templates exist for "Send Email" action
- [ ] Test role-based access (AM should only see their customers)
- [ ] Add error boundaries for graceful error handling
- [ ] Implement real-time updates (optional: subscribe to Supabase changes)
- [ ] Test with slow network conditions
- [ ] Verify responsive design on mobile devices
- [ ] Add analytics tracking for health score views
- [ ] Document health score thresholds for team

---

## Deployment Steps

### 1. Commit Changes
```bash
git add -A
git commit -m "Add Customer Health Dashboard Integration

- Create AtRiskCustomers component for dashboard
- Integrate health scoring into main dashboard
- Show top 5 at-risk customers (score < 70)
- Add navigation to full health view
- Update CustomerHealthCard with icon-free design
- Implement health trend indicators"
```

### 2. Push to Remote
```bash
git push -u origin claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
```

### 3. Create Pull Request
- Merge into main branch after review
- Deploy to staging environment first
- Run smoke tests before production

### 4. Run Database Migrations
If adding `user_activity_logs` table:
```sql
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  login_count INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, date)
);

CREATE INDEX idx_activity_logs_org_date ON user_activity_logs(org_id, date DESC);
```

---

## Troubleshooting

### Issue: "No at-risk customers found" always shows
**Cause:** No organizations with health score < 70, or database is empty
**Fix:** Add test organizations with varying health metrics, or adjust threshold in `AtRiskCustomers.tsx:72`

### Issue: Health page shows "Organization not found"
**Cause:** Invalid org ID in URL, or organization doesn't exist
**Fix:** Verify organization exists in database, check URL parameter

### Issue: Build errors with TypeScript
**Cause:** Type mismatches in Supabase queries
**Fix:** Check `lib/supabase/types.ts` is up to date, run `npx supabase gen types typescript`

### Issue: "Failed to load organization health data" error
**Cause:** Missing database tables or permissions
**Fix:** Verify Supabase RLS policies allow reading from organizations and support_tickets tables

### Issue: Quick actions don't work
**Cause:** Missing route handlers or phone/email integration
**Fix:** Implement the corresponding pages/API routes for each action

---

## Questions or Issues?

If you encounter any problems during testing:

1. Check browser console for client-side errors
2. Check terminal for server-side errors
3. Verify Supabase connection and RLS policies
4. Review this document's troubleshooting section
5. Check git commit history for recent changes

---

## Success Criteria

✅ Dashboard loads without errors
✅ At-Risk Customers widget displays correctly
✅ Clicking customer navigates to health page
✅ CustomerHealthCard shows all sections (no icons)
✅ Health scores calculate correctly
✅ Trend indicators display properly
✅ Quick actions are clickable
✅ Responsive design works on all devices
✅ No TypeScript or runtime errors

---

**Built by:** Web Claude
**Session:** claude/roadmap-linear-011CUoKacgEqC19YU41jWH9j
**Date:** 2025-11-06
**Files Modified:** 3 (2 new, 1 modified)
**Lines Added:** ~550
