'use client';

/**
 * QuickEntryForm - Seamless timeline event entry
 * Replaces old LogActivityModal with enhanced UX
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, Calendar, Copy, Check } from 'lucide-react';
import { searchEventTypes, getDisplayName } from '@/lib/timeline/activityMatcher';
import { EVENT_TAXONOMY } from '@/lib/timeline/llmParser';
import toast from 'react-hot-toast';

interface QuickEntryFormProps {
  orgId: string;
  orgName: string;
  onClose: () => void;
  onSuccess: () => void;
  prefillData?: Partial<FormData>;
}

interface FormData {
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  event_timestamp: string; // ISO date string
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  mentioned_people: string[];
  mentioned_features: string[];
  follow_up_required: boolean;
  follow_up_date: string | null;
}

interface RecentEntry {
  id: string;
  event_timestamp: string;
  event_type: string;
  event_category: string;
  title: string;
}

// Common templates
const QUICK_TEMPLATES = [
  {
    name: 'Demo Call',
    icon: '📞',
    data: {
      event_type: 'demo_conducted',
      event_category: 'communication',
      title: 'Product demo conducted',
      sentiment: 'positive' as const,
    },
  },
  {
    name: 'Support Email',
    icon: '📧',
    data: {
      event_type: 'email_exchange',
      event_category: 'communication',
      title: 'Support email exchange',
      sentiment: 'neutral' as const,
    },
  },
  {
    name: 'Feature Request',
    icon: '💡',
    data: {
      event_type: 'feature_request',
      event_category: 'feedback',
      title: 'Feature request from customer',
      sentiment: 'neutral' as const,
    },
  },
  {
    name: 'Bug Report',
    icon: '🐛',
    data: {
      event_type: 'bug_reported',
      event_category: 'support',
      title: 'Bug reported by customer',
      sentiment: 'negative' as const,
    },
  },
  {
    name: 'Follow-up',
    icon: '📅',
    data: {
      event_type: 'follow_up_sent',
      event_category: 'communication',
      title: 'Follow-up sent',
      sentiment: 'neutral' as const,
      follow_up_required: true,
    },
  },
  {
    name: 'General Note',
    icon: '📝',
    data: {
      event_type: 'sales_note',
      event_category: 'sales',
      title: 'Sales note',
      sentiment: 'neutral' as const,
    },
  },
];

export default function QuickEntryForm({
  orgId,
  orgName,
  onClose,
  onSuccess,
  prefillData,
}: QuickEntryFormProps) {
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    event_type: prefillData?.event_type || '',
    event_category: prefillData?.event_category || '',
    title: prefillData?.title || '',
    description: prefillData?.description || '',
    event_timestamp: prefillData?.event_timestamp || new Date().toISOString().slice(0, 16),
    sentiment: prefillData?.sentiment || 'neutral',
    tags: prefillData?.tags || [],
    mentioned_people: prefillData?.mentioned_people || [],
    mentioned_features: prefillData?.mentioned_features || [],
    follow_up_required: prefillData?.follow_up_required || false,
    follow_up_date: prefillData?.follow_up_date || null,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [recentTypes, setRecentTypes] = useState<Array<{ event_type: string; event_category: string }>>([]);
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [copiedFromPrevious, setCopiedFromPrevious] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const typeInputRef = useRef<HTMLInputElement>(null);

  // Load recent entries and user preferences
  useEffect(() => {
    loadRecentData();
  }, [orgId]);

  const loadRecentData = async () => {
    try {
      // Fetch recent entries for this org
      const { data: entries } = await supabase
        .from('trial_timeline_events')
        .select('id, event_timestamp, event_type, event_category, title')
        .eq('org_id', orgId)
        .order('event_timestamp', { ascending: false })
        .limit(5);

      if (entries) {
        setRecentEntries(entries);
      }

      // Fetch user's recent types
      const response = await fetch('/api/timeline/quick-entry');
      if (response.ok) {
        const data = await response.json();
        setRecentTypes(data.recent_types || []);
      }
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  };

  // Apply template
  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      ...template.data,
    });
    setTypeSearchQuery('');
  };

  // Copy from previous entry
  const copyPreviousEntry = () => {
    if (recentEntries.length === 0) return;

    const previous = recentEntries[0];
    setFormData({
      ...formData,
      event_type: previous.event_type,
      event_category: previous.event_category,
      title: previous.title,
    });
    setCopiedFromPrevious(true);
    setTimeout(() => setCopiedFromPrevious(false), 2000);
  };

  // Handle event type search
  const handleTypeSearch = (query: string) => {
    setTypeSearchQuery(query);
    setShowTypeSuggestions(true);
  };

  const selectEventType = (type: string, category: string) => {
    setFormData({
      ...formData,
      event_type: type,
      event_category: category,
    });
    setTypeSearchQuery('');
    setShowTypeSuggestions(false);
  };

  // Get type suggestions
  const typeSuggestions = typeSearchQuery
    ? searchEventTypes(typeSearchQuery, 10)
    : [
        // Show recent types first if no search query
        ...recentTypes.map(rt => ({
          event_type: rt.event_type,
          event_category: rt.event_category,
          confidence: 1.0,
          reason: 'Recently used',
          icon: EVENT_TAXONOMY.find(et => et.type === rt.event_type)?.icon || '📝',
          display_name: getDisplayName(rt.event_type),
        })),
        // Then show all event types
        ...EVENT_TAXONOMY.slice(0, 10 - recentTypes.length).map(et => ({
          event_type: et.type,
          event_category: et.category,
          confidence: 1.0,
          reason: 'All types',
          icon: et.icon,
          display_name: getDisplayName(et.type),
        })),
      ];

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.event_type || !formData.title || !formData.event_timestamp) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/timeline/quick-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create event');
      }

      toast.success('Timeline entry added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || 'Failed to create timeline entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Timeline Entry</h2>
            <p className="text-sm text-gray-500">{orgName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Type */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type *
              {recentEntries.length > 0 && (
                <button
                  type="button"
                  onClick={copyPreviousEntry}
                  className="ml-2 text-blue-600 hover:text-blue-700 text-xs inline-flex items-center gap-1"
                >
                  {copiedFromPrevious ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Previous</span>
                    </>
                  )}
                </button>
              )}
            </label>
            <input
              ref={typeInputRef}
              type="text"
              value={typeSearchQuery || getDisplayName(formData.event_type)}
              onChange={(e) => handleTypeSearch(e.target.value)}
              onFocus={() => setShowTypeSuggestions(true)}
              placeholder="Search or select activity type..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Suggestions Dropdown */}
            {showTypeSuggestions && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {recentTypes.length > 0 && typeSearchQuery === '' && (
                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    Recently Used
                  </div>
                )}
                {typeSuggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion.event_type}-${idx}`}
                    type="button"
                    onClick={() => selectEventType(suggestion.event_type, suggestion.event_category)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                  >
                    <span className="text-xl">{suggestion.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.display_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {suggestion.event_category} {suggestion.reason && `• ${suggestion.reason}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date & Time *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, event_timestamp: new Date().toISOString().slice(0, 16) })}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setFormData({ ...formData, event_timestamp: yesterday.toISOString().slice(0, 16) });
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Yesterday
              </button>
              <input
                type="datetime-local"
                value={formData.event_timestamp}
                onChange={(e) => setFormData({ ...formData, event_timestamp: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title for this activity..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sentiment
            </label>
            <div className="flex gap-2">
              {(['positive', 'neutral', 'negative'] as const).map((sentiment) => (
                <button
                  key={sentiment}
                  type="button"
                  onClick={() => setFormData({ ...formData, sentiment })}
                  className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-colors ${
                    formData.sentiment === sentiment
                      ? sentiment === 'positive'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : sentiment === 'negative'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-gray-50 border-gray-500 text-gray-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {sentiment === 'positive' && '😊 Positive'}
                  {sentiment === 'neutral' && '😐 Neutral'}
                  {sentiment === 'negative' && '☹️ Negative'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Follow-up */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.follow_up_required}
                onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Requires follow-up</span>
            </label>
            {formData.follow_up_required && (
              <input
                type="date"
                value={formData.follow_up_date || ''}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Recent Entries (Context) */}
          {recentEntries.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Entries (This Org)</h3>
              <div className="space-y-2">
                {recentEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="text-xs text-gray-600 flex items-start gap-2">
                    <Calendar className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {new Date(entry.event_timestamp).toLocaleDateString()}:
                      </span>{' '}
                      <span className="truncate">{entry.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Entry</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
