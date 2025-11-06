/**
 * useFeatureRoadmapLinks Hook
 * Manages links between feature requests and roadmap items
 */

import { createClient } from '@/lib/supabase/client';

interface LinkOptions {
  featureId: string;
  roadmapId: string;
  linkType: 'implements' | 'addresses' | 'related_to' | 'blocks' | 'blocked_by';
}

export function useFeatureRoadmapLinks(orgId: string) {
  const supabase = createClient();

  const linkFeatureToRoadmap = async ({
    featureId,
    roadmapId,
    linkType
  }: LinkOptions) => {
    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('feature_roadmap_links')
      .select('id')
      .eq('feature_request_id', featureId)
      .eq('roadmap_item_id', roadmapId)
      .maybeSingle();

    if (existingLink) {
      // Update existing link
      const { error } = await supabase
        .from('feature_roadmap_links')
        .update({
          link_type: linkType,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLink.id);

      if (error) throw error;
    } else {
      // Create new link
      const { error } = await supabase
        .from('feature_roadmap_links')
        .insert({
          org_id: orgId,
          feature_request_id: featureId,
          roadmap_item_id: roadmapId,
          link_type: linkType
        });

      if (error) throw error;
    }
  };

  const unlinkFeatureFromRoadmap = async (featureId: string, roadmapId: string) => {
    const { error } = await supabase
      .from('feature_roadmap_links')
      .delete()
      .eq('feature_request_id', featureId)
      .eq('roadmap_item_id', roadmapId);

    if (error) throw error;
  };

  const getLinksForFeature = async (featureId: string) => {
    const { data, error } = await supabase
      .from('feature_roadmap_links')
      .select(`
        *,
        roadmap_item:product_roadmap(*)
      `)
      .eq('feature_request_id', featureId);

    if (error) throw error;
    return data || [];
  };

  const getLinksForRoadmapItem = async (roadmapId: string) => {
    const { data, error } = await supabase
      .from('feature_roadmap_links')
      .select(`
        *,
        feature_request:feature_requests(*)
      `)
      .eq('roadmap_item_id', roadmapId);

    if (error) throw error;
    return data || [];
  };

  return {
    linkFeatureToRoadmap,
    unlinkFeatureFromRoadmap,
    getLinksForFeature,
    getLinksForRoadmapItem
  };
}
