// AI-powered roadmap enhancements
import { createClient } from '@/lib/supabase/client';

interface RoadmapItem {
  title: string;
  description: string | null;
  priority?: string;
  status?: string;
}

interface AITagSuggestion {
  tags: string[];
  confidence: number;
}

interface AIPrioritySuggestion {
  priority: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  confidence: number;
}

interface AISummary {
  summary: string;
  keyPoints: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
}

// AI-powered tag suggestions based on title and description
export async function suggestTags(item: RoadmapItem): Promise<AITagSuggestion> {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  const tags: string[] = [];
  let confidence = 0;

  // Technical tags
  if (text.match(/\b(api|endpoint|rest|graphql|backend)\b/)) {
    tags.push('backend');
    confidence += 0.2;
  }
  if (text.match(/\b(ui|ux|design|interface|frontend|react|component)\b/)) {
    tags.push('frontend');
    confidence += 0.2;
  }
  if (text.match(/\b(database|sql|postgres|migration|schema)\b/)) {
    tags.push('database');
    confidence += 0.2;
  }
  if (text.match(/\b(test|testing|qa|quality|automated)\b/)) {
    tags.push('testing');
    confidence += 0.2;
  }
  if (text.match(/\b(deploy|deployment|ci|cd|pipeline|devops)\b/)) {
    tags.push('devops');
    confidence += 0.2;
  }

  // Feature tags
  if (text.match(/\b(auth|authentication|login|oauth|security)\b/)) {
    tags.push('authentication');
    confidence += 0.15;
  }
  if (text.match(/\b(analytics|metrics|dashboard|reporting|insights)\b/)) {
    tags.push('analytics');
    confidence += 0.15;
  }
  if (text.match(/\b(payment|billing|subscription|stripe|pricing)\b/)) {
    tags.push('billing');
    confidence += 0.15;
  }
  if (text.match(/\b(notification|email|sms|alert|webhook)\b/)) {
    tags.push('notifications');
    confidence += 0.15;
  }
  if (text.match(/\b(search|filter|query|index|elasticsearch)\b/)) {
    tags.push('search');
    confidence += 0.15;
  }

  // Priority indicators
  if (text.match(/\b(bug|fix|broken|error|crash|issue)\b/)) {
    tags.push('bugfix');
    confidence += 0.25;
  }
  if (text.match(/\b(feature|new|add|implement|create)\b/)) {
    tags.push('feature');
    confidence += 0.15;
  }
  if (text.match(/\b(improve|enhance|optimize|refactor|update)\b/)) {
    tags.push('enhancement');
    confidence += 0.15;
  }
  if (text.match(/\b(docs|documentation|readme|guide|tutorial)\b/)) {
    tags.push('documentation');
    confidence += 0.2;
  }

  // Team/Department tags
  if (text.match(/\b(customer|user|client|support)\b/)) {
    tags.push('customer-facing');
    confidence += 0.1;
  }
  if (text.match(/\b(internal|admin|team|staff)\b/)) {
    tags.push('internal');
    confidence += 0.1;
  }
  if (text.match(/\b(mobile|ios|android|app)\b/)) {
    tags.push('mobile');
    confidence += 0.2;
  }
  if (text.match(/\b(performance|speed|optimize|cache|fast)\b/)) {
    tags.push('performance');
    confidence += 0.15;
  }

  // Limit to top 5 tags
  const uniqueTags = [...new Set(tags)].slice(0, 5);

  return {
    tags: uniqueTags,
    confidence: Math.min(confidence, 1) // Cap at 100%
  };
}

// AI-powered priority detection based on keywords and patterns
export async function detectPriority(item: RoadmapItem): Promise<AIPrioritySuggestion> {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let reasoning = '';
  let confidence = 0.5;

  // Critical priority indicators
  if (text.match(/\b(critical|urgent|emergency|blocker|showstopper|security|vulnerability|exploit|breach)\b/)) {
    priority = 'critical';
    reasoning = 'Contains critical keywords indicating urgent attention required';
    confidence = 0.95;
  }
  // High priority indicators
  else if (text.match(/\b(important|asap|high priority|bug|broken|crash|error|fix|customer complaint|revenue|payment)\b/)) {
    priority = 'high';
    reasoning = 'Contains high-priority indicators or affects core functionality';
    confidence = 0.85;
  }
  // Low priority indicators
  else if (text.match(/\b(minor|nice to have|cosmetic|polish|cleanup|refactor|documentation|typo)\b/)) {
    priority = 'low';
    reasoning = 'Appears to be a minor enhancement or maintenance task';
    confidence = 0.75;
  }
  // Medium priority (default)
  else if (text.match(/\b(feature|enhancement|improve|update|new)\b/)) {
    priority = 'medium';
    reasoning = 'Standard feature or enhancement request';
    confidence = 0.7;
  }

  // Adjust based on customer mentions
  if (text.match(/\b(customer|client|user)\b/) && priority !== 'critical') {
    if (priority === 'low') priority = 'medium';
    else if (priority === 'medium') priority = 'high';
    reasoning += '. Customer-facing issue increases priority';
    confidence = Math.min(confidence + 0.1, 1);
  }

  return {
    priority,
    reasoning,
    confidence
  };
}

// AI-powered summary generation
export async function generateSummary(item: RoadmapItem): Promise<AISummary> {
  const text = `${item.title} ${item.description || ''}`;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Generate a concise summary
  let summary = item.title;
  if (item.description && item.description.length > 100) {
    // Take first sentence of description if it exists
    const firstSentence = sentences[0] || item.description.substring(0, 100);
    summary = `${item.title}: ${firstSentence.trim()}`;
  }

  // Extract key points
  const keyPoints: string[] = [];

  // Technical aspects
  if (text.match(/\b(api|backend|frontend|database)\b/i)) {
    keyPoints.push('Technical implementation required');
  }
  if (text.match(/\b(ui|ux|design|interface)\b/i)) {
    keyPoints.push('UI/UX design considerations');
  }
  if (text.match(/\b(test|testing|qa)\b/i)) {
    keyPoints.push('Testing requirements');
  }

  // Business impact
  if (text.match(/\b(customer|user|client)\b/i)) {
    keyPoints.push('Direct customer impact');
  }
  if (text.match(/\b(revenue|payment|billing)\b/i)) {
    keyPoints.push('Revenue implications');
  }
  if (text.match(/\b(performance|speed|optimize)\b/i)) {
    keyPoints.push('Performance improvements');
  }

  // Estimate effort based on keywords
  let estimatedEffort: 'small' | 'medium' | 'large' = 'medium';
  const wordCount = text.split(/\s+/).length;

  if (text.match(/\b(minor|small|quick|simple|typo|text change)\b/i) || wordCount < 20) {
    estimatedEffort = 'small';
  } else if (text.match(/\b(major|large|complex|architecture|refactor|migration|integration)\b/i) || wordCount > 100) {
    estimatedEffort = 'large';
  }

  return {
    summary: summary.substring(0, 200),
    keyPoints: keyPoints.slice(0, 3),
    estimatedEffort
  };
}

// AI-powered duplicate detection
export async function findSimilarItems(
  newItem: RoadmapItem,
  existingItems: RoadmapItem[]
): Promise<Array<{ item: RoadmapItem; similarity: number }>> {
  const newText = `${newItem.title} ${newItem.description || ''}`.toLowerCase();
  const newWords = new Set(newText.split(/\s+/));

  const similarities = existingItems.map(item => {
    const itemText = `${item.title} ${item.description || ''}`.toLowerCase();
    const itemWords = new Set(itemText.split(/\s+/));

    // Calculate Jaccard similarity
    const intersection = new Set([...newWords].filter(x => itemWords.has(x)));
    const union = new Set([...newWords, ...itemWords]);
    const similarity = intersection.size / union.size;

    return { item, similarity };
  });

  // Return items with > 30% similarity, sorted by similarity
  return similarities
    .filter(s => s.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

// AI-powered dependency suggestions
export async function suggestDependencies(
  item: RoadmapItem,
  allItems: RoadmapItem[]
): Promise<Array<{ item: RoadmapItem; reason: string }>> {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  const dependencies: Array<{ item: RoadmapItem; reason: string }> = [];

  for (const otherItem of allItems) {
    if (otherItem.title === item.title) continue;

    const otherText = otherItem.title.toLowerCase();

    // Check for explicit dependencies
    if (text.includes(otherText) || text.includes(otherItem.title.toLowerCase())) {
      dependencies.push({
        item: otherItem,
        reason: 'Explicitly mentioned in description'
      });
      continue;
    }

    // Check for implicit dependencies
    if (text.includes('authentication') && otherText.includes('auth')) {
      dependencies.push({
        item: otherItem,
        reason: 'Related authentication functionality'
      });
    }
    if (text.includes('api') && otherText.includes('endpoint')) {
      dependencies.push({
        item: otherItem,
        reason: 'Related API functionality'
      });
    }
    if (text.includes('database') && otherText.includes('migration')) {
      dependencies.push({
        item: otherItem,
        reason: 'Database migration dependency'
      });
    }
  }

  return dependencies.slice(0, 3);
}

// AI-powered status recommendations
export function recommendNextStatus(
  currentStatus: string,
  progress: number
): { status: string; reasoning: string } {
  if (currentStatus === 'planned' && progress > 0) {
    return {
      status: 'in_progress',
      reasoning: 'Work has started based on progress'
    };
  }

  if (currentStatus === 'in_progress' && progress >= 100) {
    return {
      status: 'completed',
      reasoning: 'Progress indicates completion'
    };
  }

  if (currentStatus === 'in_progress' && progress === 0) {
    return {
      status: 'planned',
      reasoning: 'No progress made yet'
    };
  }

  return {
    status: currentStatus,
    reasoning: 'Current status is appropriate'
  };
}