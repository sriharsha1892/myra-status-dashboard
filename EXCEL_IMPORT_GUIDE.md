# Excel Trial Organizations Import Tool - Complete Guide

**Created:** 2025-11-09  
**Status:** ✅ Ready to use  
**Purpose:** Import all 73 trial organizations and users from Final List.xlsx

---

## Quick Start

### 1. Dry Run (Preview Changes)
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --dry-run
```

**What this does:**
- Reads the Excel file
- Shows what **WOULD** be created/updated
- **MAKES NO CHANGES** to the database
- Displays a summary report

### 2. Actual Import (Confirm)
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --confirm
```

**What this does:**
- Actually creates/updates organizations and users
- Writes changes to the database
- Shows progress and summary

---

## What This Tool Does

### Intelligent Import Features

#### 1. **Duplicate Detection**
- ✅ Detects organizations already in database (by name)
- ✅ Detects users already in database (by email)
- ✅ Groups duplicate companies within Excel file
  - **Example:** BP-Castrol appears 6 times → Creates 1 org with 6 users
  - **Example:** AM Capital appears 3 times → Creates 1 org with 3 users

#### 2. **Smart Data Mapping**

**From Excel → Database:**

| Excel Column | Database Field | Transformation |
|--------------|----------------|----------------|
| Company Name | org_name | Direct |
| Domain | domain | **Normalized** (AUTO→TMT, F&B→AF&B, etc.) |
| Date of Request | trial_request_date | Direct |
| License given on | trial_access_provided_date | Direct |
| (calculated) | trial_expiry_date | **+14 days** from access date |
| Sales POC | account_manager_id | **Fuzzy matched** to users table |
| Current Status | trial_status, org_lifecycle_stage, user_status | **Smart mapping** |
| Email | email | Direct |
| Title/Role | role | Direct |
| (from email) | name | **Extracted** from email prefix |
| (from email) | org_url | **Generated** from email domain |
| (generated) | logo_url | **Clearbit API** or UI Avatars |
| (generated) | description | **Auto-generated** from org name + domain |

#### 3. **Auto-Generated Fields**

**User Names (extracted from email):**
- `sourabh.singh@maruti.co.in` → "Sourabh Singh"
- `nidhis@emamigroup.com` → "Nidhis"  
- `ramki@synarchy.biz` → "Ramki"

**Website URLs (from email domains):**
- `sourabh.singh@maruti.co.in` → `https://maruti.co.in`
- `nidhis@emamigroup.com` → `https://emamigroup.com`

**Logo URLs (Clearbit or fallback):**
- `https://logo.clearbit.com/maruti.co.in`
- Fallback: `https://ui-avatars.com/api/?name=MI&size=200&...`

**Descriptions:**
- "Maruti Suzuki India Limited is a professional organization in the TMT industry."

#### 4. **Domain Normalization**

| Excel Value | Normalized To | Reason |
|-------------|---------------|--------|
| AUTO, Auto | TMT | Automotive → Technology/Manufacturing |
| F&B | AF&B | Food & Beverage → Agriculture, Food & Beverage |
| AGRI | AF&B | Agriculture |
| C&M | E&C | Construction & Mining → Engineering & Construction |
| ICT | TMT | ICT → Technology, Media, Telecom |
| Consulting | TMT | Default |
| Media | TMT | Default |
| Packaging | TMT | Default |
| E&C | E&C | Direct |
| HC | HC | Direct |
| NEO | NEO | Direct |
| TMT | TMT | Direct |
| AAD | AAD | Direct |

#### 5. **Status Mapping**

**Excel "Current Status" → Database Fields:**

| Excel Status | org_lifecycle_stage | trial_status | user_status |
|--------------|---------------------|--------------|-------------|
| "Pending - Access not shared yet" | trial_pending | requested | invited |
| "Inactive - Access shared and not logged in" | trial_active | in_progress | access_enabled |
| "Active - Logged in and using" | trial_active | active | active |
| "Follow-up needed - user not responding" | trial_active | active | inactive |
| (NULL or empty) | trial_pending | requested | invited |

---

## Expected Results (Based on Dry Run)

### Summary Statistics
```
📊 Found 54 unique organizations with 72 total users

Total rows processed:       72
New organizations created:  13   (only those not in database)
Existing orgs updated:      41   (majority already exist)
New users created:          63   (new contacts)
Existing users updated:     9    (update their status)
Rows skipped:               0
Errors:                     0
```

### Organizations with Multiple Users

**Will be created as ONE org with multiple users:**

1. **BP-Castrol** - 6 users:
   - qianqian.mei@bp.com (primary)
   - gamase.sodaba@bp.com
   - thabile.mthethwa@za.bp.com
   - pooja.desai@za.bp.com
   - silondiwe.ngcongo@bp.com
   - rorisang.shuping@bp.com

2. **AM Capital** - 3 users:
   - fouad@amcapital-llc.com (primary)
   - eliana@amcapital-llc.com
   - fatima@amcapital-llc.com

3. **Tony Blair Institute** - 3 users:
   - tyson.bodkin@institute.global (primary)
   - kamila.kawecka@institute.global
   - ruggero.salerno@institute.global

4. **Synarchy** - 2 users
5. **Protiviti** - 2 users
6. **CircleK** - 2 users
7. **Sixth Factor Consulting** - 2 users
8. **Honeywell** - 2 users
9. **BASF** - 2 users
10. **ABB** - 2 users

---

## Data Safety Features

### Fields That Will NEVER Be Overwritten

When updating existing organizations/users:
- ✅ `user_id`, `org_id` (primary keys)
- ✅ `created_at` (original creation date)
- ✅ `last_login_at` (actual user activity)
- ✅ `login_count`, `queries_executed` (usage metrics)

### Update Strategy

**For existing organizations:**
- Updates: `trial_status`, `org_lifecycle_stage`, `custom_fields`
- Fills in: `trial_access_provided_date` (only if currently NULL)
- Fills in: `trial_expiry_date` (only if currently NULL)
- Preserves: All actual usage data

**For existing users:**
- Updates: `user_status` only
- Preserves: All activity data, login history

---

## Troubleshooting

### Issue: "File not found"
**Solution:** Use full path with escaped spaces:
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --dry-run
```

### Issue: "Missing Supabase credentials"
**Solution:** Check `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Issue: Errors during import
**Solution:** Run dry-run first to see errors:
```bash
npm run excel-import -- "/path/to/file.xlsx" --dry-run
```

Check error details at bottom of output.

---

## Advanced Usage

### View Help
```bash
npm run excel-import -- --help
```

### Process Different Excel File
```bash
npm run excel-import -- "/path/to/other-file.xlsx" --dry-run
```

### Re-run Import (Safe)
The tool is **idempotent** - you can run it multiple times safely:
- Existing orgs/users will be updated (not duplicated)
- New entries will be created
- No data loss

---

## What Happens After Import

### 1. Check Dashboard
Visit: http://localhost:3000/support/trials

**You should see:**
- 54 total organizations (41 existing + 13 new)
- Each organization shows all linked users
- Status reflects Excel data

### 2. Verify Sample Organizations

**Check BP-Castrol:**
- Should show 6 users
- All users listed in "Users" tab
- First user marked as "Primary Contact"

**Check AM Capital:**
- Should show 3 users
- All linked to same organization

### 3. Verify Data Quality

**Random spot checks:**
1. Pick 5 random organizations
2. Check logo displays correctly
3. Check domain is normalized (no "AUTO" or "F&B")
4. Check website URL works
5. Check user names extracted from emails

---

## Files Created/Modified

### New Files
1. **`scripts/excel-import-trial-orgs.ts`** (600+ lines)
   - Main import script
   - All mapping logic
   - Duplicate detection
   - Error handling

2. **`EXCEL_IMPORT_GUIDE.md`** (this file)
   - Complete documentation
   - Usage examples
   - Troubleshooting

### Modified Files
1. **`package.json`**
   - Added `excel-import` script
   - Added `xlsx` dependency

---

## Code Reference

### Key Functions

**Name Extraction:**
```typescript
extractNameFromEmail("sourabh.singh@maruti.co.in")
// Returns: "Sourabh Singh"
```

**Domain Normalization:**
```typescript
normalizeDomain("AUTO")  // Returns: "TMT"
normalizeDomain("F&B")   // Returns: "AF&B"
normalizeDomain("E&C")   // Returns: "E&C"
```

**Logo Generation:**
```typescript
generateLogoUrl("https://maruti.co.in", "Maruti Suzuki")
// Returns: "https://logo.clearbit.com/maruti.co.in"
```

**Status Mapping:**
```typescript
mapTrialStatus("Pending - Access not shared yet")
// Returns: "requested"

mapLifecycleStage("Pending - Access not shared yet")
// Returns: "trial_pending"

mapUserStatus("Active - Logged in and using")
// Returns: "active"
```

---

## Next Steps

### 1. Run Dry Run First
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --dry-run
```

**Review the output:**
- Check organization groupings
- Verify new vs existing counts
- Look for any errors

### 2. Confirm Import
If dry-run looks good:
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --confirm
```

### 3. Verify in Dashboard
- Navigate to http://localhost:3000/support/trials
- Spot-check 5-10 organizations
- Verify users are linked correctly

### 4. Test Functionality
- Try logging in as a trial user
- Check trial expiry dates
- Verify email notifications work

---

## FAQ

**Q: Can I run this multiple times?**  
A: Yes! It's idempotent. Existing records will be updated, not duplicated.

**Q: What if I have a newer Excel file later?**  
A: Just run the import again with the new file. It will update existing orgs and add new ones.

**Q: Will this overwrite any actual usage data?**  
A: No. It never overwrites login history, usage metrics, or activity logs.

**Q: What if an organization name changes?**  
A: It will create a new organization. You'll need to manually merge if needed.

**Q: Can I import only specific organizations?**  
A: Currently no, but you can filter the Excel file first, then import.

**Q: What happens if Sales POC doesn't match any account manager?**  
A: The `account_manager_id` will be NULL. No error, organization still created.

**Q: Where are comments and notes stored?**  
A: In `custom_fields` JSONB column, so they're preserved and searchable.

---

## Success Criteria

After import completes successfully, you should have:

✅ **54 unique organizations** in database  
✅ **72 trial users** total  
✅ **No duplicate organizations** (BP-Castrol, AM Capital, etc. properly grouped)  
✅ **All domains normalized** (no AUTO, F&B, C&M in database)  
✅ **All users have names** (extracted from emails)  
✅ **All orgs have logos** (Clearbit or UI Avatars)  
✅ **All orgs have websites** (derived from email domains)  
✅ **Status properly mapped** (trial_status, org_lifecycle_stage, user_status)  
✅ **Comments/notes preserved** in custom_fields  
✅ **Zero errors** in import log  

---

## Contact & Support

If you encounter any issues:

1. **Check the error log** at bottom of import output
2. **Run dry-run mode** to see what would happen
3. **Review this guide** for troubleshooting steps
4. **Check Supabase logs** for database errors

---

**Tool Version:** 1.0  
**Last Updated:** 2025-11-09  
**Tested On:** 73 rows from Final List.xlsx  
**Success Rate:** 100% (0 errors in dry-run)
