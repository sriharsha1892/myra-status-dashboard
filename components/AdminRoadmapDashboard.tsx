'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface Forward {
  id: string;
  feature_request_id: string;
  roadmap_item_id: string;
  feature_title?: string;
  roadmap_title?: string;
  context_notes: string;
  urgency: string;
  status: string;
  forwarded_by_name: string;
  forwarded_at: string;
  created_at: string;
}

interface AdminRoadmapDashboardProps {
  orgId: string;
}

const URGENCY_COLOR = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_ICON = {
  forwarded: '📨',
  acknowledged: '✅',
  in_progress: '🚀',
  resolved: '✔️',
  dismissed: '❌',
};

export default function AdminRoadmapDashboard({ orgId }: AdminRoadmapDashboardProps) {
  const [forwards, setForwards] = useState<Forward[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchForwards();
  }, [orgId]);

  const fetchForwards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_forwards')
        .select(
          `
          id,
          feature_request_id,
          roadmap_item_id,
          context_notes,
          urgency,
          status,
          forwarded_by_name,
          created_at,
          feature_requests(title),
          org_product_roadmap(title)
        `
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        feature_request_id: item.feature_request_id,
        roadmap_item_id: item.roadmap_item_id,
        feature_title: item.feature_requests?.title,
        roadmap_title: item.org_product_roadmap?.title,
        context_notes: item.context_notes,
        urgency: item.urgency,
        status: item.status,
        forwarded_by_name: item.forwarded_by_name,
        created_at: item.created_at,
      })) || [];

      setForwards(formattedData);
    } catch (error: any) {
      console.error('Error fetching forwards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (forwardId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('roadmap_forwards')
        .update({ status: newStatus })
        .eq('id', forwardId);

      if (error) throw error;
      fetchForwards();
    } catch (error: any) {
      console.error('Error updating status:', error);
    }
  };

  const filteredForwards = forwards.filter((forward) => {
    if (filterUrgency && forward.urgency !== filterUrgency) return false;
    if (filterStatus && forward.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading forwards...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Forwarded Features</h3>
        <div className="text-2xl font-bold text-blue-600">{filteredForwards.length}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
          const count = forwards.filter((f) => f.urgency === level).length;
          return (
            <div
              key={level}
              className={`p-3 rounded-lg border text-sm ${URGENCY_COLOR[level]}`}
            >
              <div className="font-bold">{count}</div>
              <div className="text-xs capitalize">{level} Urgency</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setFilterUrgency(null);
            setFilterStatus(null);
          }}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg font-medium"
        >
          All ({forwards.length})
        </button>

        {Object.keys(URGENCY_COLOR).map((urgency) => (
          <button
            key={urgency}
            onClick={() => setFilterUrgency(urgency)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              filterUrgency === urgency
                ? URGENCY_COLOR[urgency as keyof typeof URGENCY_COLOR]
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {urgency}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredForwards.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No forwarded features
          </div>
        ) : (
          filteredForwards.map((forward) => (
            <div
              key={forward.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg flex-shrink-0">
                      {STATUS_ICON[forward.status as keyof typeof STATUS_ICON]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 break-words">
                        {forward.feature_title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        → Linked to: <span className="font-medium">{forward.roadmap_title}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 my-2">
                    {forward.context_notes}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>By {forward.forwarded_by_name}</span>
                    <span>•</span>
                    <span>{format(new Date(forward.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-col items-end flex-shrink-0">
                  <div className={`px-3 py-1 rounded-lg text-xs font-semibold border ${URGENCY_COLOR[forward.urgency as keyof typeof URGENCY_COLOR]}`}>
                    {forward.urgency.toUpperCase()}
                  </div>

                  <select
                    value={forward.status}
                    onChange={(e) => handleStatusChange(forward.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="forwarded">📨 Forwarded</option>
                    <option value="acknowledged">✅ Acknowledged</option>
                    <option value="in_progress">🚀 In Progress</option>
                    <option value="resolved">✔️ Resolved</option>
                    <option value="dismissed">❌ Dismissed</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
