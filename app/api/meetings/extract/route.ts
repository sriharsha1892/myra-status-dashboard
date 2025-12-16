import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { withErrorHandler, createValidationError } from '@/lib/middleware/errorHandler';

// Lazy Groq client initialization
let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqClient;
}

interface ExtractedMeetingData {
  pain_points: string[];
  objections: string[];
  positive_signals: string[];
  action_items: Array<{
    description: string;
    assigned_to: string;
    due_date: string;
  }>;
  next_steps: string[];
  key_stakeholders: string[];
  decision_timeline: string | null;
  budget_discussed: boolean;
  competitors_mentioned: string[];
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { meeting_summary, attendees, meeting_type } = await request.json();

  if (!meeting_summary || !meeting_summary.trim()) {
    throw createValidationError('Meeting summary is required for AI extraction');
  }

  const groq = getGroqClient();

  if (!groq) {
    // Fallback to rule-based extraction
    return NextResponse.json({
      success: true,
      data: extractWithRules(meeting_summary),
      meta: {
        method: 'rule-based',
        warning: 'AI extraction unavailable, using rule-based fallback',
      },
    });
  }

  try {
    const prompt = buildExtractionPrompt(meeting_summary, attendees, meeting_type);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant helping sales teams extract structured insights from meeting notes.
Your task is to analyze meeting summaries and extract key information that helps sales teams track deals and next steps.
Respond ONLY with valid JSON in the exact format requested. Do not include any explanatory text outside the JSON.
Be thorough but concise. Focus on actionable insights.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      return NextResponse.json({
        success: true,
        data: extractWithRules(meeting_summary),
        meta: { method: 'rule-based', warning: 'Empty AI response, using fallback' },
      });
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: true,
        data: extractWithRules(meeting_summary),
        meta: { method: 'rule-based', warning: 'Could not parse AI response' },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedMeetingData;

    return NextResponse.json({
      success: true,
      data: {
        pain_points: parsed.pain_points?.join('\n') || '',
        objections: parsed.objections?.join('\n') || '',
        positive_signals: parsed.positive_signals?.join('\n') || '',
        action_items: (parsed.action_items || []).map((item) => ({
          description: item.description,
          assigned_to: item.assigned_to || '',
          due_date: item.due_date || '',
          status: 'pending',
        })),
        next_steps: parsed.next_steps || [],
        key_stakeholders: parsed.key_stakeholders || [],
        decision_timeline: parsed.decision_timeline,
        budget_discussed: parsed.budget_discussed || false,
        competitors_mentioned: parsed.competitors_mentioned || [],
      },
      meta: { method: 'ai', model: 'llama-3.1-8b-instant' },
    });
  } catch (error) {
    console.error('AI extraction error:', error);
    return NextResponse.json({
      success: true,
      data: extractWithRules(meeting_summary),
      meta: { method: 'rule-based', warning: 'AI error, using fallback' },
    });
  }
});

function buildExtractionPrompt(
  summary: string,
  attendees?: string[],
  meetingType?: string
): string {
  return `Analyze this ${meetingType || 'meeting'} summary and extract structured insights:

Meeting Summary:
${summary}

${attendees?.length ? `Attendees: ${attendees.join(', ')}` : ''}

Extract and return a JSON object with these fields:
{
  "pain_points": ["list of customer pain points or challenges mentioned"],
  "objections": ["list of concerns, objections, or blockers raised"],
  "positive_signals": ["list of buying signals or positive indicators"],
  "action_items": [
    {
      "description": "action to take",
      "assigned_to": "person name or role",
      "due_date": "relative date like 'next week' or 'by Friday'"
    }
  ],
  "next_steps": ["recommended follow-up actions"],
  "key_stakeholders": ["names of decision makers or influencers mentioned"],
  "decision_timeline": "mentioned timeline for decision (or null)",
  "budget_discussed": true/false,
  "competitors_mentioned": ["competitor names if any"]
}

Return ONLY the JSON object, no other text.`;
}

function extractWithRules(text: string): {
  pain_points: string;
  objections: string;
  positive_signals: string;
  action_items: Array<{ description: string; assigned_to: string; due_date: string; status: string }>;
} {
  const lowerText = text.toLowerCase();

  // Extract pain points
  const painPointKeywords = ['challenge', 'problem', 'issue', 'struggle', 'difficult', 'pain point', 'concern'];
  const painPoints: string[] = [];
  for (const keyword of painPointKeywords) {
    if (lowerText.includes(keyword)) {
      const sentences = text.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword) && sentence.trim()) {
          painPoints.push(sentence.trim());
        }
      }
    }
  }

  // Extract objections
  const objectionKeywords = ['but', 'however', 'concern', 'worried', 'hesitant', 'not sure', 'expensive', 'budget'];
  const objections: string[] = [];
  for (const keyword of objectionKeywords) {
    if (lowerText.includes(keyword)) {
      const sentences = text.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword) && sentence.trim() && !painPoints.includes(sentence.trim())) {
          objections.push(sentence.trim());
        }
      }
    }
  }

  // Extract positive signals
  const positiveKeywords = ['interested', 'excited', 'love', 'great', 'perfect', 'exactly what', 'need this', 'ready'];
  const positiveSignals: string[] = [];
  for (const keyword of positiveKeywords) {
    if (lowerText.includes(keyword)) {
      const sentences = text.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword) && sentence.trim()) {
          positiveSignals.push(sentence.trim());
        }
      }
    }
  }

  // Extract action items
  const actionKeywords = ['will send', 'need to', 'follow up', 'schedule', 'prepare', 'share', 'provide'];
  const actionItems: Array<{ description: string; assigned_to: string; due_date: string; status: string }> = [];
  for (const keyword of actionKeywords) {
    if (lowerText.includes(keyword)) {
      const sentences = text.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword) && sentence.trim()) {
          actionItems.push({
            description: sentence.trim(),
            assigned_to: '',
            due_date: '',
            status: 'pending',
          });
        }
      }
    }
  }

  return {
    pain_points: [...new Set(painPoints)].slice(0, 5).join('\n'),
    objections: [...new Set(objections)].slice(0, 5).join('\n'),
    positive_signals: [...new Set(positiveSignals)].slice(0, 5).join('\n'),
    action_items: actionItems.slice(0, 5),
  };
}
