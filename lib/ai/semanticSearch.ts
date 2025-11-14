/**
 * Semantic Search for Timeline Events
 * Uses Groq AI to understand natural language queries and search intelligently
 */

import { callGroqJSON, isGroqAvailable, formatPrompt } from './groqClient';

// Search query analysis result
export interface QueryAnalysis {
  keywords: string[];
  intent: string;
  filters: {
    event_types?: string[];
    categories?: string[];
    sentiment?: string;
    severity?: string;
    tags?: string[];
  };
  time_context?: 'recent' | 'past_week' | 'past_month' | 'all';
}

// Search result with relevance score
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  event_category: string;
  event_timestamp: string;
  tags?: string[];
  sentiment?: string;
  severity?: string;
  relevance_score: number;
  match_reasons: string[];
}

/**
 * Analyze natural language query using AI
 */
export async function analyzeSearchQuery(
  query: string
): Promise<{ success: boolean; analysis?: QueryAnalysis; error?: string }> {
  if (!isGroqAvailable()) {
    return {
      success: false,
      error: 'Groq AI not configured',
    };
  }

  const prompt = formatPrompt(
    `You are a search query analyzer. Parse the natural language query and extract search intent.

USER QUERY: "${query}"

Analyze the query and extract:
1. keywords: Main search terms (nouns, verbs, key concepts)
2. intent: What is the user looking for? (e.g., "technical issues", "customer feedback", "recent activity")
3. filters: Inferred filters based on query
   - event_types: milestone, issue, meeting, demo, training, feedback, etc.
   - categories: technical, feature, usage, support, business
   - sentiment: positive, neutral, negative
   - severity: low, medium, high, critical
   - tags: Relevant tags mentioned or implied
4. time_context: "recent" (last 7 days), "past_week", "past_month", or "all"

EXAMPLES:
- "show me integration issues" → keywords: [integration, issues], event_types: [issue], categories: [technical]
- "recent positive feedback" → keywords: [feedback], sentiment: positive, time_context: recent
- "critical bugs last week" → keywords: [bugs], severity: critical, event_types: [issue], time_context: past_week
- "customer meetings about pricing" → keywords: [customer, pricing], event_types: [meeting], categories: [business]

OUTPUT FORMAT (JSON only):
{
  "keywords": ["word1", "word2"],
  "intent": "brief description of what user wants",
  "filters": {
    "event_types": ["type1"],
    "categories": ["cat1"],
    "sentiment": "positive",
    "severity": "high",
    "tags": ["tag1"]
  },
  "time_context": "recent"
}

Return ONLY valid JSON, no markdown.`,
    { query }
  );

  const result = await callGroqJSON<QueryAnalysis>(prompt, {
    temperature: 0.2,
    max_tokens: 500,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'Failed to analyze query',
    };
  }

  return {
    success: true,
    analysis: result.data,
  };
}

/**
 * Calculate relevance score for a timeline event
 */
export function calculateRelevance(
  event: {
    title: string;
    description?: string;
    event_type: string;
    event_category: string;
    tags?: string[];
    sentiment?: string;
    severity?: string;
  },
  analysis: QueryAnalysis
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Keyword matching in title (high weight)
  const titleLower = event.title.toLowerCase();
  const titleMatches = analysis.keywords.filter(keyword =>
    titleLower.includes(keyword.toLowerCase())
  );
  if (titleMatches.length > 0) {
    score += titleMatches.length * 10;
    reasons.push(`Title matches: ${titleMatches.join(', ')}`);
  }

  // Keyword matching in description (medium weight)
  if (event.description) {
    const descLower = event.description.toLowerCase();
    const descMatches = analysis.keywords.filter(keyword =>
      descLower.includes(keyword.toLowerCase())
    );
    if (descMatches.length > 0) {
      score += descMatches.length * 5;
      reasons.push(`Description matches: ${descMatches.join(', ')}`);
    }
  }

  // Tag matching (high weight)
  if (event.tags && analysis.filters.tags) {
    const tagMatches = event.tags.filter(tag =>
      analysis.filters.tags!.some(searchTag =>
        tag.toLowerCase().includes(searchTag.toLowerCase())
      )
    );
    if (tagMatches.length > 0) {
      score += tagMatches.length * 8;
      reasons.push(`Tag matches: ${tagMatches.join(', ')}`);
    }
  }

  // Event type matching
  if (analysis.filters.event_types?.includes(event.event_type)) {
    score += 7;
    reasons.push(`Event type: ${event.event_type}`);
  }

  // Category matching
  if (analysis.filters.categories?.includes(event.event_category)) {
    score += 6;
    reasons.push(`Category: ${event.event_category}`);
  }

  // Sentiment matching
  if (analysis.filters.sentiment && event.sentiment === analysis.filters.sentiment) {
    score += 5;
    reasons.push(`Sentiment: ${event.sentiment}`);
  }

  // Severity matching
  if (analysis.filters.severity && event.severity === analysis.filters.severity) {
    score += 5;
    reasons.push(`Severity: ${event.severity}`);
  }

  return { score, reasons };
}

/**
 * Build SQL filters from query analysis
 */
export function buildFilters(analysis: QueryAnalysis): {
  textSearch?: string;
  filters: Record<string, any>;
} {
  const filters: Record<string, any> = {};

  // Event types
  if (analysis.filters.event_types && analysis.filters.event_types.length > 0) {
    filters.event_type = analysis.filters.event_types;
  }

  // Categories
  if (analysis.filters.categories && analysis.filters.categories.length > 0) {
    filters.event_category = analysis.filters.categories;
  }

  // Sentiment
  if (analysis.filters.sentiment) {
    filters.sentiment = analysis.filters.sentiment;
  }

  // Severity
  if (analysis.filters.severity) {
    filters.severity = analysis.filters.severity;
  }

  // Text search (for full-text search)
  const textSearch = analysis.keywords.join(' | '); // OR search

  return { textSearch, filters };
}

/**
 * Get time range filter based on time context
 */
export function getTimeRange(timeContext?: string): Date | null {
  if (!timeContext || timeContext === 'all') {
    return null;
  }

  const now = new Date();
  const daysAgo = {
    recent: 7,
    past_week: 7,
    past_month: 30,
  };

  const days = daysAgo[timeContext as keyof typeof daysAgo] || 0;
  if (days > 0) {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  }

  return null;
}
