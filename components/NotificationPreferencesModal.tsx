'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { X, Bell, Check } from 'lucide-react';

interface NotificationPreference {
  notification_type: string;
  enabled: boolean;
  label: string;
  description: string;
}

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

const NOTIFICATION_TYPES: Omit<NotificationPreference, 'enabled'>[] = [
  {
    notification_type: 'mention',
    label: 'Mentions',
    description: 'When someone mentions you in a note or comment',
  },
  {
    notification_type: 'issue',
    label: 'Issues',
    description: 'When a new issue is reported for an organization',
  },
  {
    notification_type: 'new_note',
    label: 'New Notes',
    description: 'When a new note is added to an organization',
  },
  {
    notification_type: 'ticket_assigned',
    label: 'Ticket Assignments',
    description: 'When a ticket is assigned to you',
  },
  {
    notification_type: 'ticket_status_change',
    label: 'Ticket Status Changes',
    description: 'When a ticket status is updated',
  },
  {
    notification_type: 'roadmap_update',
    label: 'Roadmap Updates',
    description: 'When product roadmap items are updated',
  },
  {
    notification_type: 'feature_request',
    label: 'Feature Requests',
    description: 'When new feature requests are submitted',
  },
];

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
  userEmail,
}: NotificationPreferencesModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && userEmail) {
      fetchPreferences();
    }
  }, [isOpen, userEmail]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      // Try to fetch existing preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_email', userEmail);

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        throw error;
      }

      // Create a map of existing preferences
      const existingPrefsMap = new Map(
        (data || []).map((pref: any) => [pref.notification_type, pref.enabled])
      );

      // Merge with default notification types
      const mergedPreferences = NOTIFICATION_TYPES.map((type) => ({
        ...type,
        enabled: existingPrefsMap.get(type.notification_type) ?? true, // Default to enabled
      }));

      setPreferences(mergedPreferences);
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      // If table doesn't exist, just use defaults
      setPreferences(
        NOTIFICATION_TYPES.map((type) => ({ ...type, enabled: true }))
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (notificationType: string) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.notification_type === notificationType
          ? { ...pref, enabled: !pref.enabled }
          : pref
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing preferences for this user
      await supabase
        .from('user_notification_preferences')
        .delete()
        .eq('user_email', userEmail);

      // Insert new preferences
      const prefsToInsert = preferences.map((pref) => ({
        user_email: userEmail,
        notification_type: pref.notification_type,
        enabled: pref.enabled,
      }));

      const { error } = await supabase
        .from('user_notification_preferences')
        .insert(prefsToInsert);

      if (error) throw error;

      toast.success('Notification preferences saved successfully');
      onClose();
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      toast.error(
        error.message || 'Failed to save notification preferences. The feature may not be set up yet.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Notification Preferences
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Choose which notifications you want to receive
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {preferences.map((pref) => (
                <button
                  key={pref.notification_type}
                  onClick={() => togglePreference(pref.notification_type)}
                  className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-left group hover:shadow-md ${
                    pref.enabled
                      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        pref.enabled
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-slate-300 group-hover:border-slate-400'
                      }`}
                    >
                      {pref.enabled && (
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-base font-bold mb-1 ${
                          pref.enabled ? 'text-blue-900' : 'text-slate-900'
                        }`}
                      >
                        {pref.label}
                      </h4>
                      <p
                        className={`text-sm ${
                          pref.enabled ? 'text-blue-700' : 'text-slate-600'
                        }`}
                      >
                        {pref.description}
                      </p>
                    </div>

                    {/* Status indicator */}
                    <div
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                        pref.enabled
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {pref.enabled ? 'ON' : 'OFF'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Info box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bell className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  About Notifications
                </p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Notifications help you stay informed about important activities.
                  You can customize which events trigger notifications based on your
                  preferences.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 px-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
