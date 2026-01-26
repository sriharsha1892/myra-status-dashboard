import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callGroqJSON } from '@/lib/ai/groqClient';
import { GroqMatchResponse } from '@/lib/sync/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { names, category } = body;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json(
        { error: 'names array is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'category is required' },
        { status: 400 }
      );
    }

    // Fetch all organizations from DB (including status for display)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, display_name, status, trial_status')
      .order('name');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    if (!orgs || orgs.length === 0) {
      // No orgs in DB, return all as no-match
      const matches = names.map((name: string) => ({
        input: name.trim(),
        matched_id: null,
        matched_name: null,
        confidence: 0,
      }));
      return NextResponse.json({ success: true, matches });
    }

    // Build the Groq prompt
    const inputNamesList = names
      .map((n: string, i: number) => `${i + 1}. ${n.trim()}`)
      .join('\n');

    const dbRecordsList = orgs
      .map((org) => {
        const displayPart = org.display_name ? ` (display: "${org.display_name}")` : '';
        return `- id: "${org.id}", name: "${org.name}"${displayPart}`;
      })
      .join('\n');

    const prompt = `You are matching company names. Given input names and database records, find the best match for each input.

Input names:
${inputNamesList}

Database records:
${dbRecordsList}

Return JSON in this exact format:
{
  "matches": [
    {"input": "Input Name 1", "matched_id": "uuid-here", "matched_name": "Matched Org Name", "confidence": 95},
    {"input": "Input Name 2", "matched_id": null, "matched_name": null, "confidence": 0}
  ]
}

Matching rules:
- confidence 95-100: near-exact match (typos, abbreviations, "Inc" vs "Inc.", case differences)
- confidence 70-94: fuzzy match (partial name, known subsidiary, clear relationship)
- confidence 50-69: weak match (needs human review, possible but uncertain)
- confidence 0: no match found

Important:
- Match each input name to AT MOST one database record
- If no good match exists, set matched_id and matched_name to null with confidence 0
- Consider common variations: Corp/Corporation, Inc/Incorporated, Ltd/Limited, & vs and
- Consider that input might be a subsidiary or brand name of a parent company
- Return matches in the same order as the input names`;

    const response = await callGroqJSON<GroqMatchResponse>(prompt, {
      timeout_ms: 60000, // 60 seconds for potentially long lists
    });

    if (!response.success || !response.data) {
      console.error('Groq error:', response.error);
      return NextResponse.json(
        { error: response.error || 'Failed to process with AI' },
        { status: 500 }
      );
    }

    // Validate and clean the response
    const matches = response.data.matches || [];

    // Ensure all input names are represented
    const matchedInputs = new Set(matches.map((m) => m.input));
    const cleanNames = names.map((n: string) => n.trim());

    for (const name of cleanNames) {
      if (!matchedInputs.has(name)) {
        matches.push({
          input: name,
          matched_id: null,
          matched_name: null,
          confidence: 0,
        });
      }
    }

    // Create a lookup map for org status by ID
    const orgStatusMap = new Map(
      orgs.map((org) => [org.id, { status: org.status, trial_status: org.trial_status }])
    );

    // Enrich matches with current status
    const enrichedMatches = matches.map((match) => {
      if (match.matched_id && orgStatusMap.has(match.matched_id)) {
        const orgStatus = orgStatusMap.get(match.matched_id)!;
        return {
          ...match,
          current_status: orgStatus.status,
          current_trial_status: orgStatus.trial_status,
        };
      }
      return {
        ...match,
        current_status: null,
        current_trial_status: null,
      };
    });

    return NextResponse.json({
      success: true,
      matches: enrichedMatches,
      duration_ms: response.duration_ms,
    });
  } catch (error) {
    console.error('POST groq-match error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
