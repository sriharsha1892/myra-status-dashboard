// Test Real-time Presence Features
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testPresenceFeatures() {
  console.log('👥 Testing Real-time Presence Features');
  console.log('=' . repeat(40));

  try {
    // Get test org
    const { data: org } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .limit(1)
      .single();

    if (!org) {
      throw new Error('No organization found');
    }

    console.log(`\n📍 Testing with org: ${org.org_name}`);

    // Create presence channel
    const channel = supabase.channel(`roadmap-presence-${org.org_id}-test`, {
      config: {
        presence: {
          key: 'test-user-1',
        },
      },
    });

    // Test user presence data
    const presenceData = {
      id: 'test-user-1',
      name: 'Test User 1',
      email: 'test1@example.com',
      color: '#8B5CF6',
      lastSeen: Date.now(),
      status: 'active',
      currentView: 'roadmap'
    };

    console.log('\n📡 Testing Presence Channel...');

    // Subscribe and track presence
    await new Promise((resolve, reject) => {
      channel
        .on('presence', { event: 'sync' }, () => {
          console.log('  ✅ Presence sync event received');
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log(`  ✅ User joined: ${key}`);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log(`  ✅ User left: ${key}`);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('  ✅ Channel subscribed successfully');

            // Track presence
            await channel.track(presenceData);
            console.log('  ✅ Presence tracked');

            // Update presence status
            await channel.track({ ...presenceData, status: 'idle' });
            console.log('  ✅ Status updated to idle');

            // Simulate cursor movement
            await channel.track({
              ...presenceData,
              cursor: { x: 50, y: 50 },
              status: 'active'
            });
            console.log('  ✅ Cursor position tracked');

            resolve();
          }
        });
    });

    // Test presence state
    const state = channel.presenceState();
    console.log(`\n📊 Presence State: ${Object.keys(state).length} user(s) tracked`);

    // Unsubscribe
    await channel.unsubscribe();
    console.log('  ✅ Channel unsubscribed');

    console.log('\n✅ Presence features test completed successfully!');

  } catch (error) {
    console.error('\n❌ Presence test failed:', error.message);
    process.exit(1);
  }
}

testPresenceFeatures();