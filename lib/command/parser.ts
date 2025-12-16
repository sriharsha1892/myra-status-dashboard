/**
 * Command Parser - AI-powered natural language parsing
 * Uses Groq to extract structured data from free-form text
 */

import { z } from 'zod';
import { callGroqJSON } from '../ai/groqClient';
import type { ParsedCommand, CommandAction, ExtractionSpan, ParseDiagnostics, ParsedCommandWithSpans } from './types';

// Zod schema for validating AI response structure
const AIResponseSchema = z.object({
  action: z.string(),
  confidence: z.number().min(0).max(1).or(z.number().min(0).max(100)), // Accept 0-1 or 0-100
  org_name: z.string().nullable().optional(),
  user_name: z.string().nullable().optional(),
  fields: z.record(z.any()).optional().default({}),
  reasoning: z.string().optional(),
  extracted_spans: z.array(z.object({
    text: z.string(),
    type: z.string(),
    start: z.number(),
    end: z.number(),
  })).optional(),
  diagnostics: z.object({
    hasOrgIndicator: z.boolean().optional(),
    hasActionVerb: z.boolean().optional(),
    hasUserIndicator: z.boolean().optional(),
    hasDateIndicator: z.boolean().optional(),
    ambiguousElements: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional(),
  }).optional(),
});

// Validate and sanitize AI response
// Note: Using manual validation due to Zod 4 compatibility issues
function validateAIResponse(data: unknown): z.infer<typeof AIResponseSchema> | null {
  try {
    // Defensive check - ensure data is an object
    if (!data || typeof data !== 'object') {
      console.warn('AI response validation failed: data is not an object', data);
      return null;
    }

    const obj = data as Record<string, unknown>;

    // Manual validation of required fields
    if (typeof obj.action !== 'string') {
      console.warn('AI response validation failed: action is not a string');
      return null;
    }

    if (typeof obj.confidence !== 'number') {
      console.warn('AI response validation failed: confidence is not a number');
      return null;
    }

    // Normalize confidence to 0-1 range
    const confidence = obj.confidence > 1 ? obj.confidence / 100 : obj.confidence;

    // Return validated object with defaults
    return {
      action: obj.action,
      confidence: Math.max(0, Math.min(1, confidence)),
      org_name: typeof obj.org_name === 'string' ? obj.org_name : null,
      user_name: typeof obj.user_name === 'string' ? obj.user_name : null,
      fields: (obj.fields && typeof obj.fields === 'object') ? obj.fields as Record<string, unknown> : {},
      reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : undefined,
      extracted_spans: Array.isArray(obj.extracted_spans) ? obj.extracted_spans : undefined,
      diagnostics: (obj.diagnostics && typeof obj.diagnostics === 'object') ? obj.diagnostics as any : undefined,
    };
  } catch (error) {
    console.warn('AI response validation failed:', error);
    return null;
  }
}

// Extended parse result with spans and diagnostics
export interface ExtendedParseResult {
  success: boolean;
  parsed?: ParsedCommandWithSpans;
  diagnostics?: ParseDiagnostics;
  error?: string;
}

// System prompt for command parsing
const SYSTEM_PROMPT = `You are parsing natural language commands for a B2B trial management system.
Users input brief notes about customer interactions, and you extract structured data.

AVAILABLE ACTIONS:

=== EXISTING ACTIONS ===
1. LOG_ACTIVITY - Record user activity (queries run, logins, feature usage)
   Trigger phrases: "ran a query", "logged in", "used", "3 queries"

2. LOG_MEETING - Log a meeting with notes and summary (for demos, calls, meetings)
   Trigger phrases: "meeting with", "demo with", "call with", "had a meeting", "45 min call", "demo went great"
   Extract: meeting_type (demo/follow_up_call/check_in/technical_review/executive_briefing/other), meeting_duration (in minutes), meeting_summary
   IMPORTANT: Use this for meetings, demos, and calls - NOT LOG_ACTIVITY

3. ADD_DEAL_NOTE - Add a deal-specific note for tracking deal progress
   Trigger phrases: "deal note", "deal update", "deal:", "budget approved", "contract signed", "waiting on legal"
   Extract: deal_note (the note content)
   Use this for tracking deal-specific updates and progress notes

4. CREATE_FOLLOWUP - Create a follow-up task/reminder
   Trigger phrases: "follow up with", "remind me to", "task:", "follow-up", "reminder", "schedule followup"
   Extract: followup_title (task description), followup_due_date, followup_priority (low/medium/high/urgent)
   Use this for creating future tasks and reminders

5. UPDATE_DEAL - Update deal status and/or value (won/lost/negotiating + dollar amount)
   Trigger phrases: "won", "lost", "deal won", "deal lost", "closed deal", "contract value", "$", "pricing"
   Extract: deal_status (won/lost/negotiating/pending/on_hold), deal_value (in dollars)
   IMPORTANT: "won with contract value of $X" means deal_status="won" AND deal_value=X

6. UPDATE_STAGE - Change organization lifecycle stage
   Trigger phrases: "trial ended", "trial expired", "became customer", "customer", "lost", "extended", "started trial"

7. ADD_NOTE - Add general activity note (not deal-specific)
   Trigger phrases: "note:", "discussed", "mentioned", "feedback", "issue"

=== CREATE ACTIONS ===
5. CREATE_ORG - Create a new trial organization
   Trigger phrases: "new trial", "add org", "new organization", "onboard", "starting trial with", "create org", "add company"
   Extract: org_name (REQUIRED), website, team_size, contract_value, contacts (name/email/role), description

6. CREATE_USER - Add a new contact/user to an organization
   Trigger phrases: "add user", "new contact", "add contact", "invite user", "new user", "add person"
   Extract: email (REQUIRED), user_name, role, phone, designation

7. CREATE_TICKET - Create a support ticket
   Trigger phrases: "bug", "issue", "problem with", "not working", "ticket for", "create ticket", "report bug"
   Extract: ticket_title (REQUIRED), ticket_description, ticket_priority (low/medium/high/critical), ticket_category

8. CREATE_FEATURE_REQUEST - Create a feature request
   Trigger phrases: "feature request", "would like", "need feature", "requesting feature", "want feature"
   Extract: feature_title (REQUIRED), feature_description, feature_use_case, feature_priority

9. CREATE_ROADMAP_ITEM - Create a roadmap item
   Trigger phrases: "roadmap item", "add to roadmap", "plan feature", "roadmap:", "planned feature"
   Extract: roadmap_title (REQUIRED), roadmap_description, roadmap_status, roadmap_priority, target_date

10. CREATE_TIMELINE_EVENT - Create a timeline event directly
    Trigger phrases: "timeline:", "event:", "log event", "meeting with", "call with", "demo for", "email from"
    Extract: event_type (REQUIRED), event_title (REQUIRED), event_category, event_sentiment, date, details

=== UPDATE ACTIONS ===
11. UPDATE_ORG - Update organization details
    Trigger phrases: "update org", "change company", "update company", "set team size", "update contract"
    Extract: website, team_size, contract_value, description, domain_category

12. UPDATE_USER - Update user/contact details
    Trigger phrases: "update user", "update contact", "change role", "update email"
    Extract: user_name, role, phone, designation

13. ASSIGN_ACCOUNT_MANAGER - Assign an AM to an organization
    Trigger phrases: "assign AM", "assign account manager", "AM is", "account manager:", "assign to"
    Extract: account_manager_name (REQUIRED)

=== QUICK ACTIONS ===
14. QUICK_STATUS_UPDATE - Quick one-liner status update with sentiment
    Trigger phrases: "status:", "update:", "quick update", "looking good", "has concerns", "going well"
    Extract: status_text (REQUIRED), sentiment (positive/neutral/negative - auto-detected if not provided)
    Examples: "Acme looking good", "DataFlow has concerns about timeline", "TechCorp demo went well"

=== DELETE ACTIONS ===
15. DELETE_ORG - Delete/remove a trial organization (DESTRUCTIVE)
    Trigger phrases: "delete org", "remove org", "delete trial", "remove trial", "remove from trial list", "delete organization", "remove organization", "remove company", "delete company"
    Extract: org_name (REQUIRED), confirm_name (should match org_name for safety)
    Note: This is a destructive action. User must be explicit about deletion.

16. DELETE_USER - Delete a user/contact from an organization
    Trigger phrases: "delete user", "remove user", "remove contact", "delete contact"
    Extract: user_name (REQUIRED for identification), org_name (optional context)

17. DELETE_TICKET - Delete a support ticket
    Trigger phrases: "delete ticket", "remove ticket", "close and delete ticket"
    Extract: ticket_id (REQUIRED)

18. DELETE_FEATURE_REQUEST - Delete a feature request
    Trigger phrases: "delete feature request", "remove feature request", "cancel feature request"
    Extract: feature_request_id (REQUIRED)

19. DELETE_ROADMAP_ITEM - Delete a roadmap item
    Trigger phrases: "delete roadmap item", "remove from roadmap", "cancel roadmap item"
    Extract: roadmap_item_id (REQUIRED)

20. DELETE_NOTE - Delete an activity note
    Trigger phrases: "delete note", "remove note"
    Extract: note_id (REQUIRED)

21. DELETE_FOLLOWUP - Delete a follow-up reminder
    Trigger phrases: "delete followup", "remove followup", "cancel followup"
    Extract: followup_id (REQUIRED)

=== PROSPECT LIFECYCLE ACTIONS (pre-trial outreach) ===
22. CREATE_PROSPECT_ORG - Add new prospect organization (pre-trial cold outreach)
    Trigger phrases: "add prospect", "new prospect", "cold lead", "create prospect", "prospect org"
    Extract: org_name (REQUIRED), prospect_source (cold_outreach/inbound/referral/event/linkedin/other), icp_fit_score

23. ADD_PROSPECT_CONTACT - Add contact to prospect organization
    Trigger phrases: "add contact to", "new contact at", "contact for prospect"
    Extract: contact_name (REQUIRED), contact_email, contact_title, contact_phone, linkedin_url, is_primary_contact

24. LOG_OUTREACH - Log outreach activity to prospect
    Trigger phrases: "sent email to", "emailed", "called", "reached out", "linkedin message", "DM'd"
    Extract: outreach_type (email_sent/call/linkedin/meeting), outreach_direction (outbound/inbound), outreach_subject, outreach_content

25. LOG_RESPONSE - Log response from prospect
    Trigger phrases: "replied", "responded", "got back", "heard back", "response from"
    Extract: response_status (no_response/positive/negative/neutral/pending), outreach_content

26. LOG_SCREENING - Log screening/qualification result
    Trigger phrases: "screened", "qualified", "ICP fit", "fits ICP", "screening done"
    Extract: icp_fit_score (0-100), details

27. UPDATE_PROSPECT_STAGE - Move prospect through pipeline
    Trigger phrases: "move to contacted", "move to responded", "schedule demo", "demo scheduled", "demo done"
    Extract: prospect_stage (cold_lead/contacted/responded/screening/demo_scheduled/demo_done/disqualified)

28. DISQUALIFY_PROSPECT - Mark prospect as not a fit
    Trigger phrases: "disqualify", "not a fit", "doesn't fit", "unqualify", "bad fit"
    Extract: disqualify_reason

29. CONVERT_TO_TRIAL - Convert prospect to active trial
    Trigger phrases: "start trial", "convert to trial", "begin trial", "trial started"
    Extract: trial_status

=== DEAL OUTCOME ACTIONS (post-trial) ===
30. UPDATE_DEAL_STAGE - Move through deal pipeline stages
    Trigger phrases: "move to evaluation", "trial expired", "move to negotiation", "in negotiation"
    Extract: deal_pipeline_stage (evaluation/trial_expired/negotiation/closed)

31. CLOSE_DEAL_WON - Close deal as won
    Trigger phrases: "deal won", "closed won", "signed", "converted", "became customer"
    Extract: deal_value, details

32. CLOSE_DEAL_LOST - Close deal as lost
    Trigger phrases: "deal lost", "closed lost", "went elsewhere", "competitor won", "didn't convert"
    Extract: deal_outcome_reason

33. DEFER_DEAL - Defer deal to future date
    Trigger phrases: "defer", "push back", "revisit later", "not now", "maybe Q2", "follow up later"
    Extract: deferred_until (date), deal_outcome_reason

PROSPECT STAGES:
- cold_lead: new prospect, not yet contacted
- contacted: initial outreach sent
- responded: prospect replied
- screening: qualification in progress
- demo_scheduled: demo meeting booked
- demo_done: demo completed
- disqualified: not a fit

PROSPECT SOURCES:
- cold_outreach: cold email/call
- inbound: came to us
- referral: referred by someone
- event: met at event
- linkedin: LinkedIn connection
- other: other source

DEAL PIPELINE STAGES:
- evaluation: trial in progress, evaluating
- trial_expired: trial ended, decision pending
- negotiation: discussing contract/pricing
- closed: final decision made

PARSING RULES:
- Extract company/organization names (look for "at [Company]", "for [Company]", "[Company] trial")
- Extract person names (first names or full names, usually before "at" or as subject)
- Parse monetary values: "$50K" = 50000, "$1.2M" = 1200000, "50k" = 50000
- Parse dates: "yesterday" = 1 day ago, "last week" = 7 days ago, "today" = today
- Infer activity types from verbs
- Default to current date if no date specified

CONFIDENCE SCORING GUIDELINES:
Use these confidence levels based on input clarity:
- 0.93-1.00: Clear action + unambiguous org + explicit details (use for "John at Acme ran 5 queries")
- 0.85-0.92: Clear action + likely org (common name) + some details (use for "call with Acme about pricing")
- 0.70-0.84: Ambiguous action OR unclear org OR missing key context
- Below 0.70: Multiple interpretations possible OR key info missing

IMPORTANT: Trust clear inputs. If all indicators are present and unambiguous, confidence should be >= 0.90.
Don't be overly conservative - users prefer fewer confirmation dialogs for obvious commands.

ACTIVITY TYPES:
- query: ran query, executed query, searched, looked up
- login: logged in, signed in, accessed
- demo: demo, demonstration, showed, presented
- call: called, call with, spoke with, phone
- email: emailed, sent email, email to
- meeting: meeting, met with, discussed in person
- feature_usage: used feature, tried, tested
- feedback: feedback, review, opinion
- support_request: support, help, issue, problem
- check_in: check-in, checked in, quick sync, touched base
- follow_up: follow-up, followed up, following up
- training: training, trained, training session
- onboarding: onboarding, onboarded, getting started
- presentation: presentation, presented, pitched
- poc: poc, proof of concept, pilot
- negotiation: negotiation, negotiating, contract discussion

DEAL STATUSES:
- prospect: initial interest, lead
- negotiating: pricing sent, in discussions, proposal
- won: converted, signed, deal closed
- lost: churned, declined, rejected, not converting
- deferred: maybe later, postponed, follow up later

LIFECYCLE STAGES:
- prospect: new lead, initial contact
- demo_scheduled: demo booked, meeting set
- trial_active: trial started, in trial, active trial
- converted: won, signed up, paid
- churned: lost, cancelled, ended

OUTPUT FORMAT (JSON only, no markdown):
{
  "action": "LOG_ACTIVITY" | "LOG_MEETING" | "ADD_DEAL_NOTE" | "CREATE_FOLLOWUP" | "UPDATE_DEAL" | "UPDATE_STAGE" | "ADD_NOTE" | "CREATE_ORG" | "CREATE_USER" | "CREATE_TICKET" | "CREATE_FEATURE_REQUEST" | "CREATE_ROADMAP_ITEM" | "CREATE_TIMELINE_EVENT" | "UPDATE_ORG" | "UPDATE_USER" | "ASSIGN_ACCOUNT_MANAGER" | "DELETE_ORG" | "DELETE_USER" | "DELETE_TICKET" | "DELETE_FEATURE_REQUEST" | "DELETE_ROADMAP_ITEM" | "DELETE_NOTE" | "DELETE_FOLLOWUP" | "CREATE_PROSPECT_ORG" | "ADD_PROSPECT_CONTACT" | "LOG_OUTREACH" | "LOG_RESPONSE" | "LOG_SCREENING" | "UPDATE_PROSPECT_STAGE" | "DISQUALIFY_PROSPECT" | "CONVERT_TO_TRIAL" | "UPDATE_DEAL_STAGE" | "CLOSE_DEAL_WON" | "CLOSE_DEAL_LOST" | "DEFER_DEAL",
  "confidence": 0.0-1.0,
  "org_name": "extracted organization name or null",
  "user_name": "extracted person name or null",
  "fields": {
    // Existing fields
    "activity_type": "query|login|demo|call|email|meeting|feature_usage|feedback|support_request" or null,
    "deal_value": number or null,
    "deal_status": "prospect|negotiating|won|lost|deferred" or null,
    "lifecycle_stage": "prospect|trial_pending|trial_active|trial_expired|customer|lost" or null,
    "trial_status": "requested|approved|in_progress|active|extended|completed|closed" or null,
    "note_category": "first_login|question|issue|success|data_quality|feature_request|other" or null,
    "note_text": "text" or null,
    "date": "ISO date string or relative like 'yesterday'" or null,
    "details": "any additional context" or null,

    // LOG_MEETING fields
    "meeting_type": "demo|follow_up_call|check_in|technical_review|executive_briefing|other" or null,
    "meeting_duration": number (in minutes) or null,
    "meeting_summary": "meeting notes and summary" or null,

    // ADD_DEAL_NOTE fields
    "deal_note": "deal-specific note content" or null,

    // CREATE_FOLLOWUP fields
    "followup_title": "task/reminder description" or null,
    "followup_due_date": "ISO date or relative date" or null,
    "followup_priority": "low|medium|high|urgent" or null,

    // CREATE_ORG fields
    "website": "company website URL" or null,
    "domain_category": "AAD|AF&B|E&C|HC|NEO|TMT" or null,
    "team_size": number or null,
    "contract_value": number (in dollars) or null,
    "contacts": [{"name": "...", "email": "...", "role": "..."}] or null,
    "description": "org description" or null,

    // CREATE_USER fields
    "email": "user@email.com" or null,
    "role": "job title" or null,
    "phone": "phone number" or null,
    "designation": "title" or null,

    // CREATE_TICKET fields
    "ticket_title": "ticket subject" or null,
    "ticket_description": "details" or null,
    "ticket_priority": "low|medium|high|critical" or null,
    "ticket_category": "bug|feature_request|question|integration|performance|security|documentation|other" or null,

    // CREATE_FEATURE_REQUEST fields
    "feature_title": "feature name" or null,
    "feature_description": "details" or null,
    "feature_use_case": "use case" or null,
    "feature_priority": "low|medium|high|critical" or null,

    // CREATE_ROADMAP_ITEM fields
    "roadmap_title": "item title" or null,
    "roadmap_description": "details" or null,
    "roadmap_status": "planned|in_progress|completed|blocked" or null,
    "roadmap_priority": "low|medium|high" or null,
    "target_date": "ISO date" or null,

    // CREATE_TIMELINE_EVENT fields
    "event_type": "query_executed|user_logged_in|demo_conducted|call_completed|email_sent|meeting_held|feature_used|feedback_received|support_ticket_created|trial_started|trial_extended|trial_ended|stage_changed|note_added|other" or null,
    "event_category": "engagement|support|lifecycle|activity|system" or null,
    "event_title": "event title" or null,
    "event_sentiment": "positive|neutral|negative" or null,

    // ASSIGN_ACCOUNT_MANAGER fields
    "account_manager_name": "AM name" or null,

    // DELETE action fields
    "confirm_name": "org name for confirmation on destructive deletes" or null,
    "ticket_id": "ticket ID to delete" or null,
    "feature_request_id": "feature request ID to delete" or null,
    "roadmap_item_id": "roadmap item ID to delete" or null,
    "note_id": "note ID to delete" or null,
    "followup_id": "followup ID to delete" or null,

    // PROSPECT LIFECYCLE fields
    "prospect_stage": "cold_lead|contacted|responded|screening|demo_scheduled|demo_done|disqualified" or null,
    "prospect_source": "cold_outreach|inbound|referral|event|linkedin|other" or null,
    "icp_fit_score": number (0-100) or null,
    "contact_name": "contact full name" or null,
    "contact_title": "contact job title" or null,
    "contact_email": "contact@email.com" or null,
    "contact_phone": "phone number" or null,
    "linkedin_url": "linkedin profile URL" or null,
    "is_primary_contact": boolean or null,

    // OUTREACH fields
    "outreach_type": "email_sent|email_received|call|linkedin|meeting|note|screening|demo" or null,
    "outreach_direction": "outbound|inbound" or null,
    "outreach_subject": "email subject" or null,
    "outreach_content": "email/call content or notes" or null,
    "response_status": "no_response|positive|negative|neutral|pending" or null,

    // DEAL PIPELINE fields
    "deal_pipeline_stage": "evaluation|trial_expired|negotiation|closed" or null,
    "deal_outcome": "won|lost|deferred" or null,
    "deal_outcome_reason": "reason for outcome" or null,
    "deferred_until": "ISO date for follow-up" or null,
    "disqualify_reason": "reason for disqualification" or null
  },
  "reasoning": "brief explanation of parsing decision",
  "extracted_spans": [
    {
      "text": "the exact text extracted",
      "type": "org" | "user" | "action" | "value" | "date" | "status" | "email" | "phone" | "website" | "title" | "description" | "priority" | "category" | "team_size" | "contract_value" | "account_manager" | "prospect_stage" | "prospect_source" | "outreach_type" | "response_status" | "icp_score" | "deal_stage" | "deal_outcome" | "deferred_date" | "reason" | "linkedin",
      "start": start_index_in_original,
      "end": end_index_in_original
    }
  ],
  "diagnostics": {
    "hasOrgIndicator": true/false,
    "hasActionVerb": true/false,
    "hasUserIndicator": true/false,
    "hasDateIndicator": true/false,
    "ambiguousElements": ["list of unclear parts"],
    "suggestions": ["suggestions if parse is uncertain"]
  }
}

FEW-SHOT EXAMPLES:

Example 1: "John at Acme ran 5 queries yesterday"
{
  "action": "LOG_ACTIVITY",
  "confidence": 0.95,
  "org_name": "Acme",
  "user_name": "John",
  "fields": {
    "activity_type": "query",
    "date": "yesterday",
    "details": "ran 5 queries"
  },
  "reasoning": "Clear activity log - user ran queries at organization",
  "extracted_spans": [
    {"text": "John", "type": "user", "start": 0, "end": 4},
    {"text": "Acme", "type": "org", "start": 8, "end": 12},
    {"text": "5 queries", "type": "value", "start": 17, "end": 26},
    {"text": "yesterday", "type": "date", "start": 27, "end": 36}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": true, "hasDateIndicator": true, "ambiguousElements": [], "suggestions": []}
}

Example 2: "New trial with TechCorp - $50K potential, contact: sarah@techcorp.com (VP Sales)"
{
  "action": "CREATE_ORG",
  "confidence": 0.92,
  "org_name": "TechCorp",
  "user_name": null,
  "fields": {
    "contract_value": 50000,
    "contacts": [{"name": "Sarah", "email": "sarah@techcorp.com", "role": "VP Sales"}],
    "website": "techcorp.com"
  },
  "reasoning": "Creating new organization with contact info and deal value",
  "extracted_spans": [
    {"text": "TechCorp", "type": "org", "start": 15, "end": 23},
    {"text": "$50K", "type": "value", "start": 26, "end": 30},
    {"text": "sarah@techcorp.com", "type": "email", "start": 52, "end": 70},
    {"text": "VP Sales", "type": "title", "start": 72, "end": 80}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 3: "GlobalTech trial expired, they decided not to convert"
{
  "action": "UPDATE_STAGE",
  "confidence": 0.90,
  "org_name": "GlobalTech",
  "user_name": null,
  "fields": {
    "lifecycle_stage": "lost",
    "details": "decided not to convert"
  },
  "reasoning": "Trial ended without conversion - stage change to lost",
  "extracted_spans": [
    {"text": "GlobalTech", "type": "org", "start": 0, "end": 10},
    {"text": "trial expired", "type": "status", "start": 11, "end": 24},
    {"text": "not to convert", "type": "action", "start": 42, "end": 56}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 4: "Bug: Export function not working for DataFlow Inc - high priority"
{
  "action": "CREATE_TICKET",
  "confidence": 0.93,
  "org_name": "DataFlow Inc",
  "user_name": null,
  "fields": {
    "ticket_title": "Export function not working",
    "ticket_category": "bug",
    "ticket_priority": "high",
    "ticket_description": "Export function not working for DataFlow Inc"
  },
  "reasoning": "Bug report with high priority flag",
  "extracted_spans": [
    {"text": "Bug", "type": "category", "start": 0, "end": 3},
    {"text": "Export function not working", "type": "title", "start": 5, "end": 32},
    {"text": "DataFlow Inc", "type": "org", "start": 37, "end": 49},
    {"text": "high priority", "type": "priority", "start": 52, "end": 65}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 5: "Assign AM: Mike to handle Acme and TechStart accounts"
{
  "action": "ASSIGN_ACCOUNT_MANAGER",
  "confidence": 0.88,
  "org_name": "Acme",
  "user_name": null,
  "fields": {
    "account_manager_name": "Mike",
    "details": "Also assign to TechStart"
  },
  "reasoning": "Assigning account manager to organization(s)",
  "extracted_spans": [
    {"text": "Mike", "type": "account_manager", "start": 11, "end": 15},
    {"text": "Acme", "type": "org", "start": 26, "end": 30},
    {"text": "TechStart", "type": "org", "start": 35, "end": 44}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": ["multiple orgs - may need separate commands"], "suggestions": ["Consider separate commands for each org"]}
}

Example 6: "Demo for CloudSoft went great, they want to start trial next week"
{
  "action": "LOG_ACTIVITY",
  "confidence": 0.91,
  "org_name": "CloudSoft",
  "user_name": null,
  "fields": {
    "activity_type": "demo",
    "details": "Demo went great, want to start trial next week",
    "note_category": "success"
  },
  "reasoning": "Demo activity with positive outcome noted",
  "extracted_spans": [
    {"text": "Demo", "type": "action", "start": 0, "end": 4},
    {"text": "CloudSoft", "type": "org", "start": 9, "end": 18},
    {"text": "next week", "type": "date", "start": 54, "end": 63}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": true, "ambiguousElements": [], "suggestions": []}
}

Example 6b: "Update Cereal Docks as won with contract value of 76000"
{
  "action": "UPDATE_DEAL",
  "confidence": 0.95,
  "org_name": "Cereal Docks",
  "user_name": null,
  "fields": {
    "deal_status": "won",
    "deal_value": 76000,
    "details": "Deal closed with contract value of $76,000"
  },
  "reasoning": "Deal status update to won with specific contract value - both deal_status and deal_value extracted",
  "extracted_spans": [
    {"text": "Cereal Docks", "type": "org", "start": 7, "end": 19},
    {"text": "won", "type": "status", "start": 23, "end": 26},
    {"text": "76000", "type": "value", "start": 50, "end": 55}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 6c: "Acme deal won $50K"
{
  "action": "UPDATE_DEAL",
  "confidence": 0.94,
  "org_name": "Acme",
  "user_name": null,
  "fields": {
    "deal_status": "won",
    "deal_value": 50000
  },
  "reasoning": "Concise deal win with value - extract both status and value",
  "extracted_spans": [
    {"text": "Acme", "type": "org", "start": 0, "end": 4},
    {"text": "won", "type": "status", "start": 10, "end": 13},
    {"text": "$50K", "type": "value", "start": 14, "end": 18}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 7: "call with Acme about pricing"
{
  "action": "LOG_ACTIVITY",
  "confidence": 0.93,
  "org_name": "Acme",
  "user_name": null,
  "fields": {
    "activity_type": "call",
    "details": "discussed pricing"
  },
  "reasoning": "Quick call log with topic - clear action and org",
  "extracted_spans": [
    {"text": "call", "type": "action", "start": 0, "end": 4},
    {"text": "Acme", "type": "org", "start": 10, "end": 14},
    {"text": "pricing", "type": "description", "start": 21, "end": 28}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 8: "Sarah logged in at TechCorp"
{
  "action": "LOG_ACTIVITY",
  "confidence": 0.96,
  "org_name": "TechCorp",
  "user_name": "Sarah",
  "fields": {
    "activity_type": "login"
  },
  "reasoning": "Simple login activity - user and org clearly identified",
  "extracted_spans": [
    {"text": "Sarah", "type": "user", "start": 0, "end": 5},
    {"text": "logged in", "type": "action", "start": 6, "end": 15},
    {"text": "TechCorp", "type": "org", "start": 19, "end": 27}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": true, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 9: "Acme 3 queries"
{
  "action": "LOG_ACTIVITY",
  "confidence": 0.90,
  "org_name": "Acme",
  "user_name": null,
  "fields": {
    "activity_type": "query",
    "details": "ran 3 queries"
  },
  "reasoning": "Brief query log - org and count provided, inferring LOG_ACTIVITY",
  "extracted_spans": [
    {"text": "Acme", "type": "org", "start": 0, "end": 4},
    {"text": "3 queries", "type": "value", "start": 5, "end": 14}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 10: "Delete GlobalSoft from trial orgs"
{
  "action": "DELETE_ORG",
  "confidence": 0.92,
  "org_name": "GlobalSoft",
  "user_name": null,
  "fields": {
    "confirm_name": "GlobalSoft",
    "details": "User requested deletion from trial orgs list"
  },
  "reasoning": "Explicit delete request for organization - destructive action",
  "extracted_spans": [
    {"text": "Delete", "type": "action", "start": 0, "end": 6},
    {"text": "GlobalSoft", "type": "org", "start": 7, "end": 17}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 11: "Remove TechCorp from the list, they're not interested"
{
  "action": "DELETE_ORG",
  "confidence": 0.90,
  "org_name": "TechCorp",
  "user_name": null,
  "fields": {
    "confirm_name": "TechCorp",
    "details": "not interested"
  },
  "reasoning": "Remove from list indicates deletion, not stage update",
  "extracted_spans": [
    {"text": "Remove", "type": "action", "start": 0, "end": 6},
    {"text": "TechCorp", "type": "org", "start": 7, "end": 15}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 12: "Demo with Acme went great, discussed pricing and roadmap"
{
  "action": "LOG_MEETING",
  "confidence": 0.94,
  "org_name": "Acme",
  "user_name": null,
  "fields": {
    "meeting_type": "demo",
    "meeting_summary": "discussed pricing and roadmap"
  },
  "reasoning": "Demo meeting with positive outcome - LOG_MEETING for meeting/demo activities",
  "extracted_spans": [
    {"text": "Demo", "type": "action", "start": 0, "end": 4},
    {"text": "Acme", "type": "org", "start": 10, "end": 14}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 13: "45 min call with TechCorp about implementation timeline"
{
  "action": "LOG_MEETING",
  "confidence": 0.93,
  "org_name": "TechCorp",
  "user_name": null,
  "fields": {
    "meeting_type": "follow_up_call",
    "meeting_duration": 45,
    "meeting_summary": "discussed implementation timeline"
  },
  "reasoning": "Phone call with duration - use LOG_MEETING for calls",
  "extracted_spans": [
    {"text": "45 min", "type": "value", "start": 0, "end": 6},
    {"text": "call", "type": "action", "start": 7, "end": 11},
    {"text": "TechCorp", "type": "org", "start": 17, "end": 25}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 14: "Deal note for Acme: Budget approved by CFO"
{
  "action": "ADD_DEAL_NOTE",
  "confidence": 0.95,
  "org_name": "Acme",
  "user_name": null,
  "fields": {
    "deal_note": "Budget approved by CFO"
  },
  "reasoning": "Explicit deal note for tracking deal progress",
  "extracted_spans": [
    {"text": "Deal note", "type": "action", "start": 0, "end": 9},
    {"text": "Acme", "type": "org", "start": 14, "end": 18}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": false, "ambiguousElements": [], "suggestions": []}
}

Example 15: "Follow up with CloudSoft tomorrow about the proposal"
{
  "action": "CREATE_FOLLOWUP",
  "confidence": 0.92,
  "org_name": "CloudSoft",
  "user_name": null,
  "fields": {
    "followup_title": "Follow up about the proposal",
    "followup_due_date": "tomorrow",
    "followup_priority": "medium"
  },
  "reasoning": "Creating a follow-up task with due date",
  "extracted_spans": [
    {"text": "Follow up", "type": "action", "start": 0, "end": 9},
    {"text": "CloudSoft", "type": "org", "start": 15, "end": 24},
    {"text": "tomorrow", "type": "date", "start": 25, "end": 33}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": true, "ambiguousElements": [], "suggestions": []}
}

Example 16: "Remind me to send contract to DataFlow next week - urgent"
{
  "action": "CREATE_FOLLOWUP",
  "confidence": 0.93,
  "org_name": "DataFlow",
  "user_name": null,
  "fields": {
    "followup_title": "Send contract",
    "followup_due_date": "next week",
    "followup_priority": "urgent"
  },
  "reasoning": "Reminder/task creation with priority flag",
  "extracted_spans": [
    {"text": "Remind me", "type": "action", "start": 0, "end": 9},
    {"text": "DataFlow", "type": "org", "start": 30, "end": 38},
    {"text": "next week", "type": "date", "start": 39, "end": 48},
    {"text": "urgent", "type": "priority", "start": 51, "end": 57}
  ],
  "diagnostics": {"hasOrgIndicator": true, "hasActionVerb": true, "hasUserIndicator": false, "hasDateIndicator": true, "ambiguousElements": [], "suggestions": []}
}

Be strict about JSON format - no markdown code blocks, just raw JSON.`;

// Build the full prompt with context
function buildPrompt(
  command: string,
  context?: { knownOrgs?: string[]; knownUsers?: string[]; sessionContext?: string }
): string {
  let prompt = SYSTEM_PROMPT;

  // Add session context if available (most recent org/user)
  if (context?.sessionContext) {
    prompt += `\n\n${context.sessionContext}`;
  }

  // Add known organizations for better matching
  if (context?.knownOrgs?.length) {
    prompt += `\n\nKNOWN ORGANIZATIONS (help identify these):\n${context.knownOrgs.slice(0, 30).map(o => `- ${o}`).join('\n')}`;
  }

  // Add known users
  if (context?.knownUsers?.length) {
    prompt += `\n\nKNOWN USERS:\n${context.knownUsers.slice(0, 30).map(u => `- ${u}`).join('\n')}`;
  }

  prompt += `\n\nUSER COMMAND: "${command}"

Parse this command and return ONLY valid JSON (no markdown).`;

  return prompt;
}

// Parse a single command with extended extraction information
export async function parseCommand(
  command: string,
  context?: { knownOrgs?: string[]; knownUsers?: string[]; sessionContext?: string }
): Promise<ExtendedParseResult> {
  if (!command || command.trim().length === 0) {
    return {
      success: false,
      error: 'Empty command',
      diagnostics: {
        hasOrgIndicator: false,
        hasActionVerb: false,
        hasUserIndicator: false,
        hasDateIndicator: false,
        ambiguousElements: [],
        suggestions: ['Please enter a command']
      }
    };
  }

  const prompt = buildPrompt(command.trim(), context);

  const result = await callGroqJSON<any>(prompt, {
    temperature: 0.1, // Low for consistent parsing
    max_tokens: 1500, // Increased for extraction spans
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'Failed to parse command',
      diagnostics: {
        hasOrgIndicator: false,
        hasActionVerb: false,
        hasUserIndicator: false,
        hasDateIndicator: false,
        ambiguousElements: [command],
        suggestions: ['Try formats like: "John at Acme ran a query yesterday"']
      }
    };
  }

  // Validate and extract parsed data
  const validatedData = validateAIResponse(result.data);
  if (!validatedData) {
    return {
      success: false,
      error: 'Invalid AI response structure',
      diagnostics: {
        hasOrgIndicator: false,
        hasActionVerb: false,
        hasUserIndicator: false,
        hasDateIndicator: false,
        ambiguousElements: ['AI response'],
        suggestions: ['Try a simpler command format']
      }
    };
  }

  const data = validatedData;

  // Ensure required fields
  if (!data.action || !isValidAction(data.action)) {
    return {
      success: false,
      error: 'Invalid action type parsed',
      diagnostics: data.diagnostics || {
        hasOrgIndicator: !!data.org_name,
        hasActionVerb: false,
        hasUserIndicator: !!data.user_name,
        hasDateIndicator: !!data.fields?.date,
        ambiguousElements: ['action'],
        suggestions: [
          'Try: "ran a query" for activity',
          'Try: "$50K deal" for deals',
          'Try: "became customer" or "trial expired" for stage changes'
        ]
      }
    };
  }

  // Normalize confidence to 0-1 range
  if (typeof data.confidence !== 'number') {
    data.confidence = 0.5;
  } else if (data.confidence > 1) {
    data.confidence = data.confidence / 100;
  }

  // Ensure fields object exists
  if (!data.fields) {
    data.fields = {};
  }

  // Extract diagnostics first (needed for boost calculation)
  const diagnostics: ParseDiagnostics = data.diagnostics || {
    hasOrgIndicator: !!data.org_name,
    hasActionVerb: true,
    hasUserIndicator: !!data.user_name,
    hasDateIndicator: !!data.fields?.date,
    ambiguousElements: [],
    suggestions: []
  };

  // Apply structural confidence boost for clear, well-formed inputs
  const structuralBoost = calculateStructuralBoost({ ...data, diagnostics }, command);
  const boostedConfidence = Math.min(1.0, data.confidence + structuralBoost);

  // Build the parsed result with extraction spans
  const parsed: ParsedCommandWithSpans = {
    action: data.action,
    confidence: boostedConfidence,
    org_name: data.org_name || null,
    user_name: data.user_name || null,
    fields: data.fields,
    reasoning: data.reasoning,
    extractedSpans: data.extracted_spans || generateSpansFromText(command, data),
  };

  return { success: true, parsed, diagnostics };
}

// Generate extraction spans from text if not provided by AI
function generateSpansFromText(text: string, data: any): ExtractionSpan[] {
  const spans: ExtractionSpan[] = [];
  const lowerText = text.toLowerCase();

  // Find org name span
  if (data.org_name) {
    const orgIndex = lowerText.indexOf(data.org_name.toLowerCase());
    if (orgIndex !== -1) {
      spans.push({
        text: text.substring(orgIndex, orgIndex + data.org_name.length),
        type: 'org',
        start: orgIndex,
        end: orgIndex + data.org_name.length,
      });
    }
  }

  // Find user name span
  if (data.user_name) {
    const userIndex = lowerText.indexOf(data.user_name.toLowerCase());
    if (userIndex !== -1) {
      spans.push({
        text: text.substring(userIndex, userIndex + data.user_name.length),
        type: 'user',
        start: userIndex,
        end: userIndex + data.user_name.length,
      });
    }
  }

  // Find date span
  if (data.fields?.date) {
    const datePatterns = ['yesterday', 'today', 'last week', data.fields.date.toLowerCase()];
    for (const pattern of datePatterns) {
      const dateIndex = lowerText.indexOf(pattern);
      if (dateIndex !== -1) {
        spans.push({
          text: text.substring(dateIndex, dateIndex + pattern.length),
          type: 'date',
          start: dateIndex,
          end: dateIndex + pattern.length,
        });
        break;
      }
    }
  }

  // Find value span (money)
  const moneyMatch = text.match(/\$[\d,.]+[kKmM]?/);
  if (moneyMatch && moneyMatch.index !== undefined) {
    spans.push({
      text: moneyMatch[0],
      type: 'value',
      start: moneyMatch.index,
      end: moneyMatch.index + moneyMatch[0].length,
    });
  }

  return spans;
}

// Calculate structural confidence boost for clear, well-formed inputs
function calculateStructuralBoost(data: any, command: string): number {
  let boost = 0;

  // Boost 1: Has explicit org indicator pattern ("at X", "for X", "from X", "with X")
  if (/\b(at|for|from|with)\s+[A-Z][a-zA-Z\s]+/i.test(command)) {
    boost += 0.03;
  }

  // Boost 2: Has explicit action verb matching parsed action
  const actionVerbs: Record<string, RegExp> = {
    'LOG_ACTIVITY': /\b(ran|logged|used|called|emailed|met|demo|meeting|queried|queries|login|logged\s+in)\b/i,
    'UPDATE_DEAL': /\b(pricing|deal|value|\$|\d+[kKmM]|negotiat|contract)\b/i,
    'UPDATE_STAGE': /\b(trial|churned|converted|customer|lost|expired|won|prospect|onboard)\b/i,
    'CREATE_ORG': /\b(new\s+org|new\s+trial|onboard|starting\s+trial|add\s+org)\b/i,
    'ADD_NOTE': /\b(note|notes|observation|comment)\b/i,
    'DELETE_ORG': /\b(delete|remove)\s+(org|trial|organization|company|from\s+list)\b/i,
    'DELETE_USER': /\b(delete|remove)\s+(user|contact)\b/i,
  };
  if (data.action && actionVerbs[data.action]?.test(command)) {
    boost += 0.03;
  }

  // Boost 3: All key diagnostic indicators are positive
  if (data.diagnostics?.hasOrgIndicator && data.diagnostics?.hasActionVerb) {
    boost += 0.02;
  }

  // Boost 4: Person name follows "FirstName at Org" pattern
  if (data.user_name && /^[A-Z][a-z]+\s+(at|from|with)\s+/i.test(command)) {
    boost += 0.02;
  }

  // Boost 5: Command has specific numeric details (query count, dollar amount)
  if (/\b\d+\s*(queries|query|times|logins?)\b/i.test(command) || /\$[\d,.]+[kKmM]?/.test(command)) {
    boost += 0.02;
  }

  // Cap total boost at 8%
  return Math.min(boost, 0.08);
}

// Extended batch result
export interface ExtendedBatchParseResult {
  command: string;
  success: boolean;
  parsed?: ParsedCommandWithSpans;
  diagnostics?: ParseDiagnostics;
  error?: string;
}

// Parse multiple commands in batch
export async function parseCommands(
  commands: string[],
  context?: { knownOrgs?: string[]; knownUsers?: string[] }
): Promise<ExtendedBatchParseResult[]> {
  const results: ExtendedBatchParseResult[] = [];

  for (const command of commands) {
    const trimmed = command.trim();
    if (!trimmed) {
      results.push({
        command,
        success: false,
        error: 'Empty command',
        diagnostics: {
          hasOrgIndicator: false,
          hasActionVerb: false,
          hasUserIndicator: false,
          hasDateIndicator: false,
          ambiguousElements: [],
          suggestions: []
        }
      });
      continue;
    }

    const result = await parseCommand(trimmed, context);
    results.push({ command: trimmed, ...result });

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Validate action type - all supported actions
const VALID_ACTIONS: CommandAction[] = [
  // Existing
  'LOG_ACTIVITY',
  'LOG_MEETING',
  'ADD_DEAL_NOTE',
  'CREATE_FOLLOWUP',
  'UPDATE_DEAL',
  'UPDATE_STAGE',
  'ADD_NOTE',
  // Create actions
  'CREATE_ORG',
  'CREATE_USER',
  'CREATE_TICKET',
  'CREATE_FEATURE_REQUEST',
  'CREATE_ROADMAP_ITEM',
  'CREATE_TIMELINE_EVENT',
  // Update actions
  'UPDATE_ORG',
  'UPDATE_USER',
  'ASSIGN_ACCOUNT_MANAGER',
  // Quick actions
  'QUICK_STATUS_UPDATE',
  // Delete actions
  'DELETE_ORG',
  'DELETE_USER',
  'DELETE_TICKET',
  'DELETE_FEATURE_REQUEST',
  'DELETE_ROADMAP_ITEM',
  'DELETE_TIMELINE_EVENT',
  'DELETE_NOTE',
  'DELETE_FOLLOWUP',
  // Bulk actions (future)
  'BULK_UPDATE_STAGE',
  'BULK_ASSIGN_AM',
  // Prospect lifecycle actions
  'CREATE_PROSPECT_ORG',
  'ADD_PROSPECT_CONTACT',
  'LOG_OUTREACH',
  'LOG_RESPONSE',
  'LOG_SCREENING',
  'UPDATE_PROSPECT_STAGE',
  'DISQUALIFY_PROSPECT',
  'CONVERT_TO_TRIAL',
  // Deal outcome actions
  'UPDATE_DEAL_STAGE',
  'CLOSE_DEAL_WON',
  'CLOSE_DEAL_LOST',
  'DEFER_DEAL',
];

function isValidAction(action: string): action is CommandAction {
  return VALID_ACTIONS.includes(action as CommandAction);
}

// Parse relative date to ISO string - handles many natural language formats
export function parseRelativeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const now = new Date();
  const lower = dateStr.toLowerCase().trim();

  // Exact matches
  const exactMatches: Record<string, () => Date> = {
    'today': () => now,
    'now': () => now,
    'yesterday': () => { const d = new Date(now); d.setDate(d.getDate() - 1); return d; },
    'tomorrow': () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d; },
    'last week': () => { const d = new Date(now); d.setDate(d.getDate() - 7); return d; },
    'this week': () => now,
    'last month': () => { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; },
    'this month': () => now,
    'last year': () => { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; },
  };

  if (exactMatches[lower]) {
    return exactMatches[lower]().toISOString();
  }

  // Day of week patterns: "monday", "last monday", "this friday"
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = lower.match(/^(last\s+|this\s+)?(\w+day)$/);
  if (dayMatch) {
    const prefix = dayMatch[1]?.trim();
    const dayName = dayMatch[2];
    const targetDayIndex = daysOfWeek.indexOf(dayName);
    if (targetDayIndex !== -1) {
      const result = new Date(now);
      const currentDayIndex = result.getDay();
      let daysBack = currentDayIndex - targetDayIndex;
      if (daysBack <= 0) daysBack += 7; // Go to previous week
      if (prefix === 'last') daysBack += 7; // Go back another week
      result.setDate(result.getDate() - daysBack);
      return result.toISOString();
    }
  }

  // "N days/weeks/months ago" pattern
  const agoMatch = lower.match(/(\d+)\s*(day|week|month|year)s?\s*ago/);
  if (agoMatch) {
    const num = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    const result = new Date(now);

    if (unit === 'day') result.setDate(result.getDate() - num);
    else if (unit === 'week') result.setDate(result.getDate() - num * 7);
    else if (unit === 'month') result.setMonth(result.getMonth() - num);
    else if (unit === 'year') result.setFullYear(result.getFullYear() - num);

    return result.toISOString();
  }

  // "in N days/weeks" pattern (future dates)
  const inMatch = lower.match(/in\s+(\d+)\s*(day|week|month|year)s?/);
  if (inMatch) {
    const num = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const result = new Date(now);

    if (unit === 'day') result.setDate(result.getDate() + num);
    else if (unit === 'week') result.setDate(result.getDate() + num * 7);
    else if (unit === 'month') result.setMonth(result.getMonth() + num);
    else if (unit === 'year') result.setFullYear(result.getFullYear() + num);

    return result.toISOString();
  }

  // "next week/month" pattern
  const nextMatch = lower.match(/^next\s+(week|month|year)$/);
  if (nextMatch) {
    const unit = nextMatch[1];
    const result = new Date(now);

    if (unit === 'week') result.setDate(result.getDate() + 7);
    else if (unit === 'month') result.setMonth(result.getMonth() + 1);
    else if (unit === 'year') result.setFullYear(result.getFullYear() + 1);

    return result.toISOString();
  }

  // Common date formats: MM/DD/YYYY, MM-DD-YYYY, DD/MM/YYYY (try both)
  const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const [, a, b, yearStr] = slashMatch;
    const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
    // Try MM/DD/YYYY first (US format)
    let date = new Date(year, parseInt(a, 10) - 1, parseInt(b, 10));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    // Try DD/MM/YYYY (international format)
    date = new Date(year, parseInt(b, 10) - 1, parseInt(a, 10));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Month name formats: "Dec 15", "December 15, 2024", "15 Dec 2024"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthPatterns = [
    /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+(\d{4}))?$/i,
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i,
  ];

  for (const pattern of monthPatterns) {
    const match = lower.match(pattern);
    if (match) {
      let day: number, monthIndex: number, year: number;
      if (pattern === monthPatterns[0]) {
        day = parseInt(match[1], 10);
        monthIndex = monthNames.indexOf(match[2].toLowerCase().substring(0, 3));
        year = match[3] ? parseInt(match[3], 10) : now.getFullYear();
      } else {
        monthIndex = monthNames.indexOf(match[1].toLowerCase().substring(0, 3));
        day = parseInt(match[2], 10);
        year = match[3] ? parseInt(match[3], 10) : now.getFullYear();
      }
      if (monthIndex !== -1) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
  }

  // Try standard Date parsing as fallback (handles ISO format, etc.)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return dateStr; // Return as-is if can't parse
}
