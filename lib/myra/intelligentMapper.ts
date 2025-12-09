// Intelligent Mapper - AI-powered entity resolution with fuzzy matching
// This is the core of our graceful mapping system

import * as fuzzball from 'fuzzball';
import { callGroqJSON } from '../ai/groqClient';
import type { MappingResult, TrialOrg, TrialUser, MappingConfig, DEFAULT_MAPPING_CONFIG } from './types';

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize company names for better fuzzy matching
 * Removes common suffixes, special characters, and extra whitespace
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Remove common company suffixes
    .replace(/\b(inc|incorporated|ltd|limited|llc|corp|corporation|group|co|company|plc|gmbh|sa|spa|nv|bv)\b\.?/gi, '')
    // Remove special characters but keep spaces
    .replace(/[^\w\s]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract domain from various formats
 * Handles: email addresses, URLs, plain domains
 */
export function extractDomain(input: string): string | null {
  if (!input) return null;

  // Extract from email
  const emailMatch = input.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    return emailMatch[1].toLowerCase();
  }

  // Extract from URL
  const urlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  // Plain domain
  if (input.includes('.') && !input.includes(' ')) {
    return input.toLowerCase();
  }

  return null;
}

/**
 * Parse flexible date formats
 * Handles: ISO, US format, European format, relative dates
 */
export function parseFlexibleDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  try {
    // Try ISO format first
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try common formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY or DD/MM/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,     // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/,     // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================
// Organization Mapping
// ============================================

/**
 * Map a raw organization name to a trial org using multiple strategies
 * Returns: Best match with confidence score and alternatives
 */
export async function mapOrganization(
  rawOrgName: string,
  allOrgs: TrialOrg[],
  config: MappingConfig = DEFAULT_MAPPING_CONFIG
): Promise<MappingResult<TrialOrg>> {
  if (!rawOrgName || !allOrgs || allOrgs.length === 0) {
    return {
      entity_id: null,
      entity_name: rawOrgName || '',
      confidence: 0,
      match_strategy: 'none',
      alternatives: [],
    };
  }

  // Strategy 1: Exact match (case-insensitive)
  const exactMatch = allOrgs.find(
    (org) => org.org_name.toLowerCase() === rawOrgName.toLowerCase()
  );

  if (exactMatch) {
    return {
      entity_id: exactMatch.org_id,
      entity_name: exactMatch.org_name,
      confidence: 100,
      match_strategy: 'exact',
      alternatives: [],
    };
  }

  // Strategy 2: Fuzzy string matching
  if (config.enableFuzzyMatching) {
    const fuzzyMatches = allOrgs
      .map((org) => {
        const normalizedRaw = normalizeCompanyName(rawOrgName);
        const normalizedOrg = normalizeCompanyName(org.org_name);

        // Try multiple fuzzy matching algorithms
        const tokenSetRatio = fuzzball.token_set_ratio(normalizedRaw, normalizedOrg);
        const partialRatio = fuzzball.partial_ratio(normalizedRaw, normalizedOrg);
        const simpleRatio = fuzzball.ratio(normalizedRaw, normalizedOrg);

        // Take the best score
        const score = Math.max(tokenSetRatio, partialRatio, simpleRatio);

        return {
          org,
          score,
          method: 'fuzzy' as const,
        };
      })
      .filter((m) => m.score > config.fuzzyThreshold)
      .sort((a, b) => b.score - a.score);

    if (fuzzyMatches.length > 0 && fuzzyMatches[0].score > config.fuzzyHighConfidence) {
      // High confidence fuzzy match
      return {
        entity_id: fuzzyMatches[0].org.org_id,
        entity_name: fuzzyMatches[0].org.org_name,
        confidence: fuzzyMatches[0].score,
        match_strategy: 'fuzzy',
        alternatives: fuzzyMatches.slice(1, 4).map((m) => ({
          id: m.org.org_id,
          name: m.org.org_name,
          score: m.score,
          metadata: m.org,
        })),
      };
    }

    // Medium confidence - will need review
    if (fuzzyMatches.length > 0) {
      return {
        entity_id: fuzzyMatches[0].org.org_id,
        entity_name: fuzzyMatches[0].org.org_name,
        confidence: fuzzyMatches[0].score,
        match_strategy: 'fuzzy',
        alternatives: fuzzyMatches.slice(1, 5).map((m) => ({
          id: m.org.org_id,
          name: m.org.org_name,
          score: m.score,
          metadata: m.org,
        })),
      };
    }
  }

  // Strategy 3: Domain matching
  if (config.enableDomainMatching) {
    const extractedDomain = extractDomain(rawOrgName);
    if (extractedDomain) {
      const domainMatch = allOrgs.find(
        (org) => org.domain && org.domain.toLowerCase() === extractedDomain
      );

      if (domainMatch) {
        return {
          entity_id: domainMatch.org_id,
          entity_name: domainMatch.org_name,
          confidence: 90,
          match_strategy: 'domain',
          alternatives: [],
        };
      }
    }
  }

  // Strategy 4: AI-powered entity resolution (last resort)
  if (config.enableAI && allOrgs.length <= 100) {
    // Only use AI for small candidate sets to avoid token limits
    const topFuzzyCandidates = allOrgs
      .map((org) => ({
        org,
        score: fuzzball.ratio(
          normalizeCompanyName(rawOrgName),
          normalizeCompanyName(org.org_name)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 candidates for AI

    if (topFuzzyCandidates.length > 0 && topFuzzyCandidates[0].score > 50) {
      const aiResult = await resolveOrganizationWithAI(rawOrgName, topFuzzyCandidates.map((c) => c.org));

      if (aiResult.entity_id && aiResult.confidence > 70) {
        return aiResult;
      }
    }
  }

  // Strategy 5: No confident match - return alternatives for manual selection
  const allFuzzyMatches = allOrgs
    .map((org) => ({
      org,
      score: fuzzball.ratio(normalizeCompanyName(rawOrgName), normalizeCompanyName(org.org_name)),
    }))
    .filter((m) => m.score > 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    entity_id: null,
    entity_name: rawOrgName,
    confidence: 0,
    match_strategy: 'manual',
    alternatives: allFuzzyMatches.map((m) => ({
      id: m.org.org_id,
      name: m.org.org_name,
      score: m.score,
      metadata: m.org,
    })),
  };
}

/**
 * Use Groq AI to disambiguate between similar organizations
 */
async function resolveOrganizationWithAI(
  rawName: string,
  candidates: TrialOrg[]
): Promise<MappingResult<TrialOrg>> {
  if (candidates.length === 0) {
    return {
      entity_id: null,
      entity_name: rawName,
      confidence: 0,
      match_strategy: 'ai',
      alternatives: [],
    };
  }

  try {
    const prompt = `You are analyzing company name matching. Which organization best matches "${rawName}"?

Candidates:
${candidates.map((org, i) => `${i + 1}. ${org.org_name}${org.parent_organization ? ` (parent: ${org.parent_organization})` : ''}`).join('\n')}

Consider:
- Name similarity (accounting for abbreviations, common variations)
- Parent company relationships
- Common industry naming patterns

Return JSON format:
{
  "best_match_index": number (1-${candidates.length}) or null if no good match,
  "confidence": number (0-100),
  "reasoning": "Brief explanation"
}

If none match well, return null for best_match_index.`;

    const result = await callGroqJSON<{
      best_match_index: number | null;
      confidence: number;
      reasoning: string;
    }>(prompt, {
      temperature: 0.1, // Low temperature for deterministic results
      max_tokens: 500,
    });

    if (!result.success || !result.data) {
      throw new Error('AI resolution failed');
    }

    const { best_match_index, confidence, reasoning } = result.data;

    if (best_match_index && best_match_index >= 1 && best_match_index <= candidates.length) {
      const match = candidates[best_match_index - 1];
      return {
        entity_id: match.org_id,
        entity_name: match.org_name,
        confidence: Math.min(confidence, 95), // Cap AI confidence at 95
        match_strategy: 'ai',
        reasoning,
        alternatives: candidates
          .filter((c) => c.org_id !== match.org_id)
          .map((c) => ({
            id: c.org_id,
            name: c.org_name,
            score: 60,
            metadata: c,
          })),
      };
    }

    // AI couldn't find a match
    return {
      entity_id: null,
      entity_name: rawName,
      confidence: 0,
      match_strategy: 'ai',
      reasoning,
      alternatives: candidates.map((c) => ({
        id: c.org_id,
        name: c.org_name,
        score: 50,
        metadata: c,
      })),
    };
  } catch (error) {
    console.error('AI organization resolution failed:', error);
    // Fallback to no match
    return {
      entity_id: null,
      entity_name: rawName,
      confidence: 0,
      match_strategy: 'manual',
      alternatives: candidates.map((c) => ({
        id: c.org_id,
        name: c.org_name,
        score: 50,
        metadata: c,
      })),
    };
  }
}

// ============================================
// User Mapping
// ============================================

/**
 * Map a raw user name/email to a trial user
 * If organization is known, scope search to that org
 */
export async function mapUser(
  rawUserName: string | null,
  rawUserEmail: string | null,
  mappedOrgId: string | null,
  allUsers: TrialUser[],
  config: MappingConfig = DEFAULT_MAPPING_CONFIG
): Promise<MappingResult<TrialUser>> {
  if (!rawUserName && !rawUserEmail) {
    return {
      entity_id: null,
      entity_name: 'Unknown User',
      confidence: 0,
      match_strategy: 'none',
      alternatives: [],
    };
  }

  // Filter to organization users if we know the org
  const candidateUsers = mappedOrgId
    ? allUsers.filter((u) => u.org_id === mappedOrgId)
    : allUsers;

  if (candidateUsers.length === 0) {
    // No users in this org - suggest creating new
    return {
      entity_id: null,
      entity_name: rawUserName || rawUserEmail || '',
      confidence: 60, // Medium confidence - can create
      match_strategy: 'manual',
      alternatives: [
        {
          id: 'CREATE_NEW',
          name: `Create new user: ${rawUserName || ''} ${rawUserEmail ? `(${rawUserEmail})` : ''}`.trim(),
          score: 60,
        },
      ],
    };
  }

  // Strategy 1: Exact email match
  if (rawUserEmail) {
    const emailMatch = candidateUsers.find(
      (u) => u.email && u.email.toLowerCase() === rawUserEmail.toLowerCase()
    );

    if (emailMatch) {
      return {
        entity_id: emailMatch.user_id,
        entity_name: emailMatch.name || emailMatch.email || '',
        confidence: 100,
        match_strategy: 'exact',
        alternatives: [],
      };
    }
  }

  // Strategy 2: Fuzzy name matching
  if (rawUserName && config.enableFuzzyMatching) {
    const fuzzyMatches = candidateUsers
      .filter((u) => u.name) // Only match users with names
      .map((user) => {
        const nameSimilarity = fuzzball.ratio(
          rawUserName.toLowerCase(),
          (user.name || '').toLowerCase()
        );

        // Partial email match bonus
        let emailBonus = 0;
        if (rawUserEmail && user.email) {
          const emailUsername = rawUserEmail.split('@')[0];
          const userEmailUsername = user.email.split('@')[0];
          emailBonus = fuzzball.partial_ratio(emailUsername, userEmailUsername) * 0.3;
        }

        return {
          user,
          score: Math.min(100, nameSimilarity + emailBonus),
        };
      })
      .filter((m) => m.score > 65)
      .sort((a, b) => b.score - a.score);

    if (fuzzyMatches.length > 0 && fuzzyMatches[0].score > 80) {
      return {
        entity_id: fuzzyMatches[0].user.user_id,
        entity_name: fuzzyMatches[0].user.name || fuzzyMatches[0].user.email || '',
        confidence: fuzzyMatches[0].score,
        match_strategy: 'fuzzy',
        alternatives: fuzzyMatches.slice(1, 3).map((m) => ({
          id: m.user.user_id,
          name: m.user.name || m.user.email || '',
          score: m.score,
          metadata: m.user,
        })),
      };
    }
  }

  // Strategy 3: Suggest creating new user (if within org)
  if (mappedOrgId) {
    const alternatives = candidateUsers
      .map((user) => {
        const nameScore = rawUserName
          ? fuzzball.ratio(rawUserName.toLowerCase(), (user.name || '').toLowerCase())
          : 0;
        const emailScore = rawUserEmail && user.email
          ? fuzzball.partial_ratio(rawUserEmail.toLowerCase(), user.email.toLowerCase())
          : 0;
        return {
          user,
          score: Math.max(nameScore, emailScore),
        };
      })
      .filter((m) => m.score > 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((m) => ({
        id: m.user.user_id,
        name: m.user.name || m.user.email || '',
        score: m.score,
        metadata: m.user,
      }));

    alternatives.unshift({
      id: 'CREATE_NEW',
      name: `Create new user: ${rawUserName || ''} ${rawUserEmail ? `(${rawUserEmail})` : ''}`.trim(),
      score: 65,
    });

    return {
      entity_id: null,
      entity_name: rawUserName || rawUserEmail || '',
      confidence: 0,
      match_strategy: 'manual',
      alternatives,
    };
  }

  // Strategy 4: No match
  return {
    entity_id: null,
    entity_name: rawUserName || rawUserEmail || '',
    confidence: 0,
    match_strategy: 'manual',
    alternatives: [],
  };
}

// ============================================
// Determine Status
// ============================================

/**
 * Determine what status a staging record should have based on mapping confidence
 */
export function determineRecordStatus(
  orgMapping: MappingResult,
  userMapping: MappingResult,
  config: MappingConfig = DEFAULT_MAPPING_CONFIG
): 'approved' | 'reviewed' | 'needs_review' {
  // Auto-approve high confidence matches
  if (
    orgMapping.confidence >= config.autoApproveThreshold &&
    userMapping.confidence >= config.autoApproveThreshold * 0.9 // Slightly lower threshold for users
  ) {
    return 'approved';
  }

  // Flag for mandatory review
  if (
    orgMapping.confidence < config.needsReviewThreshold ||
    userMapping.confidence < config.needsReviewThreshold * 0.8
  ) {
    return 'needs_review';
  }

  // Medium confidence - optional review
  return 'reviewed';
}
