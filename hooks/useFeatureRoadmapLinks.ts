import { useState, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api-client';

export interface FeatureRoadmapLink {
  id: string;
  org_id: string;
  feature_id: string;
  roadmap_id: string;
  link_type: 'implements' | 'addresses' | 'related_to' | 'blocks' | 'blocked_by';
  notes?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by?: string;
}

export interface LinkedFeature {
  id: string;
  title: string;
  status: string;
  priority: string;
  votes: number;
  link_type: string;
  notes?: string;
  created_at: string;
}

export interface LinkedRoadmapItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  target_date?: string;
  link_type: string;
  notes?: string;
  created_at: string;
}

export function useFeatureRoadmapLinks(orgId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLinkedFeaturesForRoadmap = useCallback(
    async (roadmapId: string): Promise<LinkedFeature[]> => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(
          `/api/feature-roadmap-links?orgId=${orgId}&roadmapId=${roadmapId}`
        );
        if (!response.ok) throw new Error('Failed to fetch linked features');
        return await response.json();
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  const getLinkedRoadmapItems = useCallback(
    async (featureId: string): Promise<LinkedRoadmapItem[]> => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(
          `/api/feature-roadmap-links?orgId=${orgId}&featureId=${featureId}`
        );
        if (!response.ok) throw new Error('Failed to fetch linked roadmap items');
        return await response.json();
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  const linkFeatureToRoadmap = useCallback(
    async (
      featureId: string,
      roadmapId: string,
      linkType: string,
      notes?: string
    ): Promise<FeatureRoadmapLink | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch('/api/feature-roadmap-links', {
          method: 'POST',
          body: JSON.stringify({
            orgId,
            featureId,
            roadmapId,
            linkType,
            notes,
          }),
        });
        if (!response.ok) throw new Error('Failed to create link');
        return await response.json();
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  const unlinkFeatureFromRoadmap = useCallback(
    async (featureId: string, roadmapId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(
          `/api/feature-roadmap-links?orgId=${orgId}&featureId=${featureId}&roadmapId=${roadmapId}`,
          { method: 'DELETE' }
        );
        if (!response.ok) throw new Error('Failed to delete link');
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  return {
    loading,
    error,
    getLinkedFeaturesForRoadmap,
    getLinkedRoadmapItems,
    linkFeatureToRoadmap,
    unlinkFeatureFromRoadmap,
  };
}
