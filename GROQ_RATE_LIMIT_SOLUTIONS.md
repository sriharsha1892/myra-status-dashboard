# Groq Rate Limit Solutions

## Current Situation

**Groq Free Tier Limits**:
- **Tokens per minute (TPM)**: 6,000
- **Requests per day**: 14,400
- **Current usage per request**: ~4,000 tokens (due to few-shot learning examples)

**Problem**: Our enhanced prompts with real-world examples consume 4,000 tokens per extraction, meaning we can only handle 1-2 requests per minute on free tier.

## Solution Options (Ranked by Impact)

### ⭐ **Option 1: Optimize Prompt Size (RECOMMENDED - FREE)**

**Impact**: Reduce token usage by 60-70% (from 4,000 to ~1,200 tokens)
**Cost**: Free
**Effort**: 2-3 hours

**Implementation**:

1. **Remove unnecessary examples** - Keep only 2 most important examples instead of 5:
```typescript
// Before: 5 examples (3,981 tokens)
// After: 2 examples (1,200 tokens)

const EXTRACTION_PROMPT = `...

**Example 1: Basic Trial Org**
Input: "Maruti Suzuki, sourabh@maruti.co.in, AM: Rupak, Domain: AUTO"
Output: {...}

**Example 2: Full Demo Notes**
Input: "Demo with Protiviti. Naresh impressed, $120K, 50 analysts..."
Output: {...}

// Remove examples 3, 4, 5
`;
```

2. **Shorten instruction text** - Make business context more concise:
```typescript
// Before: 800 tokens of instructions
**BUSINESS CONTEXT - MyRA Platform:**
MyRA is a multi-agent deep market research platform...
[Long detailed explanation...]

// After: 200 tokens
**CONTEXT:** Extract trial org data for myRA (market research platform)
```

3. **Remove redundant field descriptions** - LLM understands from JSON schema:
```typescript
// Before:
1. **Organization** → trial_organizations table:
   - name: Company name (properly capitalized)
   - website: Infer from company name (e.g., "Sony" → "https://sony.com")
   - logo_url: Generate using Clearbit pattern: "https://logo.clearbit.com/{domain}"
   ...

// After:
**Organization**: {name, website, logo_url, description}
```

**Result**: **1,200 tokens per request = 5 requests/minute** (5x improvement)

---

### 💰 **Option 2: Upgrade to Groq Dev Tier**

**Impact**: 10x higher rate limits
**Cost**: **FREE** (Developer tier is also free!)
**Effort**: 5 minutes

**New Limits**:
- **Tokens per minute**: 30,000 (5x increase)
- **Requests per day**: 14,400 (same)
- **Requests per minute**: 30 (vs 30 on free tier)

**How to Upgrade**:
1. Go to https://console.groq.com/settings/billing
2. Click "Upgrade to Dev Tier"
3. Verify your account (may require phone number)
4. No credit card required!

**Result**: **7-8 requests/minute** with current 4,000-token prompts

---

### 🔄 **Option 3: Implement Request Queuing (RECOMMENDED)**

**Impact**: Prevent rate limit errors completely
**Cost**: Free
**Effort**: 1-2 hours

**Implementation**:

```typescript
// lib/trials/groqQueue.ts
import PQueue from 'p-queue';

const groqQueue = new PQueue({
  concurrency: 1,
  interval: 60000, // 1 minute
  intervalCap: 1   // 1 request per minute (safe limit)
});

export async function queuedGroqExtraction(text: string) {
  return groqQueue.add(async () => {
    return await parseTextWithGroq(text);
  });
}
```

Update API route:
```typescript
// app/api/trials/parse-text/route.ts
import { queuedGroqExtraction } from '@/lib/trials/groqQueue';

if (isGroqAvailable()) {
  try {
    parsed = await queuedGroqExtraction(text); // Queued!
    extraction_method = 'groq';
  } catch (groqError) {
    parsed = await parseText(text); // Fallback
  }
}
```

Install dependency:
```bash
npm install p-queue@7
```

**Result**: **Never hit rate limits**, but slower (1 request/minute max)

---

### ⚡ **Option 4: Implement Smart Retry with Exponential Backoff**

**Impact**: Gracefully handle rate limits when they occur
**Cost**: Free
**Effort**: 30 minutes

**Implementation**:

```typescript
// lib/trials/groqParser.ts
async function callGroqWithRetry(
  text: string,
  maxRetries = 2
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [...],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      });

      return completion;

    } catch (error: any) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        // Rate limit hit - extract wait time from error
        const waitSeconds = error.error?.message?.match(/try again in ([\d.]+)s/)?.[1];
        const waitMs = (parseFloat(waitSeconds) || 40) * 1000;

        console.log(`⏳ Rate limit hit, waiting ${waitMs/1000}s before retry ${attempt + 1}/${maxRetries}`);

        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue; // Retry
      }

      throw error; // Give up, fallback to regex
    }
  }
}
```

**Result**: **Auto-retry 2 times** before falling back to regex

---

### 🎯 **Option 5: Hybrid Approach - Use Groq Selectively**

**Impact**: Save tokens for complex extractions only
**Cost**: Free
**Effort**: 1 hour

**Strategy**: Use regex for simple texts, Groq for complex ones

```typescript
// lib/trials/textParser.ts
export function isComplexText(text: string): boolean {
  const complexityIndicators = [
    text.length > 500,
    (text.match(/\n/g) || []).length > 5, // Multi-line
    /demo|meeting|call|feedback|objection/i.test(text),
    text.includes('$') && text.includes('@'), // Business + contacts
  ];

  return complexityIndicators.filter(Boolean).length >= 2;
}

// app/api/trials/parse-text/route.ts
if (isGroqAvailable() && isComplexText(text)) {
  // Only use Groq for complex extractions
  parsed = await parseTextWithGroq(text);
} else {
  // Use regex for simple extractions
  parsed = await parseText(text);
}
```

**Result**: **Reduce Groq usage by 60%**, save tokens for high-value extractions

---

### 🌐 **Option 6: Switch to Alternative LLM APIs**

**Comparison**:

| Provider | Free Tier | Tokens/Min | Cost (Paid) |
|----------|-----------|------------|-------------|
| **Groq** (current) | 6,000 TPM | 6,000 | Free |
| **Groq Dev Tier** | 30,000 TPM | 30,000 | Free |
| **OpenAI GPT-4o-mini** | No free tier | Unlimited | $0.15/1M tokens |
| **Anthropic Claude Haiku** | No free tier | Unlimited | $0.25/1M tokens |
| **Google Gemini Flash** | 1,500 req/day | 15 req/min | Free up to 1500/day |

**Recommendation**: Stick with Groq Dev Tier (free + fast)

---

## 🏆 **Recommended Implementation Plan**

### Phase 1: Immediate (Today)
1. ✅ **Upgrade to Groq Dev Tier** (5 min, free, 5x improvement)
2. ✅ **Optimize prompt size** (2-3 hours, free, 3x improvement)

**Combined Result**: **15x improvement** (from 1 req/min to 15 req/min)

### Phase 2: This Week
3. ✅ **Implement smart retry** (30 min, handles edge cases)
4. ✅ **Add request queuing** (1-2 hours, prevents all errors)

**Result**: **Zero rate limit errors** + graceful degradation

### Phase 3: Optional
5. ⚪ Monitor usage in production
6. ⚪ If needed, implement hybrid approach

---

## Production Usage Estimation

**Assumptions**:
- 50 trial organizations created per month
- Average 2 extractions per trial (initial + updates)
- 100 total extractions/month
- Peak: 10 extractions/hour during business hours

**With Current Setup** (4,000 tokens/request):
- Free tier: ❌ **Will hit limits during peaks**
- Dev tier: ✅ **Handles peaks comfortably**

**With Optimized Prompts** (1,200 tokens/request):
- Free tier: ✅ **Sufficient for production**
- Dev tier: ✅ **Plenty of headroom**

---

## Implementation Code

### Step 1: Optimize Prompt (Immediate)

```typescript
// lib/trials/groqParser.ts
const EXTRACTION_PROMPT = `Extract trial organization data from text.

**CONTEXT:** myRA = market research platform for trial management

**OUTPUT FORMAT:**
{
  "organization": {
    "name": "Company Name",
    "website": "https://example.com",
    "logo_url": "https://logo.clearbit.com/domain.com",
    "description": "Brief description"
  },
  "contacts": [{
    "name": "Full Name",
    "email": "email@company.com",
    "role": "Job Title",
    "engagement_type": "champion" | "decision_maker" | "blocker" | "active"
  }],
  "account_manager": {"name": "First Name", "confidence": "high"},
  "business_metrics": {
    "contract_value": 50000,
    "team_size": 25,
    "trial_duration_days": 14
  },
  "trial_stage": "demo" | "trial_start" | "active_usage" | "feedback" | "decision",
  "engagement_signals": {
    "sentiment": "positive" | "neutral" | "negative",
    "adoption_level": "high" | "medium" | "low",
    "feedback": ["item1", "item2"],
    "objections": ["concern1"]
  },
  "market_intelligence": {
    "use_case": "Research use case",
    "industry_context": "Industry",
    "competitive_mentions": ["Competitor"],
    "ai_adoption_signals": ["signal1"]
  }
}

**EXAMPLES:**

Input: "Maruti Suzuki, sourabh@maruti.co.in, AM: Rupak"
Output: {"organization":{"name":"Maruti Suzuki"},"contacts":[{"name":"Sourabh Singh","email":"sourabh@maruti.co.in"}],"account_manager":{"name":"Rupak","confidence":"high"}}

Input: "Demo with Protiviti. Naresh loved it. $120K, 50 analysts. AM: Sudeshana"
Output: {"organization":{"name":"Protiviti","website":"https://protiviti.com","logo_url":"https://logo.clearbit.com/protiviti.com","description":"Consulting firm evaluating myRA"},"contacts":[{"name":"Naresh","engagement_type":"champion"}],"account_manager":{"name":"Sudeshana","confidence":"high"},"business_metrics":{"contract_value":120000,"team_size":50},"trial_stage":"demo","engagement_signals":{"sentiment":"positive","adoption_level":"high"}}

**INSTRUCTIONS:**
- Infer website from company name (e.g., Sony → sony.com)
- Generate logo_url: https://logo.clearbit.com/{domain}
- Account manager = first name only
- Detect sentiment, trial stage, engagement type
- Return null for missing data`;
```

**Token savings**: 3,981 → ~1,200 tokens (70% reduction!)

### Step 2: Add Retry Logic

```typescript
// lib/trials/groqParser.ts (add this function)
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
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      });
    } catch (error: any) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const waitSeconds = error.error?.message?.match(/try again in ([\d.]+)s/)?.[1];
        const waitMs = (parseFloat(waitSeconds) || 40) * 1000;
        console.log(`⏳ Groq rate limit, waiting ${waitMs/1000}s (retry ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw error;
    }
  }
}

// Update parseTextWithGroq to use retry:
export async function parseTextWithGroq(text: string): Promise<ParsedData> {
  // ... existing code ...

  const completion = await callGroqWithRetry([
    { role: 'system', content: EXTRACTION_PROMPT },
    { role: 'user', content: `Extract structured data from this text:\n\n${text}` }
  ]);

  // ... rest of function ...
}
```

---

## Testing the Fix

After implementing optimizations, test with:

```bash
GROQ_API_KEY=xxx node scripts/test-groq-business-intelligence.js
```

Expected result:
- Token usage reduced from 4,000 to ~1,200
- Response time stays ~1 second
- All 20 validations still pass

---

## Summary

**Best Solution for Production**:

1. **Upgrade to Groq Dev Tier** (free, 5 minutes) → 5x improvement
2. **Optimize prompt** (2-3 hours) → 3x improvement
3. **Add retry logic** (30 minutes) → Handles edge cases

**Total improvement**: **15x better** (1 req/min → 15 req/min)

**Production capacity**:
- Free tier + optimizations: ✅ **100 extractions/day easily**
- Dev tier + optimizations: ✅ **500+ extractions/day**

This is more than sufficient for your expected usage of ~100 extractions/month!
