# Scripts

## Template Seeding

### Prerequisites

Before running the seed script, you need to install the `dotenv` package:

```bash
npm install dotenv
```

### Running the Seed Script

To populate the database with the 4 default ticket templates:

```bash
npm run seed:templates
```

Or directly:

```bash
node scripts/seed-templates.js
```

### What Gets Seeded

The script will create 4 default templates:

1. **Can't download PPT** - Tool Functioning, High Priority
   - Pre-filled description for PowerPoint download issues
   - Custom fields: affected_feature, browser, error_type

2. **API timeout** - Performance, Critical Priority
   - Pre-filled description for API timeout issues
   - Custom fields: severity, endpoint, response_time, impact_level

3. **Account access issue** - Security, High Priority
   - Pre-filled description for login and access problems
   - Custom fields: account_type, authentication_method, last_successful_login

4. **Feature request** - Feature Request, Medium Priority
   - Pre-filled description template for feature requests
   - Custom fields: request_type, estimated_users_affected, has_workaround

### Safety Features

- The script checks for existing templates before inserting
- Won't duplicate templates that already exist
- Only inserts new templates

### Environment Variables Required

The script requires the following environment variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase API key

### Example Output

```
Starting template seed...

Seeding 4 new template(s)...

Successfully seeded templates:

1. Can't download PPT
   Category: Tool Functioning
   Priority: High
   ID: abc-123-def

2. API timeout
   Category: Performance
   Priority: Critical
   ID: ghi-456-jkl

...

Template seeding completed successfully!

You can now use these templates in the support ticket system.
```
