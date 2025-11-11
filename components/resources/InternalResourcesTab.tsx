'use client';

import { useState } from 'react';
import { FileText, MessageSquare, HelpCircle } from 'lucide-react';
import InternalDocumentsSection from './InternalDocumentsSection';
import CommunityFeedSection from './CommunityFeedSection';
import QAHubSection from './QAHubSection';

type SectionType = 'documents' | 'discussions' | 'qa';

export default function InternalResourcesTab() {
  const [activeSection, setActiveSection] = useState<SectionType>('documents');

  return (
    <div className="space-y-6">
      {/* Section Switcher - Fin AI inspired with gradients */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveSection('documents')}
            className={`
              flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-all
              ${activeSection === 'documents'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </button>

          <button
            onClick={() => setActiveSection('discussions')}
            className={`
              flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-all
              ${activeSection === 'discussions'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-200'
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Discussions</span>
            <span className="sm:hidden">💬</span>
            {activeSection === 'discussions' && (
              <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold">12</span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('qa')}
            className={`
              flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-all
              ${activeSection === 'qa'
                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-200'
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Q&A</span>
            <span className="sm:hidden">❓</span>
            {activeSection === 'qa' && (
              <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold">5</span>
            )}
          </button>
        </div>
      </div>

      {/* Section Content */}
      <div className="min-h-[600px]">
        {activeSection === 'documents' && (
          <InternalDocumentsSection />
        )}

        {activeSection === 'discussions' && (
          <CommunityFeedSection />
        )}

        {activeSection === 'qa' && (
          <QAHubSection />
        )}
      </div>
    </div>
  );
}
