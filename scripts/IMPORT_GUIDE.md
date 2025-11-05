# Smart Import Tool - User Guide

## Overview

The Smart Import Tool is an interactive CLI that helps you bulk import trial organizations and their primary contacts into the myRA Status Dashboard. It automates 80% of the work while letting you review and edit each entry before creation.

## Features

✅ **Smart Defaults**
- Auto-generates logo URLs from Clearbit API
- Auto-detects domain categories (TMT, NEO, HC, etc.)
- Auto-normalizes website URLs
- Creates placeholder descriptions when missing

✅ **Interactive Editing**
- Review each organization before creation
- Edit any field on the fly
- Skip organizations you don't want to import
- Visual progress tracking

✅ **Validation**
- Email format validation
- URL format validation
- Required field checking
- Duplicate prevention

✅ **Batch Processing**
- Imports organizations AND primary contacts
- Progress tracking with colored output
- Detailed summary report

## Getting Started

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js tsx
```

### 2. Prepare Your Data

Create a CSV file with your organization data. You can use the template provided:

```
scripts/import-template.csv
```

**Minimum Required Columns:**
- `org_name` - Organization name (required)
- `website_url` - Company website (can be guessed if missing)
- `contact_name` - Primary contact name (required)
- `contact_email` - Primary contact email (required)

**Optional Columns:**
- `domain_category` - Business domain (TMT, NEO, AF&B, E&C, HC, AAD)
- `description` - Company description (max 300 chars)
- `contact_designation` - Contact's job title/role
- `account_manager_email` - Email of assigned account manager
- `sales_poc_name` - Name or email of sales POC

**Column Name Flexibility:**
The tool recognizes common variations:
- `org_name` = `organization`, `company`, `name`
- `website_url` = `website`, `url`, `domain`
- `contact_name` = `contact`, `primary_contact`
- `contact_email` = `email`
- `contact_designation` = `designation`, `title`, `role`

### 3. Run the Import

```bash
npx tsx scripts/smart-import.ts your-data.csv
```

## Interactive Flow

### Step 1: Account Manager Selection
The tool will show all available account managers:
```
📋 Available Account Managers:
  1. Sarah Johnson (sarah@myra.ai)
  2. Mike Chen (mike@myra.ai)
  3. Lisa Garcia (lisa@myra.ai)

Select default account manager (number or press Enter to skip):
```

**Pro Tip:** Select a default AM to apply to all organizations without one specified.

### Step 2: Organization Review
For each organization, you'll see:
```
================================================================================
📋 ORGANIZATION: Acme Corporation
================================================================================

📊 Current Values:
  1. Organization Name: Acme Corporation
  2. Website URL:       https://acme.com
  3. Logo URL:          https://logo.clearbit.com/acme.com
  4. Domain Category:   TMT
  5. Description:       Acme Corporation is a leading software...
  6. Contact Name:      John Doe
  7. Contact Email:     john@acme.com
  8. Contact Designation: CEO

💡 Options:
  [Enter] Accept and continue
  [1-8]   Edit specific field
  [s]     Skip this organization
  [q]     Quit import

Your choice:
```

### Step 3: Field Editing
Press the number of the field you want to edit:
```
Your choice: 4

Available domains:
  1. TMT
  2. NEO
  3. AF&B
  4. E&C
  5. HC
  6. AAD

Select domain (1-6) or enter custom:
```

### Step 4: Creation
After you accept, the tool creates:
1. The organization record
2. The primary contact (trial user)
3. Links them together

```
✅ Created: Acme Corporation (org_123abc)
```

### Step 5: Summary
At the end, you'll see:
```
================================================================================
📊 IMPORT SUMMARY
================================================================================
Total organizations processed: 25
✅ Successfully created:        23
⚠️  Skipped:                      1
❌ Failed:                       1
================================================================================
```

## CSV Format Examples

### Basic Format
```csv
org_name,website_url,contact_name,contact_email
Acme Corp,acme.com,John Doe,john@acme.com
TechStart,techstart.io,Jane Smith,jane@techstart.io
```

### Full Format
```csv
org_name,website_url,domain_category,description,contact_name,contact_email,contact_designation,account_manager_email
Acme Corp,acme.com,TMT,Leading software company,John Doe,john@acme.com,CEO,sarah@myra.ai
Green Farms,greenfarms.com,AF&B,Organic agriculture company,Bob Johnson,bob@greenfarms.com,Director,mike@myra.ai
```

### With Sales POCs
```csv
org_name,website_url,contact_name,contact_email,sales_poc_name
Acme Corp,acme.com,John Doe,john@acme.com,Alex Thompson
```

## JSON Format

You can also import from JSON:

```json
[
  {
    "org_name": "Acme Corporation",
    "website_url": "acme.com",
    "domain_category": "TMT",
    "description": "Leading software company",
    "contact_name": "John Doe",
    "contact_email": "john@acme.com",
    "contact_designation": "CEO",
    "account_manager_email": "sarah@myra.ai"
  },
  {
    "org_name": "TechStart Inc",
    "website_url": "techstart.io",
    "contact_name": "Jane Smith",
    "contact_email": "jane@techstart.io"
  }
]
```

Run with:
```bash
npx tsx scripts/smart-import.ts your-data.json
```

## Domain Categories

The tool auto-detects domain categories based on keywords:

| Category | Keywords |
|----------|----------|
| **TMT** (Technology, Media & Telecom) | technology, software, tech, digital, it, internet, telecom, media |
| **NEO** (New Economy) | startup, venture, innovation, fintech, edtech |
| **AF&B** (Agriculture, Food & Beverages) | agriculture, food, beverage, farming, nutrition, dairy |
| **E&C** (Engineering & Construction) | engineering, construction, infrastructure, building |
| **HC** (Healthcare) | healthcare, hospital, medical, pharma, health |
| **AAD** (Architecture, Art & Design) | architecture, art, design, creative, studio |

**Default:** If no category is detected, it defaults to `TMT`.

## Logo URLs

The tool automatically fetches logos using:
1. **Clearbit Logo API** - `https://logo.clearbit.com/{domain}`
2. **Fallback** - Generated avatar with company initials

**Pro Tip:** You can manually override by editing field #3 during review.

## Smart Features

### 1. Website URL Normalization
- Input: `acme.com` → Output: `https://acme.com`
- Input: `www.acme.com` → Output: `https://www.acme.com`

### 2. Logo Auto-Regeneration
When you edit the website URL, the logo URL is automatically updated.

### 3. Description Placeholders
If no description is provided:
```
"{Company Name} is a professional organization."
```

### 4. Email Validation
The tool validates email format:
- ✅ `john@acme.com`
- ❌ `john.acme.com`
- ❌ `john@acme`

### 5. Account Manager Matching
The tool matches account manager emails to existing users in the database.

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure `.env.local` contains:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Issue: "Account manager not found"
**Solution:** The email in your CSV doesn't match any AM in the database. Either:
1. Fix the email in your CSV
2. Edit the field during review
3. Select a default AM at the start

### Issue: "Invalid email format"
**Solution:** Check the contact_email column in your CSV for typos.

### Issue: CSV parsing errors
**Solution:** Ensure:
- First row is headers
- No extra commas
- Values with commas are quoted: `"Acme Corp, Inc"`

## Tips for Best Results

1. **Prepare your CSV carefully** - The better your input data, the less editing needed
2. **Use the template** - Copy `import-template.csv` as a starting point
3. **Fill in descriptions** - Auto-generated descriptions are basic
4. **Verify website URLs** - Correct URLs ensure proper logo fetching
5. **Select default AM** - Saves time for bulk imports
6. **Review carefully** - Once created, editing in the UI is more tedious

## Example Workflow

```bash
# 1. Copy the template
cp scripts/import-template.csv my-orgs.csv

# 2. Fill in your data (using Excel, Google Sheets, etc.)
# ... edit my-orgs.csv ...

# 3. Run the import
npx tsx scripts/smart-import.ts my-orgs.csv

# 4. Select default account manager
# Input: 1

# 5. Review each organization
# Press Enter to accept, or edit as needed

# 6. Check the summary
# ✅ Successfully created: 10
```

## Need Help?

- Check the example CSV: `scripts/import-template.csv`
- Review this guide: `scripts/IMPORT_GUIDE.md`
- Contact the development team

---

**Happy Importing! 🚀**
