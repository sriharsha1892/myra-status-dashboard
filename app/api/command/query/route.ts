/**
 * Query API - Handle data questions
 *
 * POST /api/command/query
 * Processes questions like "How many demos at ABB?" and returns answers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectQuery } from '@/lib/command/queryDetector';
import { executeQuery, type QueryResult } from '@/lib/command/queryExecutor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, session_context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Detect if this is a query
    const detected = detectQuery(question);

    if (!detected.isQuery) {
      return NextResponse.json({
        success: false,
        isQuery: false,
        message: 'This does not appear to be a question. Try phrasing it as a question or use an action command.',
      });
    }

    // If no org specified but we have session context, try to use focused org
    if (!detected.orgName && session_context?.focused_org_name) {
      detected.orgName = session_context.focused_org_name;
    }

    // Execute the query
    const result = await executeQuery(detected);

    return NextResponse.json({
      success: result.success,
      isQuery: true,
      queryType: detected.type,
      answer: result.answer,
      data: result.data,
      suggestions: result.suggestions,
      error: result.error,
    });
  } catch (error: any) {
    console.error('[Query API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}
