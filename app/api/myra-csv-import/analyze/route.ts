// API endpoint for CSV analysis
// Receives CSV file, analyzes with AI and entity matching, returns summary

import { NextRequest, NextResponse } from 'next/server';
import { parseCSVFile, analyzeCSVData, createImportSummary } from '@/lib/myra-csv/importer';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large files

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Parse CSV
    const parsedData = await parseCSVFile(file);

    if (parsedData.hasErrors) {
      return NextResponse.json(
        {
          error: 'CSV validation failed',
          errors: parsedData.errors,
        },
        { status: 400 }
      );
    }

    if (parsedData.totalRows === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Analyze queries (AI + entity matching)
    const analyzedQueries = await analyzeCSVData(parsedData.rows);

    // Create summary with three-tier breakdown
    const summary = createImportSummary(analyzedQueries);

    return NextResponse.json({
      success: true,
      summary,
      analyzedQueries, // Include full details for review
    });
  } catch (error: any) {
    console.error('CSV analysis error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze CSV',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
