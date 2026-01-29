'use client';

import { useState, useMemo } from 'react';
import {
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  User,
  Building,
  DollarSign,
} from 'lucide-react';
import {
  useParseUsage,
  useSaveUsageEntries,
  type EnrichedUsageEntry,
  type ParseResponse,
} from '@/hooks/useMyraUsageParser';
import { useTrialOrganizations } from '@/hooks/useTrialOrganizations';

interface OrgOption {
  id: string;
  org_name: string;
}

export default function UsageInputParser() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [editedEntries, setEditedEntries] = useState<EnrichedUsageEntry[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const parseMutation = useParseUsage();
  const saveMutation = useSaveUsageEntries();

  // Fetch organizations using React Query hook
  const { data: orgData } = useTrialOrganizations({
    pageSize: 500, // Get all orgs for dropdown
  });

  // Map to expected format for dropdown
  const orgs = useMemo<OrgOption[]>(() => {
    return (orgData?.organizations || []).map((org) => ({
      id: org.org_id,
      org_name: org.org_name,
    }));
  }, [orgData?.organizations]);

  const handleParse = async () => {
    if (!inputText.trim()) return;

    try {
      const result = await parseMutation.mutateAsync(inputText);
      setParseResult(result);
      setEditedEntries(result.entries);
      setSaveSuccess(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleOrgChange = (index: number, orgId: string) => {
    const newEntries = [...editedEntries];
    newEntries[index] = {
      ...newEntries[index],
      matched_org_id: orgId || null,
      match_confidence: orgId ? 'high' : 'none',
    };
    setEditedEntries(newEntries);
  };

  const handleSave = async () => {
    if (editedEntries.length === 0) return;

    try {
      await saveMutation.mutateAsync(
        editedEntries.map((e) => ({
          conversation_title: e.conversation_title,
          user_name: e.user_name,
          timestamp: e.timestamp.toISOString(),
          cost: e.cost,
          matched_user_id: e.matched_user_id,
          matched_org_id: e.matched_org_id,
          match_method:
            e.match_confidence === 'none' || !e.matched_org_id
              ? ('manual' as const)
              : ('auto' as const),
        }))
      );
      setSaveSuccess(true);
      setInputText('');
      setParseResult(null);
      setEditedEntries([]);
    } catch {
      // Error handled by mutation
    }
  };

  const reset = () => {
    setInputText('');
    setParseResult(null);
    setEditedEntries([]);
    setSaveSuccess(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-neutral-900">
              myRA Usage Parser
            </h3>
            <p className="text-sm text-neutral-500">
              Paste usage data to track costs and activity
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-neutral-100">
          {/* Save Success */}
          {saveSuccess && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <p className="text-emerald-700">
                Usage data saved successfully!
              </p>
              <button
                onClick={() => setSaveSuccess(false)}
                className="ml-auto text-emerald-600 hover:text-emerald-700 text-sm"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Error Display */}
          {(parseMutation.error || saveMutation.error) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">
                  {(parseMutation.error as Error)?.message ||
                    (saveMutation.error as Error)?.message}
                </p>
              </div>
            </div>
          )}

          {/* Input Area (when no parse result) */}
          {!parseResult && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Paste myRA usage data:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Paste the usage data here. Expected format:

Conversation Title
myRA AI
User Name
Jan 23, Fri, 09:09 PM
$24.55

Another Conversation
myRA AI
Another User
Jan 23, Fri, 08:30 PM
$15.00`}
                className="w-full h-64 px-4 py-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none font-mono text-sm"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleParse}
                  disabled={!inputText.trim() || parseMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {parseMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Parse Data
                </button>
              </div>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && (
            <div className="mt-4">
              {/* Summary */}
              <div className="bg-amber-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-amber-900 mb-3">
                  Parse Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-amber-600">Conversations</p>
                    <p className="text-lg font-semibold text-amber-900">
                      {parseResult.summary.totalParsed}
                    </p>
                  </div>
                  <div>
                    <p className="text-amber-600">Total Cost</p>
                    <p className="text-lg font-semibold text-amber-900">
                      ${parseResult.summary.totalCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-amber-600">Unique Users</p>
                    <p className="text-lg font-semibold text-amber-900">
                      {parseResult.summary.uniqueUsers}
                    </p>
                  </div>
                  <div>
                    <p className="text-amber-600">Auto-Matched</p>
                    <p className="text-lg font-semibold text-amber-900">
                      {parseResult.summary.matchedUsers} /{' '}
                      {parseResult.summary.uniqueUsers}
                    </p>
                  </div>
                </div>
              </div>

              {/* Entries Table */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">
                          <User className="w-3 h-3 inline mr-1" />
                          User
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">
                          Conversation
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">
                          Date
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500">
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Cost
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">
                          <Building className="w-3 h-3 inline mr-1" />
                          Organization
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedEntries.map((entry, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="px-3 py-2 text-neutral-900">
                            {entry.user_name}
                          </td>
                          <td className="px-3 py-2 text-neutral-600 truncate max-w-48">
                            {entry.conversation_title}
                          </td>
                          <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-neutral-900">
                            ${entry.cost.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={entry.matched_org_id || ''}
                              onChange={(e) =>
                                handleOrgChange(i, e.target.value)
                              }
                              className={`w-full px-2 py-1 text-sm border rounded ${
                                entry.match_confidence === 'high'
                                  ? 'border-emerald-300 bg-emerald-50'
                                  : entry.match_confidence === 'low'
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-neutral-200'
                              }`}
                            >
                              <option value="">Select org...</option>
                              {entry.suggested_org_name &&
                                !orgs.find(
                                  (o) => o.id === entry.matched_org_id
                                ) && (
                                  <option value={entry.matched_org_id || ''}>
                                    {entry.suggested_org_name} (suggested)
                                  </option>
                                )}
                              {orgs.map((org) => (
                                <option key={org.id} value={org.id}>
                                  {org.org_name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={reset}
                  className="text-sm text-neutral-600 hover:text-neutral-800"
                >
                  ← Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save to Database
                </button>
              </div>

              {/* Parse Errors */}
              {parseResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    Parse Warnings:
                  </p>
                  <ul className="text-xs text-amber-600 space-y-1">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
