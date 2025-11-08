'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  LogIn, MessageSquare, FileText, Star, Video, Play, CheckCircle,
  Clock, AlertCircle, CheckCircle2, AlertTriangle, Lightbulb,
  Phone, PhoneOff, Calendar, ShieldAlert, MessageCircle, X
} from 'lucide-react';

interface ActivityTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  default_description: string;
  requires_details: boolean;
}

interface QuickActivityLoggerProps {
  trialOrgId: string;
  onActivityLogged?: () => void;
}

const ICON_MAP: Record<string, any> = {
  LogIn, MessageSquare, FileText, Star, Video, Play, CheckCircle,
  Clock, AlertCircle, CheckCircle2, AlertTriangle, Lightbulb,
  Phone, PhoneOff, Calendar, ShieldAlert, MessageCircle
};

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

export default function QuickActivityLogger({ trialOrgId, onActivityLogged }: QuickActivityLoggerProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplate | null>(null);
  const [details, setDetails] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Predefined templates (matching database)
  const templates: ActivityTemplate[] = [
    { id: '1', name: 'user_login', category: 'usage', icon: 'LogIn', color: 'blue', default_description: 'User logged into the platform', requires_details: false },
    { id: '2', name: 'questions_asked', category: 'usage', icon: 'MessageSquare', color: 'purple', default_description: 'User asked questions', requires_details: true },
    { id: '3', name: 'report_generated', category: 'usage', icon: 'FileText', color: 'green', default_description: 'User generated a report', requires_details: true },
    { id: '4', name: 'expert_review_requested', category: 'usage', icon: 'Star', color: 'yellow', default_description: 'User requested expert review', requires_details: true },
    { id: '5', name: 'demo_completed', category: 'engagement', icon: 'Video', color: 'indigo', default_description: 'Demo session completed', requires_details: true },
    { id: '6', name: 'call_completed', category: 'admin', icon: 'PhoneOff', color: 'green', default_description: 'Call/meeting completed', requires_details: true },
    { id: '7', name: 'trial_extended', category: 'admin', icon: 'Calendar', color: 'orange', default_description: 'Trial period extended', requires_details: true },
    { id: '8', name: 'technical_issue', category: 'support', icon: 'AlertTriangle', color: 'red', default_description: 'Technical issue encountered', requires_details: true },
    { id: '9', name: 'policy_violation', category: 'admin', icon: 'ShieldAlert', color: 'red', default_description: 'Policy violation flagged', requires_details: true },
    { id: '10', name: 'feedback_received', category: 'admin', icon: 'MessageCircle', color: 'blue', default_description: 'Customer feedback received', requires_details: true },
  ];

  const handleQuickLog = async (template: ActivityTemplate) => {
    if (template.requires_details) {
      setSelectedTemplate(template);
      setShowModal(true);
    } else {
      await logActivity(template, template.default_description);
    }
  };

  const logActivity = async (template: ActivityTemplate, description: string, meta?: Record<string, any>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('trial_activities')
        .insert({
          trial_org_id: trialOrgId,
          activity_type: template.name,
          title: template.default_description,
          description: description || template.default_description,
          metadata: meta || {},
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Activity logged successfully');
      setShowModal(false);
      setSelectedTemplate(null);
      setDetails('');
      setMetadata({});
      onActivityLogged?.();
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDetails = () => {
    if (!selectedTemplate) return;
    logActivity(selectedTemplate, details, metadata);
  };

  const categoryGroups = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ActivityTemplate[]>);

  return (
    <>
      {/* Quick Action Buttons */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Quick Log Activity</h3>

        {Object.entries(categoryGroups).map(([category, categoryTemplates]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              {category}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryTemplates.map((template) => {
                const Icon = ICON_MAP[template.icon];
                return (
                  <button
                    key={template.id}
                    onClick={() => handleQuickLog(template)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-all ${COLOR_MAP[template.color]}`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="text-xs">{template.default_description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {ICON_MAP[selectedTemplate.icon] && (
                  <div className={`p-2 rounded-lg ${COLOR_MAP[selectedTemplate.color]}`}>
                    {(() => {
                      const Icon = ICON_MAP[selectedTemplate.icon];
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedTemplate.default_description}
                  </h3>
                  <p className="text-sm text-slate-500">Add details below</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedTemplate(null);
                  setDetails('');
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any relevant details..."
                />
              </div>

              {/* Special fields based on activity type */}
              {selectedTemplate.name === 'questions_asked' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of questions
                  </label>
                  <input
                    type="number"
                    value={metadata.count || ''}
                    onChange={(e) => setMetadata({ ...metadata, count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 5"
                  />
                </div>
              )}

              {selectedTemplate.name === 'report_generated' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Report title
                  </label>
                  <input
                    type="text"
                    value={metadata.report_title || ''}
                    onChange={(e) => setMetadata({ ...metadata, report_title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Market Analysis Report"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTemplate(null);
                    setDetails('');
                  }}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDetails}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Logging...' : 'Log Activity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
