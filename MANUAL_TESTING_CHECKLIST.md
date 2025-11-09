# Manual Testing Checklist
**Purpose:** Quick verification guide for all implemented features
**Platform:** http://localhost:3000
**Date:** 2025-11-09

---

## Prerequisites
- [ ] Dev server running at http://localhost:3000
- [ ] Logged in as admin user (admin@myra.ai)
- [ ] At least one trial organization exists in database

---

## 1. Deal Closure Tracking ✅

### Test 1.1: UpdateDealStatusModal - All Status Options
**Path:** `/support/trials` → Click any org → Click "Update Status" button

**Expected:**
- [ ] Modal opens with title "Update Deal Status"
- [ ] 5 radio buttons visible:
  - [ ] 🎯 Prospect - "Initial stage, evaluating fit"
  - [ ] 💼 Negotiating - "Active negotiation in progress"
  - [ ] 🎉 Won - "Deal closed successfully"
  - [ ] ❌ Lost - "Deal did not close"
  - [ ] ⏸️ Deferred - "Postponed for future follow-up"
- [ ] All icons display correctly
- [ ] All descriptions visible

---

### Test 1.2: Opportunity Value Field
**Path:** Same modal from Test 1.1

**Expected:**
- [ ] "Opportunity Value (Estimated)" field always visible
- [ ] Number input accepts decimal values
- [ ] Currency dropdown shows: USD, EUR, GBP, INR, AUD
- [ ] Field is optional (can submit without it)
- [ ] Placeholder text: "Enter estimated deal value"

---

### Test 1.3: Won Status - Final Deal Value
**Path:** Same modal → Select "Won" status

**Steps:**
1. Click "Won" radio button
2. Try to submit without entering final deal value

**Expected:**
- [ ] Green-highlighted section appears: "Final Deal Value *"
- [ ] Input field has placeholder: "Enter actual closed deal amount"
- [ ] Required indicator (*) visible
- [ ] Submitting without value shows error toast: "Deal value is required for Won deals"

**Steps (continued):**
3. Enter opportunity value: 50000
4. Enter final deal value: 45000
5. Click "Update Deal Status"

**Expected:**
- [ ] Success toast appears
- [ ] Modal closes
- [ ] OverviewTab shows both values:
  - [ ] Opportunity Value: USD 50,000
  - [ ] Final Deal Value: USD 45,000

---

### Test 1.4: Lost Status - Predefined Reasons
**Path:** Same modal → Select "Lost" status

**Steps:**
1. Click "Lost" radio button
2. Click "Primary Loss Reason" dropdown

**Expected:**
- [ ] Red-highlighted section appears
- [ ] Dropdown shows all 11 reasons:
  1. [ ] Pricing too high
  2. [ ] Missing critical features
  3. [ ] Went with competitor
  4. [ ] Budget constraints
  5. [ ] Timing not right
  6. [ ] No executive buy-in
  7. [ ] Champion left organization
  8. [ ] Poor product-market fit
  9. [ ] Implementation too complex
  10. [ ] Security/compliance concerns
  11. [ ] Other

**Steps (continued):**
3. Select "Other"

**Expected:**
- [ ] Text area appears: "Please specify *"
- [ ] Placeholder: "Describe the reason..."
- [ ] Submitting without text shows error: "Please specify the reason for 'Other'"

**Steps (continued):**
4. Enter custom reason: "Company was acquired"
5. Click "Update Deal Status"

**Expected:**
- [ ] Success toast: "Deal status updated to Lost"
- [ ] Modal closes
- [ ] DealTrackingTab shows loss reason: "Company was acquired"

---

### Test 1.5: Deferred Status - Reason and Follow-up Date
**Path:** Same modal → Select "Deferred" status

**Steps:**
1. Click "Deferred" radio button

**Expected:**
- [ ] Purple-highlighted section appears
- [ ] "Reason for Deferring *" text area visible
- [ ] Placeholder: "Why is this deal deferred? (e.g., Waiting for budget cycle...)"
- [ ] "Expected Follow-up Date *" date picker visible
- [ ] Date picker minimum date is today
- [ ] Helper text: "When should we follow up with this prospect?"

**Steps (continued):**
2. Try to submit without filling fields

**Expected:**
- [ ] Error toast: "Reason is required for Deferred deals"

**Steps (continued):**
3. Enter reason: "Waiting for Q2 2026 budget cycle"
4. Try to submit (still no date)

**Expected:**
- [ ] Error toast: "Expected follow-up date is required for Deferred deals"

**Steps (continued):**
5. Select date: April 1, 2026
6. Enter opportunity value: 75000
7. Add notes: "Strong interest, CEO very positive"
8. Click "Update Deal Status"

**Expected:**
- [ ] Success toast: "Deal status updated to Deferred"
- [ ] Modal closes
- [ ] OverviewTab Deal Widget shows:
  - [ ] Status: ⏸️ Deferred
  - [ ] Opportunity Value: USD 75,000
  - [ ] Follow-up Date: Apr 01, 2026
- [ ] DealTrackingTab shows:
  - [ ] Deferred reason: "Waiting for Q2 2026 budget cycle"
  - [ ] Follow-up date: "April 01, 2026"
  - [ ] Notes visible

---

### Test 1.6: OverviewTab Deal Widget
**Path:** `/support/trials` → Click any org with deal data

**Expected:**
- [ ] "Deal Status" section visible with green gradient background
- [ ] "Update Status" button in top-right
- [ ] Current status card displays with:
  - [ ] Status emoji icon
  - [ ] Status name (capitalized)
  - [ ] Color-coded background (blue/yellow/green/red/purple)
- [ ] Conditional fields display based on status:
  - [ ] Opportunity Value (if set)
  - [ ] Final Deal Value (if status = won)
  - [ ] Follow-up Date (if status = deferred)

**Test with different statuses:**
1. [ ] Prospect: Shows status only
2. [ ] Negotiating: Shows status + opportunity value
3. [ ] Won: Shows opportunity value + final deal value
4. [ ] Lost: Shows status only (no values)
5. [ ] Deferred: Shows opportunity value + follow-up date

---

### Test 1.7: DealTrackingTab Full Display
**Path:** `/support/trials` → Click org → Click "Deal Tracking" tab

**Expected:**
- [ ] Tab header: "Manage and track deal outcomes"
- [ ] "Update Status" button (gradient blue)
- [ ] Large status card with:
  - [ ] Status emoji (4xl size)
  - [ ] Status label (2xl, bold)
  - [ ] Status description
  - [ ] Color-coded border and background
- [ ] Value display section (if values exist):
  - [ ] "Opportunity Value:" with currency formatting
  - [ ] "Final Deal Value:" (if won)
- [ ] Timestamp: "Status updated: [date time]"
- [ ] Conditional sections:
  - [ ] Loss Reason (red box, if lost)
  - [ ] Deferred Reason + Follow-up Date (purple box, if deferred)
  - [ ] Additional Notes (blue box, if notes exist)
- [ ] "Available Actions" section with 5 clickable status buttons

---

### Test 1.8: Database Migration Verification
**Path:** Supabase Dashboard or direct database query

**Verify columns exist in `org_deal_tracking` table:**
- [ ] `opportunity_value` (DECIMAL(12,2))
- [ ] `expected_followup_date` (DATE)
- [ ] `deferred_reason` (TEXT) - renamed from future_prospect_reason
- [ ] `deal_status` enum includes 'deferred' value
- [ ] Index exists: `idx_org_deal_tracking_followup_date`

**Verify enum values:**
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'deal_status');
```
- [ ] Returns: prospect, negotiating, won, lost, future_prospect, deferred

---

## 2. Responsive DocumentLibrary Design ✅

### Test 2.1: Mobile Layout (375px)
**Path:** `/support/documents`
**Browser:** Chrome DevTools → iPhone SE (375px)

**Expected:**
- [ ] Page title visible
- [ ] "Upload Resource" button visible (not hidden)
- [ ] Header stacks vertically (flex-col)
- [ ] Search bar full width
- [ ] Category pills wrap properly
- [ ] Resource cards:
  - [ ] Action buttons ALWAYS visible (not opacity-0)
  - [ ] Cards stack vertically
  - [ ] No horizontal scroll
  - [ ] Touch targets large enough (44px minimum)

**Test Actions:**
- [ ] Tap "Upload Resource" button → Modal opens
- [ ] Tap category pill → Filter works
- [ ] Tap search bar → Keyboard appears, can type
- [ ] Tap resource card → Clickable
- [ ] Tap action buttons → Responsive

---

### Test 2.2: Mobile Layout (320px - Smallest)
**Path:** Same as 2.1
**Browser:** Chrome DevTools → Custom (320 x 568)

**Expected:**
- [ ] No horizontal scroll (scrollWidth ≤ 320px)
- [ ] All buttons visible and don't overflow
- [ ] Text doesn't overflow containers
- [ ] All interactive elements accessible
- [ ] Layout maintains structure (no breaking)

---

### Test 2.3: Tablet Layout (768px)
**Path:** Same as 2.1
**Browser:** Chrome DevTools → iPad (768px)

**Expected:**
- [ ] Header more horizontal (flex-row)
- [ ] Better spacing between elements
- [ ] Resource cards show 2 columns (if enough cards)
- [ ] Category pills in single row
- [ ] Search bar reasonable width (not full-width)
- [ ] Action buttons visible on hover (group-hover works)

---

### Test 2.4: Desktop Layout (1024px)
**Path:** Same as 2.1
**Browser:** Chrome DevTools → Desktop (1024px)

**Expected:**
- [ ] Full horizontal layout
- [ ] Resource cards show 3+ columns
- [ ] Hover effects on cards:
  - [ ] Card shadow increases
  - [ ] Action buttons fade in (opacity 0 → 1)
  - [ ] Border color changes
- [ ] Smooth transitions (200-300ms)
- [ ] No layout shift on hover

---

### Test 2.5: Wide Desktop (1440px+)
**Path:** Same as 2.1
**Browser:** Full screen on 1440px+ monitor

**Expected:**
- [ ] Content centered (max-width container)
- [ ] Proper card spacing (gap between cards)
- [ ] No wasted whitespace
- [ ] Comfortable reading width
- [ ] All hover states work

---

### Test 2.6: Touch Interactions (Mobile/Tablet)
**Path:** Same as 2.1
**Device:** Real mobile device or touch simulation

**Expected:**
- [ ] Upload button responds to touch
- [ ] Category pills respond to touch
- [ ] Search input activates on touch
- [ ] Resource cards respond to touch
- [ ] Action buttons respond to touch
- [ ] No accidental double-taps
- [ ] Touch feedback visible (ripple/highlight)

---

## 3. Icon Rendering - Lucide Components ✅

### Test 3.1: ActivityEngagementTab Icons
**Path:** `/support/trials` → Click org → "Activity & Engagement" tab

**Expected - NO EMOJIS, ONLY SVG ICONS:**
- [ ] All activity type icons are SVG (not emoji)
- [ ] Icons have `stroke-width` attribute
- [ ] Icons scale properly
- [ ] Icon colors match activity types
- [ ] No emoji fallbacks visible

**Activity type icons to verify:**
- [ ] Meeting: Calendar icon (SVG)
- [ ] Email: Mail icon (SVG)
- [ ] Login: LogIn icon (SVG)
- [ ] Usage: BarChart icon (SVG)
- [ ] Feature request: MessageCircle icon (SVG)
- [ ] Support ticket: Headphones icon (SVG)

**Verify in DevTools:**
- [ ] Right-click icon → Inspect
- [ ] Element is `<svg>` (not text/emoji)
- [ ] Has `xmlns="http://www.w3.org/2000/svg"`

---

### Test 3.2: FeatureRequestsTab Icons
**Path:** `/support/trials` → Click org → "Feature Requests" tab

**Expected - Status Icons (SVG):**
- [ ] Submitted: Mail icon (blue)
- [ ] Reviewed: Eye icon (purple)
- [ ] Planned: ClipboardList icon (yellow)
- [ ] In Progress: Rocket icon (orange)
- [ ] Completed: CheckCircle icon (green)
- [ ] Rejected: XCircle icon (red)
- [ ] Duplicate: Copy icon (gray)

**Expected - Priority Icons (SVG):**
- [ ] Low: Circle icon (green)
- [ ] Medium: Circle icon (yellow)
- [ ] High: Circle icon (red)
- [ ] Critical: AlertTriangle icon (red)

**Expected - Action Icons (SVG):**
- [ ] ThumbsUp icon for votes
- [ ] ArrowUp icon for "Forward" button

**Verify:**
- [ ] All icons are SVG elements
- [ ] No emoji characters visible
- [ ] Icons have proper colors
- [ ] Icons scale with text size

---

### Test 3.3: DocumentLibrary Link Types
**Path:** `/support/documents`

**Expected - NO EMOJIS:**
- [ ] Link type indicators use icons (not emojis)
- [ ] No 📎 (paperclip emoji)
- [ ] No 📄 (document emoji)
- [ ] No 🎥 (video emoji)
- [ ] All type indicators are SVG-based or text-based

---

### Test 3.4: Toast Notifications
**Path:** Anywhere in app
**Action:** Trigger a success action (e.g., update deal status)

**Expected:**
- [ ] Toast appears with Sparkles SVG icon (not ✨ emoji)
- [ ] Icon is `<svg>` element
- [ ] Icon animates smoothly
- [ ] Icon color matches toast theme

**Verify in DevTools:**
```javascript
// Check for Sparkles component
document.querySelector('svg.lucide-sparkles')
```

---

### Test 3.5: Navigation Icons
**Path:** Any `/support/*` page

**Expected:**
- [ ] Dashboard: LayoutDashboard SVG icon
- [ ] Trials: Users SVG icon
- [ ] Users: UserCog SVG icon
- [ ] Reports: BarChart3 SVG icon
- [ ] Resources: Sparkles SVG icon (NOT FolderOpen)

**Verify:**
- [ ] All nav icons are SVG
- [ ] Sparkles icon for Resources specifically
- [ ] Icons have consistent size (w-5 h-5)
- [ ] Icons change color on hover/active

---

## 4. Resources Navigation ✅

### Test 4.1: Navigation Link Visibility
**Path:** Any `/support/*` page

**Expected:**
- [ ] "Resources" link visible in left sidebar
- [ ] NOT labeled as "Documents"
- [ ] Sparkles icon next to label
- [ ] Link in proper position in nav menu

---

### Test 4.2: Icon Verification
**Path:** Same as 4.1

**Expected:**
- [ ] Icon is Sparkles (✨ style but SVG)
- [ ] NOT FolderOpen icon
- [ ] Icon is `lucide-react` Sparkles component
- [ ] Icon color matches nav theme

**Verify in code (if needed):**
```typescript
// app/support/layout.tsx should have:
import { Sparkles } from 'lucide-react';
<Sparkles className="w-5 h-5" />
```

---

### Test 4.3: Navigation Functionality
**Path:** `/support/dashboard`

**Steps:**
1. Click "Resources" link in sidebar

**Expected:**
- [ ] URL changes to `/support/documents`
- [ ] Page loads DocumentLibrary component
- [ ] Page title shows "Resources" or library title
- [ ] No console errors
- [ ] Navigation completes in < 1 second

---

### Test 4.4: Active State
**Path:** `/support/documents`

**Expected:**
- [ ] "Resources" link has active styling:
  - [ ] Background color (bg-blue or bg-indigo)
  - [ ] Font weight bold
  - [ ] Icon color matches active state
  - [ ] Different from inactive links

**Compare with:**
- [ ] Click "Dashboard" → Dashboard becomes active
- [ ] Click "Resources" → Resources becomes active
- [ ] Active state switches correctly

---

### Test 4.5: All Navigation Links
**Path:** Any `/support/*` page

**Verify all links are accessible and labeled:**
- [ ] Dashboard
- [ ] Trials
- [ ] Users
- [ ] Reports
- [ ] Resources (renamed from Documents)
- [ ] Admin (if applicable)

**Test each link:**
- [ ] Clickable
- [ ] Navigates to correct page
- [ ] Shows active state when on that page
- [ ] Icon displays correctly

---

## 5. Cross-Browser Testing ✅

### Test 5.1: Chrome
**Repeat all critical tests above in:**
- [ ] Chrome (latest version)
- [ ] All Deal Tracking workflows work
- [ ] All icons render correctly
- [ ] Responsive layouts work
- [ ] Navigation functions

---

### Test 5.2: Firefox
**Repeat all critical tests above in:**
- [ ] Firefox (latest version)
- [ ] All Deal Tracking workflows work
- [ ] All icons render correctly
- [ ] Responsive layouts work
- [ ] Navigation functions

---

### Test 5.3: Safari (if available)
**Repeat critical tests in:**
- [ ] Safari (latest version)
- [ ] Deal modal works
- [ ] Icons render
- [ ] Layouts responsive

---

## 6. Performance Testing ✅

### Test 6.1: Page Load Times
**Using Chrome DevTools Network tab:**

**Dashboard:**
- [ ] Load time < 1 second
- [ ] No render-blocking resources
- [ ] Images load progressively

**Trials:**
- [ ] Load time < 1.5 seconds
- [ ] Cards render quickly
- [ ] No layout shift

**Documents/Resources:**
- [ ] Load time < 1 second
- [ ] Resources render smoothly

---

### Test 6.2: Modal Performance
**UpdateDealStatusModal:**

**Test:**
1. Open modal
2. Switch between all 5 statuses
3. Fill all fields
4. Submit

**Expected:**
- [ ] Modal opens in < 300ms
- [ ] Status switching instant (< 100ms)
- [ ] No lag when typing
- [ ] Submit completes in < 500ms
- [ ] Modal closes smoothly

---

### Test 6.3: Responsive Resize Performance
**DocumentLibrary:**

**Test:**
1. Open DevTools
2. Resize browser from 320px → 1440px slowly

**Expected:**
- [ ] Layout transitions smoothly
- [ ] No janky animations
- [ ] No flash of unstyled content
- [ ] Breakpoint changes are smooth
- [ ] No console errors during resize

---

## 7. Data Persistence Testing ✅

### Test 7.1: Deal Status Updates Persist
**Test:**
1. Update deal to "Deferred" with:
   - Opportunity value: $100,000
   - Reason: "Budget cycle Q2"
   - Follow-up date: June 1, 2026
2. Click "Update Deal Status"
3. Refresh page (F5)

**Expected:**
- [ ] Deal still shows "Deferred" status
- [ ] Opportunity value: $100,000
- [ ] Reason: "Budget cycle Q2"
- [ ] Follow-up date: June 1, 2026
- [ ] All data persisted correctly

---

### Test 7.2: Status History
**Test:**
1. Update deal: Prospect → Negotiating
2. Wait 1 minute
3. Update deal: Negotiating → Won ($85,000)
4. Check timestamps

**Expected:**
- [ ] `status_updated_at` reflects latest update
- [ ] Previous status not visible (no history tracking yet)
- [ ] Final status is "Won"
- [ ] Deal value is $85,000

---

## 8. Edge Cases & Error Handling ✅

### Test 8.1: Required Field Validation
**UpdateDealStatusModal:**

**Test each scenario:**
1. Won without deal value → [ ] Error toast shown
2. Lost without reason → [ ] Error toast shown
3. Lost "Other" without text → [ ] Error toast shown
4. Deferred without reason → [ ] Error toast shown
5. Deferred without date → [ ] Error toast shown
6. Deferred date in past → [ ] Error (date picker min=today)

---

### Test 8.2: Large Numbers
**Deal values:**

**Test:**
1. Enter opportunity value: 999999999.99
2. Enter final deal value: 1000000000.50

**Expected:**
- [ ] Numbers accepted
- [ ] Formatted with commas: USD 999,999,999
- [ ] No overflow in UI
- [ ] Database accepts (DECIMAL 12,2)

---

### Test 8.3: Special Characters in Text
**Deferred reason / Loss reason:**

**Test:**
1. Enter: `Company "restructuring" & budget cuts - waiting for Q2's cycle`

**Expected:**
- [ ] All characters accepted
- [ ] Displays correctly after save
- [ ] No XSS vulnerability
- [ ] Quotes/symbols rendered safely

---

### Test 8.4: Modal Cancel Preserves State
**Test:**
1. Open UpdateDealStatusModal
2. Fill all fields
3. Click "Cancel"
4. Reopen modal

**Expected:**
- [ ] Modal resets to current saved state
- [ ] Previous unsaved changes discarded
- [ ] No data persisted from cancelled edit

---

### Test 8.5: Concurrent Updates
**Test:**
1. Open deal in two browser tabs
2. Tab 1: Update to "Won"
3. Tab 2: Update to "Lost"
4. Refresh both

**Expected:**
- [ ] Last update wins (based on timestamp)
- [ ] Both tabs show same final state after refresh
- [ ] No data corruption
- [ ] No conflicts in database

---

## 9. Accessibility Testing ✅

### Test 9.1: Keyboard Navigation
**UpdateDealStatusModal:**

**Test with keyboard only (no mouse):**
- [ ] Tab to "Update Status" button, press Enter → Modal opens
- [ ] Tab through radio buttons
- [ ] Arrow keys select status
- [ ] Tab to input fields
- [ ] Tab to Submit button
- [ ] Enter key submits form
- [ ] Escape key closes modal

---

### Test 9.2: Screen Reader (if available)
**Test with VoiceOver (Mac) or NVDA (Windows):**

**Expected:**
- [ ] Modal title announced
- [ ] Radio button labels read
- [ ] Field labels read
- [ ] Required fields indicated
- [ ] Error messages announced
- [ ] Success messages announced

---

### Test 9.3: Focus Management
**UpdateDealStatusModal:**

**Test:**
1. Open modal
2. Observe focus ring

**Expected:**
- [ ] Focus on first interactive element (first radio button)
- [ ] Focus visible (blue ring)
- [ ] Tab order logical
- [ ] Focus doesn't leave modal
- [ ] Close button focusable
- [ ] Escape key works

---

### Test 9.4: Color Contrast
**All status badges:**

**Verify WCAG AA compliance:**
- [ ] Prospect (blue): Text readable on blue-50 bg
- [ ] Negotiating (yellow): Text readable on yellow-50 bg
- [ ] Won (green): Text readable on green-50 bg
- [ ] Lost (red): Text readable on red-50 bg
- [ ] Deferred (purple): Text readable on purple-50 bg

**Use Chrome DevTools → Lighthouse:**
- [ ] Run accessibility audit
- [ ] Score > 90
- [ ] No contrast errors

---

## 10. Mobile Device Testing (Real Devices) ✅

### Test 10.1: iPhone (iOS Safari)
**Test on real iPhone or simulator:**

**Deal Tracking:**
- [ ] Modal opens correctly
- [ ] All fields accessible
- [ ] Date picker uses native iOS date picker
- [ ] Keyboard doesn't obscure inputs
- [ ] Submit button accessible

**Responsive Layout:**
- [ ] DocumentLibrary renders correctly
- [ ] Touch targets adequate size
- [ ] No horizontal scroll
- [ ] Images load

---

### Test 10.2: Android (Chrome Mobile)
**Test on real Android or emulator:**

**Deal Tracking:**
- [ ] Modal opens correctly
- [ ] All fields accessible
- [ ] Date picker uses native Android date picker
- [ ] Keyboard behavior correct

**Responsive Layout:**
- [ ] DocumentLibrary renders correctly
- [ ] Touch works smoothly
- [ ] No performance issues

---

## Summary Checklist

### Critical Path Testing (Must Pass)
- [ ] Deal status can be updated to all 5 states
- [ ] Required fields are validated correctly
- [ ] Data persists after refresh
- [ ] Icons are all SVG (no emojis)
- [ ] Responsive layouts work on mobile/tablet/desktop
- [ ] Resources navigation works
- [ ] No console errors in any test

### Nice-to-Have Testing (Should Pass)
- [ ] Cross-browser compatibility verified
- [ ] Performance metrics acceptable
- [ ] Accessibility audit passes
- [ ] Edge cases handled gracefully
- [ ] Mobile device testing complete

---

## Sign-Off

**Tested By:** _________________
**Date:** _________________
**Environment:** http://localhost:3000
**Browser Versions:**
- Chrome: _________________
- Firefox: _________________
- Safari: _________________

**Overall Status:**
- [ ] ✅ All critical tests passing
- [ ] ✅ Ready for production
- [ ] ⚠️ Minor issues found (documented below)
- [ ] ❌ Major issues found (requires fixes)

**Issues Found (if any):**
1. _________________
2. _________________
3. _________________

**Notes:**
_________________
_________________
_________________
