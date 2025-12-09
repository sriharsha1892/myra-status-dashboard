/**
 * API Route for Testing Excel Organizations Import
 *
 * Usage: POST /api/test/excel-orgs-import
 * Body: { testFile: "path/to/test.xlsx", cleanup: true/false }
 *
 * This endpoint allows testing the Excel Organizations import with real Excel files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Starting Excel Organizations Import Test...\\n');

    // Get request body
    const body = await req.json().catch(() => ({}));
    const cleanup = body.cleanup !== false; // Default true
    const testFilePath = body.testFile;

    if (!testFilePath) {
      return NextResponse.json({
        success: false,
        error: 'No test file specified. Provide testFile path in request body.',
        usage: 'POST { "testFile": "path/to/excel/file.xlsx", "cleanup": true }',
      }, { status: 400 });
    }

    // Check if file exists
    const resolvedPath = path.resolve(testFilePath);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({
        success: false,
        error: `File not found: ${resolvedPath}`,
      }, { status: 404 });
    }

    console.log(`📁 Reading test file: ${resolvedPath}`);
    const fileBuffer = fs.readFileSync(resolvedPath);
    const file = new File([fileBuffer], path.basename(resolvedPath), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    console.log(`✅ Test file loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)\\n`);

    // Run import
    console.log('⏳ Running import...');
    const startTime = Date.now();

    // Import the function - need to use dynamic import for server-side
    const { importExcelOrganizations } = await import('@/lib/organizations/excelOrganizationsImporter');

    const result = await importExcelOrganizations(file, (progress) => {
      console.log(`  [${progress.stage}] ${progress.percentComplete.toFixed(0)}% - ${progress.message}`);
    });

    const duration = Date.now() - startTime;

    console.log(`\\n✅ Import completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Total: ${result.summary.total}`);
    console.log(`   Successful: ${result.summary.successful}`);
    console.log(`   Failed: ${result.summary.failed}`);
    console.log(`   Warnings: ${result.summary.warnings}`);

    // Get imported data for analysis
    const { data: orgs } = await supabase
      .from('trial_organizations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(result.summary.successful);

    const { data: users } = await supabase
      .from('trial_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(result.summary.successful);

    // Analysis
    const domains = new Map<string, number>();
    const statuses = new Map<string, number>();
    const lifecycleStages = new Map<string, number>();

    orgs?.forEach(org => {
      domains.set(org.domain, (domains.get(org.domain) || 0) + 1);
      statuses.set(org.trial_status, (statuses.get(org.trial_status) || 0) + 1);
      lifecycleStages.set(org.org_lifecycle_stage, (lifecycleStages.get(org.org_lifecycle_stage) || 0) + 1);
    });

    const analysis = {
      totalOrganizations: orgs?.length || 0,
      totalUsers: users?.length || 0,
      domainDistribution: Object.fromEntries(domains),
      statusDistribution: Object.fromEntries(statuses),
      lifecycleDistribution: Object.fromEntries(lifecycleStages),
      sampleOrganizations: orgs?.slice(0, 5).map(org => ({
        name: org.org_name,
        domain: org.domain,
        status: org.trial_status,
        lifecycle: org.org_lifecycle_stage,
        logoUrl: org.logo_url,
      })),
      sampleUsers: users?.slice(0, 5).map(user => ({
        name: user.name,
        email: user.email,
        role: user.role,
        stage: user.current_stage,
      })),
    };

    // Cleanup if requested
    if (cleanup && orgs && orgs.length > 0) {
      console.log('\\n🧹 Cleaning up test data...');

      const orgIds = orgs.map(org => org.org_id);

      // Delete users
      const { error: userDeleteError } = await supabase
        .from('trial_users')
        .delete()
        .in('org_id', orgIds);

      if (userDeleteError) {
        console.warn('Warning: Failed to delete some users:', userDeleteError.message);
      }

      // Delete orgs
      const { error: orgDeleteError } = await supabase
        .from('trial_organizations')
        .delete()
        .in('org_id', orgIds);

      if (orgDeleteError) {
        console.warn('Warning: Failed to delete some orgs:', orgDeleteError.message);
      }

      console.log('✅ Cleanup complete');
    }

    // Return results
    return NextResponse.json({
      success: true,
      testFile: path.basename(resolvedPath),
      duration: `${(duration / 1000).toFixed(2)}s`,
      importSummary: result.summary,
      analysis,
      cleanedUp: cleanup,
      failedItems: result.failed?.slice(0, 10), // First 10 failures
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
    message: 'Excel Organizations Import Test API',
    usage: 'POST to this endpoint with test file path',
    example: {
      testFile: './test-data/sample-orgs.xlsx',
      cleanup: true,
    },
    notes: [
      'File path should be relative to project root',
      'cleanup=true will delete imported data after test',
      'cleanup=false will keep data for manual inspection',
    ],
  });
}
