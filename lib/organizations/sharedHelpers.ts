/**
 * Shared Helper Functions for Organization Imports
 *
 * Used by both Excel and CSV organization importers
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Domain normalization map
 * Maps various domain names to 6 standard domains
 */
export const DOMAIN_MAP: Record<string, string> = {
  'TMT': 'TMT',
  'AF&B': 'AF&B',
  'E&C': 'E&C',
  'HC': 'HC',
  'NEO': 'NEO',
  'AAD': 'AAD',
  // Normalizations
  'AUTO': 'TMT',
  'Auto': 'TMT',
  'F&B': 'AF&B',
  'AGRI': 'AF&B',
  'C&M': 'E&C',
  'ICT': 'TMT',
  'Consulting': 'TMT',
  'Packaging': 'TMT',
  'Media': 'TMT',
  'Media & Consulting': 'TMT',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get organization initials for avatar
 */
export function getOrgInitials(orgName: string): string {
  const words = orgName.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length === 0) return 'ORG';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generate logo URL using Clearbit or UI Avatars
 */
export function generateLogoUrl(websiteUrl: string, orgName: string): string {
  if (!websiteUrl) {
    const initials = getOrgInitials(orgName);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`;
  }

  try {
    const url = new URL(websiteUrl);
    const domain = url.hostname.replace(/^www\./, '');
    return `https://logo.clearbit.com/${domain}`;
  } catch {
    const initials = getOrgInitials(orgName);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`;
  }
}

/**
 * Normalize domain value
 */
export function normalizeDomain(domain: string | null | undefined): string {
  if (!domain) return 'TMT'; // Default

  const normalized = DOMAIN_MAP[domain.trim()];
  return normalized || 'TMT'; // Fallback to TMT
}

/**
 * Fuzzy match Sales POC name to account managers
 */
export async function findAccountManagerBySalesPOC(salesPOCName: string | null): Promise<string | null> {
  if (!salesPOCName) return null;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get all users with Admin or Manager role
    const { data: managers, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .or('role.eq.Admin,role.eq.Manager');

    if (error || !managers || managers.length === 0) {
      return null;
    }

    const searchName = salesPOCName.toLowerCase().trim();

    // Try exact match first
    let match = managers.find(m =>
      m.full_name?.toLowerCase().includes(searchName) ||
      m.email?.toLowerCase().includes(searchName)
    );

    if (match) return match.id;

    // Try partial match (first name) - handles "Rupak/Paras" format
    const firstWord = searchName.split(/[\/\s]/)[0];
    match = managers.find(m =>
      m.full_name?.toLowerCase().includes(firstWord) ||
      m.email?.toLowerCase().startsWith(firstWord)
    );

    return match?.id || null;
  } catch (error) {
    console.error('Error finding account manager:', error);
    return null;
  }
}
