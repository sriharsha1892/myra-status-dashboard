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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const tickets = [
  {
    organization: 'Acme Research Corp',
    user_name: 'John Smith',
    user_email: 'john@acme-research.com',
    category: 'Security',
    priority: 'High',
    status: 'New',
    description: 'We need clarification on data encryption standards for our research outputs. Can you provide documentation on how sensitive data is handled?',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Global Insights Ltd',
    user_name: 'Sarah Johnson',
    user_email: 'sarah@globalinsights.com',
    category: 'Tool Functioning',
    priority: 'Critical',
    status: 'In Progress',
    description: 'The export functionality is not working. When we try to export reports to PDF, we get a timeout error.',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Market Dynamics Inc',
    user_name: 'Michael Chen',
    user_email: 'mchen@marketdynamics.com',
    category: 'Feature Set',
    priority: 'Medium',
    status: 'New',
    description: 'Is there a way to customize the research templates? We would like to add our own company branding.',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Strategic Data Group',
    user_name: 'Emily Rodriguez',
    user_email: 'emily@strategicdata.com',
    category: 'Usage',
    priority: 'Low',
    status: 'Waiting on User',
    description: 'How do we share research outputs with external stakeholders? Looking for best practices.',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Innovation Partners',
    user_name: 'David Park',
    user_email: 'dpark@innovationpartners.com',
    category: 'Data Quality',
    priority: 'High',
    status: 'In Progress',
    description: 'Some of the market data seems outdated. The automotive industry report shows 2023 data but we need 2024.',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Future Trends LLC',
    user_name: 'Lisa Wang',
    user_email: 'lwang@futuretrends.com',
    category: 'Performance',
    priority: 'Medium',
    status: 'Resolved',
    description: 'The platform has been slow when generating large reports. Is this expected?',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Analysis Pro Ltd',
    user_name: 'Robert Taylor',
    user_email: 'rtaylor@analysispro.com',
    category: 'Feature Request',
    priority: 'Medium',
    status: 'New',
    description: 'Can we get an API integration to pull research data directly into our CRM?',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Research Nexus Inc',
    user_name: 'Amanda Martinez',
    user_email: 'amartinez@researchnexus.com',
    category: 'Security',
    priority: 'Medium',
    status: 'New',
    description: 'Do you support SSO integration? We use Okta for our organization.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Data Horizon Group',
    user_name: 'James Wilson',
    user_email: 'jwilson@datahorizon.com',
    category: 'Tool Functioning',
    priority: 'High',
    status: 'In Progress',
    description: 'Search functionality is returning incomplete results. When searching for "EV market" we only get 3 results.',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Insight Dynamics',
    user_name: 'Patricia Brown',
    user_email: 'pbrown@insightdynamics.com',
    category: 'Usage',
    priority: 'Low',
    status: 'Closed',
    description: 'Need training on how to use the advanced filters in research queries.',
    created_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Market Leaders Co',
    user_name: 'Christopher Lee',
    user_email: 'clee@marketleaders.com',
    category: 'Data Quality',
    priority: 'Critical',
    status: 'New',
    description: 'Critical: The healthcare market data for Q4 2024 contains duplicate entries.',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Strategic Minds Inc',
    user_name: 'Jennifer Kim',
    user_email: 'jkim@strategicminds.com',
    category: 'Feature Request',
    priority: 'Low',
    status: 'New',
    description: 'Would love to see a dark mode option for the interface.',
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Venture Insights',
    user_name: 'Daniel Garcia',
    user_email: 'dgarcia@ventureinsights.com',
    category: 'Performance',
    priority: 'High',
    status: 'In Progress',
    description: 'Dashboard loading times have increased significantly in the past week.',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Precision Research',
    user_name: 'Michelle Anderson',
    user_email: 'manderson@precisionresearch.com',
    category: 'Other',
    priority: 'Medium',
    status: 'Waiting on User',
    description: 'We need help understanding the pricing structure for additional users.',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    organization: 'Growth Analytics',
    user_name: 'Kevin Thompson',
    user_email: 'kthompson@growthanalytics.com',
    category: 'Feature Set',
    priority: 'Medium',
    status: 'Resolved',
    description: 'Can we export data in Excel format instead of just CSV?',
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString()
  }
];

async function seedTickets() {
  console.log('Seeding tickets...');

  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert(tickets)
      .select();

    if (error) {
      console.error('Error seeding tickets:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully seeded ${data.length} tickets`);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

seedTickets();
