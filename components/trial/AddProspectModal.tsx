'use client';

/**
 * Add Prospect Contact Modal
 *
 * Creates a new prospect (person/contact) and links them to an organization.
 * If the org doesn't exist, it can be created as a prospect org.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { FormInput, FormSelect } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import { z } from 'zod';

// Validation schema for prospect contact
const createProspectSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  org_id: z.string().min(1, { message: 'Organization is required' }),
  email: z.string().email({ message: 'Invalid email format' }).optional().or(z.literal('')),
  title: z.string().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  source: z.string().optional(),
  is_primary_contact: z.boolean().optional(),
  notes: z.string().optional(),
});

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedOrgId?: string;
  preselectedOrgName?: string;
}

interface Organization {
  org_id: string;
  org_name: string;
  is_prospect: boolean;
}

const PROSPECT_SOURCES = [
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'referral', label: 'Referral' },
  { value: 'event', label: 'Event' },
];

export default function AddProspectModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedOrgId,
  preselectedOrgName,
}: AddProspectModalProps) {
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    org_id: preselectedOrgId || '',
    email: '',
    title: '',
    phone: '',
    linkedin_url: '',
    source: 'cold_outreach',
    is_primary_contact: false,
    notes: '',
  });

  // Org selection state
  const [orgSearch, setOrgSearch] = useState(preselectedOrgName || '');
  const [orgResults, setOrgResults] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [isSearchingOrgs, setIsSearchingOrgs] = useState(false);

  // Create new org state
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { isLoading, execute } = useLoadingState();

  // Search organizations
  const searchOrgs = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOrgResults([]);
      return;
    }

    setIsSearchingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, is_prospect')
        .ilike('org_name', `%${query}%`)
        .order('org_name')
        .limit(10);

      if (error) throw error;
      setOrgResults(data || []);
    } catch (error) {
      console.error('Org search error:', error);
      setOrgResults([]);
    } finally {
      setIsSearchingOrgs(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orgSearch && !selectedOrg) {
        searchOrgs(orgSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [orgSearch, selectedOrg, searchOrgs]);

  // Pre-fill org if preselected
  useEffect(() => {
    if (preselectedOrgId && preselectedOrgName) {
      setSelectedOrg({ org_id: preselectedOrgId, org_name: preselectedOrgName, is_prospect: false });
      setOrgSearch(preselectedOrgName);
      setFormData(prev => ({ ...prev, org_id: preselectedOrgId }));
    }
  }, [preselectedOrgId, preselectedOrgName]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org);
    setOrgSearch(org.org_name);
    setFormData(prev => ({ ...prev, org_id: org.org_id }));
    setShowOrgDropdown(false);
    if (errors.org_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.org_id;
        return newErrors;
      });
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    try {
      // Get current user for account_manager_id
      const { data: { user } } = await supabase.auth.getUser();
      let accountManagerId: string | null = null;
      if (user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single() as { data: { id: string } | null };
        accountManagerId = userData?.id ?? null;
      }

      const orgId = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('trial_organizations') as any).insert([{
        org_id: orgId,
        org_name: newOrgName.trim(),
        domain: 'TMT',
        is_prospect: true,
        prospect_stage: 'cold_lead',
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        account_manager_id: accountManagerId,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      const newOrg = { org_id: orgId, org_name: newOrgName.trim(), is_prospect: true };
      handleOrgSelect(newOrg);
      setShowCreateOrg(false);
      setNewOrgName('');
      toast.success('Organization created');
    } catch (error) {
      console.error('Error creating org:', error);
      toast.error('Failed to create organization');
    }
  };

  const validateForm = (): boolean => {
    try {
      createProspectSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        // Get current user for assigned_to
        const { data: { user } } = await supabase.auth.getUser();
        let assignedTo: string | null = null;
        if (user?.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single() as { data: { id: string } | null };
          assignedTo = userData?.id ?? null;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('prospects') as any).insert([{
          org_id: formData.org_id,
          name: formData.name,
          email: formData.email || null,
          title: formData.title || null,
          phone: formData.phone || null,
          linkedin_url: formData.linkedin_url || null,
          source: formData.source,
          is_primary_contact: formData.is_primary_contact,
          status: 'active',
          assigned_to: assignedTo,
          notes: formData.notes || null,
        }]);

        if (error) throw error;
      },
      {
        successMessage: 'Prospect contact added!',
        errorMessage: 'Failed to add prospect',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error creating prospect:', error);
          if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
            toast.error('A prospect with this email already exists');
          }
        },
      }
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      org_id: preselectedOrgId || '',
      email: '',
      title: '',
      phone: '',
      linkedin_url: '',
      source: 'cold_outreach',
      is_primary_contact: false,
      notes: '',
    });
    setOrgSearch(preselectedOrgName || '');
    setSelectedOrg(preselectedOrgId && preselectedOrgName
      ? { org_id: preselectedOrgId, org_name: preselectedOrgName, is_prospect: false }
      : null
    );
    setOrgResults([]);
    setShowOrgDropdown(false);
    setShowCreateOrg(false);
    setNewOrgName('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Prospect Contact</h2>
            <p className="text-sm text-gray-500 mt-1">Add a new contact person to an organization</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <FormInput
            label="Contact Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            placeholder="e.g., John Smith"
            helperText="Full name of the prospect contact"
          />

          {/* Organization Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization <span className="text-red-500">*</span>
            </label>
            {!showCreateOrg ? (
              <>
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => {
                    setOrgSearch(e.target.value);
                    setSelectedOrg(null);
                    setFormData(prev => ({ ...prev, org_id: '' }));
                    setShowOrgDropdown(true);
                  }}
                  onFocus={() => setShowOrgDropdown(true)}
                  placeholder="Search organizations..."
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.org_id ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.org_id && <p className="mt-1 text-sm text-red-600">{errors.org_id}</p>}

                {/* Dropdown */}
                {showOrgDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {isSearchingOrgs ? (
                      <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                    ) : orgSearch.length < 2 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Type to search...</div>
                    ) : orgResults.length === 0 ? (
                      <div className="p-3">
                        <p className="text-sm text-gray-500 mb-2">No organizations found</p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewOrgName(orgSearch);
                            setShowCreateOrg(true);
                            setShowOrgDropdown(false);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Create &quot;{orgSearch}&quot; as new org
                        </button>
                      </div>
                    ) : (
                      <>
                        {orgResults.map((org) => (
                          <button
                            key={org.org_id}
                            type="button"
                            onClick={() => handleOrgSelect(org)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between"
                          >
                            <span>{org.org_name}</span>
                            {org.is_prospect && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                Prospect
                              </span>
                            )}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewOrgName(orgSearch);
                              setShowCreateOrg(true);
                              setShowOrgDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg text-left"
                          >
                            + Create new organization
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Create New Org Form */
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  New Organization Name
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleCreateOrg}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateOrg(false);
                      setNewOrgName('');
                    }}
                    className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email and Title */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              placeholder="john@company.com"
            />
            <FormInput
              label="Job Title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              error={errors.title}
              placeholder="VP of Sales"
            />
          </div>

          {/* Phone and LinkedIn */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={errors.phone}
              placeholder="+1 555-123-4567"
            />
            <FormInput
              label="LinkedIn URL"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
              error={errors.linkedin_url}
              placeholder="linkedin.com/in/..."
            />
          </div>

          {/* Source */}
          <FormSelect
            label="Lead Source"
            value={formData.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
            error={errors.source}
            options={PROSPECT_SOURCES}
            helperText="How did we find this contact?"
          />

          {/* Primary Contact Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary_contact"
              checked={formData.is_primary_contact}
              onChange={(e) => handleInputChange('is_primary_contact', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_primary_contact" className="text-sm text-gray-700">
              Primary contact for this organization
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any notes about this contact..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Contact</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
