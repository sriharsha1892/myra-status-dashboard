# Quick Start Guide - Ticket Templates

## Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install dotenv
```

### Step 2: Seed the Templates
```bash
npm run seed:templates
```

**Expected Output:**
```
Starting template seed...

Seeding 4 new template(s)...

Successfully seeded templates:

1. Can't download PPT
   Category: Tool Functioning
   Priority: High
   ID: [generated-uuid]

2. API timeout
   Category: Performance
   Priority: Critical
   ID: [generated-uuid]

3. Account access issue
   Category: Security
   Priority: High
   ID: [generated-uuid]

4. Feature request
   Category: Feature Request
   Priority: Medium
   ID: [generated-uuid]

Template seeding completed successfully!
```

### Step 3: Test the Features

**A. Test Template Management**
1. Start your dev server: `npm run dev`
2. Login to support system
3. Navigate to: http://localhost:3000/support/settings/templates
4. You should see 4 templates listed

**B. Test Template Selection**
1. Navigate to: http://localhost:3000/support/submit
2. Look for "Use Template" dropdown above the Organization field
3. Select "Can't download PPT"
4. Watch the form auto-fill with template content
5. Submit the ticket

---

## Common Tasks

### Create a New Template

1. Go to `/support/settings/templates`
2. Click "New Template" button
3. Fill in the form:
   - **Name:** e.g., "Data sync issue"
   - **Category:** Choose from dropdown
   - **Priority:** Choose from dropdown
   - **Description:** Use placeholders like `{{organization}}`
   - **Custom Fields:** (Optional) Add JSON: `{"field": "value"}`
4. Click "Create Template"

### Use a Template

1. Go to `/support/submit`
2. Select template from "Use Template" dropdown
3. Form auto-fills with:
   - Description (with placeholders replaced)
   - Category
   - Priority
4. Edit as needed and submit

### Edit a Template

1. Go to `/support/settings/templates`
2. Click the pencil icon next to template name
3. Modify fields
4. Click "Update Template"

### View Usage Statistics

1. Go to `/support/settings/templates`
2. Look at the "Usage" column
3. Templates are sorted by most used first

---

## Placeholder Reference

Use these placeholders in your description template:

| Placeholder | Replaced With | Example |
|------------|---------------|---------|
| `{{organization}}` | Current organization name | "Acme Corp" |
| `{{user_name}}` | Ticket submitter's name | "John Doe" |
| `{{user_email}}` | Ticket submitter's email | "john@acme.com" |

**Example Template:**
```
User {{user_name}} from {{organization}} reported an issue.
Contact: {{user_email}}

Issue details:
[Describe the problem here]
```

**After Replacement:**
```
User John Doe from Acme Corp reported an issue.
Contact: john@acme.com

Issue details:
[Describe the problem here]
```

---

## Pre-Installed Templates

### 1. Can't Download PPT
**Use when:** Users report PowerPoint export/download issues
- **Category:** Tool Functioning
- **Priority:** High
- **Includes:** User details, troubleshooting steps

### 2. API Timeout
**Use when:** API requests are timing out
- **Category:** Performance
- **Priority:** Critical
- **Includes:** System impact assessment, timeline tracking

### 3. Account Access Issue
**Use when:** Users can't log in or access their account
- **Category:** Security
- **Priority:** High
- **Includes:** Checklist of issue types, security verification

### 4. Feature Request
**Use when:** Users suggest new features or improvements
- **Category:** Feature Request
- **Priority:** Medium
- **Includes:** Use case, benefits, priority justification

---

## Troubleshooting

### Templates Not Showing in Dropdown

**Problem:** No templates appear in submit form
**Solutions:**
1. Check if templates exist in database
2. Run seed script: `npm run seed:templates`
3. Refresh the page
4. Check browser console for errors

### Placeholders Not Replacing

**Problem:** `{{organization}}` appears literally in description
**Solutions:**
1. Make sure organization is selected in form
2. Check placeholder spelling (case-sensitive)
3. Fill in name/email fields before selecting template

### Can't Access Template Management

**Problem:** Get "Unauthorized access" message
**Solutions:**
1. Verify you're logged in
2. Check your role (must be Admin or Team)
3. Contact system administrator to update your role

### Seed Script Fails

**Problem:** Error when running `npm run seed:templates`
**Solutions:**
1. Check `.env.local` file exists with correct variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Verify Supabase connection
3. Check `ticket_templates` table exists in database

---

## Access Control

### Who Can Do What?

| Action | Admin | Team | AM | Users |
|--------|-------|------|-----|-------|
| Create templates | ✓ | ✓ | ✗ | ✗ |
| Edit templates | ✓ | ✓ | ✗ | ✗ |
| Delete templates | ✓ | ✓ | ✗ | ✗ |
| View templates | ✓ | ✓ | ✓ | ✓ |
| Use templates | ✓ | ✓ | ✓ | ✓ |

---

## Next Steps

- **Customize Templates:** Modify the seeded templates to match your common scenarios
- **Create More Templates:** Add templates for other frequent issues
- **Monitor Usage:** Check which templates are most popular
- **Share with Team:** Train team members on template usage
- **Iterate:** Update templates based on feedback

---

## Need Help?

Refer to detailed documentation:
- **FEATURE_SUMMARY.md** - Quick overview
- **TICKET_TEMPLATES_FEATURE.md** - Complete documentation
- **TEMPLATE_FEATURE_STRUCTURE.txt** - Visual diagrams
- **scripts/README.md** - Seed script details

---

## Congratulations!

You've successfully set up the Ticket Templates feature. This will help your team:
- Save time on ticket creation
- Maintain consistency in ticket descriptions
- Track common issue patterns
- Improve support response times

Happy ticketing!
