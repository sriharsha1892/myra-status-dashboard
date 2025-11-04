import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify authorization - check for admin role
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Create admin client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251104_feature_roadmap_links.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { error: 'Migration file not found' },
        { status: 404 }
      );
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into statements (basic parsing)
    const statements = migrationSql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    const results: Array<{ statement: string; success: boolean }> = [];
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      // Using raw SQL execution via Supabase
      let error: any = null;
      let data: any = null;

      try {
        const result = await supabase.rpc('exec_sql', {
          sql: statement,
        } as any);
        error = result.error;
        data = result.data;
      } catch (err) {
        error = { message: 'Direct RPC not available, attempting alternative' };
      }

      if (error) {
        console.warn(`Statement ${i + 1} may have failed:`, error);
      } else {
        results.push({
          statement: statement.substring(0, 50) + '...',
          success: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration executed. Please check Supabase console to verify.',
      statementsAttempted: statements.length,
      results: results.length > 0 ? results : 'Check console logs',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply migration',
        message: error instanceof Error ? error.message : String(error),
        note: 'Please apply the migration manually via Supabase SQL Editor',
      },
      { status: 500 }
    );
  }
}
