/**
 * Real-time Tag Suggestion API Endpoint
 * Combines existing database tags with AI-generated suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isGroqAvailable, callGroqJSON, formatPrompt } from '@/lib/ai/groqClient';
import { getSuggestedTags } from '@/lib/ai/timelineEventTagger';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      event_type,
      event_category,
      sentiment,
      severity,
      partial_tag, // User's current typing (for autocomplete)
      org_id, // Optional: limit to org-specific tags
    } = body;

    // Validate input
    if (!title && !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either title or description is required',
        },
        { status: 400 }
      );
    }

    // Step 1: Get existing tags from database
    const existingTags = await getExistingTags(partial_tag, org_id);

    // Step 2: Get pattern-based suggestions (fast, no AI needed)
    const patternSuggestions = event_type && event_category
      ? getSuggestedTags(event_type, event_category, sentiment)
      : [];

    // Step 3: If AI is available, get contextual suggestions
    let aiSuggestions: string[] = [];
    if (isGroqAvailable() && (title || description)) {
      aiSuggestions = await getAISuggestions({
        title,
        description,
        event_type,
        event_category,
        sentiment,
        severity,
        existing_tags: existingTags.slice(0, 20), // Show AI what tags already exist
      });
    }

    // Step 4: Combine and deduplicate all suggestions
    const allSuggestions = [
      ...existingTags, // Prioritize existing tags (consistency)
      ...patternSuggestions,
      ...aiSuggestions,
    ];

    // Deduplicate and normalize
    const uniqueSuggestions = [...new Set(allSuggestions.map(tag => tag.toLowerCase()))];

    // Filter by partial_tag if provided (autocomplete)
    let filteredSuggestions = uniqueSuggestions;
    if (partial_tag && partial_tag.trim()) {
      const searchTerm = partial_tag.toLowerCase().trim();
      filteredSuggestions = uniqueSuggestions.filter(tag =>
        tag.includes(searchTerm)
      );
    }

    // Limit to top 15 suggestions
    const finalSuggestions = filteredSuggestions.slice(0, 15);

    // Categorize suggestions for better UX
    const categorized = categorizeTags(finalSuggestions, existingTags, aiSuggestions);

    return NextResponse.json({
      success: true,
      suggestions: finalSuggestions,
      categorized, // For UI to show "Existing" vs "Suggested" vs "AI"
      counts: {
        existing: existingTags.length,
        pattern: patternSuggestions.length,
        ai: aiSuggestions.length,
        total: finalSuggestions.length,
      },
    });
  } catch (error: any) {
    console.error('Tag suggestion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get existing tags from database
 * Returns tags sorted by frequency (most used first)
 */
async function getExistingTags(
  partialTag?: string,
  orgId?: string
): Promise<string[]> {
  try {
    // Build query
    let query = supabaseAdmin
      .from('trial_timeline_events')
      .select('tags');

    // Optionally filter by org
    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: events, error } = await query;

    if (error || !events) {
      console.error('Error fetching existing tags:', error);
      return [];
    }

    // Flatten all tags and count frequencies
    const tagFrequency = new Map<string, number>();
    events.forEach(event => {
      if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          if (normalizedTag) {
            tagFrequency.set(
              normalizedTag,
              (tagFrequency.get(normalizedTag) || 0) + 1
            );
          }
        });
      }
    });

    // Filter by partial match if provided
    let matchingTags = Array.from(tagFrequency.keys());
    if (partialTag && partialTag.trim()) {
      const searchTerm = partialTag.toLowerCase().trim();
      matchingTags = matchingTags.filter(tag => tag.includes(searchTerm));
    }

    // Sort by frequency (most used first)
    matchingTags.sort((a, b) => {
      const freqA = tagFrequency.get(a) || 0;
      const freqB = tagFrequency.get(b) || 0;
      return freqB - freqA;
    });

    return matchingTags;
  } catch (error) {
    console.error('Error in getExistingTags:', error);
    return [];
  }
}

/**
 * Get AI-generated contextual suggestions
 */
async function getAISuggestions(context: {
  title?: string;
  description?: string;
  event_type?: string;
  event_category?: string;
  sentiment?: string;
  severity?: string;
  existing_tags?: string[];
}): Promise<string[]> {
  try {
    const prompt = formatPrompt(
      `You are a tag suggestion expert. Based on the timeline event context, suggest 5-10 relevant tags.

CONTEXT:
${JSON.stringify(context, null, 2)}

EXISTING TAGS IN DATABASE (use these when appropriate for consistency):
${context.existing_tags?.join(', ') || 'None yet'}

RULES:
1. Prioritize existing tags if they match the context
2. Suggest new tags only when existing ones don't fit
3. Use lowercase with hyphens (e.g., "feature-request")
4. Be specific and actionable
5. Focus on searchability and categorization

OUTPUT FORMAT (JSON only):
{
  "tags": ["tag1", "tag2", "tag3"]
}

Return ONLY valid JSON, no markdown.`,
      context
    );

    const result = await callGroqJSON<{ tags: string[] }>(prompt, {
      temperature: 0.4,
      max_tokens: 300,
    });

    if (result.success && result.data?.tags) {
      return result.data.tags
        .map(tag => tag.toLowerCase().trim().replace(/\s+/g, '-'))
        .filter(tag => tag.length > 0);
    }

    return [];
  } catch (error) {
    console.error('Error in getAISuggestions:', error);
    return [];
  }
}

/**
 * Categorize tags for better UX
 */
function categorizeTags(
  allTags: string[],
  existingTags: string[],
  aiTags: string[]
): {
  existing: string[];
  suggested: string[];
  ai: string[];
} {
  const existingSet = new Set(existingTags.map(t => t.toLowerCase()));
  const aiSet = new Set(aiTags.map(t => t.toLowerCase()));

  return {
    existing: allTags.filter(tag => existingSet.has(tag)),
    suggested: allTags.filter(tag => !existingSet.has(tag) && !aiSet.has(tag)),
    ai: allTags.filter(tag => aiSet.has(tag) && !existingSet.has(tag)),
  };
}

// GET endpoint to check if tag suggestions are available
export async function GET() {
  return NextResponse.json({
    available: true,
    message: 'Tag suggestion service is available',
    features: {
      existing_tags: true,
      pattern_based: true,
      ai_suggestions: isGroqAvailable(),
    },
  });
}
