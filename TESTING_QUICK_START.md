# Testing Quick Start Guide

## 🎉 What's Been Completed

### ✅ Automated Tests (100% Passing)
- **Trial Organizations Flow**: All 10 tests passing
  - Create, Read, Update, Delete
  - Filter by lifecycle stage, account manager, domain
  - Search by name
  - Order by date

### ✅ Documentation Created
1. **PAGE_INVENTORY.md** - Complete list of all 57 pages
2. **COMPREHENSIVE_TEST_PLAN.md** - Detailed testing strategy
3. **TEST_RESULTS.md** - Full automated test results
4. **This file** - Quick start guide

---

## 🚀 Quick Commands

### Run Automated Tests

```bash
# Run trial organizations flow test (100% passing)
npx tsx scripts/test-trial-orgs-flow-v2.ts

# Check database schema
npx tsx scripts/check-database-schema.ts

# Check user roles
npx tsx scripts/check-user-roles.ts

# Test shared notifications (from previous session)
npx tsx scripts/test-shared-notifications.ts
```

---

## 📋 UI Testing - Start Here

### Phase 1: Authentication & Trial Orgs (30 minutes)

1. **Login**
   ```
   URL: http://localhost:3000/support/login
   Use your admin credentials
   ```

2. **View Dashboard**
   ```
   URL: http://localhost:3000/support/dashboard
   Verify: Quick stats, recent activity
   ```

3. **Test Quick Capture Hub** (NEW DESIGN)
   ```
   URL: http://localhost:3000/support/trials
   - Click "Add New Trial" card
   - Click "Parse Text" card
   - Verify the 4-card compact layout
   ```

4. **Create Trial Organization**
   ```
   - Use "Add New Trial" button
   - Fill all required fields
   - Verify form validation
   - Submit and confirm creation
   ```

5. **Test Card View** (NEW DESIGN)
   ```
   - View trial orgs list
   - Check left border accent colors
   - Verify clean typography
   - Test hover effects
   - Click a card to view details
   ```

6. **Test Parse Text** (ENHANCED)
   ```
   URL: http://localhost:3000/support/trials/parse
   - Paste sample text with company info
   - Verify AI extraction
   - Edit any fields
   - Save as trial org
   ```

### Phase 2: Reports & Analytics (15 minutes)

7. **Test Reports Dashboard** (REDESIGNED)
   ```
   URL: http://localhost:3000/support/reports/engagement
   - Verify filters are collapsed by default
   - Expand filters
   - Check chart sizes (400px/320px)
   - Toggle "Show Data" button
   - Verify table appears/hides
   ```

### Phase 3: Notifications (10 minutes)

8. **Test Shared Notifications**
   ```
   - Click notification bell icon
   - View unread notifications
   - Mark a notification as complete
   - Verify other admins see completion (if multiple admins logged in)
   ```

### Phase 4: Tickets (15 minutes)

9. **Create and Manage Tickets**
   ```
   URL: http://localhost:3000/support/tickets
   - Create new ticket
   - Add comment
   - Change status
   - Assign to user
   - Filter by status
   ```

### Phase 5: Roadmap (10 minutes)

10. **Test Roadmap**
    ```
    URL: http://localhost:3000/support/admin/roadmap
    - View roadmap items
    - Create new item
    - Change status
    - Filter by quarter
    ```

---

## 🔍 What to Look For

### Visual/UX Checks
- ✨ **Quick Capture Hub**: Compact 4-card layout (no large hero button)
- 🎨 **Card View**: Left border accent, clean typography, status dots
- 📊 **Reports**: Charts prominent, filters collapsed, data table hidden by default
- 📝 **Parse Text**: Full editable form, AI extraction working

### Functional Checks
- ✅ All forms validate correctly
- ✅ Data saves without errors
- ✅ Filters work as expected
- ✅ Search returns relevant results
- ✅ Notifications update in real-time

### Performance Checks
- ⚡ Pages load within 2 seconds
- ⚡ No console errors
- ⚡ Smooth transitions and animations

---

## 🐛 Found an Issue?

If you encounter any issues:

1. **Check Console**
   ```
   Open browser DevTools > Console tab
   Look for errors (red text)
   ```

2. **Check Network**
   ```
   DevTools > Network tab
   Look for failed requests (red status codes)
   ```

3. **Run Automated Tests**
   ```bash
   npx tsx scripts/test-trial-orgs-flow-v2.ts
   ```
   If automated tests pass but UI fails, it's likely a UI-specific issue.

---

## 📊 Test Progress Tracker

Copy this checklist and check items as you test:

### Core Features
- [ ] Login/Authentication
- [ ] Dashboard view
- [ ] Quick Capture Hub (new design)
- [ ] Create trial org (form)
- [ ] Parse text (AI feature)
- [ ] Card view (new design)
- [ ] Trial org details page
- [ ] Reports dashboard (new design)
- [ ] Filters (collapsible)
- [ ] Charts (prominent)
- [ ] Data table toggle

### Secondary Features
- [ ] Tickets (create/view/comment)
- [ ] Roadmap (view/create/filter)
- [ ] Notifications (bell icon)
- [ ] User management (admin)
- [ ] Announcements (admin)

### Edge Cases
- [ ] Form validation errors
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsiveness

---

## 🎯 Priority Order

**If you have limited time**, test in this order:

1. **High Priority** (Must test)
   - Login
   - Quick Capture Hub
   - Create trial org
   - Card view
   - Parse text

2. **Medium Priority** (Should test)
   - Reports dashboard
   - Filters and search
   - Tickets workflow

3. **Low Priority** (Nice to test)
   - Roadmap
   - Announcements
   - Edge cases

---

## ✅ Success Criteria

You can consider testing complete when:

- ✅ All high priority items work without errors
- ✅ New UI designs (Quick Capture, Card View, Reports) look good
- ✅ At least one end-to-end flow works (e.g., create trial org → view → update)
- ✅ No critical bugs blocking normal usage

---

## 📞 Next Steps After Testing

Once UI testing is complete:

1. **Report Issues**
   - Note any bugs found
   - Document steps to reproduce
   - Include screenshots if visual issues

2. **Verify Fixes**
   - Re-run automated tests
   - Re-test affected UI areas

3. **Production Readiness**
   - All tests passing
   - No critical bugs
   - Performance acceptable
   - Ready to deploy!

---

## 💡 Pro Tips

- **Use Multiple Browser Tabs**: Test concurrent admin sessions to verify notifications
- **Check Mobile View**: Toggle device mode in DevTools
- **Test with Real Data**: Create multiple trial orgs to test filtering/search
- **Time Yourself**: Note how long each task takes (UX metric)
- **Take Screenshots**: Before/after comparisons of new designs

---

## 🚨 Known Limitations

Based on automated testing:

1. **Tables Not Tested Yet**
   - Resources/Documents (table not found)
   - Trial Org Activities (table not found)

2. **Empty Tables**
   - Tickets (exists but empty until UI tested)
   - Roadmap Notes (exists but empty until UI tested)

3. **Schema Differences**
   - Roadmap uses `roadmap_notes` not `roadmap_items`
   - Trial orgs uses `org_id` not `id`
   - Lifecycle stages: `trial_active`, `prospect`, `customer`

These are not bugs - just differences between expected vs actual schema that have been documented.

---

**Ready to start testing? Begin with Phase 1! 🚀**
