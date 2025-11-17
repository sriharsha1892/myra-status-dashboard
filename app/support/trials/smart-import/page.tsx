'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Users, Building2, Activity } from 'lucide-react';

interface ParsedActivity {
  interaction_type: string;
  title: string;
  notes?: string;
  interaction_date?: string;
  duration_minutes?: number;
  conducted_by?: string;
}

interface ParsedUser {
  name: string;
  email: string;
  title?: string;
  designation?: string;
  phone?: string;
  activities?: ParsedActivity[];
}

interface ParsedOrganization {
  org_name: string;
  domain?: string;
  website_url?: string;
  description?: string;
  users: ParsedUser[];
}

interface ParseResult {
  success: boolean;
  parsed: ParsedOrganization[];
  existing_orgs: any[];
  existing_users: any[];
  stats: {
    total_organizations: number;
    total_users: number;
    total_activities: number;
    existing_organizations: number;
    existing_users: number;
    new_organizations: number;
    new_users: number;
  };
  duration_ms?: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function SmartImportPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [accountManagerId, setAccountManagerId] = useState('');
  const [accountManagers, setAccountManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    if (user && role) {
      fetchAccountManagers();
    }
  }, [user, authLoading, role, router]);

  const fetchAccountManagers = async () => {
    setLoading(true);
    try {
      const { data: managersData } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['Admin', 'Account Manager'])
        .order('full_name', { ascending: true });

      if (managersData) {
        setAccountManagers(managersData);

        // Auto-select current user if they're an AM
        if (role === 'AM' && user) {
          const currentManager = managersData.find((m: User) => m.id === user.id);
          if (currentManager) {
            setAccountManagerId(currentManager.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching account managers:', error);
      toast.error('Failed to load account managers');
    } finally {
      setLoading(false);
    }
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Please enter some text to parse');
      return;
    }

    setParsing(true);
    setParseResult(null);

    try {
      const response = await fetch('/api/trials/smart-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to parse text');
        return;
      }

      setParseResult(result);
      toast.success(`Extracted ${result.stats.total_organizations} organizations, ${result.stats.total_users} users, ${result.stats.total_activities} activities`);
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error('Failed to parse text');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || !accountManagerId) {
      toast.error('Please select an account manager');
      return;
    }

    setImporting(true);

    try {
      const response = await fetch('/api/trials/smart-import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizations: parseResult.parsed,
          account_manager_id: accountManagerId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Import failed');
        return;
      }

      const { results } = result;
      toast.success(
        `Import complete! Created ${results.organizations_created} orgs, ${results.users_created} users, ${results.activities_created} activities`
      );

      // Reset form
      setRawText('');
      setParseResult(null);

      // Redirect to trials list
      setTimeout(() => {
        router.push('/support/trials');
      }, 2000);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/support/trials')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-accent-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI-Powered Smart Import</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Paste any text - emails, notes, CRM exports. AI will extract organizations, users, and activities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Step 1: Paste Your Data</h3>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                placeholder="Paste anything here:

Example:
- Had a call with John from Acme Corp (john@acme.com) yesterday about their trial
- Sarah Miller (CEO at TechStart Inc, sarah@techstart.io) requested a demo
- Followed up with mike.jones@example.com from XYZ Limited re: integration questions
- 30 min demo with Jane at ABC Company on Monday"
              />

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">
                  {rawText.length} characters
                </p>
                <button
                  onClick={handleParse}
                  disabled={parsing || !rawText.trim()}
                  className="h-10 px-6 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {parsing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse with AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Account Manager Selection */}
            {parseResult && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 3: Assign Account Manager</h3>

                <select
                  value={accountManagerId}
                  onChange={(e) => setAccountManagerId(e.target.value)}
                  disabled={role === 'AM' || loading}
                  className={`w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                    role === 'AM' ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">Select account manager...</option>
                  {accountManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.email})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleImport}
                  disabled={importing || !accountManagerId}
                  className="w-full mt-4 h-11 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Import All Data
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            {parseResult ? (
              <>
                {/* Statistics */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Step 2: Review Extracted Data</h3>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-blue-600">
                        {parseResult.stats.total_organizations}
                      </div>
                      <div className="text-xs text-blue-700">Organizations</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-green-600">
                        {parseResult.stats.total_users}
                      </div>
                      <div className="text-xs text-green-700">Users</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <Activity className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-purple-600">
                        {parseResult.stats.total_activities}
                      </div>
                      <div className="text-xs text-purple-700">Activities</div>
                    </div>
                  </div>

                  {parseResult.stats.existing_organizations > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <strong>Note:</strong> {parseResult.stats.existing_organizations} organizations already exist and will be linked.
                      </div>
                    </div>
                  )}
                </div>

                {/* Parsed Organizations */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 max-h-[600px] overflow-y-auto">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Extracted Organizations</h4>

                  {parseResult.parsed.map((org, orgIdx) => (
                    <div key={orgIdx} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-semibold text-gray-900">{org.org_name}</div>
                      {org.domain && (
                        <div className="text-xs text-gray-500 mt-1">Domain: {org.domain}</div>
                      )}
                      {org.description && (
                        <div className="text-xs text-gray-600 mt-1">{org.description}</div>
                      )}

                      {/* Users */}
                      <div className="mt-3 space-y-2">
                        {org.users.map((user, userIdx) => (
                          <div key={userIdx} className="pl-4 border-l-2 border-accent-200">
                            <div className="text-sm font-medium text-gray-800">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                            {user.designation && (
                              <div className="text-xs text-gray-500">{user.designation}</div>
                            )}

                            {/* Activities */}
                            {user.activities && user.activities.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {user.activities.map((activity, actIdx) => (
                                  <div key={actIdx} className="text-xs text-gray-600 flex items-start gap-1">
                                    <Activity className="w-3 h-3 mt-0.5 text-purple-500" />
                                    <span>
                                      {activity.interaction_type}: {activity.title}
                                      {activity.interaction_date && ` (${activity.interaction_date})`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 text-center">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  Paste your data on the left and click "Parse with AI" to see extracted information here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
