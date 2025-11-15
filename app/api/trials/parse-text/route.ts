import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  parseText,
  calculateConfidence,
  normalizeOrgName,
  extractDomainFromEmail
} from '@/lib/trials/textParser';
import { parseTextWithGroq, isGroqAvailable } from '@/lib/trials/groqParser';
import { findDuplicateOrgs, findDuplicateUsers } from '@/lib/trials/autoLink';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, source_type = 'manual_entry' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Parse the text - try Groq first, fall back to regex
    let parsed;
    let extraction_method = 'regex';

    if (isGroqAvailable()) {
      try {
        console.log('🤖 Attempting Groq LLM extraction...');
        parsed = await parseTextWithGroq(text);
        extraction_method = 'groq';
        console.log('✅ Groq extraction succeeded');
      } catch (groqError) {
        console.warn('⚠️ Groq extraction failed, falling back to regex:', groqError);
        parsed = await parseText(text);
      }
    } else {
      console.log('📝 Using regex extraction (Groq not available)');
      parsed = await parseText(text);
    }

    // Find potential duplicates for extracted orgs and users
    const orgDuplicates = [];
    for (const org of parsed.orgs) {
      const domain = parsed.users.length > 0
        ? extractDomainFromEmail(parsed.users[0].value)
        : undefined;

      const duplicates = await findDuplicateOrgs(org.value, domain);
      if (duplicates.length > 0) {
        orgDuplicates.push({
          org: org.value,
          matches: duplicates
        });
      }
    }

    const userDuplicates = [];
    for (const user of parsed.users.filter(u => u.metadata?.email)) {
      const duplicates = await findDuplicateUsers(user.metadata.email, user.value);
      if (duplicates.length > 0) {
        userDuplicates.push({
          user: user.value,
          email: user.metadata.email,
          matches: duplicates
        });
      }
    }

    // Create parsing session record
    const { data: session, error: sessionError } = await supabase
      .from('parsing_sessions')
      .insert({
        parsed_by: user.id,
        source_text: text,
        source_type,
        extracted_data: {
          orgs: parsed.orgs,
          users: parsed.users,
          activities: parsed.activities,
          dates: parsed.dates,
          numbers: parsed.numbers,
          features: parsed.features,
          models: parsed.models
        },
        confidence_scores: {
          overall: parsed.overall_confidence,
          orgs: calculateConfidence(parsed.orgs),
          users: calculateConfidence(parsed.users),
          activities: calculateConfidence(parsed.activities)
        },
        flagged_for_review: parsed.overall_confidence < 90 || orgDuplicates.length > 0 || userDuplicates.length > 0
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating parsing session:', sessionError);
    }

    return NextResponse.json({
      success: true,
      session_id: session?.id,
      parsed,
      extraction_method, // 'groq' or 'regex'
      duplicates: {
        orgs: orgDuplicates,
        users: userDuplicates
      },
      confidence: {
        overall: parsed.overall_confidence,
        details: {
          orgs: calculateConfidence(parsed.orgs),
          users: calculateConfidence(parsed.users),
          activities: calculateConfidence(parsed.activities),
          dates: calculateConfidence(parsed.dates),
          numbers: calculateConfidence(parsed.numbers)
        }
      }
    });
  } catch (error) {
    console.error('Error in parse-text API:', error);
    return NextResponse.json(
      { error: 'Failed to parse text', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
