# Production Testing Checklist
**Deployment URL:** https://myra-status-dashboard.vercel.app
**Date:** 2025-11-12
**Tester:** ___________

---

## 🔐 Authentication & Access

### Login Page (`/support/login`)
- [ ] Page loads without errors
- [ ] Email and password fields are present
- [ ] Login with admin@myra.ai works
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to dashboard
- [ ] Session persists on refresh

### Logout
- [ ] Logout button works
- [ ] Redirects to login page
- [ ] Session is cleared properly

---

## 📊 Dashboard (`/support/dashboard`)

### Page Load
- [ ] Dashboard loads without errors
- [ ] All widgets render correctly
- [ ] No console errors
- [ ] Loading states show properly

### Widgets
- [ ] Personal Impact widget displays metrics
- [ ] Quick Insights widget shows data
- [ ] At Risk Customers widget (if applicable)
- [ ] Todos widget functions
- [ ] Activity feed updates

---

## 🏢 Trial Organizations (`/support/trials`)

### List View
- [ ] Trial organizations list loads
- [ ] Filters work (Active, Expiring, All)
- [ ] Search functionality works
- [ ] Pagination works
- [ ] "New Trial" button accessible
- [ ] Cards display correct data

### Detail Page (`/support/trials/[id]`)
- [ ] Trial detail page loads
- [ ] Overview tab shows data
- [ ] Activity tab works
- [ ] Timeline tab displays events
- [ ] Users tab lists trial users
- [ ] Support Queries tab shows queries
- [ ] Updates tab functions
- [ ] Engagement tab shows metrics
- [ ] Navigation between tabs is smooth

### Create New Trial
- [ ] Modal opens
- [ ] Form validation works
- [ ] Can create new trial
- [ ] Redirects to trial detail page
- [ ] Data saves correctly

---

## 📈 Reports (`/support/reports`)

### Overview
- [ ] Reports page loads
- [ ] Navigation to sub-pages works

### Engagement Report (`/support/reports/engagement`)
- [ ] Page loads without errors
- [ ] Charts render correctly
- [ ] Data displays accurately
- [ ] Filters work properly
- [ ] Date range selection functions
- [ ] Export functionality (if applicable)

---

## ✨ Resources Platform (`/support/resources`) **[NEW]**

### Main Resources Page
- [ ] Page loads successfully
- [ ] Tab switcher (External/Internal) works
- [ ] No AI search bar present (removed as requested)
- [ ] Navigation is clean and simple

### External Resources Tab
- [ ] External resources display
- [ ] Category/folder filtering works
- [ ] Resource cards are clickable
- [ ] Share link functionality works
- [ ] "View Resource" button opens links

### Internal Resources Tab
- [ ] Switches to internal view
- [ ] Three sections visible: Documents, Discussions, Q&A

#### Documents Section
- [ ] Folder filtering works
- [ ] Documents display with metadata
- [ ] "View" button opens documents
- [ ] Vote counts show (if applicable)

#### Discussions Section
- [ ] Discussions list displays
- [ ] Filter buttons work (Trending, Recent)
- [ ] **Discussion cards are clickable** ✅
- [ ] Voting buttons work (up/down)
- [ ] Vote count updates in real-time
- [ ] "Start Discussion" button opens modal

#### Discussion Detail Page (`/support/resources/discussion/[id]`) **[NEW]**
- [ ] Clicking discussion card navigates correctly
- [ ] Discussion detail page loads
- [ ] Full discussion content visible
- [ ] Author info displays correctly (not "Unknown user")
- [ ] Voting interface works
- [ ] Reply form functions
- [ ] Can post replies
- [ ] Replies display correctly
- [ ] Back button works

#### Q&A Hub Section
- [ ] Questions list displays
- [ ] Filter buttons work (Recent, Most Voted, Unanswered)
- [ ] **Question cards are clickable** ✅
- [ ] Voting buttons work
- [ ] "Ask Question" button opens modal
- [ ] **"Show more" pagination works** ✅

#### Question Detail Page (`/support/resources/question/[id]`) **[NEW]**
- [ ] Clicking question card navigates correctly
- [ ] Question detail page loads
- [ ] Full question content visible
- [ ] Author info displays correctly
- [ ] Voting interface works
- [ ] Answer form functions
- [ ] Can post answers
- [ ] Answers display correctly
- [ ] Accept answer button works (for question author)
- [ ] "SOLVED" badge shows when answer accepted
- [ ] Back button works

### Create Discussion
- [ ] Modal opens on "Start Discussion"
- [ ] Title and content fields work
- [ ] Rich text editor functions
- [ ] Tags can be added
- [ ] Form validation works
- [ ] Discussion posts successfully
- [ ] Redirects to detail page (optional)

### Create Question
- [ ] Modal opens on "Ask Question"
- [ ] Question and details fields work
- [ ] Rich text editor functions
- [ ] Tags can be added
- [ ] Form validation works
- [ ] Question posts successfully
- [ ] Redirects to detail page (optional)

### Voting System
- [ ] Upvote increments count
- [ ] Downvote decrements count
- [ ] Cannot vote multiple times
- [ ] Vote state persists on refresh
- [ ] **Voting doesn't trigger parent navigation** ✅

---

## 🎫 Tickets (`/support/tickets`)

### List View
- [ ] Tickets list loads
- [ ] Status filters work
- [ ] Priority filters work
- [ ] Search works
- [ ] Can create new ticket
- [ ] Ticket cards display info

### Detail Page (`/support/tickets/[id]`)
- [ ] Ticket detail loads
- [ ] Comments section works
- [ ] Can add comments
- [ ] Can update status
- [ ] Can change priority
- [ ] Activity timeline shows
- [ ] Attachments work (if applicable)

---

## 👥 Users (`/support/users`) **[ADMIN ONLY]**

### User List
- [ ] Users list loads
- [ ] Role filters work
- [ ] Search works
- [ ] Can view user details
- [ ] Can edit user roles (admin)

### User Management
- [ ] Can create new user
- [ ] Can update user info
- [ ] Can set passwords
- [ ] Permissions enforced correctly

---

## 🗺️ Roadmap (`/support/admin/roadmap`) **[ADMIN ONLY]**

### Kanban View
- [ ] Roadmap board loads
- [ ] Cards display in correct columns
- [ ] Drag and drop works
- [ ] Can create new items
- [ ] Can edit items
- [ ] **Owner assignment works (Admin only)** ✅
- [ ] **RLS policies enforced** ✅

### Owner Management
- [ ] Only admins can assign owners
- [ ] Owner dropdown shows users
- [ ] Assignment saves correctly
- [ ] Non-admins cannot change owners

### Velocity Dashboard
- [ ] Metrics display
- [ ] Charts render
- [ ] Time logging works

---

## 🔔 Notifications (`/support/notifications`)

### Notification List
- [ ] Notifications load
- [ ] Unread count accurate
- [ ] Clicking marks as read
- [ ] Navigation to source works
- [ ] Can mark all as read
- [ ] Real-time updates work

### Notification Types
- [ ] Resource discussion notifications
- [ ] Q&A answer notifications
- [ ] Mention notifications
- [ ] System notifications

---

## 👤 Profile (`/support/profile`)

### Profile Page
- [ ] Profile info displays
- [ ] Can edit profile
- [ ] Password change works
- [ ] Preferences save
- [ ] Avatar/photo updates (if applicable)

---

## 💬 Customer Support Chat Widget **[NEW]**

### Chat Widget
- [ ] Widget icon visible
- [ ] Widget opens on click
- [ ] Can type messages
- [ ] Messages send successfully
- [ ] Real-time messaging works
- [ ] Can create ticket from chat
- [ ] Widget closes properly

---

## 🎨 UI/UX Quality

### General
- [ ] No console errors anywhere
- [ ] All images load
- [ ] Icons display correctly
- [ ] Loading states are smooth
- [ ] Animations work properly
- [ ] Mobile responsive works

### Navigation
- [ ] Sidebar navigation works
- [ ] Breadcrumbs display correctly
- [ ] Back buttons work
- [ ] Links don't break

### Performance
- [ ] Pages load quickly (< 3s)
- [ ] No lag in interactions
- [ ] Real-time updates are fast
- [ ] Charts render smoothly

---

## 🐛 Known Issues to Verify Fixed

### Resources Platform
- [x] ~~AI search removed~~ ✅
- [x] ~~Discussion cards clickable~~ ✅
- [x] ~~Question cards clickable~~ ✅
- [x] ~~"Show more Q&A" button works~~ ✅
- [x] ~~Vote buttons don't trigger navigation~~ ✅
- [x] ~~Author shows correctly (not "Unknown")~~ ✅
- [x] ~~Detail pages exist and work~~ ✅

### Roadmap
- [x] ~~Owner assignments work~~ ✅
- [x] ~~Admin-only owner management~~ ✅
- [x] ~~RLS policies correct~~ ✅

---

## ✅ Test Data Created During Testing

Document all test data created so it can be cleaned up:

### Discussions Created
- [ ] Test Discussion 1: ___________
- [ ] Test Discussion 2: ___________
- [ ] Test Discussion 3: ___________

### Questions Created
- [ ] Test Question 1: ___________
- [ ] Test Question 2: ___________
- [ ] Test Question 3: ___________

### Trial Organizations Created
- [ ] Test Org 1: ___________
- [ ] Test Org 2: ___________

### Tickets Created
- [ ] Test Ticket 1: ___________
- [ ] Test Ticket 2: ___________

### Users Created
- [ ] Test User 1: ___________

### Other Test Data
- [ ] ___________
- [ ] ___________

---

## 📝 Issues Found

Document any issues discovered during testing:

| Issue # | Page/Feature | Description | Severity | Status |
|---------|-------------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## ✅ Sign-off

- [ ] All critical features tested
- [ ] All known issues verified as fixed
- [ ] No blocking bugs found
- [ ] Test data documented for cleanup
- [ ] Ready for cleanup phase

**Tester Signature:** ___________
**Date Completed:** ___________

---

## Next Step: Run Cleanup Script

After testing is complete and all issues are documented, run:
```bash
node scripts/cleanup-production-test-data.js
```
