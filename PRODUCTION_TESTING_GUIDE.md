# Production Testing Quick Start Guide

**Production URL:** https://myra-status-dashboard.vercel.app

---

## 🚀 Testing Workflow

### 1. **Login to Production**
```
URL: https://myra-status-dashboard.vercel.app/support/login
Credentials: admin@myra.ai / [your password]
```

### 2. **Follow the Checklist**
Open `PRODUCTION_TEST_CHECKLIST.md` and systematically test each feature.

### 3. **Document Test Data**
As you create test items (discussions, questions, tickets), document their IDs in the checklist.

### 4. **Run Cleanup**
After testing is complete:
```bash
# Dry run (see what would be deleted)
DRY_RUN=true node scripts/cleanup-production-test-data.js

# Actual cleanup
node scripts/cleanup-production-test-data.js
```

---

## 🎯 Priority Testing Areas

### **CRITICAL** - Test These First

1. **Resources Platform** (Newly Built)
   - Navigate to `/support/resources`
   - Test both External and Internal tabs
   - **Click on discussion cards** - should navigate to detail page
   - **Click on question cards** - should navigate to detail page
   - Test voting (should NOT navigate when voting)
   - Verify author names show correctly (not "Unknown")
   - Test "Show more Q&A" pagination

2. **Discussion Detail Pages** (New Feature)
   - Click any discussion from Internal → Discussions
   - Verify full content loads
   - Test voting on detail page
   - Test posting replies
   - Test back navigation

3. **Question Detail Pages** (New Feature)
   - Click any question from Internal → Q&A
   - Verify full content loads
   - Test voting on detail page
   - Test posting answers
   - Test accepting answers (if you're the question author)
   - Verify "SOLVED" badge appears

4. **Roadmap Owner Management** (Fixed)
   - Go to `/support/admin/roadmap`
   - Verify only admins can assign owners
   - Test assigning an owner to a roadmap item
   - Verify non-admins cannot change owners

### **IMPORTANT** - Test These Next

5. **Dashboard**
   - Verify all widgets load
   - Check for any console errors

6. **Trials**
   - Navigate through trial detail tabs
   - Test timeline functionality

7. **Reports**
   - Check engagement report charts
   - Verify data displays correctly

8. **Tickets**
   - Create a test ticket
   - Add comments
   - Change status/priority

### **NICE TO HAVE** - Test If Time Permits

9. **Customer Support Chat**
   - Test the chat widget
   - Send a message
   - Create ticket from chat

10. **Notifications**
    - Check notification bell
    - Test real-time updates

---

## 📝 Creating Test Data

### Example Test Items to Create:

#### Test Discussion
```
Title: "TEST: Sample Discussion for Production Verification"
Content: "This is a test discussion created during production testing. Will be deleted."
Tags: test, demo
```

#### Test Question
```
Question: "TEST: How do we clean up test data?"
Details: "This is a test question. Please delete after testing."
Tags: test, cleanup
```

#### Test Ticket
```
Title: "TEST: Sample Support Ticket"
Description: "Test ticket for production verification. Delete after testing."
Priority: Low
```

---

## ✅ Verification Checklist

### Fixes to Verify

- [x] AI search removed from Resources ✅
- [x] Discussion cards are clickable ✅
- [x] Question cards are clickable ✅
- [x] Vote buttons don't navigate ✅
- [x] "Show more Q&A" works ✅
- [x] Author names display correctly ✅
- [x] Detail pages exist and function ✅
- [x] Roadmap owner assignments work ✅

### New Features to Test

- [x] Discussion detail pages ✨
- [x] Question detail pages ✨
- [x] Reply/Answer functionality ✨
- [x] Accept answer feature ✨
- [x] Customer support chat widget ✨

---

## 🧹 Cleanup Process

### Step 1: Review Test Data
Check the checklist for all test items created:
- Discussions: ___
- Questions: ___
- Tickets: ___
- Trial Orgs: ___

### Step 2: Dry Run
```bash
DRY_RUN=true node scripts/cleanup-production-test-data.js
```

This will show you what would be deleted without actually deleting anything.

### Step 3: Actual Cleanup
```bash
node scripts/cleanup-production-test-data.js
```

⚠️ **Warning:** This will wait 5 seconds before starting. Press Ctrl+C to cancel.

### Step 4: Verify Cleanup
- Re-check Resources page - test items should be gone
- Re-check Tickets - test tickets should be gone
- Re-check any other areas where test data was created

---

## 🐛 If You Find Issues

### Document in the Checklist
Use the "Issues Found" table in `PRODUCTION_TEST_CHECKLIST.md`

### Report Critical Issues
1. Take screenshots
2. Note the exact steps to reproduce
3. Check browser console for errors
4. Document in the checklist

---

## 📊 Expected Results

### What Should Work Perfectly

✅ All navigation
✅ All newly built features (Resources, Discussions, Q&A)
✅ Clickable cards and buttons
✅ Voting without navigation
✅ Detail pages loading
✅ Form submissions
✅ Real-time updates

### What Might Need Attention

⚠️ Performance on slow connections
⚠️ Mobile responsiveness
⚠️ Browser compatibility
⚠️ Edge cases in forms

---

## 🎉 Success Criteria

Testing is complete when:

1. ✅ All items in checklist are checked
2. ✅ All critical features work correctly
3. ✅ No blocking bugs found
4. ✅ Test data is documented
5. ✅ Issues (if any) are documented
6. ✅ Cleanup script has been run
7. ✅ Production is clean and ready for users

---

## 🆘 Need Help?

If you encounter issues during testing:

1. Check browser console for errors
2. Take screenshots
3. Note the exact URL and steps
4. Document in the checklist
5. We can fix before cleanup

---

## Quick Command Reference

```bash
# Start local dev server (for comparison)
npm run dev

# Dry run cleanup (safe to run anytime)
DRY_RUN=true node scripts/cleanup-production-test-data.js

# Actual cleanup (after testing complete)
node scripts/cleanup-production-test-data.js
```

---

## Time Estimate

- **Full Testing:** 45-60 minutes
- **Quick Smoke Test:** 15-20 minutes
- **Cleanup:** 2-3 minutes

**Total:** ~1 hour for complete testing and cleanup

---

Good luck with testing! 🚀
