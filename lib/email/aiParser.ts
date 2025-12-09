// AI-powered Email Content Extraction
// Uses LLM to extract entities, actions, sentiment, etc. from email body

import Groq from 'groq-sdk';
import type {
  AIExtractionResult,
  ExtractedEntities,
  ExtractedAction,
  Sentiment,
  UrgencyLevel,
} from './types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const EXTRACTION_PROMPT = `You are an expert at analyzing business emails and extracting actionable intelligence.

Analyze the provided email and extract:

1. ENTITIES:
   - Organizations mentioned (companies, startups, etc.)
   - People mentioned (with their role/title if stated)
   - Competitors mentioned (with context of comparison)
   - Important dates mentioned

2. ACTION ITEMS:
   - Tasks that need to be done
   - Follow-ups required
   - Meetings to schedule
   - Deadlines mentioned
   - Questions that need answers

3. SENTIMENT: Overall tone (positive, neutral, negative)

4. URGENCY: How time-sensitive is this (low, medium, high, urgent)

5. SUMMARY: A 1-2 sentence summary of the email's main point

6. KEY TOPICS: 3-5 main topics discussed

Return your analysis as JSON with this exact structure:
{
  "entities": {
    "organizations": [{ "name": "string", "confidence": 0-1 }],
    "people": [{ "name": "string", "email": "string or null", "role": "string or null", "company": "string or null" }],
    "competitors": [{ "name": "string", "context": "string or null" }],
    "dates": [{ "text": "original text", "parsed_date": "YYYY-MM-DD or null", "context": "what this date refers to" }]
  },
  "actions": [
    { "text": "action description", "type": "follow_up|meeting|task|deadline|question|other", "assignee": "name or null", "due_date": "YYYY-MM-DD or null", "priority": "low|medium|high" }
  ],
  "sentiment": "positive|neutral|negative",
  "urgency": "low|medium|high|urgent",
  "summary": "brief summary",
  "key_topics": ["topic1", "topic2", "topic3"]
}

Be thorough but accurate. Only extract information that is explicitly stated or strongly implied.
If there are no entities/actions of a particular type, return an empty array.`;

export async function extractEmailInsights(
  subject: string | null,
  bodyText: string,
  fromEmail: string,
  fromName: string | null
): Promise<AIExtractionResult> {
  const emailContent = `
FROM: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}
SUBJECT: ${subject || '(no subject)'}

${bodyText}
`.trim();

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this email:\n\n${emailContent}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);

    // Validate and normalize the response
    return normalizeExtractionResult(parsed);
  } catch (error) {
    console.error('Error extracting email insights:', error);

    // Return minimal result on error
    return {
      entities: { organizations: [], people: [], competitors: [], dates: [] },
      actions: [],
      sentiment: 'neutral',
      urgency: 'medium',
      summary: 'Unable to analyze email content.',
      key_topics: [],
    };
  }
}

interface RawEntities {
  organizations?: Array<Record<string, unknown>>;
  people?: Array<Record<string, unknown>>;
  competitors?: Array<Record<string, unknown>>;
  dates?: Array<Record<string, unknown>>;
}

function normalizeExtractionResult(raw: Record<string, unknown>): AIExtractionResult {
  const entities: ExtractedEntities = {
    organizations: [],
    people: [],
    competitors: [],
    dates: [],
  };

  const rawEntities = raw.entities as RawEntities | undefined;

  // Normalize organizations
  if (rawEntities && Array.isArray(rawEntities.organizations)) {
    entities.organizations = rawEntities.organizations.map((org: Record<string, unknown>) => ({
      name: String(org.name || ''),
      confidence: typeof org.confidence === 'number' ? org.confidence : 0.8,
    })).filter(org => org.name);
  }

  // Normalize people
  if (rawEntities && Array.isArray(rawEntities.people)) {
    entities.people = rawEntities.people.map((person: Record<string, unknown>) => ({
      name: String(person.name || ''),
      email: person.email ? String(person.email) : undefined,
      role: person.role ? String(person.role) : undefined,
      company: person.company ? String(person.company) : undefined,
    })).filter(p => p.name);
  }

  // Normalize competitors
  if (rawEntities && Array.isArray(rawEntities.competitors)) {
    entities.competitors = rawEntities.competitors.map((comp: Record<string, unknown>) => ({
      name: String(comp.name || ''),
      context: comp.context ? String(comp.context) : undefined,
    })).filter(c => c.name);
  }

  // Normalize dates
  if (rawEntities && Array.isArray(rawEntities.dates)) {
    entities.dates = rawEntities.dates.map((d: Record<string, unknown>) => ({
      text: String(d.text || ''),
      parsed_date: d.parsed_date ? String(d.parsed_date) : undefined,
      context: d.context ? String(d.context) : undefined,
    })).filter(d => d.text);
  }

  // Normalize actions
  const actions: ExtractedAction[] = [];
  if (Array.isArray(raw.actions)) {
    for (const action of raw.actions) {
      const actionObj = action as Record<string, unknown>;
      if (actionObj.text) {
        actions.push({
          text: String(actionObj.text),
          type: validateActionType(actionObj.type),
          assignee: actionObj.assignee ? String(actionObj.assignee) : undefined,
          due_date: actionObj.due_date ? String(actionObj.due_date) : undefined,
          priority: validatePriority(actionObj.priority),
        });
      }
    }
  }

  // Normalize sentiment
  const sentiment = validateSentiment(raw.sentiment);

  // Normalize urgency
  const urgency = validateUrgency(raw.urgency);

  // Normalize summary
  const summary = typeof raw.summary === 'string' ? raw.summary : 'No summary available.';

  // Normalize key topics
  const key_topics: string[] = [];
  if (Array.isArray(raw.key_topics)) {
    for (const topic of raw.key_topics) {
      if (typeof topic === 'string' && topic.trim()) {
        key_topics.push(topic.trim());
      }
    }
  }

  return {
    entities,
    actions,
    sentiment,
    urgency,
    summary,
    key_topics,
  };
}

function validateSentiment(value: unknown): Sentiment {
  if (value === 'positive' || value === 'neutral' || value === 'negative') {
    return value;
  }
  return 'neutral';
}

function validateUrgency(value: unknown): UrgencyLevel {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'urgent') {
    return value;
  }
  return 'medium';
}

function validateActionType(
  value: unknown
): 'follow_up' | 'meeting' | 'task' | 'deadline' | 'question' | 'other' {
  const validTypes = ['follow_up', 'meeting', 'task', 'deadline', 'question', 'other'];
  if (typeof value === 'string' && validTypes.includes(value)) {
    return value as 'follow_up' | 'meeting' | 'task' | 'deadline' | 'question' | 'other';
  }
  return 'other';
}

function validatePriority(value: unknown): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'medium';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

interface OrgMatch {
  org_id: string;
  org_name: string;
}

/**
 * Match extracted organizations to existing orgs in database
 */
export async function matchOrganizations(
  extractedOrgs: Array<{ name: string; confidence: number }>,
  supabase: AnySupabaseClient
): Promise<Array<{ name: string; confidence: number; matched_org_id?: string }>> {
  if (extractedOrgs.length === 0) return [];

  const results: Array<{ name: string; confidence: number; matched_org_id?: string }> = [];

  for (const org of extractedOrgs) {
    // Try exact match first
    const { data: exactMatch } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .ilike('org_name', org.name)
      .limit(1)
      .single();

    if (exactMatch) {
      const match = exactMatch as OrgMatch;
      results.push({
        ...org,
        matched_org_id: match.org_id,
      });
      continue;
    }

    // Try fuzzy match
    const { data: fuzzyMatches } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .ilike('org_name', `%${org.name}%`)
      .limit(3);

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      // Use the best match (shortest name that contains the search term)
      const matches = fuzzyMatches as OrgMatch[];
      const bestMatch = matches.sort((a, b) =>
        a.org_name.length - b.org_name.length
      )[0];
      results.push({
        ...org,
        matched_org_id: bestMatch.org_id,
      });
    } else {
      results.push(org);
    }
  }

  return results;
}
