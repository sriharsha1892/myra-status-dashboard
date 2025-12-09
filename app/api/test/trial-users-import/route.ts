/**
 * API Route for Testing Trial Users Import
 *
 * Usage: POST /api/test/trial-users-import
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTrialUsersImporter } from '@/lib/users/trialUsersImporter';
import { createClient } from '@supabase/supabase-js';

// Test data
const COMPREHENSIVE_TEST_DATA = `
# Trial Users Test Data

## Plain Email Lists
john.doe@acme.com
jane.smith@acme.com
bob.johnson@acme.com

## With Names
Jane Smith <jane@startup.io>
Bob Johnson <bob@startup.io>
Mike Developer <mike@startup.io>

## With Titles/Roles
CEO: Sarah Williams (sarah@enterprise.com)
CTO Bob Anderson <bob@enterprise.com>
VP Engineering - Mike Chen (mike@enterprise.com)
Engineering Manager: Tom Lee <tom@enterprise.com>
Lead Developer: Lisa Garcia <lisa@enterprise.com>
Senior Engineer - David Kim (david@enterprise.com)
Data Analyst: Emma Wilson <emma@enterprise.com>
UX Designer Maria Rodriguez <maria@enterprise.com>
Product Designer: Alex Johnson (alex@enterprise.com)

## CSV-Style Format
Name,Email,Title
John Founder,john@newco.io,Founder & CEO
Jane Manager,jane@newco.io,Engineering Manager
Bob Dev,bob@newco.io,Senior Developer
Sarah Data,sarah@newco.io,Data Analyst
Tom Design,tom@newco.io,Product Designer

## Email Thread Style
From: alice@company.com
To: team@company.com
CC: bob@company.com, charlie@company.com

Hi Team,

Please add these new trial users:
- jennifer.lead@client.com (Engineering Lead)
- mark.dev@client.com (Developer)
- susan.pm@client.com (Product Manager)

## Slack Export Style
@john.ceo CEO - john@bizco.io
@jane.vp VP of Sales - jane@bizco.io
@bob.director Director of Engineering - bob@bizco.io
@mike.engineer Software Engineer - mike@bizco.io

## Mixed Formats
Add trial access for:
1. sarah.founder@startup.io (Founder)
2. Tom Manager <tom@startup.io>
3. lisa@startup.io
4. mike.analyst@startup.io - Senior Data Analyst
5. emma.design@startup.io UX/UI Designer

## With Domains Indicating Roles
ceo@company.com
cto@company.com
admin@company.com
manager@company.com
developer@company.com
engineer@company.com
analyst@company.com
designer@company.com

## Edge Cases
duplicateuser@test.com
duplicateuser@test.com
invalid-email-format
user@
@domain.com
normaluser@valid.com

## International Names
José García <jose@global.com>
François Dubois <francois@global.com>
李明 <liming@global.com>
मोहित शर्मा <mohit@global.com>
`;

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Starting Trial Users Import Test...\n');

    // Get request body
    const body = await req.json().catch(() => ({}));
    const testData = body.testData || COMPREHENSIVE_TEST_DATA;
    const cleanup = body.cleanup !== false; // Default true

    // Create test org
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    console.log('📝 Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .insert({
        name: `test-trial-users-${Date.now()}`,
        website: 'https://test.example.com',
        status: 'active',
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Failed to create test org: ${orgError.message}`);
    }

    console.log(`✅ Test org created: ${org.id}\n`);

    // Run import
    console.log('⏳ Running import...');
    const importer = createTrialUsersImporter(org.id);
    const startTime = Date.now();

    const result = await importer.import(testData);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Import completed in ${(duration / 1000).toFixed(2)}s`);

    // Get imported users
    const { data: users, error: usersError } = await supabase
      .from('trial_users')
      .select('*')
      .eq('org_id', org.id)
      .order('name', { ascending: true });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Analysis
    const roles = new Map<string, number>();
    let totalConfidence = 0;

    users?.forEach(u => {
      roles.set(u.role, (roles.get(u.role) || 0) + 1);
      totalConfidence += u.confidence;
    });

    const avgConfidence = users && users.length > 0 ? totalConfidence / users.length : 0;
    const domains = new Set(users?.map(u => u.email.split('@')[1]) || []);

    const analysis = {
      totalUsers: users?.length || 0,
      roles: Object.fromEntries(roles),
      avgConfidence: `${(avgConfidence * 100).toFixed(1)}%`,
      uniqueDomains: domains.size,
      domains: Array.from(domains).slice(0, 10),
    };

    // Sample users
    const sampleUsers = users?.slice(0, 10).map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      confidence: `${(u.confidence * 100).toFixed(0)}%`,
    }));

    // Cleanup if requested
    if (cleanup) {
      console.log('\n🧹 Cleaning up test data...');

      // Delete users
      await supabase
        .from('trial_users')
        .delete()
        .eq('org_id', org.id);

      // Delete org
      await supabase
        .from('trial_organizations')
        .delete()
        .eq('id', org.id);

      console.log('✅ Cleanup complete');
    }

    // Return results
    return NextResponse.json({
      success: true,
      testOrgId: org.id,
      duration: `${(duration / 1000).toFixed(2)}s`,
      importSummary: result.summary,
      analysis,
      sampleUsers,
      allUsers: cleanup ? undefined : users,
      cleanedUp: cleanup,
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Trial Users Import Test API',
    usage: 'POST to this endpoint to run tests',
    options: {
      testData: 'Custom test data (optional)',
      cleanup: 'Whether to cleanup test data (default: true)',
    },
  });
}
