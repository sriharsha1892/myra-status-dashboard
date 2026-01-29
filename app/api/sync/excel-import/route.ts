import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  mapExcelData,
  detectColumns,
  type ExcelRow,
} from '@/lib/sync/demo-pipeline-mapper';
import {
  matchExcelToDb,
  compareRecords,
  FIELD_MAPPINGS,
  type DbRecord,
  type MatchResult,
  type FieldDiff,
} from '@/lib/sync/fuzzy-matcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 50;

// Zod schemas for request validation
const ExcelRowSchema = z.record(z.unknown());

const AnalyzeRequestSchema = z.object({
  rows: z.array(ExcelRowSchema).min(1, { message: 'At least one row is required' }),
  action: z.literal('analyze').optional(),
});

const CommitRowSchema = z.object({
  rowIndex: z.number(),
  excelData: z.record(z.unknown()),
  selectedMatchId: z.string().nullable(),
  fieldResolutions: z.record(z.enum(['keep_db', 'use_excel'])),
  status: z.enum(['matched', 'new', 'skipped']),
});

const CommitRequestSchema = z.object({
  action: z.literal('commit'),
  reviewRows: z.array(CommitRowSchema).min(1, { message: 'At least one row is required' }),
});

// ============================================
// Types
// ============================================

export interface ReviewRow {
  rowIndex: number;
  excelData: Record<string, unknown>;
  matchResult: MatchResult;
  selectedMatchId: string | null; // DB record ID or null for "new"
  fieldDiffs: FieldDiff[];
  status: 'matched' | 'fuzzy' | 'new' | 'skipped';
}

interface AnalyzeResponse {
  success: boolean;
  reviewRows: ReviewRow[];
  summary: {
    totalRows: number;
    exactMatches: number;
    fuzzyMatches: number;
    noMatches: number;
    totalDiffs: number;
  };
  dbRecords: DbRecord[]; // For dropdown options
}

interface CommitRequest {
  reviewRows: Array<{
    rowIndex: number;
    excelData: Record<string, unknown>;
    selectedMatchId: string | null;
    fieldResolutions: Record<string, 'keep_db' | 'use_excel'>;
    status: 'matched' | 'new' | 'skipped';
  }>;
}

interface CommitResponse {
  success: boolean;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
}

// ============================================
// POST - Analyze Excel data (Step 1: Review)
// ============================================
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Route based on action and validate with appropriate schema
    if (body.action === 'commit') {
      const parseResult = CommitRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: parseResult.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      return handleCommit(parseResult.data.reviewRows);
    }

    // Default: Analyze - validate with analyze schema
    const parseResult = AnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return handleAnalyze(parseResult.data.rows as ExcelRow[]);
  } catch (error) {
    console.error('Excel import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// ============================================
// Analyze: Parse Excel, fuzzy match, find diffs
// ============================================
async function handleAnalyze(rows: ExcelRow[]): Promise<NextResponse> {
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: 'No data provided' },
      { status: 400 }
    );
  }

  // Map Excel data
  const { pipeline, errors } = mapExcelData(rows);

  if (pipeline.length === 0) {
    return NextResponse.json(
      { error: 'No valid rows found', parseErrors: errors },
      { status: 400 }
    );
  }

  // Fetch existing DB records for matching
  const { data: dbRecords, error: dbError } = await supabase
    .from('sales_pipeline')
    .select('id, company_name, primary_email, stage, deal_value, employee_name, contact_title, expected_close, external_id')
    .order('company_name');

  if (dbError) {
    return NextResponse.json(
      { error: 'Failed to fetch existing records' },
      { status: 500 }
    );
  }

  const typedDbRecords = (dbRecords || []) as DbRecord[];

  // Match Excel rows to DB records
  const excelForMatching = pipeline.map((p) => ({
    company_name: p.company_name,
    email: p.primary_email,
    ...p,
  }));

  const matchResults = matchExcelToDb(excelForMatching, typedDbRecords);

  // Build review rows with diffs
  const reviewRows: ReviewRow[] = matchResults.map((matchResult, index) => {
    const excelData = pipeline[index] as unknown as Record<string, unknown>;
    let fieldDiffs: FieldDiff[] = [];
    let status: ReviewRow['status'] = 'new';
    let selectedMatchId: string | null = null;

    if (matchResult.matchType === 'exact' && matchResult.suggestedMatch) {
      status = 'matched';
      selectedMatchId = matchResult.suggestedMatch.id;
      fieldDiffs = compareRecords(excelData, matchResult.suggestedMatch, FIELD_MAPPINGS);
    } else if (matchResult.matchType === 'fuzzy' && matchResult.suggestedMatch) {
      status = 'fuzzy';
      selectedMatchId = matchResult.suggestedMatch.id;
      fieldDiffs = compareRecords(excelData, matchResult.suggestedMatch, FIELD_MAPPINGS);
    }

    return {
      rowIndex: index,
      excelData,
      matchResult,
      selectedMatchId,
      fieldDiffs,
      status,
    };
  });

  // Calculate summary
  const summary = {
    totalRows: reviewRows.length,
    exactMatches: reviewRows.filter((r) => r.status === 'matched').length,
    fuzzyMatches: reviewRows.filter((r) => r.status === 'fuzzy').length,
    noMatches: reviewRows.filter((r) => r.status === 'new').length,
    totalDiffs: reviewRows.reduce((sum, r) => sum + r.fieldDiffs.length, 0),
  };

  const response: AnalyzeResponse = {
    success: true,
    reviewRows,
    summary,
    dbRecords: typedDbRecords,
  };

  return NextResponse.json(response);
}

// ============================================
// Commit: Apply user-reviewed changes
// ============================================
async function handleCommit(
  reviewRows: z.infer<typeof CommitRowSchema>[]
): Promise<NextResponse> {
  if (!reviewRows || reviewRows.length === 0) {
    return NextResponse.json(
      { error: 'No review data provided' },
      { status: 400 }
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Separate rows by operation type for batch processing
  const rowsToCreate: Array<{ row: z.infer<typeof CommitRowSchema>; data: Record<string, unknown> }> = [];
  const rowsToUpdate: Array<{ row: z.infer<typeof CommitRowSchema>; data: Record<string, unknown> }> = [];

  for (const row of reviewRows) {
    if (row.status === 'skipped') {
      skipped++;
      continue;
    }

    const excelData = row.excelData;

    if (row.status === 'new' || !row.selectedMatchId) {
      // Prepare for batch insert
      rowsToCreate.push({
        row,
        data: {
          external_id: excelData.external_id as string,
          company_name: excelData.company_name as string,
          primary_email: excelData.primary_email as string,
          stage: excelData.stage as string,
          deal_value: excelData.deal_value as number,
          employee_name: excelData.employee_name as string,
          contact_title: excelData.contact_title as string,
          expected_close: excelData.expected_close as string,
          extra_data: excelData.extra_data as Record<string, unknown>,
        },
      });
    } else {
      // Prepare update data
      const updateData: Record<string, unknown> = {};

      for (const [field, resolution] of Object.entries(row.fieldResolutions || {})) {
        if (resolution === 'use_excel') {
          const excelField = FIELD_MAPPINGS.find((m) => m.dbField === field)?.excelField || field;
          updateData[field] = excelData[excelField];
        }
      }

      if (Object.keys(updateData).length > 0) {
        rowsToUpdate.push({ row, data: updateData });
      } else {
        skipped++;
      }
    }
  }

  // Process inserts in batches
  for (let i = 0; i < rowsToCreate.length; i += BATCH_SIZE) {
    const batch = rowsToCreate.slice(i, i + BATCH_SIZE);
    const insertData = batch.map((b) => b.data);

    try {
      const { error, data } = await supabase
        .from('sales_pipeline')
        .insert(insertData)
        .select('id');

      if (error) {
        // If batch fails, try individual inserts to identify specific failures
        for (const item of batch) {
          const { error: singleError } = await supabase
            .from('sales_pipeline')
            .insert(item.data);

          if (singleError) {
            errors.push(`Create failed (${item.data.company_name}): ${singleError.message}`);
          } else {
            created++;
          }
        }
      } else {
        created += data?.length || batch.length;
      }
    } catch (err) {
      errors.push(`Batch insert error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  // Process updates individually (each update targets different record)
  for (let i = 0; i < rowsToUpdate.length; i += BATCH_SIZE) {
    const batch = rowsToUpdate.slice(i, i + BATCH_SIZE);

    // Run updates in parallel within the batch
    const updatePromises = batch.map(async (item) => {
      try {
        const { error } = await supabase
          .from('sales_pipeline')
          .update(item.data)
          .eq('id', item.row.selectedMatchId!);

        if (error) {
          return { success: false, error: `Update failed (${item.row.excelData.company_name}): ${error.message}` };
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: `Error updating row ${item.row.rowIndex}: ${err instanceof Error ? err.message : 'Unknown'}` };
      }
    });

    const results = await Promise.all(updatePromises);
    for (const result of results) {
      if (result.success) {
        updated++;
      } else if (result.error) {
        errors.push(result.error);
      }
    }
  }

  // Log the sync
  await supabase.from('excel_sync_logs').insert({
    sync_type: 'pipeline',
    source_type: 'excel_upload',
    rows_received: reviewRows.length,
    rows_created: created,
    rows_updated: updated,
    rows_failed: errors.length,
    error_details: errors.slice(0, 50),
  });

  const response: CommitResponse = {
    success: errors.length === 0,
    summary: { created, updated, skipped, errors },
  };

  return NextResponse.json(response);
}

// ============================================
// GET - Column detection & recent syncs
// ============================================
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sampleJson = searchParams.get('sample');

    if (sampleJson) {
      let sample: ExcelRow;
      try {
        sample = JSON.parse(sampleJson) as ExcelRow;
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in sample parameter' },
          { status: 400 }
        );
      }
      const detection = detectColumns(sample);
      return NextResponse.json(detection);
    }

    // Return recent sync logs
    const { data: logs } = await supabase
      .from('excel_sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ recentSyncs: logs || [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
