// AI Processor - Groq-powered query analysis and categorization
// Handles batch processing of queries for auto-categorization

import Groq from 'groq-sdk';
import {
  CSVRow,
  AIAnalysisResult,
  BatchAIAnalysis,
  QueryCategory,
} from './types';

// ============================================================================
// GROQ CLIENT
// ============================================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 20; // Process 20 queries at a time
const MODEL = 'llama-3.3-70b-versatile';

const CATEGORY_DESCRIPTIONS = {
  [QueryCategory.MARKET_SIZE]: 'Queries about total addressable market, market size, market opportunity',
  [QueryCategory.FORECAST]: 'Queries about future predictions, growth projections, revenue forecasts',
  [QueryCategory.TRENDS]: 'Queries about market trends, industry trends, emerging patterns',
  [QueryCategory.COMPETITIVE_ANALYSIS]: 'Queries about competitors, competitive landscape, market share',
  [QueryCategory.CUSTOMER_INSIGHTS]: 'Queries about customer behavior, preferences, demographics, segments',
  [QueryCategory.PRICING]: 'Queries about pricing strategies, price points, willingness to pay',
  [QueryCategory.GENERAL]: 'General business intelligence queries that don\'t fit other categories',
};

// ============================================================================
// AI ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze a single query using Groq AI
 */
export async function analyzeQuery(
  queryText: string,
  existingCategory?: string,
  existingTopic?: string
): Promise<AIAnalysisResult> {
  try {
    // If both category and topic exist, validate and return
    if (existingCategory && existingTopic) {
      const validCategory = validateCategory(existingCategory);
      return {
        category: validCategory,
        categoryConfidence: 95,
        query_topic: existingTopic,
        insight_title: generateInsightTitle(queryText, existingTopic),
      };
    }

    // Use AI to analyze
    const prompt = buildAnalysisPrompt(queryText, existingCategory, existingTopic);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert business intelligence analyst. Analyze queries and categorize them accurately. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq');
    }

    const parsed = JSON.parse(response);

    return {
      category: validateCategory(parsed.category),
      categoryConfidence: Math.min(Math.max(parsed.confidence || 80, 0), 100),
      query_topic: parsed.topic || generateTopicFromQuery(queryText),
      insight_title: parsed.insight_title || generateInsightTitle(queryText, parsed.topic),
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Error analyzing query:', error);

    // Fallback to rule-based analysis
    return fallbackAnalysis(queryText, existingCategory, existingTopic);
  }
}

/**
 * Build the AI analysis prompt
 */
function buildAnalysisPrompt(
  queryText: string,
  existingCategory?: string,
  existingTopic?: string
): string {
  const categories = Object.entries(CATEGORY_DESCRIPTIONS)
    .map(([cat, desc]) => `- ${cat}: ${desc}`)
    .join('\n');

  return `Analyze this business intelligence query and categorize it.

Query: "${queryText}"
${existingCategory ? `Suggested Category: ${existingCategory}` : ''}
${existingTopic ? `Suggested Topic: ${existingTopic}` : ''}

Available Categories:
${categories}

Return a JSON object with:
{
  "category": "one of the category keys above",
  "confidence": 0-100 (how confident you are in this categorization),
  "topic": "a short 2-5 word topic that summarizes what this query is about",
  "insight_title": "a concise 5-10 word title for the insight this query would generate",
  "reasoning": "brief explanation of why you chose this category"
}`;
}

/**
 * Batch analyze multiple queries
 */
export async function batchAnalyzeQueries(
  queries: Array<{
    query_text: string;
    existing_category?: string;
    existing_topic?: string;
  }>
): Promise<BatchAIAnalysis> {
  const results: AIAnalysisResult[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((q) =>
        analyzeQuery(q.query_text, q.existing_category, q.existing_topic)
      )
    );

    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex;

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({
          index: globalIndex,
          error: result.reason?.message || 'Unknown error',
        });

        // Add fallback result
        results.push(
          fallbackAnalysis(
            batch[batchIndex].query_text,
            batch[batchIndex].existing_category,
            batch[batchIndex].existing_topic
          )
        );
      }
    });

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    results,
    processed: results.length,
    failed: errors.length,
    errors,
  };
}

// ============================================================================
// VALIDATION AND HELPERS
// ============================================================================

/**
 * Validate and normalize category
 */
function validateCategory(category: string): QueryCategory {
  const normalized = category.toLowerCase().replace(/[_\s-]/g, '_');

  const validCategories = Object.values(QueryCategory);
  const match = validCategories.find((c) => c === normalized);

  return match || QueryCategory.GENERAL;
}

/**
 * Generate topic from query text using simple extraction
 */
function generateTopicFromQuery(queryText: string): string {
  // Extract first 3-5 meaningful words
  const words = queryText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !isStopWord(w))
    .slice(0, 5);

  return words.join(' ').slice(0, 50);
}

/**
 * Generate insight title from query
 */
function generateInsightTitle(queryText: string, topic: string): string {
  // Use topic if available, otherwise extract from query
  if (topic && topic.length > 3) {
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  const firstSentence = queryText.split(/[.!?]/)[0];
  return firstSentence.slice(0, 60) + (firstSentence.length > 60 ? '...' : '');
}

/**
 * Check if word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'what', 'when', 'where', 'who',
    'how', 'why', 'which', 'this', 'that', 'these', 'those',
  ]);

  return stopWords.has(word.toLowerCase());
}

/**
 * Fallback analysis using rule-based categorization
 */
function fallbackAnalysis(
  queryText: string,
  existingCategory?: string,
  existingTopic?: string
): AIAnalysisResult {
  const lowerQuery = queryText.toLowerCase();

  // Rule-based category detection
  let category = QueryCategory.GENERAL;
  let confidence = 70;

  if (
    lowerQuery.includes('market size') ||
    lowerQuery.includes('tam') ||
    lowerQuery.includes('total addressable')
  ) {
    category = QueryCategory.MARKET_SIZE;
    confidence = 85;
  } else if (
    lowerQuery.includes('forecast') ||
    lowerQuery.includes('projection') ||
    lowerQuery.includes('growth rate')
  ) {
    category = QueryCategory.FORECAST;
    confidence = 85;
  } else if (
    lowerQuery.includes('trend') ||
    lowerQuery.includes('emerging') ||
    lowerQuery.includes('adoption')
  ) {
    category = QueryCategory.TRENDS;
    confidence = 85;
  } else if (
    lowerQuery.includes('competitor') ||
    lowerQuery.includes('competitive') ||
    lowerQuery.includes('market share')
  ) {
    category = QueryCategory.COMPETITIVE_ANALYSIS;
    confidence = 85;
  } else if (
    lowerQuery.includes('customer') ||
    lowerQuery.includes('user') ||
    lowerQuery.includes('segment')
  ) {
    category = QueryCategory.CUSTOMER_INSIGHTS;
    confidence = 85;
  } else if (
    lowerQuery.includes('price') ||
    lowerQuery.includes('pricing') ||
    lowerQuery.includes('cost')
  ) {
    category = QueryCategory.PRICING;
    confidence = 85;
  }

  // Use existing category if provided and no strong match
  if (existingCategory && confidence < 85) {
    category = validateCategory(existingCategory);
    confidence = 75;
  }

  const topic = existingTopic || generateTopicFromQuery(queryText);

  return {
    category,
    categoryConfidence: confidence,
    query_topic: topic,
    insight_title: generateInsightTitle(queryText, topic),
    reasoning: 'Fallback rule-based analysis',
  };
}
