'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  type: 'feature' | 'update' | 'maintenance' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'draft' | 'active' | 'archived';
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
}

// Type styling
const TYPE_CONFIG = {
  feature: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Feature' },
  update: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Update' },
  maintenance: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Maintenance' },
  alert: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Alert' },
} as const;

// Priority styling
const PRIORITY_CONFIG = {
  low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Low' },
  normal: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Normal' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'High' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
} as const;

// Status styling
const STATUS_CONFIG = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
  archived: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Archived' },
} as const;

// Form modal component
function AnnouncementModal({
  announcement,
  onSave,
  onClose,
  isLoading,
}: {
  announcement: Announcement | null;
  onSave: (data: Partial<Announcement>) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    type: announcement?.type || 'update',
    priority: announcement?.priority || 'normal',
    status: announcement?.status || 'draft',
    title: announcement?.title || '',
    message: announcement?.message || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(announcement ? { id: announcement.id, ...formData } : formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/20 rounded-2xl shadow-2xl animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {announcement ? 'Edit Announcement' : 'Create Announcement'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Announcement title"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                placeholder="Announcement message..."
              />
            </div>

            {/* Type & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="feature">Feature</option>
                  <option value="update">Update</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="alert">Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="draft">Draft (not visible)</option>
                <option value="active">Active (visible on status page)</option>
                <option value="archived">Archived (hidden)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title || !formData.message}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all',
                  isLoading || !formData.title || !formData.message
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                )}
              >
                {isLoading ? 'Saving...' : announcement ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Announcement card
function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  announcement: Announcement;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const typeConfig = TYPE_CONFIG[announcement.type];
  const priorityConfig = PRIORITY_CONFIG[announcement.priority];
  const statusConfig = STATUS_CONFIG[announcement.status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 hover:bg-white/[0.06] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-2 truncate">
            {announcement.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase', typeConfig.bg, typeConfig.text)}>
              {typeConfig.label}
            </span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase', priorityConfig.bg, priorityConfig.text)}>
              {priorityConfig.label}
            </span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase', statusConfig.bg, statusConfig.text)}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStatus}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              announcement.status === 'active'
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            )}
          >
            {announcement.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-white/70 leading-relaxed mb-3 line-clamp-2">
        {announcement.message}
      </p>

      {/* Metadata */}
      <div className="text-[11px] text-white/40">
        Created: {formatDate(announcement.created_at)}
        {announcement.updated_at !== announcement.created_at && (
          <> • Updated: {formatDate(announcement.updated_at)}</>
        )}
      </div>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      // Fetch all announcements (not just active) for admin
      const response = await fetch('/api/announcements/admin');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch announcements');
      }

      setAnnouncements(data.announcements || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSave = async (formData: Partial<Announcement>) => {
    try {
      setSaving(true);

      const method = formData.id ? 'PUT' : 'POST';
      const response = await fetch('/api/announcements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save announcement');
      }

      setModalOpen(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete announcement');
      }

      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (announcement: Announcement) => {
    const newStatus = announcement.status === 'active' ? 'draft' : 'active';

    try {
      const response = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: announcement.id, status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Status Page Announcements</h1>
            <p className="text-sm text-white/60">
              Manage announcements displayed on the public status page
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAnnouncement(null);
              setModalOpen(true);
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <span>+</span> New Announcement
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(['all', 'active', 'draft', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              {f}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({announcements.filter((a) => a.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50">Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchAnnouncements}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-xl">
            <p className="text-white/50 mb-4">
              {filter === 'all'
                ? 'No announcements yet'
                : `No ${filter} announcements`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setModalOpen(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Create your first announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={() => {
                  setEditingAnnouncement(announcement);
                  setModalOpen(true);
                }}
                onDelete={() => handleDelete(announcement.id)}
                onToggleStatus={() => handleToggleStatus(announcement)}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">How it works</h3>
          <ul className="text-xs text-white/60 space-y-1">
            <li>• Only <strong>Active</strong> announcements appear on the public status page</li>
            <li>• <strong>Critical</strong> priority announcements appear first and have special styling</li>
            <li>• Users can dismiss announcements (resets after 24 hours)</li>
            <li>• Use <strong>Draft</strong> status to prepare announcements before publishing</li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <AnnouncementModal
          announcement={editingAnnouncement}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingAnnouncement(null);
          }}
          isLoading={saving}
        />
      )}
    </div>
  );
}
