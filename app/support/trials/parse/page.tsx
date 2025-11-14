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
  Link
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

interface SalesPOC {
  id: string;
  name: string;
  email: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
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

export default function TextParserPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState<'email' | 'meeting_notes' | 'call_summary' | 'manual_entry'>('meeting_notes');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable Organization Fields
  const [orgName, setOrgName] = useState('');
  const [domain, setDomain] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [salesPOCId, setSalesPOCId] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');

  // Editable Contact Fields
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');

  // Dropdowns data
  const [salesPOCs, setSalesPOCs] = useState<SalesPOC[]>([]);
  const [accountManagers, setAccountManagers] = useState<User[]>([]);

  const [editingOrg, setEditingOrg] = useState(false);
  const [editingContact, setEditingContact] = useState(false);

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
      console.error('Error fetching dropdown data:', error);
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

      // Auto-populate contact fields
      if (data.parsed.users.length > 0) {
        const primaryUser = data.parsed.users[0];
        setContactName(primaryUser.value);
        if (primaryUser.metadata?.email) {
          setContactEmail(primaryUser.metadata.email);
        }
      }

    } catch (error) {
      console.error('Error parsing text:', error);
      alert('Failed to parse text. Please try again.');
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

  const handleSave = async () => {
    if (!result) return;

    // Validation
    if (!orgName.trim()) {
      alert('Organization name is required');
      return;
    }
    if (!domain) {
      alert('Domain is required');
      return;
    }
    if (!accountManagerId) {
      alert('Account Manager is required');
      return;
    }
    if (!contactName.trim() || !contactEmail.trim()) {
      alert('Contact name and email are required');
      return;
    }

    setSaving(true);
    try {
      const normalizedUrl = normalizeUrl(websiteUrl);

      // Insert organization
      const { data: newOrg, error: orgError } = await supabase
        .from('trial_organizations')
        .insert({
          org_name: orgName.trim(),
          domain: domain,
          org_url: normalizedUrl,
          logo_url: logoUrl.trim() || extractLogoUrl(normalizedUrl),
          description: description.trim(),
          sales_poc_id: salesPOCId || null,
          account_manager_id: accountManagerId,
          org_lifecycle_stage: 'prospect',
          trial_status: 'requested',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('org_id')
        .single();

      if (orgError) throw orgError;
      if (!newOrg) throw new Error('Failed to create organization');

      // Insert primary contact
      const { error: contactError } = await supabase
        .from('trial_users')
        .insert({
          org_id: newOrg.org_id,
          full_name: contactName.trim(),
          email: contactEmail.trim(),
          user_designation: contactDesignation.trim() || null,
          is_primary_contact: true,
          user_status: 'invited',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (contactError) throw contactError;

      // Insert additional users if found
      if (result.parsed.users.length > 1) {
        const additionalUsers = result.parsed.users.slice(1).filter(u => u.metadata?.email);

        for (const usr of additionalUsers) {
          await supabase.from('trial_users').insert({
            org_id: newOrg.org_id,
            full_name: usr.value,
            email: usr.metadata.email,
            is_primary_contact: false,
            user_status: 'invited',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      alert(`Success! Created organization "${orgName}" with ${result.parsed.users.length} contact(s)`);
      router.push(`/support/trials/${newOrg.org_id}`);
    } catch (error: any) {
      console.error('Error saving data:', error);
      alert('Failed to save data: ' + (error.message || 'Unknown error'));
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
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-600 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Text Intel Parser</h1>
                  <p className="text-xs text-gray-600">Extract trial data from emails, notes, and calls</p>
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
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-900">Source Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'meeting_notes', label: 'Meeting' },
                    { value: 'email', label: 'Email' },
                    { value: 'call_summary', label: 'Call' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSourceType(type.value as any)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        sourceType === type.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                placeholder="Paste your meeting notes, email, or call summary here...

Example:
Had a great demo with Acme Corp (acmecorp.com) today. Sarah Johnson (sarah@acmecorp.com) and Mike Chen from their product team attended. They loved the presentation builder and asked 12 questions about web scout features. Currently using GPT-4. Trial extended by 2 weeks."
                className="w-full h-80 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  {text.length} chars · {text.split(/\s+/).filter(w => w.length > 0).length} words
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
                      <Sparkles className="w-4 h-4" />
                      Parse with AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Insights */}
            {result && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getConfidenceColor(result.confidence.overall)}`}>
                    {getConfidenceIcon(result.confidence.overall)}
                    {result.confidence.overall}% confidence
                  </div>
                </div>

                <div className="space-y-3">
                  {result.parsed.activities.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-accent-600" />
                        <span className="text-xs font-medium text-gray-700">Activities Detected</span>
                      </div>
                      <div className="space-y-1.5">
                        {result.parsed.activities.map((activity, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            {activity.value.replace(/_/g, ' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(result.parsed.features.length > 0 || result.parsed.models.length > 0) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-700">Product Usage</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.parsed.features.map((f, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                            {f.value}
                          </span>
                        ))}
                        {result.parsed.models.map((m, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-accent-50 text-accent-700 rounded">
                            {m.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.parsed.numbers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">Key Metrics</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.parsed.numbers.map((num, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono">
                            {num.value} {num.metadata?.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Editable Form */}
          <div className="space-y-4">
            {result ? (
              <>
                {/* Organization Details */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Organization Details</h3>
                    </div>
                    <button
                      onClick={() => setEditingOrg(!editingOrg)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      {editingOrg ? 'Done' : 'Edit'}
                    </button>
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

                    {/* Logo URL */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Logo URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="flex-1 h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Auto-generated from website"
                        />
                        {logoUrl && (
                          <div className="w-9 h-9 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={300}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="AI-generated from context"
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
                            {manager.full_name}
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

                {/* Primary Contact */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Primary Contact</h3>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Designation</label>
                      <input
                        type="text"
                        value={contactDesignation}
                        onChange={(e) => setContactDesignation(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CEO, VP, Manager..."
                      />
                    </div>

                    {result.parsed.users.length > 1 && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600 mb-2">Additional contacts detected ({result.parsed.users.length - 1}):</p>
                        <div className="space-y-1.5">
                          {result.parsed.users.slice(1).map((usr, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                              <Users className="w-3 h-3 text-gray-400" />
                              {usr.value} {usr.metadata?.email && `(${usr.metadata.email})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-2">No data parsed yet</p>
                <p className="text-xs text-gray-400">Paste text on the left and click "Parse with AI"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
