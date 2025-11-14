/**
 * Organization Auto-Tagger
 * Uses Groq AI to analyze organization data and generate intelligent tags
 */

import { callGroqJSON, isGroqAvailable, formatPrompt } from './groqClient';

// Tag taxonomy - predefined categories
export const TAG_CATEGORIES = {
  industry: [
    'enterprise', 'startup', 'agency', 'saas', 'ecommerce', 'fintech',
    'healthcare', 'education', 'manufacturing', 'retail', 'media', 'other'
  ],
  company_size: [
    'solopreneur', 'small-team', 'mid-market', 'enterprise', 'fortune-500'
  ],
  engagement: [
    'highly-engaged', 'active', 'moderate', 'low-engagement', 'inactive', 'churned'
  ],
  risk: [
    'healthy', 'low-risk', 'at-risk', 'high-risk', 'critical'
  ],
  features: [
    'timeline-heavy', 'roadmap-focused', 'collaboration-oriented',
    'reporting-focused', 'integrations-needed', 'mobile-users', 'power-users'
  ],
  lifecycle: [
    'onboarding', 'exploring', 'activated', 'converting', 'champion', 'evaluating'
  ]
};

// Interface for organization data
export interface OrgDataForTagging {
  org_id: string;
  org_name: string;
  description?: string;
  comments?: string;
  engagement_score?: number;
  org_lifecycle_stage?: string;
  trial_start?: string;
  trial_end?: string;
  // Additional context
  event_count?: number;
  timeline_count?: number;
  user_count?: number;
  last_activity?: string;
  days_since_last_activity?: number;
  features_used?: string[];
}

// Response interface
export interface TaggingResult {
  success: boolean;
  tags: string[];
  confidence: number;
  reasoning?: string;
  error?: string;
}

/**
 * Generate AI tags for an organization
 * Uses Groq LLM to analyze org data and suggest relevant tags
 */
export async function generateOrgTags(
  orgData: OrgDataForTagging
): Promise<TaggingResult> {
  // Check if Groq is available
  if (!isGroqAvailable()) {
    return {
      success: false,
      tags: [],
      confidence: 0,
      error: 'Groq AI not configured - please set GROQ_API_KEY',
    };
  }

  // Build context
  const context = buildOrgContext(orgData);

  // Create prompt
  const prompt = formatPrompt(
    `You are an expert at analyzing B2B SaaS trial organizations and categorizing them with relevant tags.

Analyze the following trial organization data and generate 5-8 relevant tags from the predefined categories.

IMPORTANT: Only use tags from the predefined list below. Do not invent new tags.

TAG CATEGORIES:
${Object.entries(TAG_CATEGORIES)
  .map(([category, tags]) => `- ${category}: ${tags.join(', ')}`)
  .join('\n')}

ORGANIZATION DATA:
${JSON.stringify(context, null, 2)}

OUTPUT FORMAT (JSON only):
{
  "tags": ["tag1", "tag2", "tag3", ...],
  "confidence": 0.85,
  "reasoning": "Brief explanation of why these tags were chosen"
}

Rules:
1. Select 5-8 tags that best describe the organization
2. Only use tags from the predefined categories above
3. Tags should accurately reflect the organization's characteristics
4. Consider engagement level, company size, industry, risk factors
5. Confidence should be 0.0-1.0 based on data quality
6. Provide brief reasoning for your choices

Return ONLY valid JSON, no markdown, no explanation outside JSON.`,
    context
  );

  // Call Groq
  const result = await callGroqJSON<{
    tags: string[];
    confidence: number;
    reasoning: string;
  }>(prompt, {
    temperature: 0.3, // Lower temperature for consistent categorization
    max_tokens: 1000,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      tags: [],
      confidence: 0,
      error: result.error || 'Failed to generate tags',
    };
  }

  // Validate tags against taxonomy
  const validTags = validateAndFilterTags(result.data.tags);

  return {
    success: true,
    tags: validTags,
    confidence: result.data.confidence || 0.7,
    reasoning: result.data.reasoning,
  };
}

/**
 * Batch tag multiple organizations
 * Processes organizations in series to avoid rate limits
 */
export async function batchTagOrganizations(
  orgs: OrgDataForTagging[]
): Promise<Map<string, TaggingResult>> {
  const results = new Map<string, TaggingResult>();

  console.log(`Starting batch tagging for ${orgs.length} organizations...`);

  for (let i = 0; i < orgs.length; i++) {
    const org = orgs[i];
    console.log(`Tagging ${i + 1}/${orgs.length}: ${org.org_name}...`);

    const result = await generateOrgTags(org);
    results.set(org.org_id, result);

    // Small delay between requests to avoid rate limits (14,400 req/day = ~10 req/min safe)
    if (i < orgs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Batch tagging complete: ${results.size} organizations processed`);

  return results;
}

/**
 * Build context object from org data
 * Transforms raw data into a structured format for the prompt
 */
function buildOrgContext(orgData: OrgDataForTagging): Record<string, any> {
  const context: Record<string, any> = {
    name: orgData.org_name,
  };

  // Add optional fields if present
  if (orgData.description) context.description = orgData.description;
  if (orgData.comments) context.internal_notes = orgData.comments;
  if (orgData.org_lifecycle_stage) context.lifecycle_stage = orgData.org_lifecycle_stage;

  // Engagement metrics
  if (orgData.engagement_score !== undefined) {
    context.engagement_score = orgData.engagement_score;
    context.engagement_level =
      orgData.engagement_score >= 80 ? 'very high' :
      orgData.engagement_score >= 60 ? 'high' :
      orgData.engagement_score >= 40 ? 'moderate' :
      orgData.engagement_score >= 20 ? 'low' : 'very low';
  }

  // Activity metrics
  if (orgData.event_count !== undefined) context.timeline_events = orgData.event_count;
  if (orgData.user_count !== undefined) context.active_users = orgData.user_count;
  if (orgData.days_since_last_activity !== undefined) {
    context.days_since_last_activity = orgData.days_since_last_activity;
    context.activity_status =
      orgData.days_since_last_activity === 0 ? 'active today' :
      orgData.days_since_last_activity <= 1 ? 'active recently' :
      orgData.days_since_last_activity <= 7 ? 'active this week' :
      orgData.days_since_last_activity <= 14 ? 'inactive for 1-2 weeks' :
      'inactive for over 2 weeks';
  }

  // Trial timeline
  if (orgData.trial_start) context.trial_start = orgData.trial_start;
  if (orgData.trial_end) context.trial_end = orgData.trial_end;

  // Features used
  if (orgData.features_used && orgData.features_used.length > 0) {
    context.features_used = orgData.features_used;
  }

  return context;
}

/**
 * Validate tags against predefined taxonomy
 * Filters out any tags that don't match our categories
 */
function validateAndFilterTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];

  // Flatten all valid tags
  const validTagSet = new Set<string>();
  Object.values(TAG_CATEGORIES).forEach(categoryTags => {
    categoryTags.forEach(tag => validTagSet.add(tag));
  });

  // Filter to only valid tags
  const validTags = tags
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => validTagSet.has(tag));

  // Remove duplicates
  return [...new Set(validTags)];
}

/**
 * Get human-readable category for a tag
 */
export function getTagCategory(tag: string): string | null {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if (tags.includes(tag)) {
      return category;
    }
  }
  return null;
}

/**
 * Get all tags in a specific category
 */
export function getTagsByCategory(category: keyof typeof TAG_CATEGORIES): string[] {
  return TAG_CATEGORIES[category] || [];
}

/**
 * Format tags for display with category badges
 */
export function formatTagsWithCategories(tags: string[]): Array<{
  tag: string;
  category: string;
  color: string;
}> {
  const categoryColors: Record<string, string> = {
    industry: 'blue',
    company_size: 'purple',
    engagement: 'green',
    risk: 'red',
    features: 'orange',
    lifecycle: 'cyan',
  };

  return tags.map(tag => ({
    tag,
    category: getTagCategory(tag) || 'other',
    color: categoryColors[getTagCategory(tag) || 'other'] || 'gray',
  }));
}
