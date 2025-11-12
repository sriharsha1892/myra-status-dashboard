'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Tag,
  User,
  AlertTriangle,
  TrendingUp,
  Link2,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api-client';

interface EventDetailPanelProps {
  eventId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

interface EventData {
  id: string;
  event_timestamp: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  mentioned_people: string[];
  mentioned_features: string[];
  follow_up_required: boolean;
  parse_confidence: number;
  source: string;
  trial_organizations?: {
    org_name: string;
  };
  users?: {
    full_name: string;
    email: string;
  };
}

const EVENT_CATEGORIES = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'communication', label: 'Communication' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'support', label: 'Support' },
  { id: 'milestone', label: 'Milestone' },
  { id: 'sales', label: 'Sales' },
];

const SENTIMENT_OPTIONS = [
  { id: 'positive', label: 'Positive' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'negative', label: 'Negative' },
];

const SEVERITY_OPTIONS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

export default function EventDetailPanel({
  eventId,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}: EventDetailPanelProps) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [peopleInput, setPeopleInput] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');

  useEffect(() => {
    if (eventId && isOpen) {
      fetchEvent();
    }
  }, [eventId, isOpen]);

  const fetchEvent = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/timeline/events/${eventId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const eventData = result.data;
        setEvent(eventData);

        // Populate form
        setTitle(eventData.title);
        setDescription(eventData.description || '');
        setEventCategory(eventData.event_category);
        setSentiment(eventData.sentiment);
        setSeverity(eventData.severity);
        setFollowUpRequired(eventData.follow_up_required);
        setTagsInput(eventData.tags?.join(', ') || '');
        setPeopleInput(eventData.mentioned_people?.join(', ') || '');
        setFeaturesInput(eventData.mentioned_features?.join(', ') || '');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!eventId || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const response = await authenticatedFetch(`/api/timeline/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          event_category: eventCategory,
          sentiment,
          severity,
          follow_up_required: followUpRequired,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          mentioned_people: peopleInput.split(',').map(p => p.trim()).filter(Boolean),
          mentioned_features: featuresInput.split(',').map(f => f.trim()).filter(Boolean),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Event updated successfully');
        onSaved();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await authenticatedFetch(`/api/timeline/events/${eventId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Event deleted successfully');
        onDeleted();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error(error.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
                {event && (
                  <p className="text-sm text-gray-500 mt-1">
                    {event.trial_organizations?.org_name}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : event ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter event title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter event description"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={eventCategory}
                        onChange={(e) => setEventCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {EVENT_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sentiment
                      </label>
                      <select
                        value={sentiment}
                        onChange={(e) => setSentiment(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {SENTIMENT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {SEVERITY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={followUpRequired}
                          onChange={(e) => setFollowUpRequired(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Requires follow-up</span>
                      </label>
                    </div>
                  </div>

                  {/* Tags & Entities */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., trial, onboarding, technical-issue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      People Mentioned (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={peopleInput}
                      onChange={(e) => setPeopleInput(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., John Doe, Jane Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features Mentioned (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={featuresInput}
                      onChange={(e) => setFeaturesInput(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Dashboard, API, Reports"
                    />
                  </div>

                  {/* Event Info */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Event Information</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.event_timestamp), 'MMM d, yyyy h:mm a')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Event Type: {event.event_type.replace(/_/g, ' ')}
                      </div>
                      {event.users && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Logged by: {event.users.full_name}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Source: {event.source === 'bulk_import' ? 'Imported' : 'Manual'}
                      </div>
                      {event.source === 'bulk_import' && event.parse_confidence && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Confidence: {(event.parse_confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Related Events Placeholder */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Related Events</h3>
                    <p className="text-sm text-gray-500">No related events found</p>
                  </div>

                  {/* Pain Points & Learnings Placeholder */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Linked Pain Points & Learnings
                    </h3>
                    <p className="text-sm text-gray-500">
                      Link this event to pain points or learnings
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No event selected
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {event && !loading && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Event
                    </>
                  )}
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={saving || deleting}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || deleting || !title.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
