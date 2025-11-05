'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import AddRoadmapItemModal from './AddRoadmapItemModal';
import LinkIndicator from './LinkIndicator';
import LinkedItemsDisplay from './LinkedItemsDisplay';
import LinkFeatureRoadmapModal from './LinkFeatureRoadmapModal';
import RoadmapTimelineView from './RoadmapTimelineView';
import AdminRoadmapDashboard from './AdminRoadmapDashboard';

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
  linked_feature_count?: number;
}

interface ProductRoadmapTabEnhancedProps {
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

type ViewType = 'list' | 'kanban' | 'timeline';

export default function ProductRoadmapTabEnhanced({ orgId }: ProductRoadmapTabEnhancedProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'status' | 'priority' | 'delete'>('status');
  const [bulkValue, setBulkValue] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemTitle, setSelectedItemTitle] = useState<string>('');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

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

  const filteredItems = items.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      const selectedIds = Array.from(selectedItems);

      if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('org_product_roadmap')
          .delete()
          .in('id', selectedIds);

        if (error) throw error;
        toast.success(`Deleted ${selectedIds.length} item(s)`);
      } else if (bulkAction === 'status') {
        const { error } = await supabase
          .from('org_product_roadmap')
          .update({ status: bulkValue })
          .in('id', selectedIds);

        if (error) throw error;
        toast.success(`Updated status for ${selectedIds.length} item(s)`);
      } else if (bulkAction === 'priority') {
        const { error } = await supabase
          .from('org_product_roadmap')
          .update({ priority: bulkValue })
          .in('id', selectedIds);

        if (error) throw error;
        toast.success(`Updated priority for ${selectedIds.length} item(s)`);
      }

      setSelectedItems(new Set());
      setShowBulkActionModal(false);
      setBulkValue('');
      await fetchRoadmapItems();
    } catch (error: any) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'gray':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    const config = PRIORITY_CONFIG[priority];
    switch (config?.color) {
      case 'green':
        return 'bg-green-100 text-green-700';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-700';
      case 'red':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Product Roadmap</h3>
          <p className="text-sm text-gray-600 mt-1">Plan and manage product features</p>
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

      {/* View Selector and Controls */}
      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('list')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewType === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setViewType('kanban')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewType === 'kanban'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Kanban
          </button>
          <button
            onClick={() => setViewType('timeline')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewType === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Timeline
          </button>
          <button
            onClick={() => setShowAdminDashboard(!showAdminDashboard)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showAdminDashboard
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            👨‍💼 Admin Panel
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={filterPriority || ''}
            onChange={(e) => setFilterPriority(e.target.value || null)}
            className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priority</option>
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
              <option key={priority} value={priority}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewType === 'list' && (
        <div className="space-y-3">
          {/* Selection Controls */}
          {filteredItems.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.size > 0
                  ? `${selectedItems.size} selected`
                  : `Select all (${filteredItems.length})`}
              </span>
              {selectedItems.size > 0 && (
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => {
                      setBulkAction('status');
                      setShowBulkActionModal(true);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-all"
                  >
                    Change Status
                  </button>
                  <button
                    onClick={() => {
                      setBulkAction('priority');
                      setShowBulkActionModal(true);
                    }}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded transition-all"
                  >
                    Change Priority
                  </button>
                  <button
                    onClick={() => {
                      setBulkAction('delete');
                      setShowBulkActionModal(true);
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-all"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-600 font-medium">No roadmap items</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItems.has(item.id);
              const statusConfig = STATUS_CONFIG[item.status];
              const priorityConfig = PRIORITY_CONFIG[item.priority];

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(
                    item.status
                  )} transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectItem(item.id)}
                      className="w-4 h-4 mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">{statusConfig.icon}</span>
                          <h4 className="text-base font-semibold text-gray-900">{item.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                            {priorityConfig.label}
                          </span>
                        </div>
                        <LinkIndicator
                          linkedCount={item.linked_feature_count || 0}
                          type="roadmap"
                          size="sm"
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setSelectedItemTitle(item.title);
                            setShowLinkModal(true);
                          }}
                        />
                      </div>
                      {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
                      <div className="flex gap-6 mt-3 text-xs text-gray-600">
                        {item.target_date && (
                          <span>📅 Target: {format(new Date(item.target_date), 'MMM dd, yyyy')}</span>
                        )}
                        {item.estimated_completion_date && (
                          <span>⏱️ Est: {format(new Date(item.estimated_completion_date), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                      {item.linked_feature_count && item.linked_feature_count > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-300/30">
                          <LinkedItemsDisplay
                            orgId={orgId}
                            itemId={item.id}
                            type="roadmap"
                            title={item.title}
                            onLinkClick={() => {
                              setSelectedItemId(item.id);
                              setSelectedItemTitle(item.title);
                              setShowLinkModal(true);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewType === 'kanban' && (
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const statusItems = filteredItems.filter((item) => item.status === status);

            return (
              <div
                key={status}
                className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full"
              >
                <div className={`p-3 border-b-2 ${getStatusColor(status)}`}>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    <span className="ml-auto bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">
                      {statusItems.length}
                    </span>
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {statusItems.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-8">No items</p>
                  ) : (
                    statusItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-3 rounded border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleSelectItem(item.id)}
                      >
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                            {PRIORITY_CONFIG[item.priority].label}
                          </span>
                        </div>
                        {item.target_date && (
                          <p className="text-xs text-gray-500 mt-2">
                            {format(new Date(item.target_date), 'MMM dd')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TIMELINE VIEW */}
      {viewType === 'timeline' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-600 font-medium">No roadmap items</p>
            </div>
          ) : (
            filteredItems
              .filter((item) => item.target_date)
              .sort(
                (a, b) =>
                  new Date(a.target_date || '').getTime() - new Date(b.target_date || '').getTime()
              )
              .map((item) => {
                const statusConfig = STATUS_CONFIG[item.status];
                const priorityConfig = PRIORITY_CONFIG[item.priority];
                const daysUntil = item.target_date
                  ? Math.ceil(
                      (new Date(item.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(item.status)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{statusConfig.icon}</span>
                          <h4 className="text-base font-semibold text-gray-900">{item.title}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.target_date ? format(new Date(item.target_date), 'MMM dd, yyyy') : 'No date'}
                        </p>
                        {daysUntil !== null && (
                          <p
                            className={`text-xs font-medium ${
                              daysUntil < 0 ? 'text-red-600' : daysUntil < 7 ? 'text-yellow-600' : 'text-green-600'
                            }`}
                          >
                            {daysUntil < 0
                              ? `${Math.abs(daysUntil)} days overdue`
                              : daysUntil === 0
                              ? 'Today'
                              : `In ${daysUntil} days`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                        {priorityConfig.label}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* TIMELINE VIEW */}
      {viewType === 'timeline' && (
        <RoadmapTimelineView
          items={filteredItems}
          onItemClick={(id) => {
            setSelectedItemId(id);
            const item = items.find((i) => i.id === id);
            if (item) setSelectedItemTitle(item.title);
          }}
        />
      )}

      {/* ADMIN DASHBOARD */}
      {showAdminDashboard && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <AdminRoadmapDashboard orgId={orgId} />
        </div>
      )}

      {/* Modals */}
      <AddRoadmapItemModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchRoadmapItems}
      />

      <LinkFeatureRoadmapModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        orgId={orgId}
        mode="roadmap"
        selectedId={selectedItemId}
        selectedTitle={selectedItemTitle}
        onSuccess={() => {
          setShowLinkModal(false);
          fetchRoadmapItems();
        }}
      />

      {/* Bulk Action Modal */}
      {showBulkActionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {bulkAction === 'delete' ? 'Delete Items' : `Change ${bulkAction}`}
            </h3>

            <div className="space-y-4 mb-6">
              {bulkAction === 'status' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new status...</option>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <option key={status} value={status}>
                      {config.label}
                    </option>
                  ))}
                </select>
              )}

              {bulkAction === 'priority' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new priority...</option>
                  {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
                    <option key={priority} value={priority}>
                      {config.label}
                    </option>
                  ))}
                </select>
              )}

              {bulkAction === 'delete' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    This will permanently delete {selectedItems.size} item(s). This action cannot be undone.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkActionModal(false);
                  setBulkValue('');
                }}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                disabled={bulkAction !== 'delete' && !bulkValue}
                className={`flex-1 h-10 px-4 text-white text-sm font-semibold rounded-lg transition-all duration-200 ${
                  bulkAction === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {bulkAction === 'delete' ? 'Delete' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
