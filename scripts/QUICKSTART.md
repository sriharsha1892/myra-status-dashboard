# Quick Start - Smart Import Tool

## 🚀 In 60 Seconds

### 1. Install Dependencies
```bash
npm install
```

### 2. Prepare Your CSV
Use the template or create your own:
```csv
org_name,website_url,contact_name,contact_email
Acme Corp,acme.com,John Doe,john@acme.com
TechStart,techstart.io,Jane Smith,jane@techstart.io
```

**Minimum columns needed:**
- `org_name`
- `contact_name`
- `contact_email`

**Optional columns** (the tool will smart-fill these):
- `website_url` (can be guessed from name)
- `domain_category` (auto-detected: TMT, NEO, AF&B, HC, etc.)
- `description` (placeholder generated if missing)
- `contact_designation`
- `account_manager_email`
- `sales_poc_name`

### 3. Run the Import
```bash
npm run smart-import your-file.csv
```

### 4. Review & Accept
The tool will show you each organization with smart defaults:
- **Press Enter** to accept
- **Press 1-8** to edit a field
- **Press 's'** to skip
- **Press 'q'** to quit

### 5. Done!
Organizations and contacts are created automatically.

---

## 📋 Example: Import 3 Companies

**your-companies.csv:**
```csv
org_name,website_url,contact_name,contact_email,domain_category
Acme Software,acme.com,John Doe,john@acme.com,TMT
Green Farms Inc,greenfarms.ag,Bob Smith,bob@greenfarms.ag,AF&B
HealthTech Solutions,healthtech.io,Alice Johnson,alice@healthtech.io,HC
```

**Command:**
```bash
npm run smart-import your-companies.csv
```

**Result:**
```
✅ Created: Acme Software (org_abc123)
✅ Created: Green Farms Inc (org_def456)
✅ Created: HealthTech Solutions (org_ghi789)

📊 IMPORT SUMMARY
Total organizations processed: 3
✅ Successfully created:        3
```

---

## 💡 Pro Tips

### Tip 1: Let the Tool Do the Work
Only provide the essentials in your CSV:
```csv
org_name,contact_name,contact_email
Acme Corp,John Doe,john@acme.com
```

The tool will:
- ✅ Guess the website URL
- ✅ Fetch the logo from Clearbit
- ✅ Auto-detect the domain category
- ✅ Generate a basic description

You can edit everything during the review step!

### Tip 2: Bulk Assign Account Manager
When the tool starts, it asks for a default account manager:
```
Select default account manager (number): 1
```

This applies to ALL organizations in your CSV (unless they already have one specified).

### Tip 3: Use Column Name Variations
The tool is smart about column names. These all work:

| Standard | Variations |
|----------|------------|
| `org_name` | `organization`, `company`, `name` |
| `website_url` | `website`, `url`, `domain` |
| `contact_name` | `contact`, `primary_contact` |
| `contact_email` | `email` |

### Tip 4: Skip Empty Rows
The tool automatically skips rows with no `org_name`.

---

## 🎯 What Gets Created

For each row in your CSV, the tool creates:

1. **Organization Record**
   - Name, website, logo, description
   - Domain category
   - Account manager assignment
   - Lifecycle stage (defaults to 'prospect')
   - Trial status (defaults to 'requested')

2. **Primary Contact (Trial User)**
   - Full name, email, designation
   - Linked to the organization
   - Marked as primary contact
   - Status set to 'invited'

---

## ❓ FAQ

**Q: What if I don't know the website URL?**
A: Leave it blank. The tool will guess based on the company name.

**Q: Can I import just organizations without contacts?**
A: No, every organization needs at least a contact name and email.

**Q: Can I add multiple contacts per organization?**
A: Not with this tool. It only creates the primary contact. Add additional users through the UI afterward.

**Q: What happens if an organization already exists?**
A: The import will fail for that row. The tool doesn't update existing records.

**Q: Can I undo an import?**
A: No automatic undo. You'll need to delete organizations manually through the UI or database.

---

## 📚 Full Documentation

See [IMPORT_GUIDE.md](./IMPORT_GUIDE.md) for detailed documentation.

---

## 🆘 Troubleshooting

**Problem:** `Missing Supabase environment variables`
- **Fix:** Add these to `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-key
  ```

**Problem:** `tsx: command not found`
- **Fix:** Run `npm install`

**Problem:** CSV parsing errors
- **Fix:** Ensure proper CSV format:
  - First row must be headers
  - Use commas as separators
  - Quote values with commas: `"Acme Corp, Inc"`

**Problem:** "Account manager not found"
- **Fix:** The email doesn't match any user. Either:
  - Fix the email in your CSV
  - Select a default AM at the start
  - Edit during the review step

---

**Ready to import? Let's go! 🚀**

```bash
npm run smart-import your-file.csv
```
