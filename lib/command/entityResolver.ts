/**
 * Entity Resolver - Fuzzy matching for organizations and users
 * Resolves parsed names to actual database entities
 */

import * as fuzzball from 'fuzzball';
import { createClient } from '@/lib/supabase/server';
import type { EntityMatch } from './types';

// Threshold constants
const EXACT_MATCH_THRESHOLD = 100;
const HIGH_CONFIDENCE_THRESHOLD = 90;
const MEDIUM_CONFIDENCE_THRESHOLD = 70;

// Common abbreviations and their expansions (case-insensitive)
const COMMON_ABBREVIATIONS: Record<string, string[]> = {
  // Company name patterns
  'mi': ['mordor intelligence', 'mordor'],
  'gmi': ['gmi', 'global market insights'],
  'ms': ['microsoft'],
  'goog': ['google'],
  'fb': ['facebook', 'meta'],
  'amzn': ['amazon'],
  // Common industry abbreviations
  'ai': ['artificial intelligence'],
  'ml': ['machine learning'],
  'saas': ['software as a service'],
  // Add more as needed
};

// Reverse mapping: expansion -> abbreviation
const EXPANSION_TO_ABBREV: Map<string, string> = new Map();
for (const [abbrev, expansions] of Object.entries(COMMON_ABBREVIATIONS)) {
  for (const expansion of expansions) {
    EXPANSION_TO_ABBREV.set(expansion.toLowerCase(), abbrev);
  }
}

// Check if input matches any common abbreviation
function expandAbbreviation(input: string): string[] {
  const lower = input.toLowerCase().trim();
  const expansions = COMMON_ABBREVIATIONS[lower];
  if (expansions) {
    return [input, ...expansions];
  }
  // Check if input is an expansion
  const abbrev = EXPANSION_TO_ABBREV.get(lower);
  if (abbrev) {
    return [input, abbrev, ...(COMMON_ABBREVIATIONS[abbrev] || [])];
  }
  return [input];
}

// Normalize string for comparison
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .replace(/\b(inc|corp|corporation|ltd|limited|llc|company|co)\b/gi, '') // Remove company suffixes
    .trim();
}

// Organization type from database
interface OrgRecord {
  org_id: string;
  org_name: string;
  org_domain?: string;
  org_url?: string;
  last_activity_at?: string | null;
}

// User type from database
interface UserRecord {
  user_id: string;
  name: string;
  email: string;
  org_id: string;
}

// Resolve organization name to database entity
export async function resolveOrganization(
  orgName: string | null,
  parentCompany?: string
): Promise<EntityMatch | null> {
  if (!orgName) return null;

  const normalizedQuery = normalize(orgName);

  // Expand abbreviations to get all possible matches
  const queryVariants = expandAbbreviation(orgName).map(normalize);

  // 1. Check entity aliases FIRST (highest priority - user-learned preferences)
  const aliasMatch = await checkEntityAlias('org', orgName);
  if (aliasMatch) {
    return {
      id: aliasMatch.id,
      name: aliasMatch.name,
      confidence: 1.0,
      strategy: 'alias',
    };
  }

  const supabase = await createClient();

  // Build query - include last_activity_at for recency boosting
  let query = supabase
    .from('trial_organizations')
    .select('org_id, org_name, org_domain, org_url, last_activity_at')
    .order('last_activity_at', { ascending: false, nullsFirst: false }); // Recent orgs first

  if (parentCompany) {
    query = query.eq('parent_company', parentCompany);
  }

  const { data: orgs, error } = await query;

  if (error || !orgs || orgs.length === 0) {
    return {
      id: '',
      name: orgName,
      confidence: 0,
      strategy: 'fuzzy',
      alternatives: [],
    };
  }

  // Calculate recency boost (0-5 points) based on last activity
  function getRecencyBoost(lastActivityAt: string | null | undefined): number {
    if (!lastActivityAt) return 0;
    const daysSinceActivity = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity <= 7) return 5;   // Active in last week
    if (daysSinceActivity <= 30) return 3;  // Active in last month
    if (daysSinceActivity <= 90) return 1;  // Active in last quarter
    return 0;
  }

  // Find best match using fuzzy matching
  let bestMatch: OrgRecord | null = null;
  let bestScore = 0;
  const alternatives: EntityMatch['alternatives'] = [];

  for (const org of orgs as OrgRecord[]) {
    const normalizedOrgName = normalize(org.org_name);

    // Try exact match first (check all query variants including abbreviations)
    for (const variant of queryVariants) {
      if (normalizedOrgName === variant) {
        return {
          id: org.org_id,
          name: org.org_name,
          confidence: 1.0,
          strategy: 'exact',
        };
      }
    }

    // Try domain match (e.g., "acme" matches "acme.com")
    if (org.org_domain) {
      const domainWithoutTld = org.org_domain.replace(/\.(com|io|co|org|net|ai|app|tech|dev)$/, '');
      for (const variant of queryVariants) {
        if (normalize(domainWithoutTld) === variant) {
          return {
            id: org.org_id,
            name: org.org_name,
            confidence: 0.95,
            strategy: 'domain',
          };
        }
      }
    }

    // Fuzzy matching - try all query variants and take best score
    let maxFuzzyScore = 0;
    for (const variant of queryVariants) {
      const tokenSetScore = fuzzball.token_set_ratio(variant, normalizedOrgName);
      const partialScore = fuzzball.partial_ratio(variant, normalizedOrgName);
      maxFuzzyScore = Math.max(maxFuzzyScore, tokenSetScore, partialScore);
    }

    // Add recency boost (max 5 points on 100 scale)
    const recencyBoost = getRecencyBoost(org.last_activity_at);
    const score = Math.min(100, maxFuzzyScore + recencyBoost);

    if (score >= MEDIUM_CONFIDENCE_THRESHOLD) {
      alternatives.push({
        id: org.org_id,
        name: org.org_name,
        score: score / 100,
        metadata: { domain: org.org_domain },
      });
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = org;
    }
  }

  // Sort alternatives by score
  alternatives.sort((a, b) => b.score - a.score);

  if (!bestMatch || bestScore < MEDIUM_CONFIDENCE_THRESHOLD) {
    return {
      id: '',
      name: orgName,
      confidence: bestScore / 100,
      strategy: 'fuzzy',
      alternatives: alternatives.slice(0, 5),
    };
  }

  return {
    id: bestMatch.org_id,
    name: bestMatch.org_name,
    confidence: bestScore / 100,
    strategy: bestScore >= HIGH_CONFIDENCE_THRESHOLD ? 'fuzzy' : 'fuzzy',
    alternatives: alternatives.length > 1 ? alternatives.slice(0, 5) : undefined,
  };
}

// Resolve user name to database entity within an organization
export async function resolveUser(
  userName: string | null,
  orgId: string | null
): Promise<EntityMatch | null> {
  if (!userName) return null;

  const normalizedQuery = normalize(userName);

  // 1. Check entity aliases FIRST (highest priority - user-learned preferences)
  const aliasMatch = await checkEntityAlias('user', userName);
  if (aliasMatch) {
    return {
      id: aliasMatch.id,
      name: aliasMatch.name,
      confidence: 1.0,
      strategy: 'alias',
    };
  }

  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('trial_users')
    .select('user_id, name, email, org_id');

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data: users, error } = await query;

  if (error || !users || users.length === 0) {
    return {
      id: '',
      name: userName,
      confidence: 0,
      strategy: 'fuzzy',
      alternatives: [],
    };
  }

  // Find best match
  let bestMatch: UserRecord | null = null;
  let bestScore = 0;
  const alternatives: EntityMatch['alternatives'] = [];

  for (const user of users as UserRecord[]) {
    const normalizedUserName = normalize(user.name || '');

    // Try exact match
    if (normalizedUserName === normalizedQuery) {
      return {
        id: user.user_id,
        name: user.name,
        confidence: 1.0,
        strategy: 'exact',
      };
    }

    // Check if query matches first name
    const firstName = normalizedUserName.split(' ')[0];
    if (firstName === normalizedQuery) {
      return {
        id: user.user_id,
        name: user.name,
        confidence: 0.95,
        strategy: 'exact',
      };
    }

    // Check email local part match (e.g., "john" matches "john@company.com")
    if (user.email) {
      const emailLocal = user.email.split('@')[0].toLowerCase();
      if (emailLocal === normalizedQuery || emailLocal.includes(normalizedQuery)) {
        return {
          id: user.user_id,
          name: user.name,
          confidence: 0.90,
          strategy: 'fuzzy',
        };
      }
    }

    // Fuzzy matching
    const tokenSetScore = fuzzball.token_set_ratio(normalizedQuery, normalizedUserName);
    const partialScore = fuzzball.partial_ratio(normalizedQuery, normalizedUserName);
    const score = Math.max(tokenSetScore, partialScore);

    if (score >= MEDIUM_CONFIDENCE_THRESHOLD) {
      alternatives.push({
        id: user.user_id,
        name: user.name,
        score: score / 100,
        metadata: { email: user.email },
      });
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = user;
    }
  }

  // Sort alternatives by score
  alternatives.sort((a, b) => b.score - a.score);

  if (!bestMatch || bestScore < MEDIUM_CONFIDENCE_THRESHOLD) {
    return {
      id: '',
      name: userName,
      confidence: bestScore / 100,
      strategy: 'fuzzy',
      alternatives: alternatives.slice(0, 5),
    };
  }

  return {
    id: bestMatch.user_id,
    name: bestMatch.name,
    confidence: bestScore / 100,
    strategy: 'fuzzy',
    alternatives: alternatives.length > 1 ? alternatives.slice(0, 5) : undefined,
  };
}

// Get list of known organization names for parser context
export async function getKnownOrganizations(
  parentCompany?: string
): Promise<string[]> {
  const supabase = await createClient();

  let query = supabase
    .from('trial_organizations')
    .select('org_name')
    .order('last_activity_at', { ascending: false })
    .limit(100);

  if (parentCompany) {
    query = query.eq('parent_company', parentCompany);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((org: { org_name: string }) => org.org_name).filter(Boolean);
}

// Get list of known user names for parser context
export async function getKnownUsers(
  parentCompany?: string
): Promise<string[]> {
  const supabase = await createClient();

  let query = supabase
    .from('trial_users')
    .select('name, trial_organizations!inner(parent_company)')
    .order('last_login_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (parentCompany) {
    query = query.eq('trial_organizations.parent_company', parentCompany);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((user: { name: string }) => user.name).filter(Boolean);
}

// Check if entity alias exists
export async function checkEntityAlias(
  entityType: 'org' | 'user',
  alias: string
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  const normalizedAlias = normalize(alias);

  const { data, error } = await supabase
    .from('entity_aliases')
    .select('target_id, target_name')
    .eq('entity_type', entityType)
    .eq('alias', normalizedAlias)
    .single();

  if (error || !data) return null;

  // Increment usage count via RPC function
  await supabase.rpc('increment_alias_usage', {
    p_entity_type: entityType,
    p_alias: normalizedAlias,
  });

  return { id: data.target_id, name: data.target_name };
}

// Save entity alias for future matching
export async function saveEntityAlias(
  entityType: 'org' | 'user',
  alias: string,
  targetId: string,
  targetName: string,
  createdBy?: string
): Promise<boolean> {
  const supabase = await createClient();
  const normalizedAlias = normalize(alias);

  const { error } = await supabase
    .from('entity_aliases')
    .upsert({
      entity_type: entityType,
      alias: normalizedAlias,
      target_id: targetId,
      target_name: targetName,
      created_by: createdBy,
      usage_count: 1,
    }, { onConflict: 'entity_type,alias' });

  return !error;
}
