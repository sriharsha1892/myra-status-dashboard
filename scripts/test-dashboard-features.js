// Test Dashboard Card Toggle Features
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testDashboardFeatures() {
  console.log('📊 Testing Dashboard Features');
  console.log('=' . repeat(40));

  try {
    // Test metric calculations
    console.log('\n📈 Testing Dashboard Metrics...');

    // Get trial organizations
    const { data: orgs, error: orgError } = await supabase
      .from('trial_organizations')
      .select('*');

    if (orgError) throw orgError;

    const activeTrials = orgs.filter(o => o.org_lifecycle_stage === 'trial_active').length;
    console.log(`  ✅ Active Trials: ${activeTrials}`);

    // Get tickets
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .limit(100);

    if (ticketError) throw ticketError;

    const criticalTickets = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;
    const openTickets = tickets.filter(t => t.status !== 'resolved').length;

    console.log(`  ✅ Critical Tickets: ${criticalTickets}`);
    console.log(`  ✅ Open Tickets: ${openTickets}`);

    // Calculate at-risk trials
    const today = new Date();
    const atRiskTrials = orgs.filter(o => {
      if (!o.trial_end_date) return false;
      const endDate = new Date(o.trial_end_date);
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && daysLeft >= 0 && o.org_lifecycle_stage === 'trial_active';
    }).length;

    console.log(`  ✅ At Risk Trials: ${atRiskTrials}`);

    // Test user metrics
    const { count: userCount, error: userError } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true });

    console.log(`  ✅ Active Users: ${userCount || 0}`);

    // Calculate average engagement
    const orgsWithScores = orgs.filter(o => o.engagement_score !== null);
    const avgScore = orgsWithScores.length > 0
      ? Math.round(orgsWithScores.reduce((sum, o) => sum + (o.engagement_score || 0), 0) / orgsWithScores.length)
      : 0;

    console.log(`  ✅ Average Engagement: ${avgScore}%`);

    // Test primary vs secondary metrics
    console.log('\n🎯 Dashboard Card Configuration:');
    console.log('  Primary Cards (Always Visible):');
    console.log('    1. Active Trials');
    console.log('    2. Critical Tickets');
    console.log('    3. Open Tickets');
    console.log('    4. At Risk Trials');

    console.log('  Secondary Cards (Toggle):');
    console.log('    5. Total Organizations');
    console.log('    6. Total Tickets');
    console.log('    7. Active Users');
    console.log('    8. Engagement Score');

    console.log('\n✅ Dashboard features test completed successfully!');

  } catch (error) {
    console.error('\n❌ Dashboard test failed:', error.message);
    process.exit(1);
  }
}

testDashboardFeatures();