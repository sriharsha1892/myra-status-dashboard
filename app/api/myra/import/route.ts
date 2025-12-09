// API Route: Import myRA activity from screenshots
// POST /api/myra/import - Start a new import batch

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processBatch } from '@/lib/myra/batchProcessor';

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

    // Parse form data
    const formData = await request.formData();
    const batchName = formData.get('batchName') as string;
    const description = formData.get('description') as string | null;
    const excludedUsers = formData.get('excludedUsers') as string | null;

    // Get screenshot files
    const screenshotFiles: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('screenshot_') && value instanceof File) {
        screenshotFiles.push(value);
      }
    }

    if (screenshotFiles.length === 0) {
      return NextResponse.json({ error: 'No screenshots provided' }, { status: 400 });
    }

    if (!batchName) {
      return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
    }

    // Upload screenshots to storage (simplified - in production use Supabase Storage)
    const screenshots = await Promise.all(
      screenshotFiles.map(async (file, index) => {
        // For MVP, we'll store as data URLs
        // In production, upload to Supabase Storage or S3
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        return {
          file,
          url: dataUrl, // In production: uploaded storage URL
        };
      })
    );

    // Process the batch
    const result = await processBatch(
      screenshots,
      {
        batchName,
        description: description || undefined,
        excludedUsers: excludedUsers ? JSON.parse(excludedUsers) : [],
        userId: user.id,
      },
      undefined, // No progress callback for API route
      supabase
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Import failed',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      batch_id: result.batch_id,
      statistics: result.statistics,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/myra/import?batchId=xxx - Get batch status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      // List all batches
      const { data: batches, error } = await supabase
        .from('myra_import_batches')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return NextResponse.json({ batches });
    }

    // Get specific batch with staging records
    const [batchResult, stagingResult] = await Promise.all([
      supabase.from('myra_import_batches').select('*').eq('batch_id', batchId).single(),
      supabase
        .from('myra_activity_staging')
        .select('*')
        .eq('import_batch_id', batchId)
        .order('created_at', { ascending: true }),
    ]);

    if (batchResult.error) {
      throw batchResult.error;
    }

    return NextResponse.json({
      batch: batchResult.data,
      staging_records: stagingResult.data || [],
    });
  } catch (error: any) {
    console.error('Get batch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
