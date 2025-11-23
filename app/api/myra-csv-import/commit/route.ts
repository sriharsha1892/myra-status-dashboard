// API endpoint for committing approved queries to database
// Receives approved queries and creates orgs, users, and platform_queries

import { NextRequest, NextResponse } from 'next/server';
import { commitImport } from '@/lib/myra-csv/importer';
import { ImportCommitRequest } from '@/lib/myra-csv/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large imports

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n========== COMMIT IMPORT START [${timestamp}] ==========`);

  try {
    const body: ImportCommitRequest = await request.json();

    if (!body.approvedQueries || body.approvedQueries.length === 0) {
      console.error('❌ No queries to import');
      return NextResponse.json(
        { error: 'No queries to import' },
        { status: 400 }
      );
    }

    console.log(`📊 Import request details:`);
    console.log(`   - Total queries: ${body.approvedQueries.length}`);
    console.log(`   - First query sample:`, JSON.stringify({
      org_name: body.approvedQueries[0]?.finalQuery?.org_name,
      user_email: body.approvedQueries[0]?.finalQuery?.user_email,
      query_text: body.approvedQueries[0]?.finalQuery?.query_text?.substring(0, 50),
      category: body.approvedQueries[0]?.finalQuery?.category,
      status: body.approvedQueries[0]?.finalQuery?.status,
    }, null, 2));

    // Commit to database
    console.log('🔄 Starting database commit...');
    const result = await commitImport(body);

    if (!result.success) {
      console.error('❌ Import failed (result.success = false)');
      console.error('Result details:', JSON.stringify(result, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Import failed',
          result,
        },
        { status: 500 }
      );
    }

    console.log(`✅ Import successful: ${result.summary.queriesImported} queries imported`);
    console.log(`========== COMMIT IMPORT END [${new Date().toISOString()}] ==========\n`);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('\n❌❌❌ UNHANDLED ERROR IN COMMIT ENDPOINT ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error(`========== COMMIT IMPORT ERROR END [${new Date().toISOString()}] ==========\n`);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to commit import',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
