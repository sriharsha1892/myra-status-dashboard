// Entity Matching - Intelligent org and user resolution
// Handles fuzzy matching with multi-strategy approach

import { createClient } from '@/lib/supabase/client';
import {
  OrgMatch,
  UserMatch,
  EntityMatchResult,
  MatchStrategy,
  ConfidenceTier,
  CSVRow,
} from './types';

// Use dynamic import for fuzzball to avoid SSR issues
let fuzzball: any = null;

async function getFuzzball() {
  if (!fuzzball) {
    fuzzball = await import('fuzzball');
  }
  return fuzzball;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 90, // >90% = green tier
  NEEDS_REVIEW: 70, // 70-90% = yellow tier
  // <70% = red tier (requires fix)
};

const FUZZY_THRESHOLDS = {
  EXACT_MATCH: 100,
  HIGH_CONFIDENCE: 90,
  MEDIUM_CONFIDENCE: 75,
  LOW_CONFIDENCE: 60,
};

// ============================================================================
// ORGANIZATION MATCHING
// ============================================================================

/**
 * Match organization using multi-strategy approach
 */
export async function matchOrganization(
  orgName: string,
  existingOrgs: Array<{ org_id: string; org_name: string }>
): Promise<OrgMatch> {
  const normalizedName = normalizeOrgName(orgName);

  // Strategy 1: Exact match (100% confidence)
  const exactMatch = existingOrgs.find(
    (org) => normalizeOrgName(org.org_name) === normalizedName
  );

  if (exactMatch) {
    return {
      orgId: exactMatch.org_id,
      orgName: exactMatch.org_name,
      matchedName: exactMatch.org_name,
      confidence: 100,
      strategy: MatchStrategy.EXACT_EMAIL, // Reusing enum
      tier: ConfidenceTier.AUTO_APPROVE,
      isNewOrg: false,
    };
  }

  // Strategy 2: Fuzzy matching
  const fb = await getFuzzball();
  const fuzzyMatches = existingOrgs
    .map((org) => ({
      org,
      score: fb.token_set_ratio(normalizedName, normalizeOrgName(org.org_name)),
    }))
    .filter((m) => m.score >= FUZZY_THRESHOLDS.LOW_CONFIDENCE)
    .sort((a, b) => b.score - a.score);

  if (fuzzyMatches.length > 0) {
    const bestMatch = fuzzyMatches[0];
    const tier =
      bestMatch.score >= CONFIDENCE_THRESHOLDS.AUTO_APPROVE
        ? ConfidenceTier.AUTO_APPROVE
        : bestMatch.score >= CONFIDENCE_THRESHOLDS.NEEDS_REVIEW
        ? ConfidenceTier.NEEDS_REVIEW
        : ConfidenceTier.REQUIRES_FIX;

    return {
      orgId: bestMatch.org.org_id,
      orgName: bestMatch.org.org_name,
      matchedName: bestMatch.org.org_name,
      confidence: bestMatch.score,
      strategy: MatchStrategy.FUZZY_NAME,
      tier,
      isNewOrg: false,
      suggestions: fuzzyMatches.slice(0, 3).map((m) => ({
        orgId: m.org.org_id,
        orgName: m.org.org_name,
        confidence: m.score,
      })),
    };
  }

  // Strategy 3: Create new organization
  return {
    orgId: null,
    orgName: orgName,
    confidence: 100, // 100% confidence in creating new
    strategy: MatchStrategy.CREATE_NEW,
    tier: ConfidenceTier.AUTO_APPROVE,
    isNewOrg: true,
  };
}

/**
 * Normalize organization name for matching
 */
function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_]/g, '')
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/gi, '');
}

// ============================================================================
// USER MATCHING
// ============================================================================

/**
 * Match user using multi-strategy approach
 */
export async function matchUser(
  userEmail: string,
  userName: string,
  orgId: string,
  existingUsers: Array<{
    user_id: string;
    email: string;
    name: string;
    org_id: string;
  }>
): Promise<UserMatch> {
  const normalizedEmail = userEmail.toLowerCase().trim();
  const normalizedName = normalizeName(userName);

  // Strategy 1: Exact email match (100% confidence)
  const exactEmailMatch = existingUsers.find(
    (user) => user.email.toLowerCase().trim() === normalizedEmail
  );

  if (exactEmailMatch) {
    return {
      userId: exactEmailMatch.user_id,
      userEmail: exactEmailMatch.email,
      userName: exactEmailMatch.name,
      matchedName: exactEmailMatch.name,
      confidence: 100,
      strategy: MatchStrategy.EXACT_EMAIL,
      tier: ConfidenceTier.AUTO_APPROVE,
      isNewUser: false,
      orgId,
    };
  }

  // Strategy 2: Fuzzy name match within same org
  const usersInOrg = existingUsers.filter((user) => user.org_id === orgId);

  if (usersInOrg.length > 0) {
    const fb = await getFuzzball();
    const fuzzyMatches = usersInOrg
      .map((user) => ({
        user,
        score: fb.token_set_ratio(normalizedName, normalizeName(user.name)),
      }))
      .filter((m) => m.score >= FUZZY_THRESHOLDS.MEDIUM_CONFIDENCE)
      .sort((a, b) => b.score - a.score);

    if (fuzzyMatches.length > 0) {
      const bestMatch = fuzzyMatches[0];
      const tier =
        bestMatch.score >= CONFIDENCE_THRESHOLDS.AUTO_APPROVE
          ? ConfidenceTier.AUTO_APPROVE
          : bestMatch.score >= CONFIDENCE_THRESHOLDS.NEEDS_REVIEW
          ? ConfidenceTier.NEEDS_REVIEW
          : ConfidenceTier.REQUIRES_FIX;

      return {
        userId: bestMatch.user.user_id,
        userEmail: bestMatch.user.email,
        userName: bestMatch.user.name,
        matchedName: bestMatch.user.name,
        confidence: bestMatch.score,
        strategy: MatchStrategy.FUZZY_NAME,
        tier,
        isNewUser: false,
        orgId,
        suggestions: fuzzyMatches.slice(0, 3).map((m) => ({
          userId: m.user.user_id,
          userName: m.user.name,
          userEmail: m.user.email,
          confidence: m.score,
        })),
      };
    }
  }

  // Strategy 3: Domain-based matching (email domain matches org)
  const emailDomain = normalizedEmail.split('@')[1];
  const domainMatches = existingUsers.filter((user) => {
    const userDomain = user.email.toLowerCase().split('@')[1];
    return userDomain === emailDomain;
  });

  if (domainMatches.length > 0) {
    const fb = await getFuzzball();
    const bestDomainMatch = domainMatches
      .map((user) => ({
        user,
        score: fb.token_set_ratio(normalizedName, normalizeName(user.name)),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (bestDomainMatch.score >= FUZZY_THRESHOLDS.MEDIUM_CONFIDENCE) {
      const adjustedScore = Math.min(bestDomainMatch.score * 0.9, 90); // Cap at 90% for domain matches
      const tier =
        adjustedScore >= CONFIDENCE_THRESHOLDS.NEEDS_REVIEW
          ? ConfidenceTier.NEEDS_REVIEW
          : ConfidenceTier.REQUIRES_FIX;

      return {
        userId: bestDomainMatch.user.user_id,
        userEmail: bestDomainMatch.user.email,
        userName: bestDomainMatch.user.name,
        matchedName: bestDomainMatch.user.name,
        confidence: adjustedScore,
        strategy: MatchStrategy.DOMAIN_BASED,
        tier,
        isNewUser: false,
        orgId,
      };
    }
  }

  // Strategy 4: Create new user
  return {
    userId: null,
    userEmail: userEmail,
    userName: userName,
    confidence: 100, // 100% confidence in creating new
    strategy: MatchStrategy.CREATE_NEW,
    tier: ConfidenceTier.AUTO_APPROVE,
    isNewUser: true,
    orgId,
  };
}

/**
 * Normalize user name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_]/g, ' ');
}

// ============================================================================
// COMBINED ENTITY MATCHING
// ============================================================================

/**
 * Match both organization and user with combined confidence
 */
export async function matchEntities(
  row: CSVRow,
  existingOrgs: Array<{ org_id: string; org_name: string }>,
  existingUsers: Array<{
    user_id: string;
    email: string;
    name: string;
    org_id: string;
  }>
): Promise<EntityMatchResult> {
  // Match organization first
  const orgMatch = await matchOrganization(row.org_name, existingOrgs);

  // Determine org_id for user matching
  const orgIdForUserMatch = orgMatch.orgId || `temp_${row.org_name}`;

  // Match user
  const userMatch = await matchUser(
    row.user_email,
    row.user_name,
    orgIdForUserMatch,
    existingUsers
  );

  // Calculate combined confidence
  const overallConfidence = calculateCombinedConfidence(orgMatch, userMatch);

  // Determine overall tier
  const overallTier =
    overallConfidence >= CONFIDENCE_THRESHOLDS.AUTO_APPROVE
      ? ConfidenceTier.AUTO_APPROVE
      : overallConfidence >= CONFIDENCE_THRESHOLDS.NEEDS_REVIEW
      ? ConfidenceTier.NEEDS_REVIEW
      : ConfidenceTier.REQUIRES_FIX;

  return {
    orgMatch,
    userMatch,
    overallConfidence,
    overallTier,
  };
}

/**
 * Calculate combined confidence from org and user matches
 */
function calculateCombinedConfidence(
  orgMatch: OrgMatch,
  userMatch: UserMatch
): number {
  // If both are exact matches or new entities, return 100
  if (
    (orgMatch.confidence === 100 && userMatch.confidence === 100) ||
    (orgMatch.isNewOrg && userMatch.isNewUser)
  ) {
    return 100;
  }

  // Weight user match more heavily (70/30) since email is unique
  const combined = userMatch.confidence * 0.7 + orgMatch.confidence * 0.3;

  return Math.round(combined);
}

// ============================================================================
// BATCH MATCHING
// ============================================================================

/**
 * Fetch all existing organizations and users once for batch processing
 */
export async function fetchExistingEntities(): Promise<{
  orgs: Array<{ org_id: string; org_name: string }>;
  users: Array<{
    user_id: string;
    email: string;
    name: string;
    org_id: string;
  }>;
}> {
  const supabase = createClient();

  const [orgsResult, usersResult] = await Promise.all([
    supabase.from('trial_organizations').select('org_id, org_name'),
    supabase.from('trial_users').select('user_id, email, name, org_id'),
  ]);

  if (orgsResult.error) {
    console.error('Error fetching organizations:', orgsResult.error);
    throw new Error('Failed to fetch organizations');
  }

  if (usersResult.error) {
    console.error('Error fetching users:', usersResult.error);
    throw new Error('Failed to fetch users');
  }

  return {
    orgs: orgsResult.data || [],
    users: usersResult.data || [],
  };
}

/**
 * Match all rows in batch
 */
export async function batchMatchEntities(
  rows: CSVRow[]
): Promise<EntityMatchResult[]> {
  // Fetch all entities once
  const { orgs, users } = await fetchExistingEntities();

  // Match all rows
  const matches = await Promise.all(
    rows.map((row) => matchEntities(row, orgs, users))
  );

  return matches;
}
