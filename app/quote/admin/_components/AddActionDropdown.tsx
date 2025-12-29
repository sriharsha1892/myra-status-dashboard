'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, UserPlus, Building2, Calendar } from 'lucide-react';
import OrganizationEditModal from '@/components/quote/OrganizationEditModal';
import DemoScheduleModal from '@/components/quote/DemoScheduleModal';
import type { Organization, OrganizationInput } from '@/lib/quote/organization-types';

interface AddActionDropdownProps {
  onRefresh: () => void;
  parentOrgs: Organization[];
}

export default function AddActionDropdown({ onRefresh, parentOrgs }: AddActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSaveOrg = async (formData: OrganizationInput) => {
    const response = await fetch('/api/quote/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Failed to save');
    setShowOrgModal(false);
    onRefresh();
  };

  const options = [
    {
      id: 'prospect',
      label: 'Add Prospect',
      description: 'Quick add a new lead',
      icon: <UserPlus className="w-5 h-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      onClick: () => {
        setIsOpen(false);
        setShowOrgModal(true);
      },
    },
    {
      id: 'trial',
      label: 'Add Trial Org',
      description: 'Create organization with full details',
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      onClick: () => {
        setIsOpen(false);
        setShowOrgModal(true);
      },
    },
    {
      id: 'demo',
      label: 'Schedule Demo',
      description: 'Book a demo session',
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => {
        setIsOpen(false);
        setShowDemoModal(true);
      },
    },
  ];

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-9 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/20"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-200/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={option.onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg ${option.bgColor} flex items-center justify-center ${option.color}`}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{option.label}</p>
                    <p className="text-xs text-neutral-500 truncate">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Organization Edit Modal */}
      <OrganizationEditModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        org={{}}
        parentOrgs={parentOrgs}
        onSave={handleSaveOrg}
      />

      {/* Demo Schedule Modal */}
      <DemoScheduleModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onSave={async (demoData) => {
          const response = await fetch('/api/quote/demos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(demoData),
          });
          const data = await response.json();
          if (!response.ok || data.error) throw new Error(data.error || 'Failed to schedule demo');
          setShowDemoModal(false);
          onRefresh();
        }}
      />
    </>
  );
}
