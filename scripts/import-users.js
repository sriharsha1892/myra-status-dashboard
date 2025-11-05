require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const users = [
  { name: 'Krati Agarwal', email: 'krati@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Kartheek Puttaparthini', email: 'kartheek@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Nikita Manmode', email: 'nikita@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Satyananth P', email: 'satyananth@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Satish Boini', email: 'satish.boini@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Kirandeep Kaur', email: 'kirandeep.kaur@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Rupak Dalapathi', email: 'rupak.dalapathi@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Reddy', email: 'reddy@mordorintelligence.com', role: 'Admin' },
  { name: 'Abin Zacharia', email: 'abin.zacharia@mordorintelligence.com', role: 'Admin' },
  { name: 'Aditya Pisupati', email: 'adi@mordorintelligence.com', role: 'Admin' },
  { name: 'Sai Teja', email: 'sai.teja@mordorintelligence.com', role: 'Sales Admin' },
  { name: 'Vivek Sikaria', email: 'vivek.sikaria@mordorintelligence.com', role: 'Research Admin' },
];

async function importUsers() {
  console.log('\n🚀 Starting user import...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const user of users) {
    try {
      console.log(`📧 Inviting ${user.name} (${user.email}) as ${user.role}...`);

      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        user.email,
        {
          data: {
            name: user.name,
            role: user.role,
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/login`,
        }
      );

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
        errors.push({ user: user.name, error: error.message });
      } else {
        console.log(`   ✅ Invited successfully!`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error: ${err.message}`);
      errorCount++;
      errors.push({ user: user.name, error: err.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Successfully invited: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach(({ user, error }) => {
      console.log(`   - ${user}: ${error}`);
    });
  }

  console.log('\n✨ Import complete!\n');
}

importUsers();
