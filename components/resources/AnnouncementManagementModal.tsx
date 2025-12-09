'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  announcement_type: 'feature' | 'update' | 'maintenance' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'draft' | 'active' | 'archived';
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  posted_by?: string;
}

interface AnnouncementManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnouncementManagementModal({
  isOpen,
  onClose,
}: AnnouncementManagementModalProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    announcement_type: 'feature' as Announcement['announcement_type'],
    priority: 'normal' as Announcement['priority'],
    status: 'draft' as Announcement['status'],
    title: '',
    content: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
    }
  }, [isOpen]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching announcements:', errorMessage);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Announcement updated successfully');
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('announcements')
          .insert([{
            ...formData,
            posted_by: 'admin',
          }]);

        if (error) throw error;
        toast.success('Announcement created successfully');
      }

      resetForm();
      fetchAnnouncements();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message :
        typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) :
        JSON.stringify(error);
      console.error('Error saving announcement:', errorMessage, error);
      toast.error(`${editingId ? 'Failed to update' : 'Failed to create'}: ${errorMessage}`);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      announcement_type: announcement.announcement_type,
      priority: announcement.priority,
      status: announcement.status,
      title: announcement.title,
      content: announcement.content,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error deleting announcement:', errorMessage);
      toast.error(`Failed to delete: ${errorMessage}`);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Announcement['status']) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Announcement ${newStatus}`);
      fetchAnnouncements();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error updating status:', errorMessage);
      toast.error(`Failed to update status: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      announcement_type: 'feature',
      priority: 'normal',
      status: 'draft',
      title: '',
      content: '',
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      feature: 'Feature',
      update: 'Update',
      maintenance: 'Maintenance',
      alert: 'Alert',
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      critical: 'Critical',
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      active: 'Active',
      archived: 'Archived',
    };
    return labels[status] || status;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      feature: 'bg-blue-100 text-blue-700 border-blue-200',
      update: 'bg-purple-100 text-purple-700 border-purple-200',
      maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
      alert: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-emerald-100 text-emerald-700',
      archived: 'bg-slate-100 text-slate-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    if (filterType !== 'all' && announcement.announcement_type !== filterType) return false;
    if (filterStatus !== 'all' && announcement.status !== filterStatus) return false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Announcements</h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage feature announcements for your team</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6 p-6">
            {/* Form Section - Left Side */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter announcement title"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Message
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter announcement message"
                      rows={4}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                      required
                    />
                  </div>

                  {/* Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Type
                      </label>
                      <select
                        value={formData.announcement_type}
                        onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value as Announcement['announcement_type'] })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      >
                        <option value="feature">Feature</option>
                        <option value="update">Update</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="alert">Alert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Announcement['priority'] })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Announcement['status'] })}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-purple-200"
                    >
                      {editingId ? 'Update Announcement' : 'Create Announcement'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm border border-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* List Section - Right Side */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Type:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">All Types</option>
                    <option value="feature">Feature</option>
                    <option value="update">Update</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="alert">Alert</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Status:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="ml-auto text-sm text-gray-600 font-medium">
                  {filteredAnnouncements.length} {filteredAnnouncements.length === 1 ? 'announcement' : 'announcements'}
                </div>
              </div>

              {/* Announcements List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : filteredAnnouncements.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-600 mb-2">No announcements found</p>
                  <p className="text-sm text-gray-500">Create your first announcement to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 p-5"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-gray-900 mb-2">
                            {announcement.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getTypeColor(announcement.announcement_type)}`}>
                              {getTypeLabel(announcement.announcement_type)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getPriorityColor(announcement.priority)}`}>
                              {getPriorityLabel(announcement.priority)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusColor(announcement.status)}`}>
                              {getStatusLabel(announcement.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {announcement.content}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                        </span>

                        <div className="flex items-center gap-2">
                          {announcement.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(announcement.id, 'active')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all"
                            >
                              Publish
                            </button>
                          )}
                          {announcement.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(announcement.id, 'archived')}
                              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
