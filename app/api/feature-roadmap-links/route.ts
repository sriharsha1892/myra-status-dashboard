import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const featureId = searchParams.get('featureId');
    const roadmapId = searchParams.get('roadmapId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get linked features for a roadmap item
    if (roadmapId && !featureId) {
      // @ts-ignore - Supabase RPC typing issue with dynamic functions
      const { data, error } = await supabase.rpc('get_linked_features', {
        p_org_id: orgId,
        p_roadmap_id: roadmapId,
      } as any);

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Get linked roadmap items for a feature
    if (featureId && !roadmapId) {
      // @ts-ignore - Supabase RPC typing issue with dynamic functions
      const { data, error } = await supabase.rpc('get_linked_roadmap_items', {
        p_org_id: orgId,
        p_feature_id: featureId,
      } as any);

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Get all links for organization
    const { data, error } = await supabase
      .from('feature_roadmap_links')
      .select('*')
      .eq('org_id', orgId);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching feature-roadmap links:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { orgId, featureId, roadmapId, linkType, notes } = body;

    if (!orgId || !featureId || !roadmapId || !linkType) {
      return NextResponse.json(
        { error: 'Organization ID, feature ID, roadmap ID, and link type are required' },
        { status: 400 }
      );
    }

    // Use the function to create the link with validation
    // @ts-ignore - Supabase RPC typing issue with dynamic functions
    const { data, error } = await supabase.rpc('link_feature_to_roadmap', {
      p_org_id: orgId,
      p_feature_id: featureId,
      p_roadmap_id: roadmapId,
      p_link_type: linkType,
      p_notes: notes || null,
    } as any);

    if (error) throw error;
    return NextResponse.json((data as any)?.[0] || (data as any), { status: 201 });
  } catch (error: any) {
    console.error('Error creating feature-roadmap link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create link' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const featureId = searchParams.get('featureId');
    const roadmapId = searchParams.get('roadmapId');

    if (!orgId || !featureId || !roadmapId) {
      return NextResponse.json(
        { error: 'Organization ID, feature ID, and roadmap ID are required' },
        { status: 400 }
      );
    }

    // Use the function to unlink
    // @ts-ignore - Supabase RPC typing issue with dynamic functions
    const { error } = await supabase.rpc('unlink_feature_from_roadmap', {
      p_org_id: orgId,
      p_feature_id: featureId,
      p_roadmap_id: roadmapId,
    } as any);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting feature-roadmap link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete link' },
      { status: 500 }
    );
  }
}
