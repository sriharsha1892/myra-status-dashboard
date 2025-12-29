'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, Users, Building2, Star, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import type { Organization } from '@/lib/quote/organization-types';

interface DemoFormData {
  org_id: string;
  demo_date: string;
  demo_time: string;
  sales_poc: string;
  demo_status: 'scheduled' | 'completed' | 'cancelled';
  attendee_names: string[];
  demo_observations: string;
  pain_points: string;
  next_steps: string;
  demo_rating: number | null;
}

interface DemoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DemoFormData) => Promise<void>;
  existingDemo?: Partial<DemoFormData>;
}

const SALES_POCS = [
  'Sriharsha',
  'Ranga',
  'Ramana',
  'Vijay',
];

export default function DemoScheduleModal({ isOpen, onClose, onSave, existingDemo }: DemoScheduleModalProps) {
  const [formData, setFormData] = useState<DemoFormData>({
    org_id: '',
    demo_date: new Date().toISOString().split('T')[0],
    demo_time: '10:00',
    sales_poc: SALES_POCS[0],
    demo_status: 'scheduled',
    attendee_names: [''],
    demo_observations: '',
    pain_points: '',
    next_steps: '',
    demo_rating: null,
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof DemoFormData, string>>>({});

  // Fetch organizations
  useEffect(() => {
    if (isOpen) {
      fetch('/api/quote/organizations')
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setOrganizations(data.data || []);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (existingDemo) {
        setFormData({
          org_id: existingDemo.org_id || '',
          demo_date: existingDemo.demo_date || new Date().toISOString().split('T')[0],
          demo_time: existingDemo.demo_time || '10:00',
          sales_poc: existingDemo.sales_poc || SALES_POCS[0],
          demo_status: existingDemo.demo_status || 'scheduled',
          attendee_names: existingDemo.attendee_names?.length ? existingDemo.attendee_names : [''],
          demo_observations: existingDemo.demo_observations || '',
          pain_points: existingDemo.pain_points || '',
          next_steps: existingDemo.next_steps || '',
          demo_rating: existingDemo.demo_rating || null,
        });
      } else {
        setFormData({
          org_id: '',
          demo_date: new Date().toISOString().split('T')[0],
          demo_time: '10:00',
          sales_poc: SALES_POCS[0],
          demo_status: 'scheduled',
          attendee_names: [''],
          demo_observations: '',
          pain_points: '',
          next_steps: '',
          demo_rating: null,
        });
        setSelectedOrg(null);
        setOrgSearch('');
      }
      setErrors({});
    }
  }, [isOpen, existingDemo]);

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
    (org.display_name && org.display_name.toLowerCase().includes(orgSearch.toLowerCase()))
  );

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setFormData(prev => ({ ...prev, org_id: org.id }));
    setOrgSearch(org.display_name || org.name);
    setShowOrgDropdown(false);
  };

  const handleAddAttendee = () => {
    setFormData(prev => ({
      ...prev,
      attendee_names: [...prev.attendee_names, ''],
    }));
  };

  const handleRemoveAttendee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attendee_names: prev.attendee_names.filter((_, i) => i !== index),
    }));
  };

  const handleAttendeeChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      attendee_names: prev.attendee_names.map((a, i) => i === index ? value : a),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof DemoFormData, string>> = {};

    if (!formData.org_id) {
      newErrors.org_id = 'Please select an organization';
    }
    if (!formData.demo_date) {
      newErrors.demo_date = 'Date is required';
    }
    if (!formData.sales_poc) {
      newErrors.sales_poc = 'Sales POC is required';
    }
    if (formData.demo_status === 'completed' && !formData.demo_rating) {
      newErrors.demo_rating = 'Rating is required for completed demos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      // Filter out empty attendee names
      const cleanedData = {
        ...formData,
        attendee_names: formData.attendee_names.filter(name => name.trim()),
      };
      await onSave(cleanedData);
      onClose();
    } catch (err) {
      console.error('Failed to save demo:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {existingDemo ? 'Edit Demo' : 'Schedule Demo'}
              </h2>
              <p className="text-blue-100 text-sm">Book a demo session with an organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Organization Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Organization *
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => {
                    setOrgSearch(e.target.value);
                    setShowOrgDropdown(true);
                    if (!e.target.value) {
                      setSelectedOrg(null);
                      setFormData(prev => ({ ...prev, org_id: '' }));
                    }
                  }}
                  onFocus={() => setShowOrgDropdown(true)}
                  placeholder="Search organizations..."
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.org_id ? 'border-red-300' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Dropdown */}
              {showOrgDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredOrgs.length > 0 ? (
                    filteredOrgs.slice(0, 10).map(org => (
                      <button
                        key={org.id}
                        onClick={() => handleSelectOrg(org)}
                        className="w-full px-4 py-2.5 text-left hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-neutral-400" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {org.display_name || org.name}
                          </p>
                          {org.industry && (
                            <p className="text-xs text-neutral-500">{org.industry}</p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                      No organizations found
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.org_id && (
              <p className="text-red-500 text-xs mt-1">{errors.org_id}</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.demo_date}
                onChange={(e) => setFormData(prev => ({ ...prev, demo_date: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.demo_date ? 'border-red-300' : 'border-neutral-200'
                }`}
              />
              {errors.demo_date && (
                <p className="text-red-500 text-xs mt-1">{errors.demo_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={formData.demo_time}
                onChange={(e) => setFormData(prev => ({ ...prev, demo_time: e.target.value }))}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Sales POC & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Sales POC *
              </label>
              <select
                value={formData.sales_poc}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_poc: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.sales_poc ? 'border-red-300' : 'border-neutral-200'
                }`}
              >
                {SALES_POCS.map(poc => (
                  <option key={poc} value={poc}>{poc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Status
              </label>
              <select
                value={formData.demo_status}
                onChange={(e) => setFormData(prev => ({ ...prev, demo_status: e.target.value as DemoFormData['demo_status'] }))}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Attendees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700">
                Attendees
              </label>
              <button
                type="button"
                onClick={handleAddAttendee}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.attendee_names.map((name, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleAttendeeChange(index, e.target.value)}
                    placeholder={`Attendee ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {formData.attendee_names.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(index)}
                      className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rating (only for completed) */}
          {formData.demo_status === 'completed' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Demo Rating *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, demo_rating: rating }))}
                    className={`p-2 rounded-lg transition-colors ${
                      formData.demo_rating && formData.demo_rating >= rating
                        ? 'text-amber-500'
                        : 'text-neutral-300 hover:text-amber-400'
                    }`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
              {errors.demo_rating && (
                <p className="text-red-500 text-xs mt-1">{errors.demo_rating}</p>
              )}
            </div>
          )}

          {/* Notes Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Observations
              </label>
              <textarea
                value={formData.demo_observations}
                onChange={(e) => setFormData(prev => ({ ...prev, demo_observations: e.target.value }))}
                placeholder="Key observations from the demo..."
                rows={3}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Pain Points
              </label>
              <textarea
                value={formData.pain_points}
                onChange={(e) => setFormData(prev => ({ ...prev, pain_points: e.target.value }))}
                placeholder="Customer pain points discussed..."
                rows={2}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Next Steps
              </label>
              <textarea
                value={formData.next_steps}
                onChange={(e) => setFormData(prev => ({ ...prev, next_steps: e.target.value }))}
                placeholder="Action items and follow-up..."
                rows={2}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-6 py-4 flex items-center justify-end gap-3 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : existingDemo ? (
              'Update Demo'
            ) : (
              'Schedule Demo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
