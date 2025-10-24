/**
 * ID Obfuscation Utility
 * Maps vendor-specific IDs to generic obfuscated IDs for security
 */

// Deterministic mapping based on simple hash
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 4);
}

// Provider ID mapping - obfuscated IDs are deterministic but non-obvious
const PROVIDER_ID_MAP: Record<string, string> = {
  'openai': `srv-${simpleHash('openai')}`,
  'anthropic': `srv-${simpleHash('anthropic')}`,
  'exa': `srv-${simpleHash('exa')}`,
  'aws': `srv-${simpleHash('aws')}`,
  'google': `srv-${simpleHash('google')}`,
  'brave': `srv-${simpleHash('brave')}`,
};

// Reverse mapping for internal use
const REVERSE_PROVIDER_ID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_ID_MAP).map(([real, obfuscated]) => [obfuscated, real])
);

/**
 * Convert real provider ID to obfuscated ID for client exposure
 */
export function obfuscateProviderId(realId: string): string {
  return PROVIDER_ID_MAP[realId] || realId;
}

/**
 * Convert obfuscated ID back to real provider ID for internal use
 */
export function deobfuscateProviderId(obfuscatedId: string): string {
  return REVERSE_PROVIDER_ID_MAP[obfuscatedId] || obfuscatedId;
}

/**
 * Get all provider ID mappings (for debugging/admin only)
 */
export function getProviderIdMappings(): Record<string, string> {
  return { ...PROVIDER_ID_MAP };
}
