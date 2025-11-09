# Excel Import - Quick Reference Card

## Commands

### Preview (Safe - No Changes)
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --dry-run
```

### Actual Import (Makes Changes)
```bash
npm run excel-import -- "/Users/sriharsha/Downloads/Final List.xlsx" --confirm
```

---

## Expected Results

```
📊 54 unique organizations
👥 72 total users
✨ 13 new orgs (rest already exist)
➕ 63 new users
📝 41 orgs updated
🔄 9 users updated
❌ 0 errors
```

---

## Key Features

✅ **Duplicate Handling**: BP-Castrol (6 users) → 1 org with 6 users  
✅ **Domain Normalization**: AUTO → TMT, F&B → AF&B  
✅ **Name Extraction**: sourabh.singh@... → "Sourabh Singh"  
✅ **URL Generation**: @maruti.co.in → https://maruti.co.in  
✅ **Logo Generation**: Clearbit API + fallback  
✅ **Smart Status Mapping**: Excel status → 3 DB fields  

---

## Multi-User Organizations

| Organization | Users |
|--------------|-------|
| BP-Castrol | 6 |
| AM Capital | 3 |
| Tony Blair Institute | 3 |
| Synarchy | 2 |
| Protiviti | 2 |
| CircleK | 2 |
| Sixth Factor | 2 |
| Honeywell | 2 |
| BASF | 2 |
| ABB | 2 |

---

## Data Mapping Cheat Sheet

### Domain Normalization
```
AUTO, Auto     → TMT
F&B, AGRI      → AF&B
C&M            → E&C
ICT, Media     → TMT
Consulting     → TMT
Packaging      → TMT
```

### Status Mapping
```
"Pending"      → trial_pending + requested + invited
"Inactive"     → trial_active + in_progress + access_enabled
"Active"       → trial_active + active + active
"Follow-up"    → trial_active + active + inactive
```

### Auto-Generated Fields
```
Email prefix   → User name (Sourabh Singh)
Email domain   → Website (https://maruti.co.in)
Website        → Logo (Clearbit API)
Org + domain   → Description
Access date    → Expiry (access + 14 days)
```

---

## Safety Features

**Never Overwrites:**
- User IDs, Org IDs
- Created dates
- Login history
- Usage metrics
- Query counts

**Only Updates:**
- Status fields
- Custom fields (merged)
- NULL fields (filled in)

---

## Verification Steps

After import:

1. **Dashboard**: http://localhost:3000/support/trials
2. **Check**: BP-Castrol has 6 users
3. **Check**: AM Capital has 3 users  
4. **Check**: All domains normalized (no AUTO/F&B)
5. **Check**: All users have names
6. **Check**: All orgs have logos

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File not found | Use full path with quotes |
| No Supabase creds | Check .env.local |
| Errors during import | Run --dry-run first |
| Wrong results | Review EXCEL_IMPORT_GUIDE.md |

---

## Quick Debug

```bash
# See what would happen (no changes)
npm run excel-import -- "/path/to/file.xlsx" --dry-run | less

# Check for errors only
npm run excel-import -- "/path/to/file.xlsx" --dry-run 2>&1 | grep -i error

# See summary only
npm run excel-import -- "/path/to/file.xlsx" --dry-run 2>&1 | tail -20
```

---

**Full Guide**: See `EXCEL_IMPORT_GUIDE.md` for complete documentation
