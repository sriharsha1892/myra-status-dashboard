/**
 * ProductRoadmapTabEnhanced Component
 * Enhanced product roadmap view with features and timeline
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Plus, Calendar, Check, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type RoadmapItem = Database['public']['Tables']['product_roadmap']['Row'];

interface ProductRoadmapTabEnhancedProps {
  orgId: string;
}

export default function ProductRoadmapTabEnhanced({ orgId }: ProductRoadmapTabEnhancedProps) {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed'>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchRoadmapItems();
  }, [orgId, filter]);

  const fetchRoadmapItems = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('product_roadmap')
        .select('*')
        .eq('org_id', orgId)
        .order('target_date', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRoadmapItems(data || []);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="h-6 w-3/4 bg-slate-200 rounded mb-3"></div>
            <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Product Roadmap</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'planned', 'in_progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            } border border-slate-200`}
          >
            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
          </button>
        ))}
      </div>

      {/* Roadmap Items */}
      <div className="space-y-4">
        {roadmapItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No roadmap items found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first roadmap item to get started</p>
          </div>
        ) : (
          roadmapItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(item.status)}
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-600">{item.description}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                {item.target_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Target: {format(new Date(item.target_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {item.priority && (
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                    {item.priority} priority
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
