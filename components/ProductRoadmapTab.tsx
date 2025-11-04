'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import AddRoadmapItemModal from './AddRoadmapItemModal';

interface RoadmapItem {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date?: string;
  estimated_completion_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface ProductRoadmapTabProps {
  orgId: string;
}

const STATUS_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  planned: { icon: '📋', color: 'blue', label: 'Planned' },
  in_progress: { icon: '🚀', color: 'yellow', label: 'In Progress' },
  completed: { icon: '✅', color: 'green', label: 'Completed' },
  cancelled: { icon: '⛔', color: 'gray', label: 'Cancelled' },
};

const PRIORITY_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  low: { icon: '🟢', color: 'green', label: 'Low' },
  medium: { icon: '🟡', color: 'yellow', label: 'Medium' },
  high: { icon: '🔴', color: 'red', label: 'High' },
  critical: { icon: '🚨', color: 'red', label: 'Critical' },
};

export default function ProductRoadmapTab({ orgId }: ProductRoadmapTabProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchRoadmapItems();
  }, [orgId]);

  const fetchRoadmapItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('org_product_roadmap')
        .select('*')
        .eq('org_id', orgId)
        .order('target_date', { ascending: true, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching roadmap:', error);
      toast.error('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = filterStatus ? items.filter((item) => item.status === filterStatus) : items;

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'gray':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    const config = PRIORITY_CONFIG[priority];
    switch (config?.color) {
      case 'green':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Product Roadmap</h3>
          <p className="text-sm text-gray-600 mt-1">Planned features and improvements</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Item</span>
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus(null)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === null
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          All Items ({items.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = items.filter((item) => item.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === status
                  ? `${getStatusColor(status)} border`
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {config.icon} {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Roadmap Items */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No roadmap items</p>
          <p className="text-sm text-gray-500 mt-1">
            {filterStatus ? 'No items with this status' : 'Start by adding your first roadmap item'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status];
            const priorityConfig = PRIORITY_CONFIG[item.priority];

            return (
              <div key={item.id} className={`rounded-lg border-2 p-4 ${getStatusColor(item.status)}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{statusConfig.icon}</span>
                      <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-700 mt-2">{item.description}</p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(item.priority)}`}>
                    {priorityConfig.icon} {priorityConfig.label}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {item.target_date && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 opacity-75">Target Date</span>
                      <p className="text-gray-900">{format(new Date(item.target_date), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  {item.estimated_completion_date && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 opacity-75">Est. Completion</span>
                      <p className="text-gray-900">{format(new Date(item.estimated_completion_date), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  {item.created_by && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 opacity-75">Created By</span>
                      <p className="text-gray-900">{item.created_by}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-medium text-gray-700 opacity-75">Created</span>
                    <p className="text-gray-900">{format(new Date(item.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddRoadmapItemModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchRoadmapItems}
      />
    </div>
  );
}
