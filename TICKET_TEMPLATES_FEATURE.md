# Feature #1: Ticket Templates

## Overview

The Ticket Templates feature allows administrators to create, manage, and track reusable templates for common support ticket scenarios. Users can then select these templates when submitting tickets to auto-fill form fields with pre-defined content.

## Features Implemented

### 1. Template Management Page

**Location:** `/support/settings/templates`

**File:** `/Users/sriharsha/myra-status-dashboard/app/support/settings/templates/page.tsx`

**Features:**
- Full CRUD operations (Create, Read, Update, Delete)
- Table view showing:
  - Template name with description preview
  - Category badge with color coding
  - Priority badge with color coding
  - Usage statistics ("Used X times")
  - Action buttons (Edit, Delete)
- Modal interface for creating/editing templates
- Form fields:
  - Name (required)
  - Category dropdown (9 categories)
  - Priority dropdown (Low, Medium, High, Critical)
  - Description template with placeholder support
  - Custom fields (JSON key-value pairs)
- Validation and error handling
- Empty state with call-to-action

**Access Control:** Admin and Team roles only

### 2. Template Selector Component

**Location:** Component used in ticket submission form

**File:** `/Users/sriharsha/myra-status-dashboard/components/support/TemplateSelector.tsx`

**Features:**
- Dropdown selector for available templates
- Loads templates sorted by usage count
- Displays template info: Name - Category (Priority)
- Auto-fills form fields when template selected
- Placeholder replacement functionality
- Usage tracking (increments count on selection)
- Success notification on template application
- Graceful handling (hides if no templates exist)

### 3. Submit Page Integration

**Location:** `/support/submit`

**File:** `/Users/sriharsha/myra-status-dashboard/app/support/submit/page.tsx`

**Changes:**
- Added TemplateSelector component above organization field
- Integrated template selection handler
- Auto-fills description with placeholder replacement
- Sets category and priority based on template
- Clears validation errors when template applied
- Passes current form values as placeholders

### 4. Database Seeding Script

**Location:** `/Users/sriharsha/myra-status-dashboard/scripts/seed-templates.js`

**Features:**
- Pre-populates 4 default templates
- Checks for existing templates (no duplicates)
- Uses Supabase client to insert data
- Detailed console output
- Error handling

**Command:** `npm run seed:templates`

## Template Placeholders

Templates support dynamic placeholders that get replaced with actual values:

- `{{organization}}` - Selected organization name
- `{{user_name}}` - Ticket submitter's name
- `{{user_email}}` - Ticket submitter's email

Example:
```
User from {{organization}} is unable to download PowerPoint presentations.

User Details:
- Name: {{user_name}}
- Email: {{user_email}}
```

## Pre-populated Templates

### 1. Can't download PPT
- **Category:** Tool Functioning
- **Priority:** High
- **Custom Fields:**
  - `affected_feature`: "PowerPoint Export"
  - `browser`: "Chrome"
  - `error_type`: "Download Failure"

### 2. API timeout
- **Category:** Performance
- **Priority:** Critical
- **Custom Fields:**
  - `severity`: "System-wide"
  - `endpoint`: "/api/v1/"
  - `response_time`: "30s+"
  - `impact_level`: "High"

### 3. Account access issue
- **Category:** Security
- **Priority:** High
- **Custom Fields:**
  - `account_type`: "Standard"
  - `authentication_method`: "Email/Password"
  - `last_successful_login`: null

### 4. Feature request
- **Category:** Feature Request
- **Priority:** Medium
- **Custom Fields:**
  - `request_type`: "Enhancement"
  - `estimated_users_affected`: "Multiple"
  - `has_workaround`: "No"

## Usage Tracking

The system tracks how many times each template is used:

1. When a template is selected from the dropdown
2. Usage count is incremented in the database
3. Templates are sorted by usage count (most used first)
4. Display shows "Used X times" in the template list

## Design & Styling

### Color Coding

**Priority Badges:**
- Critical: Red (text-red-700 bg-red-50)
- High: Orange (text-orange-700 bg-orange-50)
- Medium: Yellow (text-yellow-700 bg-yellow-50)
- Low: Green (text-green-700 bg-green-50)

**Category Badges:**
- Security: Purple (text-purple-700 bg-purple-50)
- Tool Functioning: Blue (text-blue-700 bg-blue-50)
- Performance: Red (text-red-700 bg-red-50)
- Feature Request: Green (text-green-700 bg-green-50)
- Feature Set: Indigo (text-indigo-700 bg-indigo-50)
- Others: Gray (text-gray-700 bg-gray-50)

### Component Styling
- Template selector: h-9, border, rounded-lg
- Modal: Max-width 2xl, rounded-xl, shadow-2xl
- Table: Hover effects, divided rows
- Buttons: Primary blue, consistent sizing

## Files Created

1. `/Users/sriharsha/myra-status-dashboard/app/support/settings/templates/page.tsx` (677 lines)
   - Full template management interface

2. `/Users/sriharsha/myra-status-dashboard/components/support/TemplateSelector.tsx` (127 lines)
   - Reusable template selector component

3. `/Users/sriharsha/myra-status-dashboard/scripts/seed-templates.js` (174 lines)
   - Database seeding script

4. `/Users/sriharsha/myra-status-dashboard/scripts/README.md`
   - Script documentation

## Files Modified

1. `/Users/sriharsha/myra-status-dashboard/app/support/submit/page.tsx`
   - Added TemplateSelector import
   - Added handleTemplateSelect function
   - Integrated template selector in form

2. `/Users/sriharsha/myra-status-dashboard/app/support/settings/users/page.tsx`
   - Added navigation link to Templates page

3. `/Users/sriharsha/myra-status-dashboard/package.json`
   - Added `seed:templates` script

## Database Schema

The feature uses the existing `ticket_templates` table with columns:

- `id` (uuid, primary key)
- `name` (text, required)
- `category` (text, required)
- `description_template` (text, required)
- `priority` (text, required)
- `custom_fields` (jsonb, nullable)
- `usage_count` (integer, default 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install dotenv
```

### 2. Seed Templates

```bash
npm run seed:templates
```

### 3. Access Template Management

Navigate to: `/support/settings/templates`

### 4. Use Templates

Navigate to: `/support/submit` and select a template from the dropdown

## Future Enhancements

Possible improvements for future iterations:

1. **Template Categories/Tags:** Organize templates by custom tags
2. **Template Permissions:** Control which roles can use which templates
3. **Template Analytics:** Detailed usage analytics and reporting
4. **Template Versioning:** Track template changes over time
5. **Bulk Actions:** Import/export templates, bulk delete
6. **Template Preview:** Live preview before applying
7. **Conditional Fields:** Show/hide fields based on template selection
8. **Template Sharing:** Share templates across organizations
9. **Time-based Stats:** "Used 23 times this month" feature
10. **Template Search:** Search and filter templates by name/category

## Notes

- Templates are visible to all authenticated users
- Only Admin and Team roles can manage templates
- Template selection is optional; users can still manually fill forms
- Custom fields are stored but not currently displayed in the UI
- Usage tracking happens asynchronously (doesn't block form submission)
- Placeholders are case-sensitive and must match exactly
