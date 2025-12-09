'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Upload, FileSpreadsheet, Sparkles, Users, Calendar, FileText, Lightbulb } from 'lucide-react';

// Lazy load modals for code splitting - only loaded when triggered
// All modals use the unified BulkImportWizard framework
const BulkImportCSVOrganizationsModal = dynamic(() => import('@/components/shared/BulkImportCSVOrganizationsModal'), {
  loading: () => null,
});
const BulkImportActivityTimelineModal = dynamic(() => import('@/components/shared/BulkImportActivityTimelineModal'), {
  loading: () => null,
});
const BulkImportSmartModal = dynamic(() => import('@/components/shared/BulkImportSmartModal'), {
  loading: () => null,
});
const BulkImportExcelOrganizationsModal = dynamic(() => import('@/components/shared/BulkImportExcelOrganizationsModal'), {
  loading: () => null,
});
const BulkImportTimelineEventsModal = dynamic(() => import('@/components/shared/BulkImportTimelineEventsModal'), {
  loading: () => null,
});
const BulkImportTrialUsersModal = dynamic(() => import('@/components/shared/BulkImportTrialUsersModal'), {
  loading: () => null,
});

/**
 * Unified Bulk Import Dashboard
 *
 * Provides access to all 7 bulk import tools through a single interface:
 * - CSV Organizations
 * - Activity Timeline
 * - Smart Import
 * - Timeline Events (AI)
 * - Trial Users (AI)
 * - Excel Organizations
 * - Feature Requests
 */
export default function BulkImportPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveModal(null);
  };

  const importTools = [
    {
      id: 'csv-organizations',
      name: 'CSV Organizations',
      description: 'Import organizations from CSV files with contact information',
      icon: FileSpreadsheet,
      color: 'blue',
      features: ['Batch import', 'Email validation', 'Logo generation'],
    },
    {
      id: 'smart-import',
      name: 'Smart Import',
      description: 'Auto-detect columns and categories with intelligent defaults',
      icon: Sparkles,
      color: 'purple',
      features: ['Auto-detection', 'Flexible columns', 'Smart defaults'],
    },
    {
      id: 'activity-timeline',
      name: 'Activity Timeline',
      description: 'Import activity events (meetings, calls, demos)',
      icon: Calendar,
      color: 'green',
      features: ['Event types', 'Org lookup', 'Date parsing'],
    },
    {
      id: 'timeline-events',
      name: 'Timeline Events',
      description: 'AI-powered parsing of unstructured timeline events',
      icon: Lightbulb,
      color: 'orange',
      features: ['AI parsing', 'Date extraction', '47 event types'],
    },
    {
      id: 'trial-users',
      name: 'Trial Users',
      description: 'AI-powered extraction of users from text',
      icon: Users,
      color: 'indigo',
      features: ['Email extraction', 'Role detection', 'Name inference'],
    },
    {
      id: 'excel-organizations',
      name: 'Excel Organizations',
      description: 'Import organizations from Excel spreadsheets',
      icon: FileSpreadsheet,
      color: 'teal',
      features: ['Multi-sheet', 'Column mapping', 'Rich data'],
    },
    {
      id: 'feature-requests',
      name: 'Feature Requests',
      description: 'AI-powered feature request parsing and categorization',
      icon: FileText,
      color: 'pink',
      features: ['AI parsing', 'Priority detection', 'Multi-org'],
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; hover: string; text: string }> = {
      blue: { border: 'border-blue-200', bg: 'bg-blue-50', hover: 'hover:border-blue-400', text: 'text-blue-700' },
      purple: { border: 'border-purple-200', bg: 'bg-purple-50', hover: 'hover:border-purple-400', text: 'text-purple-700' },
      green: { border: 'border-green-200', bg: 'bg-green-50', hover: 'hover:border-green-400', text: 'text-green-700' },
      orange: { border: 'border-orange-200', bg: 'bg-orange-50', hover: 'hover:border-orange-400', text: 'text-orange-700' },
      indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', hover: 'hover:border-indigo-400', text: 'text-indigo-700' },
      teal: { border: 'border-teal-200', bg: 'bg-teal-50', hover: 'hover:border-teal-400', text: 'text-teal-700' },
      pink: { border: 'border-pink-200', bg: 'bg-pink-50', hover: 'hover:border-pink-400', text: 'text-pink-700' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bulk Import Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Unified access to all bulk import tools. Import organizations, users, events, and more.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">Total Tools</div>
            <div className="text-2xl font-bold text-gray-900">7</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">AI-Powered</div>
            <div className="text-2xl font-bold text-purple-600">3</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">CSV Support</div>
            <div className="text-2xl font-bold text-green-600">4</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">Smart Features</div>
            <div className="text-2xl font-bold text-blue-600">2</div>
          </div>
        </div>

        {/* Import Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {importTools.map((tool) => {
            const Icon = tool.icon;
            const colors = getColorClasses(tool.color);

            return (
              <button
                key={tool.id}
                onClick={() => setActiveModal(tool.id)}
                className={`
                  group relative p-6 bg-white rounded-xl border-2 ${colors.border} ${colors.hover}
                  transition-all duration-200 hover:shadow-lg text-left
                `}
              >
                {/* Icon */}
                <div className={`inline-flex p-3 ${colors.bg} rounded-lg mb-4`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                  {tool.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4">
                  {tool.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {tool.features.map((feature) => (
                    <span
                      key={feature}
                      className={`text-xs px-2 py-1 ${colors.bg} ${colors.text} rounded-full`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className={`w-5 h-5 ${colors.text}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
          <div className="text-blue-800 text-sm space-y-1">
            <p>• All imports support preview mode before committing</p>
            <p>• Results can be downloaded as CSV for review</p>
            <p>• Failed items can be retried without re-uploading</p>
            <p>• AI-powered tools require unstructured text input</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BulkImportCSVOrganizationsModal
        isOpen={activeModal === 'csv-organizations'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />

      <BulkImportSmartModal
        isOpen={activeModal === 'smart-import'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />

      <BulkImportActivityTimelineModal
        isOpen={activeModal === 'activity-timeline'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />

      <BulkImportTimelineEventsModal
        isOpen={activeModal === 'timeline-events'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />

      <BulkImportTrialUsersModal
        isOpen={activeModal === 'trial-users'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />

      <BulkImportExcelOrganizationsModal
        isOpen={activeModal === 'excel-organizations'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />

      {/* Feature Requests - Requires org context, show info modal */}
      {activeModal === 'feature-requests' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold mb-4">Feature Requests Import</h2>
            <p className="text-gray-600 mb-4">
              Feature requests must be imported from an organization&apos;s detail page.
              Navigate to the organization and use the &quot;Import Feature Requests&quot; option there.
            </p>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
