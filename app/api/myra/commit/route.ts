// API Route: Commit approved staging records to production
// POST /api/myra/commit

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { commitBatchToProduction, rollbackBatch } from '@/lib/myra/commitToProduction';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['super_admin', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { batchId, action } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    if (action === 'rollback') {
      // Rollback batch
      const result = await rollbackBatch(batchId, true, supabase);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Batch rolled back successfully',
      });
    }

    // Commit batch
    const result = await commitBatchToProduction(batchId, supabase);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Commit failed',
          statistics: result.statistics,
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      statistics: result.statistics,
      message: `Successfully committed ${result.statistics.successful} insights`,
    });
  } catch (error: any) {
    console.error('Commit error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
