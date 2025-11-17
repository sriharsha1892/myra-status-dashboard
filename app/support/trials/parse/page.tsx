'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
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
  ArrowRight,
  ArrowLeft,
  Edit3,
  Save,
  Link,
  Trash2,
  Plus,
  DollarSign,
  Clock,
  UserCheck,
  X,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as fuzz from 'fuzzball';
import {
  createTrialOrganizationAtomic,
  verifyAtomicCreation,
  verifyDatabaseRecords,
  type PlatformQueryData,
  type UserInteractionData
} from '@/lib/supabase/rpc';
import {
  createImportResults,
  addSuccess,
  addFailure,
  addWarning,
  verifyImportCounts,
  addDatabaseVerification,
  generateImportSummary,
  getImportToastMessage
} from '@/lib/errors/importResultsFormatter';
import { getErrorMessage } from '@/lib/errorHandler';
import { generateOrgDescription } from '@/lib/ai/descriptionGenerator';
import { parseQueryCSV, type ParsedQuery } from '@/lib/parsers/query-csv-parser';

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

interface SalesPOC {
  id: string;
  name: string;
  email: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EditableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isPrimary: boolean;
  phone?: string;
}

interface EditableActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  duration_minutes: number | null;
  confidence: number;
  selected: boolean;
  assignedUserId?: string;
}

interface EditablePlatformQuery {
  id: string;
  queryTopic: string;
  queryText: string;
  userName: string;
  executedAt: string;
  status: 'success' | 'partial' | 'failed' | 'timeout';
  confidenceScore: number;
  responseTimeMs?: number;
  sessionId?: string;
  confidence: number;
  selected: boolean;
  assignedUserId?: string;
}

const DOMAIN_OPTIONS = [
  { value: 'AAD', label: 'AAD' },
  { value: 'AF&B', label: 'AF&B' },
  { value: 'E&C', label: 'E&C' },
  { value: 'HC', label: 'HC' },
  { value: 'NEO', label: 'NEO' },
  { value: 'TMT', label: 'TMT' },
  { value: 'Unassigned', label: 'Unassigned' },
];

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'demo', label: 'Demo' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Chat' },
  { value: 'training', label: 'Training' },
  { value: 'support', label: 'Support' },
];

export default function TextParserPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [text, setText] = useState('');
  const [platformQueriesCSV, setPlatformQueriesCSV] = useState('');
  const [sourceType, setSourceType] = useState<'email' | 'meeting_notes' | 'call_summary' | 'manual_entry'>('meeting_notes');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Editable Organization Fields
  const [orgName, setOrgName] = useState('');
  const [domain, setDomain] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [parentOrganization, setParentOrganization] = useState<'Mordor Intelligence' | 'GMI'>('Mordor Intelligence');
  const [trialDuration, setTrialDuration] = useState('');
  const [salesPOCId, setSalesPOCId] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');

  // Editable Users List
  const [users, setUsers] = useState<EditableUser[]>([]);

  // Editable Activities List
  const [activities, setActivities] = useState<EditableActivity[]>([]);

  // Editable Platform Queries List
  const [platformQueries, setPlatformQueries] = useState<EditablePlatformQuery[]>([]);

  // Dropdowns data
  const [salesPOCs, setSalesPOCs] = useState<SalesPOC[]>([]);
  const [accountManagers, setAccountManagers] = useState<User[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      // Fetch sales POCs
      const { data: pocsData } = await supabase
        .from('sales_pocs')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (pocsData) setSalesPOCs(pocsData);

      // Fetch account managers
      const { data: managersData } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['Admin', 'Account Manager'])
        .order('full_name', { ascending: true });

      if (managersData) {
        // Map full_name to name for compatibility
        const mappedManagers = managersData.map((m: any) => ({
          id: m.id,
          name: m.full_name,
          email: m.email,
          role: m.role
        }));
        setAccountManagers(mappedManagers);

        // Auto-select current user if they're an AM
        if ((role === 'Account Manager' || role === 'Admin') && user) {
          const currentManager = mappedManagers.find((m: User) => m.id === user.id);
          if (currentManager) {
            setAccountManagerId(currentManager.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handlePlatformQueriesCSVChange = (csvText: string) => {
    setPlatformQueriesCSV(csvText);

    if (!csvText || csvText.trim().length === 0) {
      setPlatformQueries([]);
      return;
    }

    try {
      const parseResult = parseQueryCSV(csvText);

      if (parseResult.errors.length > 0) {
        const errorMessages = parseResult.errors
          .slice(0, 3)
          .map(e => `Row ${e.row}: ${e.message}`)
          .join('\n');

        toast.error(
          `CSV parsing errors (${parseResult.errors.length} total):\n${errorMessages}${
            parseResult.errors.length > 3 ? '\n...' : ''
          }`,
          { duration: 5000 }
        );
      }

      // Convert parsed queries to editable format with fuzzy user matching
      const editableQueries: EditablePlatformQuery[] = parseResult.queries.map((q) => {
        // Fuzzy match user name with existing users
        const matchedUser = users.find((u) => {
          const similarity = fuzz.ratio(
            q.user_name.toLowerCase(),
            u.name.toLowerCase()
          );
          return similarity >= 85; // 85% similarity threshold
        });

        return {
          id: `temp-${Date.now()}-${Math.random()}`,
          queryTopic: q.query_topic,
          queryText: q.query_text,
          userName: q.user_name,
          executedAt: q.executed_at,
          status: q.status || 'success',
          confidenceScore: q.confidence_score || 0,
          responseTimeMs: undefined,
          sessionId: undefined,
          confidence: 90, // Default confidence for CSV imports
          selected: true,
          assignedUserId: matchedUser?.id, // Will be undefined if no match found
        };
      });

      setPlatformQueries(editableQueries);

      // Show summary toast
      const matchedCount = editableQueries.filter((q) => q.assignedUserId).length;
      const unmatchedCount = editableQueries.length - matchedCount;

      if (unmatchedCount > 0) {
        toast.success(
          `Parsed ${editableQueries.length} queries. ${matchedCount} matched to users, ${unmatchedCount} need manual assignment.`,
          { duration: 4000 }
        );
      } else {
        toast.success(`Parsed ${editableQueries.length} queries. All matched to users!`, {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error parsing platform queries CSV:', error);
      toast.error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const extractWebsiteFromText = (text: string, orgName: string): string => {
    // Try to find URLs in text
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|net|org|io|ai|co))/g;
    const matches = text.match(urlRegex);

    if (matches && matches.length > 0) {
      return matches[0].startsWith('http') ? matches[0] : `https://${matches[0]}`;
    }

    // Try to derive from org name
    if (orgName) {
      const cleaned = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return `https://${cleaned}.com`;
    }

    return '';
  };

  const extractLogoUrl = (websiteUrl: string): string => {
    if (!websiteUrl) return '';

    try {
      const url = new URL(websiteUrl);
      const domain = url.hostname.replace('www.', '');
      // Use Clearbit Logo API as fallback
      return `https://logo.clearbit.com/${domain}`;
    } catch {
      return '';
    }
  };

  const generateDescription = (orgName: string, text: string): string => {
    // Extract relevant context from text
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const relevantSentences = sentences.filter(s =>
      s.toLowerCase().includes(orgName.toLowerCase()) ||
      s.toLowerCase().includes('company') ||
      s.toLowerCase().includes('organization') ||
      s.toLowerCase().includes('business')
    );

    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 2).join('. ').trim().substring(0, 300);
    }

    return `${orgName} is a trial organization.`;
  };

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

      // Auto-populate organization fields
      if (data.parsed.orgs.length > 0) {
        const org = data.parsed.orgs[0];
        const extractedOrgName = org.value;
        setOrgName(extractedOrgName);

        const extractedWebsite = extractWebsiteFromText(text, extractedOrgName);
        setWebsiteUrl(extractedWebsite);

        const extractedLogo = extractLogoUrl(extractedWebsite);
        setLogoUrl(extractedLogo);

        const extractedDesc = generateDescription(extractedOrgName, text);
        setDescription(extractedDesc);
      }

      // Extract enhanced business data from numbers
      const contractVal = data.parsed.numbers.find((n: any) => n.metadata?.source === 'contract_value');
      const team = data.parsed.numbers.find((n: any) => n.metadata?.source === 'team_size');
      const duration = data.parsed.numbers.find((n: any) => n.metadata?.source === 'trial_duration');

      if (contractVal) setContractValue(contractVal.metadata.formatted || contractVal.value);
      if (team) setTeamSize(team.value);
      if (duration) setTrialDuration(duration.value);

      // Auto-populate users list
      if (data.parsed.users.length > 0) {
        const extractedUsers: EditableUser[] = data.parsed.users.map((usr: any, idx: number) => ({
          id: `user-${idx}`,
          name: usr.value,
          email: usr.metadata?.email || '',
          role: usr.metadata?.role || '',
          phone: usr.metadata?.phone || '',
          isPrimary: idx === 0
        }));
        setUsers(extractedUsers);
      }

      // Auto-populate account manager from extracted text
      const extractedAccountManager = data.parsed.users.find((usr: any) =>
        usr.metadata?.source === 'account_manager_pattern' ||
        usr.metadata?.is_account_manager === true ||
        usr.metadata?.role === 'Account Manager'
      );

      if (extractedAccountManager && accountManagers.length > 0) {
        const extractedName = extractedAccountManager.value;

        // Try exact match first
        let matchedManager = accountManagers.find((m: User) =>
          m.name?.toLowerCase() === extractedName.toLowerCase()
        );

        // If no exact match, try fuzzy matching
        if (!matchedManager && extractedName) {
          const fuzzMatches = accountManagers.map((m: User) => ({
            manager: m,
            score: m.name ?
              Math.max(
                // Token sort ratio for partial matches
                fuzz.token_sort_ratio(extractedName.toLowerCase(), m.name.toLowerCase()),
                // Partial ratio for substring matches
                fuzz.partial_ratio(extractedName.toLowerCase(), m.name.toLowerCase())
              )
              : 0
          }));

          // Get best match if score > 70
          const bestMatch = fuzzMatches.sort((a, b) => b.score - a.score)[0];
          if (bestMatch && bestMatch.score > 70) {
            matchedManager = bestMatch.manager;
            console.log(`Fuzzy matched "${extractedName}" to "${matchedManager.name}" (${bestMatch.score}% confidence)`);
          }
        }

        // Auto-select matched account manager
        if (matchedManager) {
          setAccountManagerId(matchedManager.id);
          toast.success(`Auto-selected Account Manager: ${matchedManager.name}`, { duration: 3000 });
        } else {
          toast(`Account Manager "${extractedName}" mentioned but not found in system`, {
            icon: '⚠️',
            duration: 4000
          });
        }
      }

      // Auto-populate activities list
      if (data.parsed.activities.length > 0) {
        const extractedActivities: EditableActivity[] = data.parsed.activities.map((act: any, idx: number) => {
          // Map activity types
          const typeMapping: Record<string, string> = {
            'trial_started': 'demo',
            'demo_scheduled': 'demo',
            'questions_asked': 'support',
            'feedback_received': 'call',
            'follow_up': 'email'
          };

          const activityType = typeMapping[act.value] || act.value;
          const title = act.metadata?.title || act.value.replace(/_/g, ' ');

          // Try to extract date from parsed dates
          const activityDate = data.parsed.dates[idx]?.value || new Date().toISOString().split('T')[0];

          return {
            id: `activity-${idx}`,
            type: activityType,
            title: title,
            description: act.metadata?.description || `${title} activity`,
            date: activityDate,
            duration_minutes: act.metadata?.duration_minutes || null,
            confidence: act.confidence || 80,
            selected: true // Selected by default
          };
        });
        setActivities(extractedActivities);
      }

      toast.success('Text parsed successfully! Review the extracted data below.');
    } catch (error) {
      console.error('Error parsing text:', error);
      toast.error('Failed to parse text. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleAddUser = () => {
    const newUser: EditableUser = {
      id: `user-${Date.now()}`,
      name: '',
      email: '',
      role: '',
      isPrimary: users.length === 0,
      phone: ''
    };
    setUsers([...users, newUser]);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleUpdateUser = (userId: string, field: keyof EditableUser, value: any) => {
    setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
  };

  const handleSetPrimaryUser = (userId: string) => {
    setUsers(users.map(u => ({ ...u, isPrimary: u.id === userId })));
  };

  const handleToggleActivity = (activityId: string) => {
    setActivities(activities.map(a =>
      a.id === activityId ? { ...a, selected: !a.selected } : a
    ));
  };

  const handleUpdateActivity = (activityId: string, field: keyof EditableActivity, value: any) => {
    setActivities(activities.map(a =>
      a.id === activityId ? { ...a, [field]: value } : a
    ));
  };

  const handleRemoveActivity = (activityId: string) => {
    setActivities(activities.filter(a => a.id !== activityId));
  };

  const handleGenerateAIDescription = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name is required to generate description');
      return;
    }

    setGeneratingDescription(true);
    try {
      const context = {
        name: orgName,
        domain: domain || undefined,
        website: websiteUrl || undefined,
        users: users.map(u => ({
          name: u.name,
          role: u.role || undefined,
          email: u.email
        })),
        activities: activities
          .filter(a => a.selected)
          .map(a => ({
            type: a.type,
            title: a.title,
            description: a.description
          })),
        rawText: text || undefined
      };

      const aiResult = await generateOrgDescription(context);

      if (aiResult.success && aiResult.description) {
        setDescription(aiResult.description);

        if (aiResult.usingAI) {
          toast.success('AI-generated description created successfully!', { duration: 3000 });
        } else {
          toast('Generated description using fallback (AI unavailable)', {
            icon: 'ℹ️',
            duration: 4000
          });
        }
      } else {
        toast.error(aiResult.error || 'Failed to generate description');
      }
    } catch (error: any) {
      console.error('Error generating AI description:', error);
      toast.error('Failed to generate description. Please try again.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    // Validation
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    if (!domain) {
      toast.error('Domain is required');
      return;
    }
    if (!accountManagerId) {
      // Check if there's an extracted account manager that wasn't matched
      const extractedAM = result.parsed.users.find((usr: any) =>
        usr.metadata?.source === 'account_manager_pattern' ||
        usr.metadata?.is_account_manager === true ||
        usr.metadata?.role === 'Account Manager'
      );

      if (extractedAM) {
        toast.error(
          `Account Manager is required. We detected "${extractedAM.value}" in your text but couldn't find a matching user. Please select one from the dropdown.`,
          { duration: 6000 }
        );
      } else {
        toast.error('Account Manager is required. Please select one from the dropdown.');
      }
      return;
    }
    if (users.length === 0) {
      toast.error('At least one contact is required');
      return;
    }

    const primaryUser = users.find(u => u.isPrimary);
    if (!primaryUser || !primaryUser.name.trim() || !primaryUser.email.trim()) {
      toast.error('Primary contact name and email are required');
      return;
    }

    setSaving(true);
    try {
      const normalizedUrl = normalizeUrl(websiteUrl);

      // Prepare organization data for atomic RPC call
      const orgData: TrialOrganizationData = {
        org_name: orgName.trim(),
        domain: domain,
        org_url: normalizedUrl,
        logo_url: logoUrl.trim() || extractLogoUrl(normalizedUrl),
        description: description.trim(),
        contract_value: contractValue ? parseFloat(contractValue.replace(/[^0-9.]/g, '')) : undefined,
        parent_organization: parentOrganization,
        trial_duration_days: trialDuration ? parseInt(trialDuration, 10) : undefined,
        sales_poc_id: salesPOCId || undefined,
        account_manager_id: accountManagerId,
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested'
      };

      // Prepare users data
      const usersData: TrialUserData[] = users
        .filter(usr => usr.name.trim() && usr.email.trim())
        .map(usr => ({
          name: usr.name.trim(),
          email: usr.email.trim(),
          role: usr.role.trim() || undefined,
          phone: usr.phone?.trim() || undefined,
          current_stage: 'invited' as const
        }));

      // Prepare activities data (selected only)
      const selectedActivities = activities.filter(a => a.selected);
      const activitiesData: UserInteractionData[] = selectedActivities.map(activity => ({
        interaction_type: activity.type,
        title: activity.title,
        notes: activity.description,
        interaction_date: activity.date ? new Date(activity.date).toISOString() : new Date().toISOString(),
        duration_minutes: activity.duration_minutes || undefined,
        conducted_by: user?.email || undefined
      }));

      // Prepare platform queries data (selected only with assigned users)
      const selectedQueries = platformQueries.filter(q => q.selected);
      const queriesWithoutUsers = selectedQueries.filter(q => !q.assignedUserId);

      if (queriesWithoutUsers.length > 0) {
        toast.error(
          `${queriesWithoutUsers.length} platform queries do not have assigned users. Please assign users to all queries before saving.`,
          { duration: 5000 }
        );
        setSaving(false);
        return;
      }

      const queriesData: PlatformQueryData[] = selectedQueries.map(query => ({
        query_topic: query.queryTopic,
        query_text: query.queryText,
        status: query.status,
        confidence_score: query.confidenceScore || undefined,
        response_time_ms: query.responseTimeMs || undefined,
        session_id: query.sessionId || undefined,
        executed_at: query.executedAt,
        user_id: query.assignedUserId!  // Non-null assertion safe due to validation above
      }));

      // Call atomic RPC function - ALL or NOTHING
      const atomicResult = await createTrialOrganizationAtomic(
        orgData,
        usersData,
        activitiesData,
        queriesData,
        supabase
      );

      // Verify counts match expectations
      const verification = verifyAtomicCreation(atomicResult);

      if (!verification.success) {
        // Count mismatch - organization was created but some items failed
        const warningTitle = `⚠️ "${orgName}" created with issues`;
        const warningDetails = verification.errors.map(err => `• ${err}`).join('\n');

        toast.error(
          `${warningTitle}\n\n${warningDetails}\n\nThe organization was created successfully, but some contacts or activities were not saved. Please review and add missing items manually.`,
          { duration: 8000 }
        );

        // Still navigate - the org was created
        router.push(`/support/trials/${atomicResult.org_id}`);
      } else {
        // Complete success
        const successMsg = `✅ Created "${orgName}" with ${atomicResult.created_user_count} contact(s) and ${atomicResult.created_activity_count} interaction(s)`;
        toast.success(successMsg, { duration: 4000 });

        // Navigate to the new organization
        router.push(`/support/trials/${atomicResult.org_id}`);
      }
    } catch (error: any) {
      // Use graceful error handler for user-friendly messages
      const errorDetails = getErrorMessage(error, 'trial_org_create');

      // Build comprehensive error message
      let errorMessage = errorDetails.message;

      // Add suggestion if available
      if (errorDetails.suggestion) {
        errorMessage += `\n\n${errorDetails.suggestion}`;
      }

      // Add specific guidance based on error type
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        errorMessage += '\n\nTip: An organization with this name or email may already exist. Try checking existing organizations first.';
      } else if (error.message?.includes('required') || error.message?.includes('validation')) {
        errorMessage += '\n\nPlease check that all required fields are filled correctly and try again.';
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        errorMessage += '\n\nYou may not have permission to create organizations. Please contact your administrator.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage += '\n\nPlease check your internet connection and try again.';
      }

      // Show error toast with extended duration for longer messages
      toast.error(errorMessage, {
        duration: 7000,
        style: {
          maxWidth: '500px'
        }
      });

      // Log technical details for debugging
      console.error('[Paste & Extract] Failed to create trial organization:', {
        error: error.message,
        technical: errorDetails.technical,
        orgName,
        userCount: users.length,
        activityCount: selectedActivities.length
      });
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

  const selectedActivitiesCount = activities.filter(a => a.selected).length;
  const primaryUser = users.find(u => u.isPrimary);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/support/trials')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Paste & Extract</h1>
                  <p className="text-xs text-gray-600">Create trial organizations and capture user interactions, platform queries, and other details from any text source</p>
                </div>
              </div>
            </div>
            {result && (
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
                    <Save className="w-4 h-4" />
                    Save Trial
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your meeting notes, email, or call summary here...

Example:
Had a great demo with Acme Corp (acmecorp.com) today. Sarah Johnson (sarah@acmecorp.com, +1-555-0123) and Mike Chen from their product team attended. They loved the presentation builder and asked 12 questions. Team of 25 users. $50K annual contract. Looking for 14 day trial. Currently using GPT-4."
                className="w-full h-80 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  {text.length} chars · {text.split(/\s+/).filter(w => w.length > 0).length} words
                </span>
                <button
                  onClick={handleParse}
                  disabled={!text.trim() || parsing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting data...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract Data
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Platform Queries CSV Input */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Platform Queries (CSV)</h3>
              </div>
              <textarea
                value={platformQueriesCSV}
                onChange={(e) => handlePlatformQueriesCSVChange(e.target.value)}
                placeholder="Paste platform queries CSV here...

Simple format (Title,User,Date):
Dairy Beverage Giants,Michael Pence,Nov 17, Mon
Global Cream Manufacturers,Michael Pence,Nov 17, Mon
Latin America Cream Market,Lezama Pérez Aureliano,Nov 15, Sat

Extended format (Title,User,Date,Status,Category,Observations,Confidence):
Dairy Trends,John Doe,Nov 17,success,Market Analysis,Excellent,95.5"
                className="w-full h-64 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  {platformQueriesCSV.length} chars · {platformQueries.length} queries parsed
                </span>
                {platformQueries.length > 0 && (
                  <span className="text-xs text-blue-600 font-medium">
                    {platformQueries.filter(q => q.assignedUserId).length} matched · {platformQueries.filter(q => !q.assignedUserId).length} unmatched
                  </span>
                )}
              </div>
            </div>

            {/* AI Insights */}
            {result && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Extraction Summary</h3>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getConfidenceColor(result.confidence.overall)}`}>
                    {getConfidenceIcon(result.confidence.overall)}
                    {result.confidence.overall}% confidence
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">Organization</span>
                    </div>
                    <p className="text-lg font-bold text-blue-900">{result.parsed.orgs.length}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-900">Contacts</span>
                    </div>
                    <p className="text-lg font-bold text-green-900">{users.length}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-900">Activities</span>
                    </div>
                    <p className="text-lg font-bold text-purple-900">{selectedActivitiesCount}/{activities.length}</p>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-900">Key Metrics</span>
                    </div>
                    <p className="text-lg font-bold text-amber-900">{result.parsed.numbers.length}</p>
                  </div>
                </div>

                {(result.parsed.features.length > 0 || result.parsed.models.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700">Product Usage Detected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.parsed.features.map((f, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          {f.value}
                        </span>
                      ))}
                      {result.parsed.models.map((m, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                          {m.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Review & Edit */}
          <div className="space-y-4">
            {result ? (
              <>
                {/* Organization Details */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Organization Details</h3>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Review & Edit</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Org Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Acme Corporation"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Domain */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Domain <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {DOMAIN_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Website */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Website</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="example.com"
                          />
                          {websiteUrl && (
                            <Link className="absolute right-2 top-2 w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Contract Value */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Contract Value
                        </label>
                        <input
                          type="text"
                          value={contractValue}
                          onChange={(e) => setContractValue(e.target.value)}
                          className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="$50,000"
                        />
                      </div>

                      {/* Parent Organization */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Building2 className="w-3 h-3 inline mr-1" />
                          Parent Organization
                        </label>
                        <select
                          value={parentOrganization}
                          onChange={(e) => setParentOrganization(e.target.value as 'Mordor Intelligence' | 'GMI')}
                          className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Mordor Intelligence">Mordor Intelligence</option>
                          <option value="GMI">GMI</option>
                        </select>
                      </div>

                      {/* Trial Duration */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Trial Days
                        </label>
                        <input
                          type="number"
                          value={trialDuration}
                          onChange={(e) => setTrialDuration(e.target.value)}
                          className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="14"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-gray-700">Description</label>
                        <button
                          onClick={handleGenerateAIDescription}
                          disabled={generatingDescription || !orgName.trim()}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generate professional description from context"
                        >
                          {generatingDescription ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Writing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Write for me
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={300}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Auto-generated from context or click 'Generate with AI'"
                      />
                      <p className="text-xs text-gray-500 mt-1">{description.length}/300</p>
                    </div>

                    {/* Account Manager */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Account Manager <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={accountManagerId}
                        onChange={(e) => setAccountManagerId(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {accountManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sales POC */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Sales POC (Optional)</label>
                      <select
                        value={salesPOCId}
                        onChange={(e) => setSalesPOCId(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {salesPOCs.map((poc) => (
                          <option key={poc.id} value={poc.id}>
                            {poc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Users/Contacts */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Contacts ({users.length})</h3>
                    </div>
                    <button
                      onClick={handleAddUser}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      Add Contact
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    {users.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No contacts detected</p>
                        <button
                          onClick={handleAddUser}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Add manually
                        </button>
                      </div>
                    ) : (
                      users.map((usr) => (
                        <div key={usr.id} className={`p-4 rounded-lg border-2 ${usr.isPrimary ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {usr.isPrimary && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                  <UserCheck className="w-3 h-3" />
                                  Primary
                                </span>
                              )}
                              {!usr.isPrimary && users.length > 1 && (
                                <button
                                  onClick={() => handleSetPrimaryUser(usr.id)}
                                  className="text-xs text-gray-500 hover:text-green-600 font-medium"
                                >
                                  Set as primary
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveUser(usr.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name {usr.isPrimary && <span className="text-red-500">*</span>}</label>
                              <input
                                type="text"
                                value={usr.name}
                                onChange={(e) => handleUpdateUser(usr.id, 'name', e.target.value)}
                                className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Email {usr.isPrimary && <span className="text-red-500">*</span>}</label>
                              <input
                                type="email"
                                value={usr.email}
                                onChange={(e) => handleUpdateUser(usr.id, 'email', e.target.value)}
                                className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="john@example.com"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Role/Title</label>
                              <input
                                type="text"
                                value={usr.role}
                                onChange={(e) => handleUpdateUser(usr.id, 'role', e.target.value)}
                                className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="CEO, VP, Manager"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                              <input
                                type="text"
                                value={usr.phone || ''}
                                onChange={(e) => handleUpdateUser(usr.id, 'phone', e.target.value)}
                                className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+1-555-0123"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Activities */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Activities ({selectedActivitiesCount} selected)</h3>
                    </div>
                    <span className="text-xs text-purple-600 font-medium">Check to include</span>
                  </div>

                  <div className="p-5 space-y-3">
                    {activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No activities detected</p>
                        <p className="text-xs text-gray-400 mt-1">Try including words like "demo", "call", "meeting"</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className={`p-4 rounded-lg border-2 transition-all ${activity.selected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={activity.selected}
                              onChange={() => handleToggleActivity(activity.id)}
                              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />

                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Activity Type</label>
                                  <select
                                    value={activity.type}
                                    onChange={(e) => handleUpdateActivity(activity.id, 'type', e.target.value)}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                  <input
                                    type="date"
                                    value={activity.date}
                                    onChange={(e) => handleUpdateActivity(activity.id, 'date', e.target.value)}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                <input
                                  type="text"
                                  value={activity.title}
                                  onChange={(e) => handleUpdateActivity(activity.id, 'title', e.target.value)}
                                  className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="Demo session"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                  value={activity.description}
                                  onChange={(e) => handleUpdateActivity(activity.id, 'description', e.target.value)}
                                  rows={2}
                                  className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                  placeholder="Activity details..."
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                                  <input
                                    type="number"
                                    value={activity.duration_minutes || ''}
                                    onChange={(e) => handleUpdateActivity(activity.id, 'duration_minutes', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="30"
                                  />
                                </div>

                                <div className="flex items-center gap-2 pt-5">
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(activity.confidence)}`}>
                                    {activity.confidence}%
                                  </div>
                                  <button
                                    onClick={() => handleRemoveActivity(activity.id)}
                                    className="text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Platform Queries */}
                {platformQueries.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Platform Queries ({platformQueries.filter(q => q.selected).length} selected)
                        </h3>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">Check to include</span>
                    </div>

                    <div className="p-5 space-y-3">
                      {platformQueries.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-500">No platform queries detected</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Include query execution details in your text for automatic extraction
                          </p>
                        </div>
                      ) : (
                        platformQueries.map((query) => (
                          <div
                            key={query.id}
                            className={`p-4 rounded-lg border transition-all ${
                              query.selected
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={query.selected}
                                onChange={(e) => {
                                  setPlatformQueries(platformQueries.map(q =>
                                    q.id === query.id ? { ...q, selected: e.target.checked } : q
                                  ));
                                }}
                                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                              />

                              <div className="flex-1 grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Query Topic</label>
                                  <input
                                    type="text"
                                    value={query.queryTopic}
                                    onChange={(e) => {
                                      setPlatformQueries(platformQueries.map(q =>
                                        q.id === query.id ? { ...q, queryTopic: e.target.value } : q
                                      ));
                                    }}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Market Analysis"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">User</label>
                                  <select
                                    value={query.assignedUserId || ''}
                                    onChange={(e) => {
                                      setPlatformQueries(platformQueries.map(q =>
                                        q.id === query.id ? { ...q, assignedUserId: e.target.value } : q
                                      ));
                                    }}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select user...</option>
                                    {users.map(user => (
                                      <option key={user.id} value={user.id}>
                                        {user.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                  <select
                                    value={query.status}
                                    onChange={(e) => {
                                      setPlatformQueries(platformQueries.map(q =>
                                        q.id === query.id ? { ...q, status: e.target.value as any } : q
                                      ));
                                    }}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="success">Success</option>
                                    <option value="partial">Partial</option>
                                    <option value="failed">Failed</option>
                                    <option value="timeout">Timeout</option>
                                  </select>
                                </div>

                                <div className="col-span-3">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Query Text</label>
                                  <textarea
                                    value={query.queryText}
                                    onChange={(e) => {
                                      setPlatformQueries(platformQueries.map(q =>
                                        q.id === query.id ? { ...q, queryText: e.target.value } : q
                                      ));
                                    }}
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="What are the market trends for electric vehicles in 2024?"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Executed At</label>
                                  <input
                                    type="datetime-local"
                                    value={query.executedAt}
                                    onChange={(e) => {
                                      setPlatformQueries(platformQueries.map(q =>
                                        q.id === query.id ? { ...q, executedAt: e.target.value } : q
                                      ));
                                    }}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Confidence Score</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={query.confidenceScore}
                                    onChange={(e) => {
                                      setPlatformQueries(platformQueries.map(q =>
                                        q.id === query.id ? { ...q, confidenceScore: parseFloat(e.target.value) || 0 } : q
                                      ));
                                    }}
                                    className="w-full h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="85"
                                  />
                                </div>

                                <div className="flex items-center gap-2 pt-5">
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                    query.status === 'success' ? 'bg-green-100 text-green-700' :
                                    query.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    query.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {query.status.toUpperCase()}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setPlatformQueries(platformQueries.filter(q => q.id !== query.id));
                                    }}
                                    className="text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-2">No data extracted yet</p>
                <p className="text-xs text-gray-400">Paste text on the left and click "Extract Data"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
