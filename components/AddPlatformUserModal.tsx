// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface AddPlatformUserModalProps {
  isOpen: boolean;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const JOURNEY_STAGES = [
  { value: 'invited', label: 'Invited', color: 'gray' },
  { value: 'onboarding', label: 'Onboarding', color: 'blue' },
  { value: 'exploring', label: 'Exploring', color: 'cyan' },
  { value: 'building', label: 'Building', color: 'purple' },
  { value: 'testing', label: 'Testing', color: 'yellow' },
  { value: 'integrating', label: 'Integrating', color: 'orange' },
  { value: 'pilot', label: 'Pilot', color: 'indigo' },
  { value: 'evaluating', label: 'Evaluating', color: 'pink' },
  { value: 'production_ready', label: 'Production Ready', color: 'green' },
  { value: 'blocked', label: 'Blocked', color: 'red' },
  { value: 'stalled', label: 'Stalled', color: 'amber' },
  { value: 'inactive', label: 'Inactive', color: 'gray-400' },
];

// Sample Account Managers (8)
const ACCOUNT_MANAGERS = [
  'John Doe',
  'Sarah Johnson',
  'Michael Chen',
  'Emily Rodriguez',
  'David Kumar',
  'Jessica Lee',
  'Robert Williams',
  'Lisa Anderson',
];

// Sample Sales POCs (60 - showing first 20 for brevity, you'd load all 60)
const SALES_POCS = [
  'Alex Patterson', 'Brandon Mitchell', 'Catherine Davis', 'Daniel Foster',
  'Elizabeth Garcia', 'Frank Jackson', 'Grace Martinez', 'Henry Miller',
  'Iris Wilson', 'James Taylor', 'Kristine Thomas', 'Leonard Harris',
  'Megan Clark', 'Nicholas Lewis', 'Olivia Young', 'Patrick Hall',
  'Quinn White', 'Rachel Green', 'Samuel King', 'Tina Scott',
  // Add more as needed to reach 60
];

export default function AddPlatformUserModal({
  isOpen,
  orgId,
  onClose,
  onSuccess,
}: AddPlatformUserModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    salesforce_id: '',
    current_stage: 'invited',
    account_manager: '',
    sales_poc: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error('Name is required');
        setLoading(false);
        return;
      }
      if (!formData.email.trim()) {
        toast.error('Email is required');
        setLoading(false);
        return;
      }
      if (!formData.account_manager) {
        toast.error('Account Manager is required');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Invalid email format');
        setLoading(false);
        return;
      }

      // Insert into database
      const { error } = await supabase.from('trial_users').insert({
        org_id: orgId,
        name: formData.name,
        email: formData.email,
        role: formData.role || null,
        phone: formData.phone || null,
        salesforce_id: formData.salesforce_id || null,
        current_stage: formData.current_stage,
        account_manager: formData.account_manager,
        sales_poc: formData.sales_poc || null,
      });

      if (error) throw error;

      toast.success('Platform user added successfully!');
      setFormData({
        name: '',
        email: '',
        role: '',
        phone: '',
        salesforce_id: '',
        current_stage: 'invited',
        account_manager: '',
        sales_poc: '',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding platform user:', error);
      if (error.message.includes('unique')) {
        toast.error('This email is already registered for this organization');
      } else {
        toast.error('Failed to add platform user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Add Platform User</h2>
            <p className="text-blue-100 text-sm mt-1">Track actual users from this trial organization</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Jane Smith"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g., jane@company.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role / Job Title</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g., Data Analyst"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., +1 (555) 123-4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* External IDs Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m0 0h5a2 2 0 002-2V8a2 2 0 00-2-2h-5m0 0V5a2 2 0 012-2h1a2 2 0 012 2v1m0 0h4a2 2 0 012 2v10a2 2 0 01-2 2h-4m0 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1m0 0H4" />
              </svg>
              External IDs
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salesforce ID</label>
              <input
                type="text"
                name="salesforce_id"
                value={formData.salesforce_id}
                onChange={handleChange}
                placeholder="e.g., SF-00051234"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Journey Tracking Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Journey Tracking
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stage <span className="text-red-500">*</span>
              </label>
              <select
                name="current_stage"
                value={formData.current_stage}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {JOURNEY_STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                User will start at "{JOURNEY_STAGES.find((s) => s.value === formData.current_stage)?.label}"
              </p>
            </div>
          </div>

          {/* Account Management Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM4 20h16a2 2 0 002-2v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2a2 2 0 002 2z" />
              </svg>
              Account Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Manager <span className="text-red-500">*</span>
                </label>
                <select
                  name="account_manager"
                  value={formData.account_manager}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Account Manager</option>
                  {ACCOUNT_MANAGERS.map((am) => (
                    <option key={am} value={am}>
                      {am}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">One of 8 Account Managers (required)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sales POC</label>
                <select
                  name="sales_poc"
                  value={formData.sales_poc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Sales POC (optional)</option>
                  {SALES_POCS.map((poc) => (
                    <option key={poc} value={poc}>
                      {poc}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">One of 60 sales team members</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Platform User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
