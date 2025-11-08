/**
 * Auto-Linking and Duplicate Prevention Engine
 * Uses fuzzy matching to detect duplicates and auto-link entities
 */

import { createClient } from '@/lib/supabase/server';
import * as fuzz from 'fuzzball';

export interface DuplicateMatch {
  id: string;
  similarity: number; // 0-100
  matchType: 'email_exact' | 'domain_and_name' | 'org_name_fuzzy' | 'org_domain_exact';
  existing: any;
  suggested_action: 'auto_link' | 'flag_for_review' | 'create_new';
  confidence: number;
}

// Thresholds for decision making
const THRESHOLD_AUTO_LINK = 90; // >= 90% confidence: auto-link silently
const THRESHOLD_REVIEW = 70; // 70-89% confidence: flag for review
// < 70%: create new

/**
 * Find duplicate trial organizations
 */
export async function findDuplicateOrgs(
  orgName: string,
  orgDomain?: string
): Promise<DuplicateMatch[]> {
  const supabase = await createClient();
  const matches: DuplicateMatch[] = [];

  // Fetch all organizations
  const { data: orgs, error } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, org_domain, org_url');

  if (error || !orgs) return [];

  for (const org of orgs) {
    let similarity = 0;
    let matchType: DuplicateMatch['matchType'] = 'org_name_fuzzy';

    // 1. Exact domain match (highest confidence)
    if (orgDomain && org.org_domain && orgDomain.toLowerCase() === org.org_domain.toLowerCase()) {
      similarity = 95;
      matchType = 'org_domain_exact';
    }
    // 2. Fuzzy name matching
    else {
      const nameSimilarity = fuzz.ratio(
        normalizeOrgName(orgName),
        normalizeOrgName(org.org_name)
      );

      if (nameSimilarity >= 70) {
        similarity = nameSimilarity;
        matchType = 'org_name_fuzzy';
      }
    }

    if (similarity >= THRESHOLD_REVIEW) {
      const suggested_action =
        similarity >= THRESHOLD_AUTO_LINK ? 'auto_link' :
        similarity >= THRESHOLD_REVIEW ? 'flag_for_review' :
        'create_new';

      matches.push({
        id: org.org_id,
        similarity,
        matchType,
        existing: org,
        suggested_action,
        confidence: similarity
      });
    }
  }

  // Sort by similarity (highest first)
  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find duplicate trial users
 */
export async function findDuplicateUsers(
  email: string,
  fullName?: string,
  orgId?: string
): Promise<DuplicateMatch[]> {
  const supabase = await createClient();
  const matches: DuplicateMatch[] = [];

  // Build query
  let query = supabase
    .from('trial_users')
    .select('user_id, email, full_name, org_id, org_name:trial_organizations(org_name)');

  // If orgId provided, limit to that org
  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data: users, error } = await query;
  if (error || !users) return [];

  for (const user of users) {
    let similarity = 0;
    let matchType: DuplicateMatch['matchType'] = 'domain_and_name';

    // 1. Exact email match (highest confidence)
    if (email.toLowerCase() === user.email.toLowerCase()) {
      similarity = 100;
      matchType = 'email_exact';
    }
    // 2. Domain + fuzzy name match (medium confidence)
    else if (fullName) {
      const emailDomain = extractDomain(email);
      const userDomain = extractDomain(user.email);

      if (emailDomain === userDomain) {
        const nameSimilarity = fuzz.ratio(
          normalizeName(fullName),
          normalizeName(user.full_name)
        );

        if (nameSimilarity >= 70) {
          similarity = nameSimilarity;
          matchType = 'domain_and_name';
        }
      }
    }

    if (similarity >= THRESHOLD_REVIEW) {
      const suggested_action =
        similarity >= THRESHOLD_AUTO_LINK ? 'auto_link' :
        similarity >= THRESHOLD_REVIEW ? 'flag_for_review' :
        'create_new';

      matches.push({
        id: user.user_id,
        similarity,
        matchType,
        existing: user,
        suggested_action,
        confidence: similarity
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Auto-link entities or create review queue item
 */
export async function processMatch(
  match: DuplicateMatch,
  entityType: 'org' | 'user',
  sourceData: any,
  userId: string
): Promise<{ action: string; id: string }> {
  const supabase = await createClient();

  // >= 90% confidence: auto-link
  if (match.suggested_action === 'auto_link') {
    return {
      action: 'auto_linked',
      id: match.id
    };
  }

  // 70-89% confidence: create review queue item
  if (match.suggested_action === 'flag_for_review') {
    const { data, error } = await supabase
      .from('review_queue')
      .insert({
        review_type: entityType === 'org' ? 'org_duplicate' : 'user_duplicate',
        priority: match.confidence >= 85 ? 'high' : 'normal',
        source_data: sourceData,
        suggestions: [{
          action: 'link_to_existing',
          target_id: match.id,
          confidence: match.confidence,
          reason: `${match.confidence}% ${match.matchType} match`,
          existing_data: match.existing
        }, {
          action: 'create_new',
          confidence: 100 - match.confidence,
          reason: 'Create as separate entity'
        }],
        source_type: 'auto_detection'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      action: 'flagged_for_review',
      id: data.id
    };
  }

  // < 70% confidence: create new
  return {
    action: 'create_new',
    id: ''
  };
}

/**
 * Learn from admin decision on duplicate
 */
export async function learnFromDecision(
  reviewQueueId: string,
  decision: 'merge' | 'separate',
  entity1: any,
  entity2: any,
  entityType: 'org' | 'user',
  userId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('learning_decisions')
    .insert({
      decision_type: entityType === 'org' ? 'merge_orgs' : 'separate_orgs',
      choice_data: {
        entity1,
        entity2,
        decision,
        timestamp: new Date().toISOString()
      },
      review_queue_id: reviewQueueId,
      decided_by: userId
    });

  // Update review queue as resolved
  await supabase
    .from('review_queue')
    .update({
      status: 'resolved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      resolution: { decision, applied: true }
    })
    .eq('id', reviewQueueId);
}

/**
 * Get learned patterns to improve future matching
 */
export async function getLearnedPatterns(
  entityType: 'org' | 'user'
): Promise<{ alwaysMerge: string[][]; neverMerge: string[][] }> {
  const supabase = await createClient();

  const decisionType = entityType === 'org' ? 'merge_orgs' : 'separate_orgs';

  const { data, error } = await supabase
    .from('learning_decisions')
    .select('choice_data')
    .eq('decision_type', decisionType)
    .order('decided_at', { ascending: false })
    .limit(100);

  if (error || !data) return { alwaysMerge: [], neverMerge: [] };

  const alwaysMerge: string[][] = [];
  const neverMerge: string[][] = [];

  for (const record of data) {
    const { entity1, entity2, decision } = record.choice_data;

    if (decision === 'merge') {
      alwaysMerge.push([entity1.name || entity1.org_name, entity2.name || entity2.org_name]);
    } else {
      neverMerge.push([entity1.name || entity1.org_name, entity2.name || entity2.org_name]);
    }
  }

  return { alwaysMerge, neverMerge };
}

/**
 * Check if learned patterns suggest auto-merge or never-merge
 */
export async function checkLearnedPatterns(
  name1: string,
  name2: string,
  entityType: 'org' | 'user'
): Promise<'always_merge' | 'never_merge' | null> {
  const patterns = await getLearnedPatterns(entityType);

  // Check always merge patterns
  for (const [pattern1, pattern2] of patterns.alwaysMerge) {
    if ((fuzzyMatch(name1, pattern1) && fuzzyMatch(name2, pattern2)) ||
        (fuzzyMatch(name1, pattern2) && fuzzyMatch(name2, pattern1))) {
      return 'always_merge';
    }
  }

  // Check never merge patterns
  for (const [pattern1, pattern2] of patterns.neverMerge) {
    if ((fuzzyMatch(name1, pattern1) && fuzzyMatch(name2, pattern2)) ||
        (fuzzyMatch(name1, pattern2) && fuzzyMatch(name2, pattern1))) {
      return 'never_merge';
    }
  }

  return null;
}

// Helper functions

function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+inc\.?$/i, '')
    .replace(/\s+corp\.?$/i, '')
    .replace(/\s+corporation$/i, '')
    .replace(/\s+ltd\.?$/i, '')
    .replace(/\s+limited$/i, '')
    .replace(/\s+llc$/i, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : '';
}

function fuzzyMatch(str1: string, str2: string, threshold = 85): boolean {
  return fuzz.ratio(
    str1.toLowerCase().trim(),
    str2.toLowerCase().trim()
  ) >= threshold;
}

/**
 * Bulk duplicate detection for import
 */
export async function bulkDetectDuplicates(
  orgs: Array<{ org_name: string; org_domain?: string }>,
  users: Array<{ email: string; full_name?: string }>
): Promise<{
  orgMatches: Map<number, DuplicateMatch[]>;
  userMatches: Map<number, DuplicateMatch[]>;
}> {
  const orgMatches = new Map<number, DuplicateMatch[]>();
  const userMatches = new Map<number, DuplicateMatch[]>();

  // Check each org
  for (let i = 0; i < orgs.length; i++) {
    const matches = await findDuplicateOrgs(orgs[i].org_name, orgs[i].org_domain);
    if (matches.length > 0) {
      orgMatches.set(i, matches);
    }
  }

  // Check each user
  for (let i = 0; i < users.length; i++) {
    const matches = await findDuplicateUsers(users[i].email, users[i].full_name);
    if (matches.length > 0) {
      userMatches.set(i, matches);
    }
  }

  return { orgMatches, userMatches };
}
