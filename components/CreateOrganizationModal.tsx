// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface SalesPOC {
  id: string;
  name: string;
  email: string;
  account_manager_id: string;
}

interface Users {
  id: string;
  full_name: string;
}

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOMAINS = ['TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD'];
const PARENT_COMPANIES = ['Mordor Intelligence', 'GMI'];

export default function CreateOrganizationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [salesPOCs, setSalesPOCs] = useState<SalesPOC[]>([]);
  const [accountManagers, setAccountManagers] = useState<Users[]>([]);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [selectedPOC, setSelectedPOC] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [parentCompany, setParentCompany] = useState('Mordor Intelligence');
  const [logoUrl, setLogoUrl] = useState('');
  const [orgUrl, setOrgUrl] = useState('');
  const [description, setDescription] = useState('');
  const [assignedAccountManager, setAssignedAccountManager] = useState('');

  const supabase = createClient();

  // Fetch Sales POCs and Account Managers on mount
  useEffect(() => {
    if (isOpen) {
      fetchSalesPOCsAndManagers();
    }
  }, [isOpen]);

  // Auto-assign account manager when POC is selected
  useEffect(() => {
    if (selectedPOC) {
      const poc = salesPOCs.find((p) => p.id === selectedPOC);
      if (poc) {
        const manager = accountManagers.find((m) => m.id === poc.account_manager_id);
        setAssignedAccountManager(manager?.full_name || '');
      }
    }
  }, [selectedPOC, salesPOCs, accountManagers]);

  const fetchSalesPOCsAndManagers = async () => {
    try {
      // Fetch Sales POCs
      const { data: pocs, error: pocsError } = await supabase
        .from('sales_pocs')
        .select('id, name, email, account_manager_id')
        .order('name');

      if (pocsError) throw pocsError;
      setSalesPOCs(pocs || []);

      // Fetch Account Managers
      const { data: managers, error: managersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'account_manager')
        .order('full_name');

      if (managersError) throw managersError;
      setAccountManagers(managers || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load sales POCs and account managers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    if (!selectedPOC) {
      toast.error('Please select a Sales POC');
      return;
    }

    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('trial_organizations').insert({
        org_name: orgName,
        org_domain: selectedDomain,
        parent_company: parentCompany,
        logo_url: logoUrl || null,
        org_url: orgUrl || null,
        description: description || null,
        sales_poc_id: selectedPOC,
        account_manager_id: salesPOCs.find((p) => p.id === selectedPOC)?.account_manager_id,
        trial_request_date: new Date().toISOString(),
        trial_status: 'requested',
        org_lifecycle_stage: 'prospect',
      });

      if (error) throw error;

      toast.success('Organization created successfully');
      resetForm();
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrgName('');
    setSelectedPOC('');
    setSelectedDomain('');
    setParentCompany('Mordor Intelligence');
    setLogoUrl('');
    setOrgUrl('');
    setDescription('');
    setAssignedAccountManager('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Trial Organization</h2>
            <p className="text-sm text-gray-500 mt-1">Set up a new trial organization with Sales POC and domain assignment</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sales POC Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Sales POC *
            </label>
            <select
              value={selectedPOC}
              onChange={(e) => setSelectedPOC(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a Sales POC</option>
              {salesPOCs.map((poc) => (
                <option key={poc.id} value={poc.id}>
                  {poc.name} ({poc.email})
                </option>
              ))}
            </select>
            {assignedAccountManager && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Assigned to Account Manager: <span className="font-semibold">{assignedAccountManager}</span>
              </p>
            )}
          </div>

          {/* Domain Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Domain *
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a domain</option>
              {DOMAINS.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          {/* Parent Company Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Parent Company *
            </label>
            <select
              value={parentCompany}
              onChange={(e) => setParentCompany(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PARENT_COMPANIES.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          {/* Organization URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Organization URL
            </label>
            <input
              type="url"
              value={orgUrl}
              onChange={(e) => setOrgUrl(e.target.value)}
              placeholder="e.g., https://example.com"
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="e.g., https://example.com/logo.png"
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details about this organization..."
              rows={3}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Trial Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Initial Status:</span> Requested
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Trial dates will be automatically calculated when the product/admin team approves access (14 days from approval date).
            </p>
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
              disabled={loading}
              className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Organization</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
