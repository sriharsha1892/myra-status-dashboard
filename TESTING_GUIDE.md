# Comprehensive Testing Guide: Paste & Extract Feature

## Quick Test (5 minutes)

Test the feature at: `http://localhost:3000/support/trials` → Click "Paste & Extract" button

### Test Scenario 1: Standard Demo (Test all features)
```
Had an excellent demo call with TEST-TechVision Solutions (techvision-test.io) today.

ATTENDEES:
- Sarah Chen (sarah.chen@techvision-test.io, +1-415-555-0198) - VP of Engineering
- Marcus Rodriguez (marcus.r@techvision-test.io, +1-415-555-0199) - CTO

BUSINESS DETAILS:
- Looking at $125K annual contract
- Team of 47 engineers
- Want 14 day trial
- Budget approved for Q2

MEETING NOTES:
- Gave comprehensive product demo
- Asked 12 questions about AI integration
- Scheduled follow-up for next Tuesday

Very hot lead!
```

**Expected Results:**
- ✓ Organization: TEST-TechVision Solutions
- ✓ Contract Value: $125,000
- ✓ Team Size: 47
- ✓ Trial Duration: 14 days
- ✓ Users: 2 contacts (Sarah, Marcus)
- ✓ Phone numbers extracted for both
- ✓ Activities: 3 detected (demo, questions, follow-up)

---

### Test Scenario 2: Minimal Data (Edge case)
```
Brief note on TEST-MinimalCo:

Just spoke with Emma Wilson (emma.w@minimalco-test.com) from TEST-MinimalCo.

She's interested in trying our platform. Gave her a quick demo over Zoom.
```

**Expected Results:**
- ✓ Organization: TEST-MinimalCo
- ✓ Contract Value: (empty - OK)
- ✓ Team Size: (empty - OK)
- ✓ Trial Duration: (empty - OK)
- ✓ Users: 1 contact (Emma)
- ✓ Activities: 1 detected (demo)

---

### Test Scenario 3: Alternative Formats (Week conversion)
```
Meeting with TEST-DataCorp Analytics (datacorp-test.ai):

Contacts:
- Alex Thompson (alex@datacorp-test.ai, 555.3101) - CTO
- Jamie Lee (jamie@datacorp-test.ai, (408) 555-3102) - Director

Business:
- 100K ARR deal
- Team of 23 data scientists
- Looking for 2 weeks trial

Initial demo went great!
```

**Expected Results:**
- ✓ Organization: TEST-DataCorp Analytics
- ✓ Contract Value: $100,000 (from "100K ARR")
- ✓ Team Size: 23
- ✓ Trial Duration: 14 days (2 weeks converted)
- ✓ Users: 2 contacts
- ✓ Phone formats: both 555.3101 and (408) 555-3102 extracted
- ✓ Activities: 1 detected (demo)

---

## What to Test

### 1. Extraction Accuracy
- [ ] Organization name extracted correctly
- [ ] Contract value shows in "$X,XXX" format
- [ ] Team size shows as number
- [ ] Trial duration shows in days
- [ ] All contacts listed in cards
- [ ] Phone numbers extracted (various formats)
- [ ] Primary contact marked (first user)

### 2. UI Functionality
- [ ] Can edit organization name
- [ ] Can select domain from dropdown
- [ ] Can edit contract value, team size, duration
- [ ] Can add new contacts with "+" button
- [ ] Can remove contacts with trash icon
- [ ] Can switch primary contact
- [ ] Can check/uncheck activities
- [ ] Can edit activity details
- [ ] Extraction summary shows correct counts

### 3. Save Functionality
- [ ] Validation shows errors for missing required fields
- [ ] "Save Trial" button creates records
- [ ] Success toast shows counts
- [ ] Redirects to trial detail page

### 4. Database Verification
After saving, check database:
```sql
-- Check organization
SELECT org_name, contract_value, team_size, trial_duration_days
FROM trial_organizations
WHERE org_name LIKE 'TEST-%'
ORDER BY created_at DESC LIMIT 5;

-- Check users
SELECT name, email, phone, role
FROM trial_users
WHERE org_id IN (
  SELECT org_id FROM trial_organizations WHERE org_name LIKE 'TEST-%'
)
ORDER BY created_at DESC;

-- Check activities
SELECT u.name, ui.interaction_type, ui.title, ui.interaction_date
FROM user_interactions ui
JOIN trial_users u ON u.user_id = ui.user_id
WHERE ui.org_id IN (
  SELECT org_id FROM trial_organizations WHERE org_name LIKE 'TEST-%'
)
ORDER BY ui.created_at DESC;
```

---

## After Testing: Cleanup

Run the cleanup script to remove all test data:
```bash
npm run cleanup:test-data
```

Or manually:
```sql
-- 1. Get test org IDs
WITH test_orgs AS (
  SELECT org_id FROM trial_organizations WHERE org_name LIKE 'TEST-%'
)

-- 2. Delete user_interactions
DELETE FROM user_interactions
WHERE org_id IN (SELECT org_id FROM test_orgs);

-- 3. Delete trial_users
DELETE FROM trial_users
WHERE org_id IN (SELECT org_id FROM test_orgs);

-- 4. Delete trial_organizations
DELETE FROM trial_organizations
WHERE org_name LIKE 'TEST-%';
```

---

## Success Criteria

✅ All 3 test scenarios parse correctly
✅ Contract values, team sizes, trial durations extracted
✅ Phone numbers extracted in multiple formats
✅ Week→day conversion works (2 weeks = 14 days)
✅ Primary contact designation works
✅ Activity checkboxes allow selective saving
✅ Database records created with correct foreign keys
✅ All enhanced fields map to database properly

---

## Known Limitations

- Parser uses regex, not true AI (intentional - no external dependencies)
- Confidence scores are estimates based on pattern matching
- Phone extraction handles common formats but may miss unusual ones
- Contract values need $ sign or "K/M" suffix to be detected
- Team size extraction looks for specific keywords ("team", "users", etc.)

---

## If Issues Found

1. Check browser console for errors
2. Check network tab for API responses
3. Verify database schema matches expectations
4. Review extraction results in "Extraction Summary" card
5. Check confidence scores - low scores may indicate parsing issues
