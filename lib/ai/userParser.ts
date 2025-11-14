/**
 * User Parser
 * Uses Groq AI to parse unstructured user data and suggest roles
 */

import { callGroqJSON, isGroqAvailable, formatPrompt } from './groqClient';

// User data for parsing
export interface RawUserData {
  rawText: string;
}

// Parsed user result
export interface ParsedUser {
  name: string;
  email: string;
  role: string;
  confidence: number;
}

// Parse result
export interface UserParseResult {
  success: boolean;
  users: ParsedUser[];
  error?: string;
  duplicates?: string[]; // List of duplicate emails
  invalid?: string[]; // List of invalid emails
}

/**
 * Parse unstructured user data using AI
 * Extracts names, emails, and suggests roles
 */
export async function parseUsers(
  rawData: RawUserData
): Promise<UserParseResult> {
  // Check if Groq is available
  if (!isGroqAvailable()) {
    return {
      success: false,
      users: [],
      error: 'Groq AI not configured - please set GROQ_API_KEY',
    };
  }

  // Create parsing prompt
  const prompt = formatPrompt(
    `You are an expert at parsing unstructured user data from various sources (email lists, CSV, raw text, etc.).

Parse the following text and extract user information. The text may contain:
- Email addresses with or without names
- CSV-style data with headers
- Lists from emails or Slack messages
- Mixed formats

INPUT DATA:
${rawData.rawText}

INSTRUCTIONS:
1. Extract all users with their information
2. For each user, determine:
   - name: Full name (if available, otherwise extract from email prefix)
   - email: Valid email address
   - role: Suggested role based on email domain, name, or context
     Possible roles: "Admin", "Manager", "Developer", "User", "Analyst", "Designer"
     Use these heuristics:
     * CEO, CTO, Founder, VP → "Admin"
     * Manager, Lead, Director → "Manager"
     * Engineer, Developer, Dev → "Developer"
     * Analyst, Data → "Analyst"
     * Designer, UX, UI → "Designer"
     * Default → "User"
   - confidence: 0.0-1.0 (how confident you are about this user's data)

3. Validate email formats
4. Detect potential duplicates (same email appears multiple times)
5. Flag invalid entries

OUTPUT FORMAT (JSON only):
{
  "users": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "Developer",
      "confidence": 0.95
    }
  ],
  "duplicates": ["duplicate@example.com"],
  "invalid": ["invalid-email-format"]
}

Return ONLY valid JSON, no markdown, no explanation outside JSON.`,
    { rawText: rawData.rawText }
  );

  // Call Groq
  const result = await callGroqJSON<{
    users: ParsedUser[];
    duplicates?: string[];
    invalid?: string[];
  }>(prompt, {
    temperature: 0.1, // Very low for consistent parsing
    max_tokens: 3000,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      users: [],
      error: result.error || 'Failed to parse user data',
    };
  }

  // Validate and normalize data
  const users = (result.data.users || [])
    .filter(user => user.email && user.name)
    .map(user => ({
      name: user.name.trim(),
      email: user.email.toLowerCase().trim(),
      role: validateRole(user.role),
      confidence: Math.max(0, Math.min(1, user.confidence || 0.7)),
    }));

  // Detect duplicates within the parsed users
  const emailCounts = new Map<string, number>();
  users.forEach(user => {
    emailCounts.set(user.email, (emailCounts.get(user.email) || 0) + 1);
  });
  const duplicates = Array.from(emailCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([email, _]) => email);

  return {
    success: true,
    users,
    duplicates: [...new Set([...(result.data.duplicates || []), ...duplicates])],
    invalid: result.data.invalid || [],
  };
}

/**
 * Batch parse users from multiple raw text inputs
 */
export async function batchParseUsers(
  rawDataList: RawUserData[]
): Promise<Map<number, UserParseResult>> {
  const results = new Map<number, UserParseResult>();

  console.log(`Starting batch user parsing for ${rawDataList.length} inputs...`);

  for (let i = 0; i < rawDataList.length; i++) {
    const rawData = rawDataList[i];
    console.log(`Parsing input ${i + 1}/${rawDataList.length}...`);

    const result = await parseUsers(rawData);
    results.set(i, result);

    // Small delay between requests to avoid rate limits
    if (i < rawDataList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Batch user parsing complete: ${results.size} inputs processed`);

  return results;
}

/**
 * Validate and normalize role
 */
function validateRole(role: any): string {
  const validRoles = ['Admin', 'Manager', 'Developer', 'User', 'Analyst', 'Designer'];

  if (typeof role === 'string') {
    // Case-insensitive match
    const normalized = validRoles.find(
      r => r.toLowerCase() === role.toLowerCase()
    );
    if (normalized) return normalized;
  }

  return 'User'; // Default role
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

/**
 * Get suggested role based on email or name patterns
 */
export function suggestRole(name: string, email: string): string {
  const text = `${name} ${email}`.toLowerCase();

  // Admin patterns
  if (
    text.includes('ceo') ||
    text.includes('cto') ||
    text.includes('founder') ||
    text.includes('vp') ||
    text.includes('president')
  ) {
    return 'Admin';
  }

  // Manager patterns
  if (
    text.includes('manager') ||
    text.includes('lead') ||
    text.includes('director') ||
    text.includes('head')
  ) {
    return 'Manager';
  }

  // Developer patterns
  if (
    text.includes('engineer') ||
    text.includes('developer') ||
    text.includes('dev') ||
    text.includes('programmer')
  ) {
    return 'Developer';
  }

  // Analyst patterns
  if (
    text.includes('analyst') ||
    text.includes('data') ||
    text.includes('research')
  ) {
    return 'Analyst';
  }

  // Designer patterns
  if (
    text.includes('designer') ||
    text.includes('ux') ||
    text.includes('ui') ||
    text.includes('design')
  ) {
    return 'Designer';
  }

  return 'User';
}
