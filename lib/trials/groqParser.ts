/**
 * Groq-Powered Text Intelligence Parser
 * Uses Llama 3.1 for intelligent extraction from unstructured text
 * Falls back to regex parser on failure
 */

import Groq from 'groq-sdk';
import { ParsedData, ParsedEntity } from './textParser';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

interface GroqExtractionResult {
  organization: {
    name: string;
    website?: string;
    logo_url?: string;
    description?: string;
  } | null;
  contacts: Array<{
    name: string;
    email: string;
    role?: string;
    phone?: string;
    is_primary?: boolean;
    engagement_type?: 'champion' | 'decision_maker' | 'blocker' | 'active' | 'silent';
  }>;
  account_manager: {
    name: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  business_metrics: {
    contract_value?: number;
    team_size?: number;
    trial_duration_days?: number;
  };
  activities: Array<{
    type: string;
    title: string;
    description?: string;
    date?: string;
  }>;
  engagement_signals?: {
    adoption_level?: 'high' | 'medium' | 'low' | 'unknown';
    sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
    feedback?: string[];
    objections?: string[];
    usage_indicators?: string[];
  };
  trial_stage?: 'initial_contact' | 'demo' | 'trial_start' | 'onboarding' | 'active_usage' | 'feedback' | 'decision' | 'unknown';
  market_intelligence?: {
    use_case?: string;
    industry_context?: string;
    competitive_mentions?: string[];
    ai_adoption_signals?: string[];
    research_needs?: string[];
  };
}

const EXTRACTION_PROMPT = `Extract trial organization data from unstructured text (emails, meeting notes, call summaries).

**CONTEXT:** myRA = AI market research platform for trial management by Mordor Intelligence
**GOAL:** Extract trial intelligence: contacts, business metrics, engagement signals, sentiment, trial stage

**OUTPUT FORMAT:**
{
  "organization": {
    "name": "Company Name",
    "website": "https://example.com",
    "logo_url": "https://logo.clearbit.com/example.com",
    "description": "Brief third-person description"
  },
  "contacts": [{
    "name": "Full Name",
    "email": "email@example.com",
    "role": "Job Title",
    "phone": "+1-555-0123",
    "is_primary": true,
    "engagement_type": "champion" | "decision_maker" | "blocker" | "active" | "silent"
  }],
  "account_manager": {"name": "First Name Only", "confidence": "high" | "medium" | "low"},
  "business_metrics": {
    "contract_value": 50000,
    "team_size": 25,
    "trial_duration_days": 14
  },
  "activities": [{
    "type": "demo" | "call" | "meeting" | "email" | "training",
    "title": "Brief summary",
    "description": "Details",
    "date": "2025-01-15"
  }],
  "trial_stage": "initial_contact" | "demo" | "trial_start" | "onboarding" | "active_usage" | "feedback" | "decision" | "unknown",
  "engagement_signals": {
    "adoption_level": "high" | "medium" | "low" | "unknown",
    "sentiment": "positive" | "neutral" | "negative" | "mixed",
    "feedback": ["Feature request 1"],
    "objections": ["Security concern"],
    "usage_indicators": ["Using daily"]
  },
  "market_intelligence": {
    "use_case": "Problem they're solving",
    "industry_context": "Industry vertical and context",
    "competitive_mentions": ["Tool1"],
    "ai_adoption_signals": ["AI maturity indicator"],
    "research_needs": ["Market size data"]
  }
}

**EXAMPLES:**

Input: "Maruti Suzuki, sourabh@maruti.co.in, AM: Rupak"
Output: {"organization":{"name":"Maruti Suzuki","website":"https://marutisuzuki.com"},"contacts":[{"name":"Sourabh Singh","email":"sourabh@maruti.co.in","is_primary":true}],"account_manager":{"name":"Rupak","confidence":"high"},"business_metrics":{},"activities":[]}

Input: "Demo with Protiviti. Naresh (naresh@protiviti.com) loved AI features. Team of 50 analysts. Currently use Gartner ($$$). Naresh championing internally. Main concern: data security. AM: Sudeshana"
Output: {"organization":{"name":"Protiviti","website":"https://protiviti.com","logo_url":"https://logo.clearbit.com/protiviti.com","description":"Protiviti is evaluating myRA as a cost-effective alternative to Gartner for their analyst team."},"contacts":[{"name":"Naresh","email":"naresh@protiviti.com","is_primary":true,"engagement_type":"champion"}],"account_manager":{"name":"Sudeshana","confidence":"high"},"business_metrics":{"team_size":50},"activities":[{"type":"demo","title":"AI Research Demo","description":"Showcased AI research features"}],"trial_stage":"demo","engagement_signals":{"adoption_level":"high","sentiment":"positive","feedback":["Impressed with AI capabilities"],"objections":["Data security concerns"]},"market_intelligence":{"use_case":"Research platform for consulting analysts","industry_context":"Consulting - Advisory services","competitive_mentions":["Gartner"],"ai_adoption_signals":["Interested in AI features"]}}

**EXTRACTION RULES:**

**Organization:**
- Infer website: "Maruti Suzuki India Limited" → "https://marutisuzuki.com" (remove "India Limited", "Inc", "Corp", spaces)
- Generate logo_url: https://logo.clearbit.com/{domain}
- Description: 1-2 sentence third-person summary from context

**Contacts:**
- Extract name from email: "sourabh.singh@maruti.co.in" → "Sourabh Singh"
- First contact = is_primary: true
- Engagement types: champion (advocating), decision_maker (budget authority), blocker (resistant), active (engaged), silent (no signals)

**Account Manager:**
- Known AMs: Rupak, Kartheek, Sudeshana, Satish, Nikita, Satyananth, Krati
- Look for: "AM:", "Account Manager:", "managed by", "POC:"
- ONLY extract first name: "Satish Boini" → "Satish"

**Business Metrics:**
- contract_value: "$50K" → 50000, "six-figure" → 100000
- team_size: "team of 30" → 30
- trial_duration_days: "2 weeks" → 14, "1 month" → 30

**Trial Stage:**
- initial_contact: First outreach
- demo: Demo scheduled/completed
- trial_start: Trial beginning
- active_usage: Using platform
- feedback: Evaluation phase
- decision: Go/no-go decision

**Engagement Signals:**
- adoption_level: high (daily use), medium (regular), low (minimal)
- sentiment: positive (excited), neutral, negative (frustrated), mixed
- feedback: What they like/dislike
- objections: Concerns, blockers (security, price, integration)

**Market Intelligence:**
- use_case: Problem solving, workflow
- industry_context: Industry + specific context
- competitive_mentions: Tools they use/compare
- ai_adoption_signals: AI maturity, use cases
- research_needs: Data/insights needed

Return ONLY valid JSON (no markdown, no explanation).`;

/**
 * Call Groq API with retry logic for rate limit handling
 */
async function callGroqWithRetry(
  messages: any[],
  maxRetries = 2
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
    } catch (error: any) {
      // Check if it's a rate limit error (429)
      if (error.status === 429 && attempt < maxRetries - 1) {
        // Extract wait time from error message (e.g., "try again in 39.38s")
        const waitSeconds = error.error?.message?.match(/try again in ([\d.]+)s/)?.[1];
        const waitMs = (parseFloat(waitSeconds) || 40) * 1000;

        console.log(`⏳ Groq rate limit hit, waiting ${waitMs/1000}s before retry ${attempt + 1}/${maxRetries}`);

        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue; // Retry
      }

      // Not a rate limit error, or out of retries
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Extract trial data using Groq LLM
 */
export async function parseTextWithGroq(text: string): Promise<ParsedData> {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const completion = await callGroqWithRetry([
      {
        role: 'system',
        content: EXTRACTION_PROMPT
      },
      {
        role: 'user',
        content: `Extract structured data from this text:\n\n${text}`
      }
    ]);

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from Groq');
    }

    // Parse JSON response
    const extracted: GroqExtractionResult = JSON.parse(responseText);

    // Convert to ParsedData format
    const parsedData: ParsedData = {
      orgs: [],
      users: [],
      activities: [],
      dates: [],
      numbers: [],
      features: [],
      models: [],
      raw_text: text,
      overall_confidence: 95 // Groq is highly confident
    };

    // Organization
    if (extracted.organization) {
      parsedData.orgs.push({
        type: 'org',
        value: extracted.organization.name,
        confidence: 95,
        metadata: {
          website: extracted.organization.website,
          logo_url: extracted.organization.logo_url,
          description: extracted.organization.description,
          source: 'groq_llm'
        }
      });
    }

    // Contacts
    for (const contact of extracted.contacts || []) {
      parsedData.users.push({
        type: 'user',
        value: contact.email || contact.name,
        confidence: 95,
        metadata: {
          name: contact.name,
          email: contact.email,
          role: contact.role,
          phone: contact.phone,
          is_primary: contact.is_primary,
          engagement_type: contact.engagement_type,
          source: 'groq_llm'
        }
      });
    }

    // Account Manager
    if (extracted.account_manager) {
      const confidenceMap = { high: 95, medium: 85, low: 70 };
      parsedData.users.push({
        type: 'user',
        value: extracted.account_manager.name,
        confidence: confidenceMap[extracted.account_manager.confidence] || 85,
        metadata: {
          name: extracted.account_manager.name,
          role: 'Account Manager',
          source: 'groq_llm',
          is_account_manager: true
        }
      });
    }

    // Business Metrics
    const metrics = extracted.business_metrics || {};

    if (metrics.contract_value) {
      parsedData.numbers.push({
        type: 'number',
        value: metrics.contract_value.toString(),
        confidence: 90,
        metadata: {
          amount: metrics.contract_value,
          formatted: `$${metrics.contract_value.toLocaleString()}`,
          source: 'contract_value'
        }
      });
    }

    if (metrics.team_size) {
      parsedData.numbers.push({
        type: 'number',
        value: metrics.team_size.toString(),
        confidence: 90,
        metadata: {
          team_size: metrics.team_size,
          source: 'team_size'
        }
      });
    }

    if (metrics.trial_duration_days) {
      parsedData.numbers.push({
        type: 'number',
        value: metrics.trial_duration_days.toString(),
        confidence: 90,
        metadata: {
          trial_days: metrics.trial_duration_days,
          source: 'trial_duration'
        }
      });
    }

    // Activities
    for (const activity of extracted.activities || []) {
      parsedData.activities.push({
        type: 'activity',
        value: activity.type,
        confidence: 85,
        metadata: {
          title: activity.title,
          description: activity.description,
          date: activity.date,
          source: 'groq_llm'
        }
      });

      // Extract date if provided
      if (activity.date) {
        parsedData.dates.push({
          type: 'date',
          value: activity.date,
          confidence: 85,
          metadata: {
            original: activity.date,
            source: 'groq_llm'
          }
        });
      }
    }

    // Business Intelligence Fields - Store as metadata for frontend/API consumption
    if (extracted.trial_stage) {
      parsedData.metadata = parsedData.metadata || {};
      parsedData.metadata.trial_stage = extracted.trial_stage;
    }

    if (extracted.engagement_signals) {
      parsedData.metadata = parsedData.metadata || {};
      parsedData.metadata.engagement_signals = extracted.engagement_signals;
    }

    if (extracted.market_intelligence) {
      parsedData.metadata = parsedData.metadata || {};
      parsedData.metadata.market_intelligence = extracted.market_intelligence;
    }

    console.log('✅ Groq extraction successful:', {
      orgs: parsedData.orgs.length,
      users: parsedData.users.length,
      activities: parsedData.activities.length,
      numbers: parsedData.numbers.length,
      trial_stage: extracted.trial_stage || 'not specified',
      sentiment: extracted.engagement_signals?.sentiment || 'not specified'
    });

    return parsedData;

  } catch (error) {
    console.error('❌ Groq extraction failed:', error);
    throw error; // Let caller handle fallback to regex
  }
}

/**
 * Check if Groq API is available and configured
 */
export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}
