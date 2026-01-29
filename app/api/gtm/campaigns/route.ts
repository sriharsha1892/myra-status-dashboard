import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireGtmAuth } from '@/lib/gtm/auth';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaignType: 'hubspot' | 'apollo' | 'inbound' | 'other';
  totalOutreach: number;
  totalResponses: number;
  totalLeads: number;
  qualifiedLeads: number;
  ongoingCases: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string | null;
  endDate: string | null;
  externalUrl: string | null;
  attributedOrgs: number;
  convertedOrgs: number;
  attributedValue: number;
  createdAt: string;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalLeads: number;
    totalQualified: number;
    totalAttributedValue: number;
  };
}

function mapCampaign(data: Record<string, unknown>): Campaign {
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string | null) || null,
    campaignType: data.campaign_type as 'hubspot' | 'apollo' | 'inbound' | 'other',
    totalOutreach: Number(data.total_outreach || 0),
    totalResponses: Number(data.total_responses || 0),
    totalLeads: Number(data.total_leads || 0),
    qualifiedLeads: Number(data.qualified_leads || 0),
    ongoingCases: Number(data.ongoing_cases || 0),
    status: data.status as 'draft' | 'active' | 'paused' | 'completed',
    startDate: (data.start_date as string | null) || null,
    endDate: (data.end_date as string | null) || null,
    externalUrl: (data.external_url as string | null) || null,
    attributedOrgs: Number(data.attributed_orgs || 0),
    convertedOrgs: Number(data.converted_orgs || 0),
    attributedValue: Number(data.attributed_value || 0),
    createdAt: data.created_at as string,
  };
}

/**
 * GET - Fetch campaigns with summary
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const gtmEmail = requireGtmAuth(request);
    if (!gtmEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // hubspot, apollo, inbound, or null for all

    // Fetch campaigns from summary view (includes attribution counts)
    let query = supabase
      .from('gtm_campaign_summary')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('campaign_type', type);
    }

    const { data: campaigns, error: campaignsError } = await query;

    if (campaignsError) {
      throw campaignsError;
    }

    const mappedCampaigns = (campaigns || []).map(mapCampaign);

    // Calculate summary
    const activeCampaigns = mappedCampaigns.filter((c) => c.status === 'active');

    const response: CampaignsResponse = {
      campaigns: mappedCampaigns,
      summary: {
        totalCampaigns: mappedCampaigns.length,
        activeCampaigns: activeCampaigns.length,
        totalLeads: mappedCampaigns.reduce((sum, c) => sum + c.totalLeads, 0),
        totalQualified: mappedCampaigns.reduce((sum, c) => sum + c.qualifiedLeads, 0),
        totalAttributedValue: mappedCampaigns.reduce((sum, c) => sum + c.attributedValue, 0),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fetch campaigns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new campaign
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      campaignType,
      totalOutreach,
      totalResponses,
      totalLeads,
      qualifiedLeads,
      ongoingCases,
      status,
      startDate,
      endDate,
      externalId,
      externalUrl,
    } = body;

    if (!name || !campaignType) {
      return NextResponse.json({ error: 'name and campaignType are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gtm_campaigns')
      .insert({
        name,
        description: description || null,
        campaign_type: campaignType,
        total_outreach: totalOutreach || 0,
        total_responses: totalResponses || 0,
        total_leads: totalLeads || 0,
        qualified_leads: qualifiedLeads || 0,
        ongoing_cases: ongoingCases || 0,
        status: status || 'active',
        start_date: startDate || null,
        end_date: endDate || null,
        external_id: externalId || null,
        external_url: externalUrl || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      campaign: mapCampaign(data),
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update campaign or link orgs
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, updates, linkOrgs, unlinkOrgs } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    // Update campaign details if provided
    if (updates) {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.totalOutreach !== undefined) updateData.total_outreach = updates.totalOutreach;
      if (updates.totalResponses !== undefined) updateData.total_responses = updates.totalResponses;
      if (updates.totalLeads !== undefined) updateData.total_leads = updates.totalLeads;
      if (updates.qualifiedLeads !== undefined) updateData.qualified_leads = updates.qualifiedLeads;
      if (updates.ongoingCases !== undefined) updateData.ongoing_cases = updates.ongoingCases;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.externalUrl !== undefined) updateData.external_url = updates.externalUrl;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('gtm_campaigns')
          .update(updateData)
          .eq('id', campaignId);

        if (updateError) {
          throw updateError;
        }
      }
    }

    // Link orgs to campaign
    if (linkOrgs && Array.isArray(linkOrgs) && linkOrgs.length > 0) {
      const linksToInsert = linkOrgs.map((orgId: string) => ({
        campaign_id: campaignId,
        org_id: orgId,
        attribution_type: 'primary',
      }));

      const { error: linkError } = await supabase
        .from('gtm_campaign_orgs')
        .upsert(linksToInsert, { onConflict: 'campaign_id,org_id' });

      if (linkError) {
        throw linkError;
      }
    }

    // Unlink orgs from campaign
    if (unlinkOrgs && Array.isArray(unlinkOrgs) && unlinkOrgs.length > 0) {
      const { error: unlinkError } = await supabase
        .from('gtm_campaign_orgs')
        .delete()
        .eq('campaign_id', campaignId)
        .in('org_id', unlinkOrgs);

      if (unlinkError) {
        throw unlinkError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a campaign
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('gtm_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
