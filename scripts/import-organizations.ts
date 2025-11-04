import { createClient } from '@supabase/supabase-js';

const organizations = [
  'Maruti Suzuki India Limited',
  'Emami',
  'Protiviti',
  'Huawei',
  'Synarchy',
  'SALIC',
  'Bosch',
  'H&H Group',
  'Sixth Factor Consulting',
  'Navi Sustainable Energy',
  'Jotun',
  'Astrazeneca',
  'AbbVie',
  'Alvarez & Marshal',
  'ABB',
  'AM Capital',
  'Oliver Wyman',
  'Huntsman',
  'Honeywell',
  'Amazon',
  'Abbott',
  'BD',
  'Ikea',
  'LBBG',
  'Oerlikon',
  'Silgan',
  'Saint-Gobain',
  'Trouw Nutrition',
  'ENEOS Corporation',
  'Airgas',
  'Wacker',
  'Dubai Investments',
  'Goody Co',
  'Amarai',
  'Focal Point',
  'SRMC',
  'Wipak',
  'JK Cements',
  'Hausmann',
  'Brimsa',
  'Mérieux NutriSciences',
  'Sony',
  'Cereal Docks',
  'GCC Makers',
  'BP-Castrol',
  'BASF',
  'Circlek',
  'Vanderlande',
];

async function importOrganizations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Starting import of ${organizations.length} organizations...`);

  const orgData = organizations.map((name) => ({
    org_name: name,
    org_domain: name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[&]/g, 'and')
      .replace(/[^a-z0-9]/g, ''),
    org_lifecycle_stage: 'prospect' as const,
    engagement_score: 0,
  }));

  try {
    const { data, error } = await supabase
      .from('trial_organizations')
      .insert(orgData)
      .select();

    if (error) {
      console.error('Error inserting organizations:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully created ${data?.length || 0} organizations`);
    console.log('Sample organizations created:');
    data?.slice(0, 5).forEach((org: any) => {
      console.log(`  - ${org.org_name} (${org.org_domain})`);
    });
    if (data && data.length > 5) {
      console.log(`  ... and ${data.length - 5} more`);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

importOrganizations();
