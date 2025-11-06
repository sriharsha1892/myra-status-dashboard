'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

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
  { value: 'TMT', label: 'TMT - Technology, Media & Telecommunications' },
  { value: 'NEO', label: 'NEO - New Economy' },
  { value: 'AF&B', label: 'AF&B - Agriculture, Food & Beverages' },
  { value: 'E&C', label: 'E&C - Engineering & Construction' },
  { value: 'HC', label: 'HC - Healthcare' },
  { value: 'AAD', label: 'AAD - Architecture, Art & Design' },
];

const DESIGNATION_SUGGESTIONS = ['CEO', 'Director', 'VP', 'Manager', 'Analyst', 'Consultant'];

export default function CreateOrganizationPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [salesPOCs, setSalesPOCs] = useState<SalesPOC[]>([]);
  const [accountManagers, setAccountManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Organization form state
  const [orgName, setOrgName] = useState('');
  const [domain, setDomain] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [salesPOCId, setSalesPOCId] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');

  // Primary contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    if (user && role) {
      fetchData();
    }
  }, [user, authLoading, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sales POCs
      const { data: pocsData } = await supabase
        .from('sales_pocs')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (pocsData) setSalesPOCs(pocsData);

      // Fetch account managers (users table)
      const { data: managersData } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['admin', 'account_manager'])
        .order('full_name', { ascending: true });

      if (managersData) {
        setAccountManagers(managersData);

        // Auto-select current user if they're an AM
        if (role?.toLowerCase() === 'account_manager') {
          const currentManager = managersData.find((m: User) => m.id === user?.id);
          if (currentManager) {
            setAccountManagerId(currentManager.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
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

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getOrgInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!orgName.trim()) newErrors.orgName = 'Organization name is required';
    if (!domain) newErrors.domain = 'Domain is required';
    if (!websiteUrl.trim()) {
      newErrors.websiteUrl = 'Website URL is required';
    } else {
      const normalized = normalizeUrl(websiteUrl);
      if (!isValidUrl(normalized)) {
        newErrors.websiteUrl = 'Invalid URL format';
      }
    }
    if (!logoUrl.trim()) newErrors.logoUrl = 'Logo URL is required';
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 300) {
      newErrors.description = 'Description must be 300 characters or less';
    }
    if (!accountManagerId) newErrors.accountManagerId = 'Account Manager is required';

    // Primary contact validation
    if (!contactName.trim()) newErrors.contactName = 'Contact name is required';
    if (!contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSubmitting(true);

    try {
      const normalizedUrl = normalizeUrl(websiteUrl);

      // Insert organization
      const { data: newOrg, error: orgError } = await supabase
        .from('trial_organizations')
        .insert({
          org_name: orgName.trim(),
          domain: domain,
          org_url: normalizedUrl,
          logo_url: logoUrl.trim(),
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
          is_primary_contact: isPrimaryContact,
          user_status: 'invited',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (contactError) throw contactError;

      toast.success('Organization created successfully!');
      router.push(`/support/trials/${newOrg.org_id}`);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
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
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/support/trials')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Trial Organization</h1>
              <p className="text-sm text-gray-500 mt-0.5">Add a new organization and primary contact</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Details Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Organization Details</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Organization Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.orgName ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g., Acme Corporation"
                />
                {errors.orgName && <p className="text-xs text-red-500 mt-1">{errors.orgName}</p>}
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain <span className="text-red-500">*</span>
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.domain ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">Select domain...</option>
                  {DOMAIN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.domain && <p className="text-xs text-red-500 mt-1">{errors.domain}</p>}
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.websiteUrl ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="example.com"
                />
                {websiteUrl && !errors.websiteUrl && (
                  <p className="text-xs text-green-600 mt-1">✓ Will be saved as: {normalizeUrl(websiteUrl)}</p>
                )}
                {errors.websiteUrl && <p className="text-xs text-red-500 mt-1">{errors.websiteUrl}</p>}
              </div>

              {/* Logo URL */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.logoUrl ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">Hint: Right-click logo → Copy image address</p>
                    {errors.logoUrl && <p className="text-xs text-red-500 mt-1">{errors.logoUrl}</p>}
                  </div>
                  <div className="w-16 h-16 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`text-xl font-bold text-gray-400 ${logoUrl ? 'hidden' : ''}`}>
                      {orgName ? getOrgInitials(orgName) : '?'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className={`w-full px-4 py-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Describe the organization in 3rd person (who they are, what they do, target market)"
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description ? (
                    <p className="text-xs text-red-500">{errors.description}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Max 300 characters</p>
                  )}
                  <p className={`text-xs ${description.length > 300 ? 'text-red-500' : 'text-gray-400'}`}>
                    {description.length}/300
                  </p>
                </div>
              </div>

              {/* Sales POC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sales POC (Optional)</label>
                <select
                  value={salesPOCId}
                  onChange={(e) => setSalesPOCId(e.target.value)}
                  className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None selected</option>
                  {salesPOCs.map((poc) => (
                    <option key={poc.id} value={poc.id}>
                      {poc.name} ({poc.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Manager <span className="text-red-500">*</span>
                </label>
                <select
                  value={accountManagerId}
                  onChange={(e) => setAccountManagerId(e.target.value)}
                  disabled={role?.toLowerCase() === 'account_manager'}
                  className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.accountManagerId ? 'border-red-300' : 'border-gray-200'
                  } ${role?.toLowerCase() === 'account_manager' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select account manager...</option>
                  {accountManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.email})
                    </option>
                  ))}
                </select>
                {errors.accountManagerId && <p className="text-xs text-red-500 mt-1">{errors.accountManagerId}</p>}
              </div>
            </div>
          </div>

          {/* Primary Contact Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Primary Contact</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactName ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="John Doe"
                />
                {errors.contactName && <p className="text-xs text-red-500 mt-1">{errors.contactName}</p>}
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={`w-full h-11 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactEmail ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.contactEmail && <p className="text-xs text-red-500 mt-1">{errors.contactEmail}</p>}
              </div>

              {/* Contact Designation */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(e.target.value)}
                  list="designation-suggestions"
                  className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CEO, Director, VP, Manager, etc."
                />
                <datalist id="designation-suggestions">
                  {DESIGNATION_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>

              {/* Primary Contact Checkbox */}
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as primary contact</span>
                </label>
                <p className="text-xs text-gray-500 ml-7 mt-1">The primary contact is the main point of contact for this organization</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/support/trials')}
              disabled={submitting}
              className="h-11 px-6 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
