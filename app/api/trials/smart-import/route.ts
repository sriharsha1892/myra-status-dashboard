/**
 * AI-Powered Smart Import API
 * Parses unstructured text to extract organizations, users, and activities
 * Uses Groq LLM for intelligent data extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isGroqAvailable, callGroqJSON } from '@/lib/ai/groqClient';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Types
interface ParsedOrganization {
  org_name: string;
  domain?: string;
  website_url?: string;
  description?: string;
  users: ParsedUser[];
}

interface ParsedUser {
  name: string;
  email: string;
  title?: string;
  phone?: string;
  designation?: string;
  activities?: ParsedActivity[];
}

interface ParsedActivity {
  interaction_type: 'call' | 'email' | 'meeting' | 'demo' | 'chat' | 'training' | 'support';
  title: string;
  notes?: string;
  interaction_date?: string;
  duration_minutes?: number;
  conducted_by?: string;
}

interface ParseResult {
  organizations: ParsedOrganization[];
}

// AI Prompt for parsing
const createParsePrompt = (rawText: string) => `You are an expert at extracting trial organization data from unstructured text.

Parse the following text and extract:

1. ORGANIZATIONS: Company names mentioned
2. USERS: People with their contact details (name, email, title/designation)
3. ACTIVITIES: Any interactions mentioned (calls, emails, meetings, demos)

RULES:
- Extract ALL organizations mentioned
- For each user, determine which organization they belong to
- If multiple users from same org, group them together
- Extract activity dates (convert relative dates like "yesterday" to actual dates using today: ${new Date().toISOString().split('T')[0]})
- Interaction types: call, email, meeting, demo, chat, training, support
- If duration mentioned (e.g., "30 min call"), extract duration_minutes
- Infer domain from context: TMT (tech), NEO (new economy), AF&B (food), E&C (energy), HC (healthcare), AAD (aerospace)

INPUT TEXT:
${rawText}

OUTPUT FORMAT (JSON only, no markdown):
{
  "organizations": [
    {
      "org_name": "Company Name",
      "domain": "TMT|NEO|AF&B|E&C|HC|AAD",
      "website_url": "https://example.com",
      "description": "What the company does",
      "users": [
        {
          "name": "Full Name",
          "email": "email@company.com",
          "title": "Job Title",
          "designation": "CEO|Director|VP|Manager|Analyst",
          "phone": "+1234567890",
          "activities": [
            {
              "interaction_type": "call|email|meeting|demo|chat|training|support",
              "title": "Brief description",
              "notes": "Detailed notes about the interaction",
              "interaction_date": "YYYY-MM-DD",
              "duration_minutes": 30,
              "conducted_by": "Your sales rep name"
            }
          ]
        }
      ]
    }
  ]
}`;

// POST: Parse unstructured text
export async function POST(request: NextRequest) {
  try {
    // Check Groq availability
    if (!isGroqAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI parsing not available - GROQ_API_KEY not configured',
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { raw_text } = body;

    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'raw_text is required and must be non-empty' },
        { status: 400 }
      );
    }

    // Use Groq to parse the text
    const prompt = createParsePrompt(raw_text);
    const parseResult = await callGroqJSON<ParseResult>(prompt, {
      temperature: 0.2, // Low temperature for consistent extraction
      max_tokens: 4000,
    });

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || 'Failed to parse text with AI',
        },
        { status: 500 }
      );
    }

    const parsed = parseResult.data;

    // Validate parsed data
    if (!parsed.organizations || !Array.isArray(parsed.organizations)) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI parsing failed: no organizations extracted',
          raw_response: parsed,
        },
        { status: 422 }
      );
    }

    // Check for duplicate organizations in database
    const orgNames = parsed.organizations.map((org) => org.org_name);
    const { data: existingOrgs } = await supabaseAdmin
      .from('trial_organizations')
      .select('org_id, org_name, org_url, domain')
      .in('org_name', orgNames);

    // Check for duplicate users by email
    const allEmails = parsed.organizations.flatMap((org) =>
      org.users.map((user) => user.email)
    );
    const { data: existingUsers } = await supabaseAdmin
      .from('trial_users')
      .select('user_id, email, name, org_id')
      .in('email', allEmails);

    // Calculate statistics
    const stats = {
      total_organizations: parsed.organizations.length,
      total_users: parsed.organizations.reduce((sum, org) => sum + org.users.length, 0),
      total_activities: parsed.organizations.reduce(
        (sum, org) =>
          sum +
          org.users.reduce(
            (userSum, user) => userSum + (user.activities?.length || 0),
            0
          ),
        0
      ),
      existing_organizations: existingOrgs?.length || 0,
      existing_users: existingUsers?.length || 0,
      new_organizations:
        parsed.organizations.length - (existingOrgs?.length || 0),
      new_users:
        parsed.organizations.reduce((sum, org) => sum + org.users.length, 0) -
        (existingUsers?.length || 0),
    };

    // Return parsed data for review
    return NextResponse.json({
      success: true,
      parsed: parsed.organizations,
      existing_orgs: existingOrgs || [],
      existing_users: existingUsers || [],
      stats,
      duration_ms: parseResult.duration_ms,
    });
  } catch (error: any) {
    console.error('Smart import parsing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT: Execute the import after user review
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizations, account_manager_id } = body;

    if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'organizations array is required' },
        { status: 400 }
      );
    }

    if (!account_manager_id) {
      return NextResponse.json(
        { success: false, error: 'account_manager_id is required' },
        { status: 400 }
      );
    }

    const results = {
      organizations_created: 0,
      organizations_linked: 0,
      users_created: 0,
      users_updated: 0,
      activities_created: 0,
      errors: [] as string[],
    };

    // Process each organization
    for (const orgData of organizations) {
      try {
        let orgId: string;

        // Check if organization exists
        const { data: existingOrg } = await supabaseAdmin
          .from('trial_organizations')
          .select('org_id')
          .eq('org_name', orgData.org_name)
          .single();

        if (existingOrg) {
          // Link to existing org
          orgId = existingOrg.org_id;
          results.organizations_linked++;
        } else {
          // Create new organization
          const { data: newOrg, error: orgError } = await supabaseAdmin
            .from('trial_organizations')
            .insert({
              org_name: orgData.org_name,
              domain: orgData.domain || null,
              org_url: orgData.website_url || null,
              description: orgData.description || null,
              account_manager_id: account_manager_id,
              org_lifecycle_stage: 'prospect',
              trial_status: 'requested',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('org_id')
            .single();

          if (orgError || !newOrg) {
            results.errors.push(`Failed to create org ${orgData.org_name}: ${orgError?.message}`);
            continue;
          }

          orgId = newOrg.org_id;
          results.organizations_created++;
        }

        // Process users for this organization
        for (const userData of orgData.users) {
          try {
            // Check if user exists
            const { data: existingUser } = await supabaseAdmin
              .from('trial_users')
              .select('user_id')
              .eq('email', userData.email)
              .eq('org_id', orgId)
              .single();

            let userId: string;

            if (existingUser) {
              userId = existingUser.user_id;
              results.users_updated++;
            } else {
              // Create new user
              const { data: newUser, error: userError } = await supabaseAdmin
                .from('trial_users')
                .insert({
                  org_id: orgId,
                  name: userData.name,
                  email: userData.email,
                  role: userData.designation || userData.title || null,
                  current_stage: 'invited',
                  account_manager: account_manager_id,
                  created_at: new Date().toISOString(),
                })
                .select('user_id')
                .single();

              if (userError || !newUser) {
                results.errors.push(
                  `Failed to create user ${userData.email}: ${userError?.message}`
                );
                continue;
              }

              userId = newUser.user_id;
              results.users_created++;
            }

            // Process activities for this user
            if (userData.activities && userData.activities.length > 0) {
              for (const activity of userData.activities) {
                const { error: activityError } = await supabaseAdmin
                  .from('user_interactions')
                  .insert({
                    user_id: userId,
                    org_id: orgId,
                    interaction_type: activity.interaction_type,
                    title: activity.title,
                    notes: activity.notes || null,
                    interaction_date: activity.interaction_date
                      ? new Date(activity.interaction_date).toISOString()
                      : new Date().toISOString(),
                    duration_minutes: activity.duration_minutes || null,
                    conducted_by: activity.conducted_by || null,
                    created_at: new Date().toISOString(),
                  });

                if (activityError) {
                  results.errors.push(
                    `Failed to create activity for ${userData.email}: ${activityError.message}`
                  );
                } else {
                  results.activities_created++;
                }
              }
            }
          } catch (userError: any) {
            results.errors.push(`Error processing user ${userData.email}: ${userError.message}`);
          }
        }
      } catch (orgError: any) {
        results.errors.push(`Error processing org ${orgData.org_name}: ${orgError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Smart import execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
