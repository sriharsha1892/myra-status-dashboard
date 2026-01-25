import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const { rows, action } = body as {
      rows?: ExcelRow[];
      action?: 'analyze' | 'commit';
      reviewRows?: CommitRequest['reviewRows'];
    };

    // Route to appropriate handler
    if (action === 'commit') {
      return handleCommit(body.reviewRows || []);
    }

    // Default: Analyze
    return handleAnalyze(rows || []);
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
  reviewRows: CommitRequest['reviewRows']
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

  for (const row of reviewRows) {
    try {
      if (row.status === 'skipped') {
        skipped++;
        continue;
      }

      const excelData = row.excelData;

      if (row.status === 'new' || !row.selectedMatchId) {
        // Create new record
        const { error } = await supabase.from('sales_pipeline').insert({
          external_id: excelData.external_id as string,
          company_name: excelData.company_name as string,
          primary_email: excelData.primary_email as string,
          stage: excelData.stage as string,
          deal_value: excelData.deal_value as number,
          employee_name: excelData.employee_name as string,
          contact_title: excelData.contact_title as string,
          expected_close: excelData.expected_close as string,
          extra_data: excelData.extra_data as Record<string, unknown>,
        });

        if (error) {
          errors.push(`Create failed (${excelData.company_name}): ${error.message}`);
        } else {
          created++;
        }
      } else {
        // Update existing record with resolved fields
        const updateData: Record<string, unknown> = {};

        // Apply field resolutions
        for (const [field, resolution] of Object.entries(row.fieldResolutions || {})) {
          if (resolution === 'use_excel') {
            // Map field names if needed
            const excelField = FIELD_MAPPINGS.find((m) => m.dbField === field)?.excelField || field;
            updateData[field] = excelData[excelField];
          }
          // 'keep_db' means we don't update that field
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('sales_pipeline')
            .update(updateData)
            .eq('id', row.selectedMatchId);

          if (error) {
            errors.push(`Update failed (${excelData.company_name}): ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // No changes to apply
          skipped++;
        }
      }
    } catch (err) {
      errors.push(`Error processing row ${row.rowIndex}: ${err instanceof Error ? err.message : 'Unknown'}`);
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
      const sample = JSON.parse(sampleJson) as ExcelRow;
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
