const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  {
    name: "Michael Pence",
    email: "mpence@rich.com",
    role: "User",
    is_primary: true
  },
  {
    name: "Lezama Pérez Aureliano",
    email: "alezama@rich.com",
    role: "User",
    is_primary: false
  }
];

const trialQueries = [
  {
    title: "Dairy Beverage Giants",
    user_email: "mpence@rich.com",
    run_date: "2025-11-17"
  },
  {
    title: "Global Cream Manufacturers",
    user_email: "mpence@rich.com",
    run_date: "2025-11-17"
  },
  {
    title: "Top Dairy Giants",
    user_email: "mpence@rich.com",
    run_date: "2025-11-17"
  },
  {
    title: "Latin America Cream Market In...",
    user_email: "alezama@rich.com",
    run_date: "2025-11-15"
  }
];

async function createTrialOrgWithUsersAndQueries() {
  console.log('Creating trial organization for Rich\'s...');
  console.log('');

  try {
    // Get account manager ID
    const { data: amUser, error: amError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'satish.boini@mordorintelligence.com')
      .single();

    if (amError || !amUser) {
      console.error('❌ Error finding account manager:', amError?.message || 'Not found');
      console.error('Please create user with email satish.boini@mordorintelligence.com first');
      process.exit(1);
    }

    const trialData = {
      org_name: "Rich's",
      domain: "AF&B",
      org_url: "https://www.richs.com/",
      logo_url: "https://www.richs.com/assets/images/logo.svg",
      description: "Rich's is a multinational, family-owned food company specializing in frozen and refrigerated food products for global markets. The firm is a leading supplier of non-dairy toppings, icings, frozen desserts, bakery items, and pizza products to foodservice and retail channels.",
      account_manager_id: amUser.id,
      sales_poc_id: null,
      sales_poc: null,
      org_lifecycle_stage: 'prospect',
      trial_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create trial organization
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .insert(trialData)
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating trial organization:', orgError.message);
      console.error('Details:', orgError);
      process.exit(1);
    }

    console.log('✅ Trial organization created successfully!');
    console.log('');
    console.log('Organization ID:', org.org_id);
    console.log('Organization Name:', org.org_name);
    console.log('Account Manager ID:', org.account_manager_id);
    console.log('Domain:', org.domain);
    console.log('Trial Status:', org.trial_status);
    console.log('');

    // Create users
    console.log('Creating trial users...');
    const usersToInsert = users.map(user => ({
      org_id: org.org_id,
      name: user.name,
      email: user.email,
      role: user.role,
      current_stage: 'active',
      account_manager: amUser.id,
      created_at: new Date().toISOString(),
      is_primary_user: user.is_primary
    }));

    const { data: createdUsers, error: usersError } = await supabase
      .from('trial_users')
      .insert(usersToInsert)
      .select();

    if (usersError) {
      console.error('⚠️  Warning: Error creating trial users:', usersError.message);
      console.error('Details:', usersError);
    } else {
      console.log('✅ Trial users created successfully!');
      console.log('');
      createdUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email})${user.is_primary_user ? ' [PRIMARY]' : ''}`);
      });
      console.log('');
    }

    // Create trial queries
    console.log('Creating trial queries...');
    const queriesToInsert = trialQueries.map(query => {
      const user = createdUsers.find(u => u.email === query.user_email);
      return {
        org_id: org.org_id,
        query_title: query.title,
        user_id: user?.id,
        user_email: query.user_email,
        run_date: query.run_date,
        created_at: new Date().toISOString(),
      };
    });

    const { data: createdQueries, error: queriesError } = await supabase
      .from('trial_queries')
      .insert(queriesToInsert)
      .select();

    if (queriesError) {
      console.error('⚠️  Warning: Error creating trial queries:', queriesError.message);
      console.error('Details:', queriesError);
      console.log('You may need to add queries manually.');
    } else {
      console.log('✅ Trial queries created successfully!');
      console.log('');
      createdQueries.forEach(query => {
        console.log(`  - ${query.query_title} (${query.user_email}) - ${query.run_date}`);
      });
      console.log('');
    }

    console.log('View at: http://localhost:3000/support/trials/' + org.org_id);
    console.log('Production URL: https://myra-status-dashboard.vercel.app/support/trials/' + org.org_id);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createTrialOrgWithUsersAndQueries();
