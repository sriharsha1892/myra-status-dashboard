import { parseISO, parse, isValid, differenceInDays } from 'date-fns';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ParsedEvent {
  event_timestamp: Date;
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  mentioned_people: string[];
  mentioned_features: string[];
  follow_up_required: boolean;
  follow_up_date?: Date | null;
  parse_confidence: number;
  metadata?: Record<string, any>;
}

export interface ExtractedPainPoint {
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExtractedLearning {
  title: string;
  description: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ParseResult {
  events: ParsedEvent[];
  pain_points: ExtractedPainPoint[];
  learnings: ExtractedLearning[];
  overall_confidence: number;
}

// ============================================
// MAIN PARSER FUNCTION
// ============================================

/**
 * Parse Circle K-style CRM notes into structured events, pain points, and learnings
 * Uses advanced rule-based pattern matching (no AI required)
 */
export function parseCircleKStyleNotes(rawText: string): ParseResult {
  if (!rawText || rawText.trim().length === 0) {
    return { events: [], pain_points: [], learnings: [], overall_confidence: 0 };
  }

  // Step 1: Detect format and split into event blocks
  const blocks = detectAndSplitBlocks(rawText);

  // Step 2: Parse each block into an event
  const events = blocks
    .map(block => parseEventBlock(block))
    .filter((e): e is ParsedEvent => e !== null);

  // Step 3: Extract pain points from dedicated sections
  const pain_points = extractPainPoints(rawText);

  // Step 4: Extract learnings from dedicated sections
  const learnings = extractLearnings(rawText);

  // Step 5: Auto-link related events
  linkRelatedEvents(events);

  // Calculate overall confidence
  const overall_confidence = events.length > 0
    ? events.reduce((sum, e) => sum + e.parse_confidence, 0) / events.length
    : 0;

  return { events, pain_points, learnings, overall_confidence };
}

// ============================================
// BLOCK DETECTION & SPLITTING
// ============================================

function detectAndSplitBlocks(text: string): string[] {
  const blocks: string[] = [];

  // Pattern 1: Circle K tabular format
  // "Oct 31 2025 6:10 PM    Trial access shared    Nikita issued..."
  // Process line-by-line for more reliable parsing
  const lines = text.split('\n');
  const circleKMatches: string[] = [];

  // Circle K date pattern at start of line
  const datePattern = /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)\s{2,}/;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and section headers
    if (!trimmedLine || trimmedLine.includes('Pain Points:') || trimmedLine.includes('Learnings:')) {
      continue;
    }

    // Check if line matches Circle K format
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const remainder = line.substring(dateMatch[0].length);

      // Split remainder by multiple spaces (2 or more) to separate title from description
      const parts = remainder.split(/\s{2,}/);
      if (parts.length >= 2) {
        const eventTitle = parts[0].trim();
        const description = parts.slice(1).join(' ').trim();

        if (eventTitle && description) {
          circleKMatches.push(`${dateStr}\n${eventTitle}\n${description}`);
          console.log(`Parsed event: "${eventTitle}"`);
        }
      }
    }
  }

  if (circleKMatches.length > 0) {
    console.log(`Found ${circleKMatches.length} Circle K format events`);
    return circleKMatches;
  }

  // Pattern 2: Markdown-style headers with dates
  // "## Oct 31, 2025 - Trial Access Shared"
  let match;
  const markdownPattern = /^#{2,3}\s+(.+?)\s*[-–—]\s*(.+?)\s*\n([\s\S]+?)(?=\n#{2,3}|$)/gm;
  while ((match = markdownPattern.exec(text)) !== null) {
    blocks.push(match[0]);
  }

  if (blocks.length > 0) return blocks;

  // Pattern 3: Bullet points with dates
  // "- **Oct 31**: Trial access shared - Nikita..."
  const bulletPattern = /^[-*•]\s+\*\*(.+?)\*\*[:\s]+(.+?)(?=\n[-*•]|$)/gm;
  while ((match = bulletPattern.exec(text)) !== null) {
    blocks.push(match[0]);
  }

  if (blocks.length > 0) return blocks;

  // Fallback: Split by double newlines
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  return paragraphs.length > 0 ? paragraphs : [text];
}

// ============================================
// EVENT BLOCK PARSING
// ============================================

function parseEventBlock(block: string): ParsedEvent | null {
  // Extract timestamp
  const timestamp = extractTimestamp(block);
  if (!timestamp) {
    console.warn('No valid timestamp found in block:', block.substring(0, 50));
    return null;
  }

  // Extract title
  const title = extractTitle(block);
  if (!title) {
    console.warn('No title found in block:', block.substring(0, 50));
    return null;
  }

  // Extract description
  const description = extractDescription(block, title);

  // Classify event type and category
  const { event_type, event_category } = classifyEvent(title, description);

  // Analyze sentiment
  const sentiment = analyzeSentiment(description);

  // Calculate severity
  const severity = calculateSeverity(sentiment, description);

  // Extract entities
  const mentioned_people = extractPeople(block);
  const mentioned_features = extractFeatures(block);

  // Generate tags
  const tags = generateTags(block, event_type, sentiment);

  // Detect follow-up requirements
  const { follow_up_required, follow_up_date } = detectFollowUp(description);

  // Calculate confidence score
  const parse_confidence = calculateConfidence(block, event_type, timestamp);

  return {
    event_timestamp: timestamp,
    event_type,
    event_category,
    title: title.substring(0, 200),
    description,
    sentiment,
    severity,
    tags,
    mentioned_people,
    mentioned_features,
    follow_up_required,
    follow_up_date,
    parse_confidence,
  };
}

// ============================================
// TIMESTAMP EXTRACTION
// ============================================

function extractTimestamp(text: string): Date | null {
  const dateFormats = [
    {
      // "Oct 31 2025 6:10 PM"
      pattern: /([A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)/i,
      format: 'MMM d yyyy h:mm a',
    },
    {
      // "2025-10-31 18:10"
      pattern: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
      format: 'yyyy-MM-dd HH:mm',
    },
    {
      // "Oct 31, 2025"
      pattern: /([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/i,
      format: 'MMM d, yyyy',
    },
    {
      // "31/10/2025"
      pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/,
      format: 'dd/MM/yyyy',
    },
  ];

  for (const { pattern, format } of dateFormats) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];

      // Try parsing as ISO first
      let date = parseISO(dateStr);

      // If not valid, try with date-fns parse
      if (!isValid(date)) {
        date = parse(dateStr, format, new Date());
      }

      if (isValid(date)) {
        return date;
      }
    }
  }

  return null;
}

// ============================================
// TITLE & DESCRIPTION EXTRACTION
// ============================================

function extractTitle(block: string): string | null {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Skip lines that are just dates
  for (const line of lines) {
    // Skip date-only lines
    if (/^[A-Z][a-z]{2}\s+\d{1,2}/.test(line) && line.length < 30) {
      continue;
    }

    // Skip markdown headers
    if (/^#{1,6}\s/.test(line)) {
      continue;
    }

    // This is likely the title
    if (line.length > 5) {
      // Clean up markdown/formatting
      return line.replace(/^\*\*|\*\*$/g, '').replace(/^[-*•]\s+/, '').trim();
    }
  }

  return null;
}

function extractDescription(block: string, title: string): string {
  // Remove the title and timestamp from block
  let desc = block
    .replace(title, '')
    .trim();

  // Remove date patterns
  desc = desc.replace(/[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M/gi, '').trim();

  // Clean up extra whitespace
  desc = desc.replace(/\s+/g, ' ').trim();

  return desc;
}

// ============================================
// EVENT CLASSIFICATION
// ============================================

function classifyEvent(title: string, description: string): {
  event_type: string;
  event_category: string;
} {
  const combined = (title + ' ' + description).toLowerCase();

  // Onboarding events
  if (/trial\s+access\s+(shared|provided|granted|sent|issued)/i.test(combined)) {
    return { event_type: 'credentials_shared', event_category: 'onboarding' };
  }
  if (/not\s+receiv|delivery\s+issue|did\s+not\s+get|didn't\s+receive/i.test(combined)) {
    return { event_type: 'delivery_issue', event_category: 'onboarding' };
  }
  if (/first\s+login|successful\s+login|confirmed\s+(access|login)|login\s+confirmed/i.test(combined)) {
    return { event_type: 'first_login', event_category: 'onboarding' };
  }
  if (/allowlist|whitelist|firewall|blocked\s+by|network\s+restriction|corporate\s+network/i.test(combined)) {
    return { event_type: 'allowlist_support', event_category: 'onboarding' };
  }

  // Communication events
  if (/call\s+(scheduled|proposed|set\s+up|requested)/i.test(combined)) {
    return { event_type: 'call_scheduled', event_category: 'communication' };
  }
  if (/call\s+(completed|held|finished|done)|spoke\s+with|discussed\s+with/i.test(combined)) {
    return { event_type: 'call_completed', event_category: 'communication' };
  }
  if (/demo|demonstration|walkthrough|presentation/i.test(combined)) {
    return { event_type: 'demo_conducted', event_category: 'communication' };
  }

  // Feedback events
  if (/negative\s+feedback|disappointed|frustrated|unhappy|concerns?\s+about/i.test(combined)) {
    return { event_type: 'negative_feedback', event_category: 'feedback' };
  }
  if (/positive\s+feedback|impressed|excellent|loved|satisfied|great\s+feedback/i.test(combined)) {
    return { event_type: 'positive_feedback', event_category: 'feedback' };
  }
  if (/pain\s+point|blocker|challenge|difficulty|problem|obstacle/i.test(combined)) {
    return { event_type: 'pain_point_identified', event_category: 'feedback' };
  }
  if (/feature\s+request|would\s+like|wish\s+it\s+had|enhancement/i.test(combined)) {
    return { event_type: 'feature_request', event_category: 'feedback' };
  }

  // Support events
  if (/escalat(e|ed|ion)|urgent|critical\s+issue/i.test(combined)) {
    return { event_type: 'internal_escalation', event_category: 'support' };
  }
  if (/resolv(e|ed)|fix(ed)?|solution\s+found|issue\s+closed/i.test(combined)) {
    return { event_type: 'issue_resolved', event_category: 'support' };
  }
  if (/technical\s+issue|bug|error|not\s+working|broken/i.test(combined)) {
    return { event_type: 'technical_issue_reported', event_category: 'support' };
  }

  // Milestone events
  if (/trial\s+extended|extended\s+trial|extension\s+granted/i.test(combined)) {
    return { event_type: 'trial_extended', event_category: 'milestone' };
  }
  if (/will\s+not\s+proceed|lost|no\s+longer\s+interested|passed|decided\s+not/i.test(combined)) {
    return { event_type: 'deal_lost', event_category: 'milestone' };
  }
  if (/defer(red)?|postpone|next\s+year|future|re-evaluation/i.test(combined)) {
    return { event_type: 'deal_deferred', event_category: 'milestone' };
  }
  if (/champion|advocate|internal\s+supporter/i.test(combined)) {
    return { event_type: 'champion_identified', event_category: 'milestone' };
  }
  if (/budget|pricing\s+approved|funds\s+allocated/i.test(combined)) {
    return { event_type: 'budget_confirmed', event_category: 'milestone' };
  }

  // Default to sales note
  return { event_type: 'sales_note', event_category: 'sales' };
}

// ============================================
// SENTIMENT ANALYSIS
// ============================================

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const lower = text.toLowerCase();

  // Count negative indicators (weighted)
  const negativeKeywords = [
    'negative', 'disappointed', 'frustrated', 'unhappy', 'concern', 'issue',
    'problem', 'blocker', 'inaccurate', 'incorrect', 'poor', 'bad', 'fail',
    'error', 'bug', 'broken', 'not working',
  ];
  const criticalKeywords = ['will not proceed', 'lost', 'blocked', 'critical', 'severe', 'unusable'];

  const negativeScore =
    negativeKeywords.filter(kw => lower.includes(kw)).length * 2 +
    criticalKeywords.filter(kw => lower.includes(kw)).length * 3;

  // Count positive indicators (weighted)
  const positiveKeywords = [
    'positive', 'excellent', 'great', 'successful', 'impressed', 'satisfied',
    'loved', 'confirmed', 'approved', 'amazing', 'fantastic', 'wonderful',
  ];
  const highPositiveKeywords = ['champion', 'budget confirmed', 'contract', 'signed', 'converted'];

  const positiveScore =
    positiveKeywords.filter(kw => lower.includes(kw)).length * 2 +
    highPositiveKeywords.filter(kw => lower.includes(kw)).length * 3;

  if (negativeScore > positiveScore && negativeScore > 2) return 'negative';
  if (positiveScore > negativeScore && positiveScore > 2) return 'positive';
  return 'neutral';
}

// ============================================
// SEVERITY CALCULATION
// ============================================

function calculateSeverity(
  sentiment: string,
  text: string
): 'low' | 'medium' | 'high' | 'critical' {
  const lower = text.toLowerCase();

  // Critical indicators
  const criticalTerms = ['critical', 'urgent', 'will not proceed', 'deal lost', 'severe', 'escalation'];
  if (criticalTerms.some(term => lower.includes(term))) {
    return 'critical';
  }

  // High severity
  const highTerms = ['blocker', 'major issue', 'significant', 'high priority', 'showstopper'];
  if (sentiment === 'negative' && highTerms.some(term => lower.includes(term))) {
    return 'high';
  }

  // Medium severity
  const mediumTerms = ['issue', 'problem', 'concern', 'bug', 'error'];
  if (sentiment === 'negative' || mediumTerms.some(term => lower.includes(term))) {
    return 'medium';
  }

  return 'low';
}

// ============================================
// ENTITY EXTRACTION
// ============================================

function extractPeople(text: string): string[] {
  // Match capitalized names: "Andrew Colhoun", "Nikita Manmode"
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  const matches = text.match(namePattern) || [];

  // Filter out false positives (month names, etc.)
  const falsePositives = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'Circle K', // Company name
  ];

  const filtered = matches.filter(name => {
    const firstWord = name.split(' ')[0];
    return !falsePositives.includes(firstWord);
  });

  return [...new Set(filtered)];
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];

  // Common product/feature patterns
  const patterns = [
    /\b(myRA|ask-myra|platform|dashboard|report|presentation|PPT|analysis|forecast|model)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Demand|Outlook|Analysis|Builder|Forecast))\b/g,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      features.push(...matches);
    }
  });

  return [...new Set(features.map(f => f.trim()))];
}

// ============================================
// TAG GENERATION
// ============================================

function generateTags(text: string, event_type: string, sentiment: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();

  // Add sentiment tag if not neutral
  if (sentiment !== 'neutral') {
    tags.push(sentiment);
  }

  // Domain-specific tags
  if (/data\s+quality|accuracy|credibility|baseline|incorrect\s+data/i.test(lower)) {
    tags.push('data-quality');
  }
  if (/performance|speed|slow|latency/i.test(lower)) {
    tags.push('performance');
  }
  if (/ux|user\s+experience|interface|usability|confusing/i.test(lower)) {
    tags.push('ux');
  }
  if (/pricing|cost|budget|expensive/i.test(lower)) {
    tags.push('pricing');
  }
  if (/integration|api|sso|allowlist|firewall/i.test(lower)) {
    tags.push('integration');
  }
  if (/onboarding|training|documentation|user\s+guide/i.test(lower)) {
    tags.push('onboarding');
  }

  // Urgency tags
  if (/urgent|asap|critical|immediate/i.test(lower)) {
    tags.push('urgent');
  }
  if (/follow.up|next\s+step|action\s+required/i.test(lower)) {
    tags.push('action-required');
  }

  return [...new Set(tags)];
}

// ============================================
// FOLLOW-UP DETECTION
// ============================================

function detectFollowUp(text: string): {
  follow_up_required: boolean;
  follow_up_date?: Date | null;
} {
  const lower = text.toLowerCase();

  // Check for follow-up indicators
  const followUpIndicators = [
    'follow.up', 'next step', 'schedule', 'will get back', 'need to check',
    'action required', 'to do', 'pending',
  ];

  const requiresFollowUp = followUpIndicators.some(indicator => lower.includes(indicator));

  if (!requiresFollowUp) {
    return { follow_up_required: false };
  }

  // Try to extract follow-up date (basic implementation)
  // For now, just flag it - user can set date manually
  return { follow_up_required: true, follow_up_date: null };
}

// ============================================
// PAIN POINTS EXTRACTION
// ============================================

function extractPainPoints(text: string): ExtractedPainPoint[] {
  const painPoints: ExtractedPainPoint[] = [];

  // Look for dedicated pain points section
  const painPointSection = extractSection(text, [
    'pain point', 'challenge', 'issue observed', 'concern', 'problem',
  ]);

  if (painPointSection) {
    const bullets = extractBullets(painPointSection);

    bullets.forEach(bullet => {
      painPoints.push({
        title: bullet.substring(0, 100),
        description: bullet,
        category: classifyPainPoint(bullet),
        severity: calculatePainPointSeverity(bullet),
      });
    });
  }

  return painPoints;
}

function classifyPainPoint(text: string): string {
  const lower = text.toLowerCase();

  if (/data|accuracy|baseline|credibility|quality/i.test(lower)) return 'data_quality';
  if (/performance|slow|speed|latency/i.test(lower)) return 'performance';
  if (/ux|interface|confusing|difficult\s+to/i.test(lower)) return 'ux';
  if (/pricing|expensive|cost/i.test(lower)) return 'pricing';
  if (/integration|api|sso/i.test(lower)) return 'integration';
  if (/missing\s+feature|would\s+like|wish\s+it\s+had/i.test(lower)) return 'feature_gap';
  if (/onboarding|training|documentation/i.test(lower)) return 'onboarding';

  return 'other';
}

function calculatePainPointSeverity(text: string): 'low' | 'medium' | 'high' | 'critical' {
  const lower = text.toLowerCase();

  if (/critical|severe|blocker|showstopper|unusable/i.test(lower)) return 'critical';
  if (/major|significant|high\s+priority/i.test(lower)) return 'high';
  if (/moderate|important/i.test(lower)) return 'medium';

  return 'low';
}

// ============================================
// LEARNINGS EXTRACTION
// ============================================

function extractLearnings(text: string): ExtractedLearning[] {
  const learnings: ExtractedLearning[] = [];

  // Look for dedicated learnings section
  const learningSection = extractSection(text, [
    'learning', 'observation', 'insight', 'takeaway', 'mi observation',
    'key finding', 'lesson',
  ]);

  if (learningSection) {
    const bullets = extractBullets(learningSection);

    bullets.forEach(bullet => {
      learnings.push({
        title: bullet.substring(0, 100),
        description: bullet,
        category: classifyLearning(bullet),
        impact: 'medium', // Default
      });
    });
  }

  return learnings;
}

function classifyLearning(text: string): string {
  const lower = text.toLowerCase();

  if (/product|feature|platform|data\s+quality/i.test(lower)) return 'product';
  if (/sales|pricing|contract|deal/i.test(lower)) return 'sales';
  if (/customer\s+success|onboarding|support/i.test(lower)) return 'customer_success';
  if (/technical|api|integration|model/i.test(lower)) return 'technical';
  if (/process|workflow|automation/i.test(lower)) return 'process';

  return 'market';
}

// ============================================
// EVENT RELATIONSHIP LINKING
// ============================================

function linkRelatedEvents(events: ParsedEvent[]): void {
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      // Check if events are related
      const similarity = calculateEventSimilarity(events[i], events[j]);

      if (similarity > 0.6) {
        // Mark as potentially related (will be stored as metadata for now)
        if (!events[i].metadata) events[i].metadata = {};
        if (!events[j].metadata) events[j].metadata = {};

        if (!events[i].metadata.related_indices) events[i].metadata.related_indices = [];
        if (!events[j].metadata.related_indices) events[j].metadata.related_indices = [];

        events[i].metadata.related_indices.push(j);
        events[j].metadata.related_indices.push(i);
      }
    }
  }
}

function calculateEventSimilarity(e1: ParsedEvent, e2: ParsedEvent): number {
  let score = 0;

  // Same people mentioned
  const commonPeople = e1.mentioned_people.filter(p => e2.mentioned_people.includes(p));
  score += commonPeople.length * 0.25;

  // Same features mentioned
  const commonFeatures = e1.mentioned_features.filter(f => e2.mentioned_features.includes(f));
  score += commonFeatures.length * 0.25;

  // Temporal proximity (within 3 days)
  const timeDiff = Math.abs(e1.event_timestamp.getTime() - e2.event_timestamp.getTime());
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (timeDiff < threeDays) {
    score += 0.3;
  }

  // Similar tags
  const commonTags = e1.tags.filter(t => e2.tags.includes(t));
  score += commonTags.length * 0.1;

  return Math.min(score, 1);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractSection(text: string, keywords: string[]): string | null {
  const lines = text.split('\n');

  for (const keyword of keywords) {
    // Find the section header line
    const headerPattern = new RegExp(`^${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[s]?\\s*:`, 'i');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (headerPattern.test(line)) {
        console.log(`Found section header: "${line}"`);

        // Collect all content after the header until we hit another section or end
        const sectionLines: string[] = [];

        for (let j = i + 1; j < lines.length; j++) {
          const contentLine = lines[j].trim();

          // Stop if we hit another section header (capitalized word followed by colon)
          if (/^[A-Z][a-z]+.*:/.test(contentLine) && !contentLine.startsWith('-')) {
            break;
          }

          // Stop if we hit a date line (next event)
          if (/^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}/.test(contentLine)) {
            break;
          }

          // Add non-empty lines
          if (contentLine) {
            sectionLines.push(contentLine);
          }
        }

        if (sectionLines.length > 0) {
          const sectionContent = sectionLines.join('\n');
          console.log(`Extracted ${sectionLines.length} lines from "${keyword}" section`);
          return sectionContent;
        }
      }
    }
  }

  return null;
}

function extractBullets(text: string): string[] {
  const bullets: string[] = [];

  // Match different bullet point styles
  const patterns = [
    /^[-*•]\s+(.+)$/gm,
    /^\d+\.\s+(.+)$/gm,
    /^›\s+(.+)$/gm,
  ];

  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (match[1].trim().length > 0) {
        bullets.push(match[1].trim());
      }
    }
  });

  return [...new Set(bullets)];
}

function calculateConfidence(block: string, event_type: string, timestamp: Date | null): number {
  let confidence = 0.5;

  // Boost for valid timestamp
  if (timestamp) confidence += 0.2;

  // Boost for specific event classification
  if (event_type !== 'sales_note') confidence += 0.15;

  // Boost for structured content
  if (/^[-*•\d+\.]/m.test(block)) confidence += 0.1;

  // Boost for clear sections
  if (/pain\s+point|learning|observation/i.test(block)) confidence += 0.05;

  return Math.min(confidence, 1.0);
}
