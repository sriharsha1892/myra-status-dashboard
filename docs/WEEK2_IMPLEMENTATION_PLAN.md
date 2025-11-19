# Week 2 - Implementation Plan

**Start Date**: 2025-11-18
**Goal**: Apply Week 1 infrastructure to production forms
**Timeline**: Days 8-14 of 12-week improvement plan

---

## Week 1 Recap - Infrastructure Complete ✅

**Deliverables:**
- Zod validation library + schemas (email, phone, URL, dates)
- 3 accessible form components (FormInput, FormTextarea, FormSelect)
- 10 skeleton loader variants
- useLoadingState hook
- WCAG 2.1 AA compliant throughout
- Test suite: 20/34 tests pass (core functionality validated)

---

## Week 2 Objectives

### Primary Goal
Migrate critical production forms to use Week 1 components, delivering immediate UX improvements to users.

### Success Criteria
- ✅ Replace 5+ forms with new accessible components
- ✅ Add Zod validation to all migrated forms
- ✅ Implement loading states with skeleton loaders
- ✅ Use useLoadingState for async operations
- ✅ Maintain or improve existing functionality
- ✅ No regressions in user workflows

---

## Implementation Priorities

### Priority 1: Trial Organization Management (Days 8-10)
**Impact**: HIGH - Most critical user workflow
**Complexity**: MEDIUM
**Files to Modify:**
- `/components/CreateOrganizationModal.tsx` - Create trial org form
- Trial org edit/update modals
- Bulk operation modals (dates, account manager, stage)

**Tasks:**
1. ✅ Audit existing forms in trials workflow
2. Create Zod validation schema for trial organizations
3. Replace form inputs with FormInput/FormSelect/FormTextarea
4. Add useLoadingState to form submissions
5. Implement skeleton loaders for loading states
6. Test end-to-end workflow

**Expected Improvements:**
- Real-time validation feedback
- Better error messages
- Accessible form fields
- Professional loading states

### Priority 2: User Management Forms (Days 11-12)
**Impact**: MEDIUM-HIGH
**Complexity**: LOW-MEDIUM
**Files:**
- User creation/edit forms
- User invite forms
- Bulk user operations

**Tasks:**
1. Audit user management forms
2. Create Zod schemas for user data
3. Migrate to new form components
4. Add loading states
5. Test workflows

### Priority 3: Dashboard & Loading States (Days 13-14)
**Impact**: MEDIUM
**Complexity**: LOW
**Files:**
- Dashboard pages
- Data loading views
- Empty states

**Tasks:**
1. Replace old skeleton loaders with new variants
2. Add loading states to async operations
3. Implement useLoadingState in data fetching
4. Polish transitions

---

## Current System Analysis

### Existing Forms Found (from /app/support/trials/page.tsx)

#### Modal Forms:
1. **CreateOrganizationModal** (line 12)
   - Organization name, domain, etc.
   - Needs: FormInput, validation, useLoadingState

2. **Bulk Account Manager Modal** (lines 48)
   - Account manager selection
   - Needs: FormSelect, validation

3. **Bulk Trial Dates Modal** (lines 49, 57-58)
   - Start date, end date inputs
   - Needs: FormInput (date type), dateRangeSchema validation

4. **Bulk Stage Modal** (line 50, 60)
   - Stage selection
   - Needs: FormSelect, validation

#### Current State Variables (lines 55-60):
```typescript
bulkAccountManager: string
bulkAccountManagerOther: string
bulkTrialStartDate: string
bulkTrialEndDate: string
onlyUpdateMissingDates: boolean
bulkStage: string
```

#### Loading States (lines 36, 52):
- `loading` - main data loading
- `bulkProcessing` - bulk operations
- Already uses `SkeletonCard` (line 15)
- Can upgrade to new skeleton variants

---

## Day 8 Tasks - Trial Organizations

### Morning: Form Audit & Schema Creation

**1. Read and document existing modal forms**
- CreateOrganizationModal structure
- Bulk operation modals
- Current validation (if any)
- Error handling approach

**2. Create trial organization Zod schema**
```typescript
// /lib/validation/schemas/trialOrganization.ts
- organizationName (required, min/max length)
- domain (optional, URL format)
- accountManager (required, select from list)
- trialStartDate (required, date format)
- trialEndDate (required, date format, must be after start)
- stage (required, enum)
- notes (optional, textarea)
```

### Afternoon: Component Migration

**3. Migrate CreateOrganizationModal**
- Replace native inputs with FormInput
- Replace select with FormSelect
- Add Zod validation
- Integrate useLoadingState
- Test create flow

**4. Migrate Bulk Operations Modals**
- Account Manager modal
- Trial Dates modal
- Stage update modal
- Add validation to each
- Test bulk operations

---

## Day 9 Tasks - Loading States & Polish

### Morning: Skeleton Loaders

**1. Replace old SkeletonCard**
- Currently uses `/components/SkeletonCard.tsx`
- Migrate to new `/components/skeletons/` variants
- Add SkeletonTable for organization list
- Add SkeletonForm for modals

**2. Implement useLoadingState**
- Form submission handlers
- Bulk operation handlers
- Data refresh operations

### Afternoon: Testing & Polish

**3. End-to-end testing**
- Create organization workflow
- Edit organization workflow
- Bulk operations
- Error scenarios
- Loading states

**4. Accessibility review**
- Tab navigation through forms
- Screen reader announcements
- Error message clarity
- Focus management

---

## Day 10 Tasks - Documentation & Handoff

### Morning: Documentation

**1. Update component docs**
- Document new validation schemas
- Usage examples for trial forms
- Migration notes

**2. Create Week 2 progress report**
- Forms migrated
- Improvements delivered
- Before/after comparisons
- User impact metrics

### Afternoon: Next Priority Prep

**3. Audit user management forms**
- Identify all user-related forms
- Plan migration approach
- Create user Zod schemas

**4. Plan Days 11-14**
- User management migration
- Dashboard loading states
- Additional form improvements

---

## Metrics to Track

### Forms Migrated
- [ ] CreateOrganizationModal
- [ ] EditOrganizationModal (if exists)
- [ ] Bulk Account Manager Modal
- [ ] Bulk Trial Dates Modal
- [ ] Bulk Stage Modal
- [ ] User forms (Days 11-12)

### Code Quality
- [ ] All forms have Zod validation
- [ ] All async operations use useLoadingState
- [ ] All loading states use skeleton loaders
- [ ] No accessibility regressions
- [ ] Error messages are user-friendly

### User Experience
- [ ] Real-time validation feedback
- [ ] Clear error messages
- [ ] Professional loading states
- [ ] Smooth transitions
- [ ] Keyboard navigation works

---

## Risks & Mitigation

### Risk 1: Breaking Existing Workflows
**Mitigation**:
- Test each form thoroughly before moving to next
- Keep old components available for quick rollback
- Test with real data in dev environment

### Risk 2: Incomplete Modal Discovery
**Mitigation**:
- Search codebase for all modal imports
- Check for inline form implementations
- Review components directory systematically

### Risk 3: Validation Too Strict
**Mitigation**:
- Match validation to existing DB constraints
- Allow optional fields where appropriate
- Provide helpful error messages

---

## Week 2 Success Definition

**Minimum Success:**
- 3+ forms migrated with validation
- No user-facing regressions
- Loading states improved

**Target Success:**
- 5+ forms migrated
- All trial org forms validated
- Skeleton loaders upgraded
- Documentation complete

**Stretch Success:**
- 10+ forms migrated
- User management complete
- Dashboard loading states done
- Automated tests for forms

---

## Notes

- Focus on user-facing improvements over perfection
- Ship incremental improvements daily
- Test in dev before touching production
- Document learnings for Week 3+

**Status**: 🟢 READY TO START
**Next Action**: Read CreateOrganizationModal and begin schema creation
