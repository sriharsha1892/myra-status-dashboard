'use client';

import { useState } from 'react';
import { Lightbulb, Target, MessageSquare, Folder } from 'lucide-react';
import FeatureRequestsTab from './FeatureRequestsTab';
import ResearchActionsTab from './ResearchActionsTab';
import UnifiedNotesPanel from './UnifiedNotesPanel';
import DocumentLibrary2027 from './DocumentLibrary2027';

interface ProductResearchTabProps {
  orgId: string;
  organizationName: string;
  currentUserId: string;
  currentUserRole?: string;
}

export default function ProductResearchTab({
  orgId,
  organizationName,
  currentUserId,
  currentUserRole,
}: ProductResearchTabProps) {
  const [activeSection, setActiveSection] = useState<'features' | 'research' | 'notes' | 'documents'>('features');

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex items-center gap-2 p-1 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl inline-flex flex-wrap">
        <button
          onClick={() => setActiveSection('features')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'features'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Feature Requests
        </button>
        <button
          onClick={() => setActiveSection('research')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'research'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Target className="w-4 h-4" />
          Research Actions
        </button>
        <button
          onClick={() => setActiveSection('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'notes'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Notes
        </button>
        <button
          onClick={() => setActiveSection('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'documents'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Folder className="w-4 h-4" />
          Documents
        </button>
      </div>

      {/* Content */}
      {activeSection === 'features' && (
        <FeatureRequestsTab orgId={orgId} />
      )}

      {activeSection === 'research' && (
        <ResearchActionsTab orgId={orgId} />
      )}

      {activeSection === 'notes' && (
        <UnifiedNotesPanel
          noteType="trial_org_note"
          contextId={orgId}
          contextName={organizationName}
          allowFeatureProposals={true}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}

      {activeSection === 'documents' && (
        <DocumentLibrary2027
          trialOrgId={orgId}
          viewMode="both"
        />
      )}
    </div>
  );
}
