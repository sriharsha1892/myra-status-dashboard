import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  matchUsersWithGroq,
  type OrganizationContext,
  type PastMapping,
} from '@/lib/parsers/groq-user-matcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MatchUsersRequest {
  userNames: string[];
  organizations: Array<{
    id: string;
    name: string;
    domain?: string;
  }>;
}

/**
 * POST - Match users to organizations using Groq AI
 * Returns matches with confidence scores
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userNames, organizations } = body as MatchUsersRequest;

    if (!userNames || !Array.isArray(userNames) || userNames.length === 0) {
      return NextResponse.json(
        { error: 'No user names provided' },
        { status: 400 }
      );
    }

    if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organizations provided' },
        { status: 400 }
      );
    }

    // Fetch past mappings from database
    const { data: pastMappingsData } = await supabase
      .from('myra_user_org_mappings')
      .select('user_name, org_id');

    const pastMappings: PastMapping[] = (pastMappingsData || [])
      .filter(m => m.user_name)
      .map(m => ({
        user_name: m.user_name,
        org_id: m.org_id,
      }));

    // Fetch contacts for organizations to provide context
    const orgIds = organizations.map(o => o.id);
    const { data: usersData } = await supabase
      .from('trial_users')
      .select('name, email, org_id')
      .in('org_id', orgIds);

    // Build organization context with contacts
    const orgContextMap = new Map<string, OrganizationContext>();
    for (const org of organizations) {
      orgContextMap.set(org.id, {
        id: org.id,
        name: org.name,
        domain: org.domain,
        contacts: [],
      });
    }

    // Add contacts to organizations
    if (usersData) {
      for (const user of usersData) {
        const orgContext = orgContextMap.get(user.org_id);
        if (orgContext && user.name) {
          orgContext.contacts = orgContext.contacts || [];
          orgContext.contacts.push({
            name: user.name,
            email: user.email || undefined,
          });
        }
      }
    }

    const organizationsWithContext = Array.from(orgContextMap.values());

    // Call Groq matcher
    const result = await matchUsersWithGroq(
      userNames,
      organizationsWithContext,
      pastMappings
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Match users error:', error);
    return NextResponse.json(
      { error: 'Failed to match users' },
      { status: 500 }
    );
  }
}
