/**
 * Timeline Event Tagger
 * Uses Groq AI to generate relevant tags for timeline events
 */

import { callGroqJSON, isGroqAvailable, formatPrompt } from './groqClient';

// Timeline event data for tagging
export interface TimelineEventForTagging {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  event_category: string;
  sentiment?: string;
  severity?: string;
  existing_tags?: string[];
}

// Tagging result
export interface EventTaggingResult {
  success: boolean;
  tags: string[];
  confidence: number;
  reasoning?: string;
  error?: string;
}

/**
 * Generate tags for a timeline event using AI
 */
export async function tagTimelineEvent(
  event: TimelineEventForTagging
): Promise<EventTaggingResult> {
  // Check if Groq is available
  if (!isGroqAvailable()) {
    return {
      success: false,
      tags: [],
      confidence: 0,
      error: 'Groq AI not configured - please set GROQ_API_KEY',
    };
  }

  // Build event context
  const context = buildEventContext(event);

  // Create tagging prompt
  const prompt = formatPrompt(
    `You are an expert at analyzing trial timeline events and generating relevant, actionable tags.

Analyze the following timeline event and generate 3-7 relevant tags.

EVENT DATA:
${JSON.stringify(context, null, 2)}

TAG GENERATION GUIDELINES:

1. **Tag Categories** (generate tags from these categories):
   - **Technical**: integration, api, sdk, deployment, performance, bug, error
   - **Feature**: onboarding, dashboard, analytics, reporting, workflow, automation
   - **User Activity**: active-usage, low-engagement, power-user, exploration, adoption
   - **Business**: pricing, contract, expansion, renewal, churn-risk, upsell
   - **Customer Health**: positive-signal, warning-sign, blocker, success, milestone
   - **Support**: question, feedback, feature-request, complaint, praise
   - **Team**: champion, stakeholder, decision-maker, end-user
   - **Timeline**: kickoff, demo, training, check-in, review, escalation

2. **Tag Format**:
   - Use lowercase with hyphens (e.g., "feature-request", "churn-risk")
   - Be specific but concise (2-3 words max)
   - Focus on actionable insights
   - Avoid redundancy with event_type/category

3. **Sentiment-based tags**:
   - Positive: success, milestone, positive-signal, praise, win
   - Neutral: question, exploration, check-in
   - Negative: blocker, warning-sign, complaint, churn-risk

4. **Severity-based tags**:
   - Critical: blocker, escalation, urgent
   - High: important, action-needed
   - Medium: follow-up, monitor
   - Low: nice-to-have, future

OUTPUT FORMAT (JSON only):
{
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why these tags were chosen"
}

Return ONLY valid JSON, no markdown, no explanation outside JSON.
Generate 3-7 tags that are most relevant and actionable.`,
    context
  );

  // Call Groq
  const result = await callGroqJSON<{
    tags: string[];
    confidence: number;
    reasoning?: string;
  }>(prompt, {
    temperature: 0.3, // Balanced for creativity with consistency
    max_tokens: 500,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      tags: [],
      confidence: 0,
      error: result.error || 'Failed to generate tags',
    };
  }

  // Validate and normalize tags
  const tags = (result.data.tags || [])
    .filter(tag => typeof tag === 'string' && tag.length > 0)
    .map(tag => normalizeTag(tag))
    .slice(0, 10); // Max 10 tags

  // Merge with existing tags (avoid duplicates)
  const existingTags = event.existing_tags || [];
  const mergedTags = [...new Set([...existingTags, ...tags])];

  return {
    success: true,
    tags: mergedTags,
    confidence: Math.max(0, Math.min(1, result.data.confidence || 0.8)),
    reasoning: result.data.reasoning,
  };
}

/**
 * Batch tag timeline events
 */
export async function batchTagTimelineEvents(
  events: TimelineEventForTagging[]
): Promise<Map<string, EventTaggingResult>> {
  const results = new Map<string, EventTaggingResult>();

  console.log(`Starting batch timeline event tagging for ${events.length} events...`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`Tagging event ${i + 1}/${events.length}: ${event.title.substring(0, 50)}...`);

    const result = await tagTimelineEvent(event);
    results.set(event.id, result);

    // Small delay between requests to avoid rate limits
    if (i < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Optimized: 200ms (5 req/sec)
    }
  }

  console.log(`Batch timeline event tagging complete: ${results.size} events tagged`);

  return results;
}

/**
 * Build context for event tagging
 */
function buildEventContext(event: TimelineEventForTagging): Record<string, any> {
  const context: Record<string, any> = {
    title: event.title,
    event_type: event.event_type,
    event_category: event.event_category,
  };

  if (event.description) {
    context.description = event.description;
  }

  if (event.sentiment) {
    context.sentiment = event.sentiment;
  }

  if (event.severity) {
    context.severity = event.severity;
  }

  if (event.existing_tags && event.existing_tags.length > 0) {
    context.existing_tags = event.existing_tags;
  }

  return context;
}

/**
 * Normalize tag format
 */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get suggested tags for common event patterns
 */
export function getSuggestedTags(
  eventType: string,
  eventCategory: string,
  sentiment?: string
): string[] {
  const tags: string[] = [];

  // Event type based tags
  const typeMap: Record<string, string[]> = {
    milestone: ['milestone', 'success'],
    issue: ['blocker', 'action-needed'],
    meeting: ['check-in', 'discussion'],
    demo: ['demo', 'presentation'],
    training: ['training', 'education'],
    onboarding: ['onboarding', 'kickoff'],
    escalation: ['escalation', 'urgent'],
    feedback: ['feedback', 'input'],
  };

  const typeTags = typeMap[eventType.toLowerCase()];
  if (typeTags) {
    tags.push(...typeTags);
  }

  // Category based tags
  const categoryMap: Record<string, string[]> = {
    technical: ['technical', 'integration'],
    feature: ['feature-request', 'product'],
    usage: ['active-usage', 'adoption'],
    support: ['support', 'help'],
    business: ['business', 'commercial'],
  };

  const categoryTags = categoryMap[eventCategory.toLowerCase()];
  if (categoryTags) {
    tags.push(...categoryTags);
  }

  // Sentiment based tags
  if (sentiment) {
    const sentimentMap: Record<string, string[]> = {
      positive: ['positive-signal', 'win'],
      negative: ['warning-sign', 'concern'],
      neutral: ['neutral', 'informational'],
    };

    const sentimentTags = sentimentMap[sentiment.toLowerCase()];
    if (sentimentTags) {
      tags.push(...sentimentTags);
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}
