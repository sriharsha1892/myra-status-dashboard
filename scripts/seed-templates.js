/**
 * Seed script to pre-populate ticket templates
 *
 * Usage:
 *   node scripts/seed-templates.js
 *
 * This script creates 4 default templates for common ticket scenarios.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const templates = [
  {
    name: "Can't download PPT",
    category: 'Tool Functioning',
    priority: 'High',
    description_template: `User from {{organization}} is unable to download PowerPoint presentations.

User Details:
- Name: {{user_name}}
- Email: {{user_email}}

Issue: The download button for PowerPoint exports is not working or the downloaded file is corrupted.

Steps tried:
1. Refreshed the page
2. Tried different browsers
3. Cleared cache and cookies

Expected behavior: User should be able to download presentations as .pptx files without issues.`,
    custom_fields: {
      affected_feature: 'PowerPoint Export',
      browser: 'Chrome',
      error_type: 'Download Failure'
    },
    usage_count: 0
  },
  {
    name: 'API timeout',
    category: 'Performance',
    priority: 'Critical',
    description_template: `API timeout issue reported by {{organization}}.

Reporter: {{user_name}} ({{user_email}})

Issue Description:
The API is timing out when making requests to the myRA AI service. This is affecting multiple users and blocking critical workflows.

Impact:
- Users cannot access key features
- Workflows are interrupted
- Data sync is failing

Timeline:
- Issue started: [To be filled]
- Frequency: [To be filled]

Environment:
- Endpoint: [To be filled]
- Request type: [To be filled]`,
    custom_fields: {
      severity: 'System-wide',
      endpoint: '/api/v1/',
      response_time: '30s+',
      impact_level: 'High'
    },
    usage_count: 0
  },
  {
    name: 'Account access issue',
    category: 'Security',
    priority: 'High',
    description_template: `Account access issue for {{organization}}.

Affected User:
- Name: {{user_name}}
- Email: {{user_email}}

Issue Type:
[ ] Cannot log in
[ ] Password reset not working
[ ] Account locked
[ ] Permission issues
[ ] SSO/Authentication error

Description:
User is unable to access their account. Please investigate and restore access as soon as possible.

Additional context: [To be filled]

Security verification completed: [Yes/No]`,
    custom_fields: {
      account_type: 'Standard',
      authentication_method: 'Email/Password',
      last_successful_login: null
    },
    usage_count: 0
  },
  {
    name: 'Feature request',
    category: 'Feature Request',
    priority: 'Medium',
    description_template: `Feature request from {{organization}}.

Requested by: {{user_name}} ({{user_email}})

Feature Description:
[Provide detailed description of the requested feature]

Use Case:
[Explain how this feature would be used and what problem it solves]

Expected Benefit:
[Describe the value this feature would bring to users]

Priority Justification:
[Explain why this feature is important]

Additional Notes:
[Any other relevant information]`,
    custom_fields: {
      request_type: 'Enhancement',
      estimated_users_affected: 'Multiple',
      has_workaround: 'No'
    },
    usage_count: 0
  }
];

async function seedTemplates() {
  console.log('Starting template seed...\n');

  try {
    // Check if templates already exist
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('ticket_templates')
      .select('name');

    if (fetchError) {
      console.error('Error checking existing templates:', fetchError);
      process.exit(1);
    }

    const existingNames = new Set(existingTemplates?.map(t => t.name) || []);

    // Filter out templates that already exist
    const newTemplates = templates.filter(t => !existingNames.has(t.name));

    if (newTemplates.length === 0) {
      console.log('All templates already exist. Nothing to seed.');
      console.log('\nExisting templates:');
      existingTemplates?.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name}`);
      });
      return;
    }

    console.log(`Seeding ${newTemplates.length} new template(s)...\n`);

    // Insert new templates
    const { data, error } = await supabase
      .from('ticket_templates')
      .insert(newTemplates)
      .select();

    if (error) {
      console.error('Error inserting templates:', error);
      process.exit(1);
    }

    console.log('Successfully seeded templates:');
    data.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Priority: ${template.priority}`);
      console.log(`   ID: ${template.id}`);
    });

    console.log('\n\nTemplate seeding completed successfully!');
    console.log('\nYou can now use these templates in the support ticket system.');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the seed function
seedTemplates();
