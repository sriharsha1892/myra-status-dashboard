# Page Inventory & Navigation Status

## 📊 Summary
- **Total Pages**: 57
- **Linked in Main Nav**: 10
- **Sub-pages (Accessible via links)**: 28
- **Hidden/Debug/Orphaned**: 19

---

## ✅ PAGES IN MAIN NAVIGATION

### Public/Auth Pages
1. ✅ `/support/login` - Login page
2. ✅ `/support/signup` - Signup page (if enabled)

### Main Navigation (Sidebar)
3. ✅ `/support/dashboard` - Dashboard
4. ✅ `/support/notifications` - Notifications Center
5. ✅ `/support/trials` - Trial Organizations
6. ✅ `/support/reports` - Reports Hub
7. ✅ `/support/documents` - Resources/Documents
8. ✅ `/support/tickets` - Tickets
9. ✅ `/support/users` - Users (Admin only)
10. ✅ `/support/admin/roadmap` - Roadmap (Admin only)
11. ✅ `/support/admin/announcements` - Announcements (Admin only)
12. ✅ `/support/profile` - User Profile

---

## 🔗 SUB-PAGES (Accessible via links/buttons in parent pages)

### Trial Organization Sub-pages
13. ✅ `/support/trials/[id]` - Trial Detail Page
14. ✅ `/support/trials/new` - Create New Trial (via "Add New Trial" button)
15. ✅ `/support/trials/parse` - Parse Text (via "Parse Text" button)
16. ✅ `/support/trials/bulk-edit` - Bulk Edit Trials
17. ✅ `/support/trials/users/[userId]` - Trial User Detail
18. ✅ `/support/trials/features` - Trial Features
19. ✅ `/support/trials/follow-ups` - Follow-ups
20. ✅ `/support/trials/roadmap` - Trial Roadmap
21. ✅ `/support/trials/meetings/[id]` - Meeting Detail
22. ✅ `/support/trials/meetings` - Meetings List
23. ✅ `/support/trials/meetings/actions` - Meeting Actions
24. ✅ `/support/trials/demos/[id]` - Demo Detail
25. ✅ `/support/trials/demos` - Demos List

### Report Sub-pages
26. ✅ `/support/reports/engagement` - Engagement Report (linked from /support/reports)

### Admin Import Pages
27. ✅ `/support/admin/trial-orgs-import` - Import Trial Orgs (via "Import CSV" button)
28. ✅ `/support/admin/bulk-activity-import` - Bulk Activity Import
29. ✅ `/support/admin/bulk-activity` - Bulk Activity
30. ✅ `/support/admin/roadmap-import` - Roadmap Import
31. ✅ `/support/admin/users` - Admin Users Management

### Ticket Sub-pages
32. ✅ `/support/tickets/[id]` - Ticket Detail Page

### Organization Pages
33. ✅ `/support/organizations/[id]/health` - Organization Health

### Settings Pages
34. ✅ `/support/settings/teams` - Teams Settings
35. ✅ `/support/settings/templates` - Templates Settings
36. ✅ `/support/settings/users` - Users Settings

---

## ❌ PAGES NOT LINKED IN UI (Orphaned/Hidden/Debug)

### Trial Import Pages (Accessible but no UI link)
37. ⚠️ `/support/trials/import` - Trial Import (Old? Replaced by admin version?)
38. ⚠️ `/support/trials/import-demo-log` - Import Demo Log

### Feature Proposals
39. ⚠️ `/support/feature-proposals` - Feature Proposals Page
   - **Should be linked**: This seems like a useful feature!
   - **Suggested location**: Main navigation or under a "Product" section

### Analytics
40. ⚠️ `/support/analytics` - Analytics Page
   - **Should be linked**: Analytics could be valuable
   - **Suggested location**: Next to Reports in main nav

### Submit Page
41. ⚠️ `/support/submit` - Submit Page
   - **Purpose unclear**: What is this for?

### Root Support Page
42. ⚠️ `/support/page.tsx` - Support root (redirects?)

### Old/Legacy Admin Pages
43. ⚠️ `/admin/page.tsx` - Old admin page
44. ⚠️ `/admin/login/page.tsx` - Old admin login

### Debug/Emergency Pages
45. ⚠️ `/support/debug-auth` - Auth Debugging
46. ⚠️ `/debug-env` - Environment Debugging
47. ⚠️ `/admin-users-emergency` - Emergency User Management
48. ⚠️ `/emergency-users` - Emergency Users
49. ⚠️ `/force-logout` - Force Logout Utility

### Utility/Test Pages
50. ⚠️ `/bulk-edit` - Bulk Edit (root level, duplicate?)
51. ⚠️ `/test-features` - Test Features Page
52. ⚠️ `/widget-demo` - Widget Demo
53. ⚠️ `/widget` - Widget Page
54. ⚠️ `/unauthorized` - Unauthorized Page

### Root Pages
55. ⚠️ `/page.tsx` - Root landing page
56. ⚠️ `/status` - Status page (health check?)

---

## 🎯 RECOMMENDATIONS FOR LINKING

### High Priority - Should Be in Main Navigation
1. **Feature Proposals** (`/support/feature-proposals`)
   - Add to main nav as "Feature Requests" or "Proposals"
   - Icon: Lightbulb or Sparkles
   - Position: After Documents

2. **Analytics** (`/support/analytics`)
   - Add to main nav as "Analytics"
   - Icon: TrendingUp or Activity
   - Position: After Reports or combine with Reports

### Medium Priority - Should Be Accessible
3. **Trial Import** (`/support/trials/import`)
   - Link from Trial Orgs page (admin only)
   - Or consolidate with `/support/admin/trial-orgs-import`

4. **Settings** (teams, templates, users)
   - Add a "Settings" section in nav (Admin only)
   - Icon: Settings
   - Position: Above Profile in bottom section

### Low Priority - Keep Hidden (Debug/Emergency)
5. Debug pages - Keep these as direct URL access only
6. Emergency pages - Keep these as direct URL access only
7. Widget/Demo pages - Development only

### Should Be Removed (if not used)
8. Old admin pages (`/admin/*`) if not actively used
9. Duplicate bulk-edit at root level
10. `/support/submit` if purpose is unclear

---

## 🗺️ SUGGESTED NAVIGATION STRUCTURE

```
Main Navigation:
├── Dashboard
├── Notifications
├── Trial Orgs
│   ├── All Trials
│   ├── New Trial
│   ├── Parse Text
│   ├── Meetings
│   ├── Demos
│   ├── Features
│   └── Follow-ups
├── Reports
│   ├── Overview
│   └── Engagement
├── Analytics (NEW)
├── Resources
├── Tickets
├── Feature Requests (NEW)
├── Users (Admin)
├── Roadmap (Admin)
├── Announcements (Admin)
│
Bottom Section:
├── Settings (NEW - Admin)
│   ├── Teams
│   ├── Templates
│   └── Users
├── Profile
└── Sign Out
```

---

## 📝 NAVIGATION GAPS IDENTIFIED

### Missing Sub-navigation for Trial Orgs
The Trials section has many sub-pages but no secondary navigation:
- Meetings
- Demos
- Features
- Follow-ups
- Import/Bulk Edit

**Suggestion**: Add tabs or dropdown menu in `/support/trials` page header

### Missing Settings Section
Settings pages exist but aren't linked:
- `/support/settings/teams`
- `/support/settings/templates`
- `/support/settings/users`

**Suggestion**: Add "Settings" to main nav (Admin only)

### Missing Quick Actions
Some useful actions buried:
- Parse Text (exists but could be more prominent)
- Import Trial Orgs
- Bulk Edit

**Suggestion**: Keep Quick Capture Hub design we implemented

---

## 🧪 TESTING PRIORITY ORDER

Based on the main user flows, test in this order:

### Phase 1: Core Workflows (High Priority)
1. ✅ Login → Dashboard
2. ✅ Dashboard → Trial Orgs → View Trial → Edit Trial
3. ✅ Create New Trial (form)
4. ✅ Parse Text (AI feature)
5. ✅ Reports → Engagement Report
6. ✅ Tickets → Create → View → Comment

### Phase 2: Admin Features
7. ✅ User Management
8. ✅ Roadmap Management
9. ✅ Announcements
10. ✅ Bulk Import/Edit

### Phase 3: Secondary Features
11. ⚠️ Meetings Management
12. ⚠️ Demos Tracking
13. ⚠️ Feature Proposals (if linked)
14. ⚠️ Analytics (if linked)
15. ⚠️ Settings Pages

### Phase 4: Edge Cases
16. ⚠️ Notifications workflow
17. ⚠️ Profile management
18. ⚠️ Trial user detail pages
19. ⚠️ Organization health pages

---

## 🚨 PAGES THAT NEED ATTENTION

1. **Feature Proposals** - Orphaned but potentially valuable
2. **Analytics** - Orphaned but potentially valuable
3. **Settings Pages** - Exist but not linked
4. **Meetings/Demos** - Exist but hard to discover
5. **Old Admin Pages** - Should be deprecated if not used

---

## ✅ READY FOR TESTING

All main navigation pages are linked and accessible:
- Dashboard ✅
- Notifications ✅
- Trial Orgs ✅
- Reports ✅
- Resources/Documents ✅
- Tickets ✅
- Users (Admin) ✅
- Roadmap (Admin) ✅
- Announcements (Admin) ✅
- Profile ✅

Most sub-pages are accessible via buttons/links in parent pages.
