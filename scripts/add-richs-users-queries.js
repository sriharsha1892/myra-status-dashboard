const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ORG_ID = '835ad7c2-8385-4461-b8f4-7ccd02409536'; // Rich's org ID

const users = [
  {
    name: "Michael Pence",
    email: "mpence@rich.com",
    role: "User"
  },
  {
    name: "Lezama Pérez Aureliano",
    email: "alezama@rich.com",
    role: "User"
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

async function addUsersAndQueries() {
  console.log('Adding users and queries to Rich\'s trial organization...');
  console.log('Org ID:', ORG_ID);
  console.log('');

  try {
    // Get account manager ID
    const { data: amUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'satish.boini@mordorintelligence.com')
      .single();

    // Create users
    console.log('Creating trial users...');
    const usersToInsert = users.map(user => ({
      org_id: ORG_ID,
      name: user.name,
      email: user.email,
      role: user.role,
      current_stage: 'active',
      account_manager: amUser?.id,
      created_at: new Date().toISOString()
    }));

    const { data: createdUsers, error: usersError } = await supabase
      .from('trial_users')
      .insert(usersToInsert)
      .select();

    if (usersError) {
      console.error('❌ Error creating trial users:', usersError.message);
      console.error('Details:', usersError);
      process.exit(1);
    }

    console.log('✅ Trial users created successfully!');
    console.log('');
    createdUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
    console.log('');

    // Create trial queries
    console.log('Creating trial queries...');
    const queriesToInsert = trialQueries.map(query => {
      const user = createdUsers.find(u => u.email === query.user_email);
      return {
        org_id: ORG_ID,
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
      console.error('❌ Error creating trial queries:', queriesError.message);
      console.error('Details:', queriesError);
    } else {
      console.log('✅ Trial queries created successfully!');
      console.log('');
      createdQueries.forEach(query => {
        console.log(`  - ${query.query_title} (${query.user_email}) - ${query.run_date}`);
      });
      console.log('');
    }

    console.log('✅ All done!');
    console.log('');
    console.log('View at: http://localhost:3000/support/trials/' + ORG_ID);
    console.log('Production URL: https://myra-status-dashboard.vercel.app/support/trials/' + ORG_ID);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

addUsersAndQueries();
