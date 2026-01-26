/**
 * Groq-Powered User-to-Organization Matcher
 * Uses LLM for context-aware matching with confidence scores
 * Falls back to fuzzy string matching if Groq is unavailable
 */

import { callGroqJSON, isGroqAvailable } from '@/lib/ai/groqClient';
import { fuzzyMatchUser } from './myra-usage-parser';

// Types
export interface OrganizationContext {
  id: string;
  name: string;
  domain?: string;
  contacts?: Array<{ name: string; email?: string }>;
}

export interface PastMapping {
  user_name: string;
  org_id: string;
  org_name?: string;
}

export interface MatchResult {
  user_name: string;
  matched_org_id: string | null;
  matched_org_name: string | null;
  confidence: number; // 0-100
  reason: string;
}

export interface GroqMatcherResponse {
  matches: MatchResult[];
  unmatched: string[];
}

// System prompt for user matching
const SYSTEM_PROMPT = `You are a user-to-organization matcher for a B2B SaaS dashboard.

TASK: Match user names from myRA usage data to the correct organization.

CONTEXT PROVIDED:
1. List of organizations with: id, name, domain, known contacts
2. User names from conversation logs
3. Previous successful mappings (learn from these)

MATCHING RULES (in priority order):
1. EXACT MATCH: User email domain matches org domain → 100% confidence
2. KNOWN CONTACT: User name matches a known contact name → 95% confidence
3. PAST MAPPING: User was previously mapped to this org → 90% confidence
4. FUZZY NAME: User name partially matches org name/contacts → 70% confidence
5. NO MATCH: Cannot determine → return null, let user decide

OUTPUT FORMAT (JSON only, no markdown):
{
  "matches": [
    {
      "user_name": "John Smith",
      "matched_org_id": "uuid-here",
      "matched_org_name": "Acme Corp",
      "confidence": 95,
      "reason": "Name matches known contact 'John Smith (john@acme.com)'"
    }
  ],
  "unmatched": ["Unknown User"]
}

CRITICAL RULES:
- NEVER guess if confidence < 70%
- Prefer NO MATCH over wrong match
- Email domain is strongest signal
- Consider typos: "Jon Smith" may be "John Smith"
- Company name variations: "Acme" = "Acme Corp" = "Acme Inc"
- Return ONLY valid JSON, no explanations or markdown`;

/**
 * Match users to organizations using Groq LLM
 * Returns matches with confidence scores
 */
export async function matchUsersWithGroq(
  userNames: string[],
  organizations: OrganizationContext[],
  pastMappings: PastMapping[] = []
): Promise<GroqMatcherResponse> {
  // Check if Groq is available
  if (!isGroqAvailable()) {
    console.warn('Groq not available, using fallback matching');
    return fallbackMatch(userNames, organizations, pastMappings);
  }

  // Build context for the prompt
  const orgContext = organizations.map(o => {
    const contacts = o.contacts?.map(c => c.email ? `${c.name} (${c.email})` : c.name).join(', ') || 'none';
    return `- ${o.name} [id: ${o.id}]${o.domain ? ` domain: ${o.domain}` : ''} contacts: ${contacts}`;
  }).join('\n');

  const pastMappingContext = pastMappings.length > 0
    ? pastMappings.map(m => `- "${m.user_name}" → ${m.org_name || m.org_id}`).join('\n')
    : 'No previous mappings';

  const userPrompt = `ORGANIZATIONS:
${orgContext}

PAST SUCCESSFUL MAPPINGS:
${pastMappingContext}

USERS TO MATCH:
${userNames.map(u => `- "${u}"`).join('\n')}

Return JSON with matches. Remember: ONLY valid JSON, no markdown code blocks.`;

  try {
    const result = await callGroqJSON<GroqMatcherResponse>(
      `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      { temperature: 0.1, max_tokens: 2000 }
    );

    if (result.success && result.data) {
      // Validate and normalize the response
      return normalizeGroqResponse(result.data, userNames, organizations);
    }

    console.warn('Groq matching failed, using fallback:', result.error);
    return fallbackMatch(userNames, organizations, pastMappings);
  } catch (error) {
    console.error('Groq matcher error:', error);
    return fallbackMatch(userNames, organizations, pastMappings);
  }
}

/**
 * Normalize and validate Groq response
 */
function normalizeGroqResponse(
  response: GroqMatcherResponse,
  originalUsers: string[],
  organizations: OrganizationContext[]
): GroqMatcherResponse {
  const matches: MatchResult[] = [];
  const unmatched: string[] = [];
  const matchedUsers = new Set<string>();

  // Process matches from response
  if (response.matches && Array.isArray(response.matches)) {
    for (const match of response.matches) {
      // Validate org_id exists
      const validOrg = organizations.find(o => o.id === match.matched_org_id);

      if (match.matched_org_id && validOrg) {
        matches.push({
          user_name: match.user_name,
          matched_org_id: match.matched_org_id,
          matched_org_name: validOrg.name,
          confidence: Math.min(100, Math.max(0, match.confidence || 70)),
          reason: match.reason || 'Matched by AI',
        });
        matchedUsers.add(match.user_name.toLowerCase());
      } else if (!match.matched_org_id) {
        unmatched.push(match.user_name);
        matchedUsers.add(match.user_name.toLowerCase());
      }
    }
  }

  // Add any unmatched from response
  if (response.unmatched && Array.isArray(response.unmatched)) {
    for (const user of response.unmatched) {
      if (!matchedUsers.has(user.toLowerCase())) {
        unmatched.push(user);
        matchedUsers.add(user.toLowerCase());
      }
    }
  }

  // Add any users that weren't in the response at all
  for (const user of originalUsers) {
    if (!matchedUsers.has(user.toLowerCase())) {
      unmatched.push(user);
    }
  }

  return { matches, unmatched };
}

/**
 * Fallback matching using fuzzy string matching
 * Used when Groq is unavailable
 */
function fallbackMatch(
  userNames: string[],
  organizations: OrganizationContext[],
  pastMappings: PastMapping[]
): GroqMatcherResponse {
  const matches: MatchResult[] = [];
  const unmatched: string[] = [];

  // Convert organizations to format expected by fuzzyMatchUser
  const knownUsers = organizations.flatMap(org =>
    (org.contacts || []).map(contact => ({
      id: contact.email || `${org.id}-${contact.name}`,
      name: contact.name,
      org_id: org.id,
      org_name: org.name,
    }))
  );

  for (const userName of userNames) {
    // Check past mappings first
    const pastMatch = pastMappings.find(
      m => m.user_name.toLowerCase() === userName.toLowerCase()
    );

    if (pastMatch) {
      const org = organizations.find(o => o.id === pastMatch.org_id);
      matches.push({
        user_name: userName,
        matched_org_id: pastMatch.org_id,
        matched_org_name: org?.name || pastMatch.org_name || null,
        confidence: 90,
        reason: 'Previously mapped to this organization',
      });
      continue;
    }

    // Try fuzzy matching
    const fuzzyResult = fuzzyMatchUser(userName, knownUsers);

    if (fuzzyResult.match && fuzzyResult.confidence !== 'none') {
      matches.push({
        user_name: userName,
        matched_org_id: fuzzyResult.match.org_id,
        matched_org_name: fuzzyResult.match.org_name,
        confidence: fuzzyResult.confidence === 'high' ? 85 : 70,
        reason: fuzzyResult.confidence === 'high'
          ? `Exact match with contact "${fuzzyResult.match.name}"`
          : `Partial match with contact "${fuzzyResult.match.name}"`,
      });
    } else {
      unmatched.push(userName);
    }
  }

  return { matches, unmatched };
}

/**
 * Get match suggestions for a single user
 * Useful for real-time suggestions in the UI
 */
export async function getSingleUserMatch(
  userName: string,
  organizations: OrganizationContext[],
  pastMappings: PastMapping[] = []
): Promise<MatchResult | null> {
  const result = await matchUsersWithGroq([userName], organizations, pastMappings);

  if (result.matches.length > 0) {
    return result.matches[0];
  }

  return null;
}

/**
 * Check if a match confidence meets the threshold for auto-acceptance
 */
export function isHighConfidenceMatch(match: MatchResult, threshold = 85): boolean {
  return match.confidence >= threshold;
}

/**
 * Group matches by confidence level for UI display
 */
export function groupMatchesByConfidence(matches: MatchResult[]): {
  high: MatchResult[];    // >= 85
  medium: MatchResult[];  // 70-84
  low: MatchResult[];     // < 70
} {
  return {
    high: matches.filter(m => m.confidence >= 85),
    medium: matches.filter(m => m.confidence >= 70 && m.confidence < 85),
    low: matches.filter(m => m.confidence < 70),
  };
}
