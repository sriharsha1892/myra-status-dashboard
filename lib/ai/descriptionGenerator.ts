/**
 * AI-Powered Description Generator
 * Generates professional descriptions for trial organizations using GROQ
 */

import { callGroq, isGroqAvailable, type GroqResponse } from './groqClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OrgContext {
  name: string;
  domain?: string;
  website?: string;
  users?: Array<{ name: string; role?: string; email?: string }>;
  activities?: Array<{ type: string; title: string; description?: string }>;
  rawText?: string; // Original pasted text if available
}

export interface DescriptionResult {
  success: boolean;
  description: string | null;
  error?: string;
  usingAI: boolean;
}

// ============================================================================
// DESCRIPTION GENERATION
// ============================================================================

/**
 * Generate a professional organization description using AI
 *
 * @param context - Organization context including name, domain, users, activities
 * @returns Promise with generated description or fallback
 *
 * @example
 * const result = await generateOrgDescription({
 *   name: "Acme Corp",
 *   domain: "E&C",
 *   users: [{ name: "Jane Doe", role: "VP of Sales" }],
 *   activities: [{ type: "demo", title: "Initial product demo completed" }]
 * });
 */
export async function generateOrgDescription(
  context: OrgContext
): Promise<DescriptionResult> {
  // Check if GROQ is available
  if (!isGroqAvailable()) {
    return {
      success: true,
      description: generateFallbackDescription(context),
      usingAI: false,
    };
  }

  try {
    // Build context-aware prompt
    const prompt = buildDescriptionPrompt(context);

    // Call GROQ with specific parameters for description generation
    const response: GroqResponse<string> = await callGroq(prompt, {
      temperature: 0.4, // Balance creativity and consistency
      max_tokens: 500,
      max_retries: 2,
      timeout_ms: 15000, // 15 seconds
    });

    // Handle AI response
    if (response.success && response.data) {
      const cleaned = cleanAIDescription(response.data);
      return {
        success: true,
        description: cleaned,
        usingAI: true,
      };
    }

    // Fallback if AI failed
    return {
      success: true,
      description: generateFallbackDescription(context),
      error: response.error,
      usingAI: false,
    };
  } catch (error: any) {
    console.error('[AI Description] Unexpected error:', error);
    return {
      success: true,
      description: generateFallbackDescription(context),
      error: error.message,
      usingAI: false,
    };
  }
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build a context-aware prompt for description generation
 */
function buildDescriptionPrompt(context: OrgContext): string {
  const parts: string[] = [
    'Generate a professional, concise 2-3 sentence description for this trial organization.',
    'Focus on their business context, industry, and what makes them noteworthy.',
    'Keep it factual and professional. Do NOT include fluff or assumptions.',
    '',
    `Organization Name: ${context.name}`,
  ];

  if (context.domain) {
    parts.push(`Industry/Domain: ${context.domain}`);
  }

  if (context.website) {
    parts.push(`Website: ${context.website}`);
  }

  if (context.users && context.users.length > 0) {
    parts.push('');
    parts.push('Key Contacts:');
    context.users.slice(0, 5).forEach(user => {
      const roleInfo = user.role ? ` (${user.role})` : '';
      parts.push(`- ${user.name}${roleInfo}`);
    });
  }

  if (context.activities && context.activities.length > 0) {
    parts.push('');
    parts.push('Recent Activities:');
    context.activities.slice(0, 5).forEach(activity => {
      parts.push(`- ${activity.title}`);
      if (activity.description) {
        parts.push(`  ${activity.description.substring(0, 100)}`);
      }
    });
  }

  if (context.rawText) {
    parts.push('');
    parts.push('Additional Context:');
    parts.push(context.rawText.substring(0, 500)); // Limit to avoid token limits
  }

  parts.push('');
  parts.push('Generate a professional 2-3 sentence description. Start directly with the description, no preamble.');

  return parts.join('\n');
}

/**
 * Clean and format AI-generated description
 */
function cleanAIDescription(description: string): string {
  let cleaned = description.trim();

  // Remove common AI prefixes
  const prefixes = [
    'Here is a professional description:',
    'Here is the description:',
    'Description:',
    'Professional Description:',
  ];

  for (const prefix of prefixes) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleaned = cleaned.substring(prefix.length).trim();
    }
  }

  // Remove quotes if the entire description is quoted
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  // Ensure proper capitalization
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Limit length (max 500 characters)
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 497) + '...';
  }

  return cleaned;
}

// ============================================================================
// FALLBACK GENERATION
// ============================================================================

/**
 * Generate a basic fallback description without AI
 */
function generateFallbackDescription(context: OrgContext): string {
  const parts: string[] = [];

  // Basic intro
  parts.push(`${context.name} is a trial organization`);

  // Add domain if available
  if (context.domain) {
    parts.push(`in the ${context.domain} industry`);
  }

  // Add key contacts count
  if (context.users && context.users.length > 0) {
    const contactCount = context.users.length;
    const contactWord = contactCount === 1 ? 'contact' : 'contacts';
    parts.push(`with ${contactCount} key ${contactWord}`);

    // Mention primary contact if available
    const primaryUser = context.users.find(u => u.role);
    if (primaryUser && primaryUser.role) {
      parts.push(`including ${primaryUser.role}`);
    }
  }

  // Close sentence
  let description = parts.join(' ') + '.';

  // Add activity summary if available
  if (context.activities && context.activities.length > 0) {
    const activityCount = context.activities.length;
    description += ` Recent activity includes ${activityCount} recorded interaction${activityCount === 1 ? '' : 's'}.`;
  }

  return description;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const DescriptionGenerator = {
  generateOrgDescription,
  isAvailable: isGroqAvailable,
};

export default DescriptionGenerator;
