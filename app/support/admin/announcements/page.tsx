'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  Megaphone, Plus, X, Edit2, Trash2, Sparkles, AlertTriangle,
  Info, ChevronLeft, Calendar, User
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: 'feature' | 'update' | 'maintenance' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'draft' | 'active' | 'archived';
  posted_by: string;
  expires_at: string | null;
  created_at: string;
}

export default function AnnouncementsManagementPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    // Check admin role
    if (user && role?.toLowerCase() !== 'admin') {
      router.push('/support/dashboard');
      toast.error('Admin access required');
      return;
    }

    if (user) {
      fetchAnnouncements();
    }
  }, [user, authLoading, role, router]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
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
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'draft' | 'active' | 'archived') => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Announcement ${newStatus}`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-4 h-4" strokeWidth={1.5} />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />;
      case 'maintenance':
        return <Info className="w-4 h-4" strokeWidth={1.5} />;
      default:
        return <Megaphone className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  const getTypeColor = (type: string, priority: string) => {
    if (priority === 'critical') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
        badge: 'bg-red-100 text-red-700'
      };
    }
    if (priority === 'high') {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700'
      };
    }

    switch (type) {
      case 'feature':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700'
        };
      case 'alert':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconText: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-700'
        };
      case 'maintenance':
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          iconBg: 'bg-slate-100',
          iconText: 'text-slate-600',
          badge: 'bg-slate-100 text-slate-700'
        };
      default:
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          iconBg: 'bg-purple-100',
          iconText: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-700'
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/support/dashboard')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
                <p className="text-sm text-slate-600">Manage platform announcements and updates</p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingAnnouncement(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              New Announcement
            </button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No announcements yet</h3>
              <p className="text-sm text-slate-600 mb-4">
                Create your first announcement to notify users about updates and features
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Create Announcement
              </button>
            </div>
          ) : (
            announcements.map((announcement) => {
              const colors = getTypeColor(announcement.announcement_type, announcement.priority);

              return (
                <div
                  key={announcement.id}
                  className={`bg-white rounded-lg border ${colors.border} p-4 hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`${colors.iconBg} rounded-lg p-2 flex items-center justify-center flex-shrink-0`}>
                      <div className={colors.iconText}>
                        {getIcon(announcement.announcement_type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-slate-900">
                              {announcement.title}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wide rounded ${colors.badge}`}>
                              {announcement.announcement_type}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              announcement.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              announcement.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {announcement.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed mb-2">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" strokeWidth={1.5} />
                              {announcement.posted_by}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" strokeWidth={1.5} />
                              {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                            </span>
                            {announcement.expires_at && (
                              <span>Expires: {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
                            )}
                            <span className="font-medium capitalize">{announcement.priority} Priority</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {announcement.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(announcement.id, 'active')}
                              className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                            >
                              Publish
                            </button>
                          )}
                          {announcement.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(announcement.id, 'archived')}
                              className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                              Archive
                            </button>
                          )}
                          {announcement.status === 'archived' && (
                            <button
                              onClick={() => handleStatusChange(announcement.id, 'active')}
                              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingAnnouncement(announcement);
                              setShowCreateModal(true);
                            }}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateAnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAnnouncement(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingAnnouncement(null);
            fetchAnnouncements();
          }}
          userEmail={user?.email || ''}
        />
      )}
    </div>
  );
}

interface CreateAnnouncementModalProps {
  announcement: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
}

function CreateAnnouncementModal({ announcement, onClose, onSuccess, userEmail }: CreateAnnouncementModalProps) {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    announcement_type: announcement?.announcement_type || 'update' as const,
    priority: announcement?.priority || 'normal' as const,
    status: announcement?.status || 'draft' as const,
    expires_at: announcement?.expires_at ? format(new Date(announcement.expires_at), 'yyyy-MM-dd') : '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        announcement_type: formData.announcement_type,
        priority: formData.priority,
        status: formData.status,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        posted_by: userEmail.split('@')[0],
      };

      if (announcement) {
        // Update existing
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', announcement.id);

        if (error) throw error;
        toast.success('Announcement updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('announcements')
          .insert(payload);

        if (error) throw error;
        toast.success('Announcement created');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {announcement ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter announcement title"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Enter announcement content"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.announcement_type}
                onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="feature">Feature</option>
                <option value="update">Update</option>
                <option value="maintenance">Maintenance</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Status & Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expires At (Optional)</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : announcement ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
