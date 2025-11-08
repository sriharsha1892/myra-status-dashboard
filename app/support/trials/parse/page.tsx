'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Sparkles,
  Building2,
  Users,
  Activity,
  Calendar,
  Hash,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';

interface ParsedResult {
  session_id: string;
  parsed: {
    orgs: any[];
    users: any[];
    activities: any[];
    dates: any[];
    numbers: any[];
    features: any[];
    models: any[];
    overall_confidence: number;
  };
  duplicates: {
    orgs: any[];
    users: any[];
  };
  confidence: {
    overall: number;
    details: Record<string, number>;
  };
}

export default function TextParserPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState<'email' | 'meeting_notes' | 'call_summary' | 'manual_entry'>('meeting_notes');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;

    setParsing(true);
    try {
      const response = await fetch('/api/trials/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source_type: sourceType })
      });

      if (!response.ok) {
        throw new Error('Failed to parse text');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error parsing text:', error);
      alert('Failed to parse text. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      // Prepare data for saving
      const selectedOrg = result.parsed.orgs.length > 0 ? {
        name: result.parsed.orgs[0].value,
        metadata: result.parsed.orgs[0].metadata
      } : null;

      const selectedUsers = result.parsed.users
        .filter(u => u.metadata?.email)
        .map(u => ({
          email: u.metadata.email,
          full_name: u.value
        }));

      const selectedActivities = result.parsed.activities.map(a => ({
        type: a.value,
        title: a.metadata?.phrase || a.value,
        description: a.metadata?.context || null,
        metadata: a.metadata,
        feature: result.parsed.features.find(f => f.confidence > 80)?.value,
        model: result.parsed.models.find(m => m.confidence > 80)?.value
      }));

      const response = await fetch('/api/trials/save-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: result.session_id,
          selected_org: selectedOrg,
          selected_users: selectedUsers,
          selected_activities: selectedActivities,
          auto_link_decisions: {} // TODO: Handle duplicate resolution
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      const saved = await response.json();

      // Show success and redirect
      alert(`Success! Created ${saved.counts.orgs} org, ${saved.counts.users} users, ${saved.counts.activities} activities`);
      router.push('/support/trials');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return <CheckCircle2 className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Text Intel Parser</h1>
            <p className="text-sm text-slate-600">Paste meeting notes, emails, or call summaries to extract trial data</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-slate-900">Source Type</label>
              <div className="flex gap-2">
                {[
                  { value: 'meeting_notes', label: 'Meeting Notes' },
                  { value: 'email', label: 'Email' },
                  { value: 'call_summary', label: 'Call Summary' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSourceType(type.value as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      sourceType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your meeting notes, email thread, or call summary here...

Example:
Had demo with Acme Corp today. John Doe and Jane Smith from their product team attended. Went really well - they asked 15 questions about the presentation builder and web scout features. They're using GPT-5 currently. Trial extended by 2 weeks."
              className="w-full h-96 px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">
                {text.length} characters, {text.split(/\s+/).filter(w => w.length > 0).length} words
              </span>
              <button
                onClick={handleParse}
                disabled={!text.trim() || parsing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Parse Text
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Overall Confidence */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 mb-1">Overall Confidence</h3>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${getConfidenceColor(result.confidence.overall)}`}>
                        {getConfidenceIcon(result.confidence.overall)}
                        {result.confidence.overall}%
                      </div>
                      {result.confidence.overall >= 90 && (
                        <span className="text-xs text-green-600">High confidence - ready to save</span>
                      )}
                      {result.confidence.overall >= 70 && result.confidence.overall < 90 && (
                        <span className="text-xs text-yellow-600">Review recommended</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save All
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Extracted Entities */}
              <div className="space-y-3">
                {/* Organizations */}
                {result.parsed.orgs.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-medium text-slate-900">Organizations ({result.parsed.orgs.length})</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(result.confidence.details.orgs)}`}>
                        {result.confidence.details.orgs}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      {result.parsed.orgs.map((org, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-900">{org.value}</span>
                          <span className="text-xs text-slate-500">{org.confidence}% confidence</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {result.parsed.users.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-green-600" />
                      <h3 className="text-sm font-medium text-slate-900">Users ({result.parsed.users.length})</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(result.confidence.details.users)}`}>
                        {result.confidence.details.users}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      {result.parsed.users.map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-900">{user.value}</span>
                            {user.metadata?.email && (
                              <span className="text-xs text-slate-500">{user.metadata.email}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{user.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {result.parsed.activities.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-medium text-slate-900">Activities ({result.parsed.activities.length})</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(result.confidence.details.activities)}`}>
                        {result.confidence.details.activities}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      {result.parsed.activities.map((activity, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-900">{activity.value.replace(/_/g, ' ')}</span>
                            {activity.metadata?.phrase && (
                              <span className="text-xs text-slate-500">Detected: &quot;{activity.metadata.phrase}&quot;</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{activity.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features & Models */}
                {(result.parsed.features.length > 0 || result.parsed.models.length > 0) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-medium text-slate-900 mb-3">Product Usage</h3>
                    <div className="space-y-2">
                      {result.parsed.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm text-slate-900">Feature: {feature.value}</span>
                          <span className="ml-auto text-xs text-slate-500">{feature.confidence}%</span>
                        </div>
                      ))}
                      {result.parsed.models.map((model, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                          <Hash className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-sm text-slate-900">Model: {model.value}</span>
                          <span className="ml-auto text-xs text-slate-500">{model.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Numbers */}
                {result.parsed.numbers.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-medium text-slate-900 mb-3">Metrics</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {result.parsed.numbers.map((num, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm text-slate-900">{num.value} {num.metadata?.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500">Paste text and click &quot;Parse Text&quot; to see extracted data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
