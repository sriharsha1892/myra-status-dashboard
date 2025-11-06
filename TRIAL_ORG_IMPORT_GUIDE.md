# Trial Organization Import Guide

## 🚀 Quick Start

### 1. Download Template
```bash
templates/trial-organizations-import-template.csv
```

### 2. Fill Your Data
Edit the CSV with your trial organizations

### 3. Validate (Dry Run)
```bash
node scripts/import-trial-organizations.js your-data.csv --dry-run
```

### 4. Import
```bash
node scripts/import-trial-organizations.js your-data.csv
```

---

## 📋 Template Columns

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| **org_name** | ✅ Yes | Text | "Acme Corporation" |
| **org_domain** | Optional | domain.com | "acme.com" |
| **account_manager** | Optional | email@domain.com | "harsha@myra.ai" |
| **lifecycle_stage** | Optional | prospect / demo_scheduled / trial_active / converted / churned | "trial_active" |
| **trial_start_date** | Optional | YYYY-MM-DD or MM/DD/YYYY | "2025-01-15" |
| **trial_end_date** | Optional | YYYY-MM-DD or MM/DD/YYYY | "2025-02-15" |
| **engagement_score** | Optional | 0-100 | "85" |
| **last_activity_date** | Optional | YYYY-MM-DD | "2025-01-20" |
| **comments** | Optional | Text | "Very engaged customer" |

---

## 🎯 Lifecycle Stages

Smart mapping handles variations:

- **prospect** - Also accepts: "lead", "new"
- **demo_scheduled** - Also accepts: "demo scheduled", "demo"
- **trial_active** - Also accepts: "trial active", "trial", "active"
- **converted** - Also accepts: "customer", "paid", "won"
- **churned** - Also accepts: "lost", "cancelled", "inactive"

---

## ✨ Features

### Smart Duplicate Detection
- Checks by **org_name** and **org_domain**
- Updates existing records automatically
- No manual de-duplication needed

### Comprehensive Validation
- ✅ Email format validation
- ✅ Domain format validation (removes http://, www., etc.)
- ✅ Date parsing (multiple formats)
- ✅ Engagement score (auto-clamps 0-100)
- ✅ Lifecycle stage normalization

### Error Handling
- Shows validation errors before import
- Detailed warnings for each row
- Clear progress tracking
- Failed rows reported with reasons

---

## 📊 Example Import

```bash
$ node scripts/import-trial-organizations.js data.csv --dry-run

🚀 Trial Organization Import Script
📍 Supabase URL: https://your-project.supabase.co
📁 File: data.csv
🔍 Mode: DRY RUN (no changes)

📖 Reading file...
✅ Parsed 50 rows

🔍 Validating data...

✅ Valid rows: 48
❌ Invalid rows: 2

⚠️  Invalid Rows:

   Row 15: (no name)
      - org_name is required

   Row 32: Bad Data Corp
      - org_name is required

✅ DRY RUN COMPLETE - No changes made
   48 rows would be imported
```

Then run without --dry-run to actually import!

---

## 🔧 Troubleshooting

### "org_name is required"
Every row must have an organization name.

### "Invalid account_manager email"
Check email format (must be valid@email.com)

### "Invalid org_domain"
Domain should be just the domain name: "acme.com" not "https://www.acme.com"

### "Could not parse date"
Use YYYY-MM-DD format: "2025-01-15"

---

## 💡 Pro Tips

1. **Always run --dry-run first** to validate your data
2. **Use the template** as a starting point
3. **Duplicate names** - Script will update existing orgs
4. **Leave optional fields blank** - Script handles defaults
5. **Date formats** - YYYY-MM-DD works best

---

## 🎯 Success Output

```bash
🎉 Import Complete!

   ✅ Created: 45
   🔄 Updated: 3
   ❌ Failed: 0
   📊 Total: 48 organizations imported
```

Perfect! 🚀
