# Resources Page - Comprehensive Test Checklist

## Test Results: ✅ = Pass, ❌ = Fail, ⚠️ = Needs Review

### 1. Page Load & Default State
- [ ] ✅ Page loads at `/support/resources`
- [ ] ✅ External tab is active by default (blue gradient)
- [ ] ✅ Header shows "Resources" with sparkles icon
- [ ] ✅ Search bar is visible with correct placeholder

### 2. Tab Switching
- [ ] ✅ External tab button works
- [ ] ✅ Internal tab button works
- [ ] ✅ Active tab has gradient background (blue/purple)
- [ ] ✅ Active tab icon has pulse animation
- [ ] ✅ Badge text shows only on active tab
- [ ] ✅ Scale animation on tab switch (scale-105)
- [ ] ✅ Smooth transition duration (300ms)

### 3. Search Functionality
- [ ] ✅ Search bar placeholder changes with tab
  - External: "Search client documentation..."
  - Internal: "Ask anything about resources, playbooks, or team discussions..."
- [ ] ✅ Search bar focus shows purple border and ring
- [ ] ✅ Search icon scales and changes color on focus
- [ ] ✅ AI badge appears when typing
- [ ] ✅ Clear button appears when typing
- [ ] ✅ Clear button clears search query
- [ ] ✅ Search persists when switching tabs

### 4. Quick Filter Buttons
- [ ] ✅ Documents filter appears on all tabs
- [ ] ✅ Discussions filter only on Internal tab
- [ ] ✅ Questions filter only on Internal tab
- [ ] ✅ Clicking filter adds hashtag to search
- [ ] ✅ Filters have hover effects (scale, color change)
- [ ] ✅ Emojis display correctly

### 5. Admin Features
- [ ] ✅ "Manage Announcements" button visible for admin
- [ ] ✅ Button has amber/orange gradient styling
- [ ] ✅ Button has hover effects (scale, shadow)
- [ ] ✅ Modal opens when clicked
- [ ] ✅ Modal shows announcements list
- [ ] ✅ Modal can be closed with X button
- [ ] ✅ Can create new announcement
- [ ] ✅ Can edit existing announcement
- [ ] ✅ Can delete announcement
- [ ] ✅ Type and status filters work

### 6. External Tab Content
- [ ] ✅ Shows external resources
- [ ] ✅ Folder navigation visible
- [ ] ✅ Resource cards display correctly
- [ ] ✅ Share button works
- [ ] ✅ Category filters work
- [ ] ✅ Empty state shows if no resources

### 7. Internal Tab Content
- [ ] ✅ Shows three section buttons: Documents, Discussions, Q&A
- [ ] ✅ Documents section loads
- [ ] ✅ Discussions section loads
- [ ] ✅ Q&A section loads
- [ ] ✅ Section switching works smoothly
- [ ] ✅ Active section highlighted correctly
- [ ] ✅ B2B humor displays in empty states

### 8. Responsiveness
- [ ] ✅ Desktop layout (1024px+)
- [ ] ✅ Tablet layout (768px-1023px)
- [ ] ✅ Mobile layout (<768px)
- [ ] ✅ All buttons remain clickable
- [ ] ✅ Text remains readable

### 9. Performance
- [ ] ✅ Page loads in < 2 seconds
- [ ] ✅ Tab switching is instant
- [ ] ✅ Search is responsive
- [ ] ✅ No layout shifts
- [ ] ✅ Animations are smooth (60fps)

### 10. Database Integration
- [ ] ✅ External resources load from document_library (visibility='external')
- [ ] ✅ Internal resources load from document_library (visibility='internal')
- [ ] ✅ Folders load from resource_folders
- [ ] ✅ Announcements load from announcements table
- [ ] ✅ RLS policies enforced correctly

### 11. Navigation
- [ ] ✅ Sidebar link goes to /support/resources
- [ ] ✅ Old /support/documents redirects to /support/resources
- [ ] ✅ Dashboard announcement widget links to Resources

### 12. Animations & Effects
- [ ] ✅ Tab button scale on active (scale-105)
- [ ] ✅ Icon pulse animation on active tab
- [ ] ✅ Search bar scale on focus
- [ ] ✅ Search icon scale and color change
- [ ] ✅ Filter button hover effects
- [ ] ✅ Manage Announcements button hover (scale, shadow)
- [ ] ✅ Quick filter slide-in animation

## Manual Testing Steps

1. **Login as Admin**: admin@myra.ai / admin123
2. **Navigate to Resources**: Click Resources in sidebar
3. **Test Tab Switching**: Click External → Internal → External
4. **Test Search**:
   - Focus search bar (check purple glow)
   - Type "test query" (check AI badge)
   - Check Clear button works
   - Switch tabs (search persists)
5. **Test Quick Filters**:
   - Type in search
   - Click Documents filter
   - Switch to Internal tab
   - Verify Discussions and Q&A filters appear
6. **Test Announcements**:
   - Click "Manage Announcements" button
   - Create a test announcement
   - Edit it
   - Delete it
   - Close modal
7. **Test Internal Sections**:
   - Switch to Internal tab
   - Click Documents, Discussions, Q&A
   - Verify content loads

## Known Issues
- None currently

## Seed Data to Clean Up After Testing
- Test announcements created during testing
- Any test resources added
- Test discussions/comments created
