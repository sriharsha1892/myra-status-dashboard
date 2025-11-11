// Test script to check customer ticket creation
const { createClient } = require('@supabase/supabase-js');

async function testTicketCreation() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Testing ticket creation with minimal data...\n');

  const testData = {
    title: 'Test from script',
    description: '<p>Test description</p>',
    status: 'open',
    priority: 'medium',
    user_name: 'Test User',
    user_email: 'test@example.com',
    source: 'customer_chat',
    organization: 'Customer',
  };

  console.log('Inserting:', JSON.stringify(testData, null, 2));

  const { data, error } = await supabase
    .from('tickets')
    .insert(testData)
    .select('ticket_id, ticket_number')
    .single();

  if (error) {
    console.error('\n❌ Error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('\n✅ Success!');
  console.log('Ticket created:', JSON.stringify(data, null, 2));
}

testTicketCreation();
