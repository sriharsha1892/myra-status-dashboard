'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Globe, Users, Sparkles } from 'lucide-react';
import ExternalResourcesTab from '@/components/resources/ExternalResourcesTab';
import InternalResourcesTab from '@/components/resources/InternalResourcesTab';
import { createClient } from '@/lib/supabase/client';

// Lazy load modal for code splitting
const AnnouncementManagementModal = dynamic(() => import('@/components/resources/AnnouncementManagementModal'), {
  loading: () => null,
});

type TabType = 'external' | 'internal';

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('internal');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        setUserRole(userData?.role || null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title Row */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">
                    Resources
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Knowledge hub for teams and clients
                  </p>
                </div>
              </div>

              {/* Quick Stats & Actions */}
              <div className="hidden md:flex items-center gap-4">
                {isAdmin && (
                  <button
                    onClick={() => setIsAnnouncementModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 border-2 border-amber-400"
                  >
                    Manage Announcements
                  </button>
                )}
                <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">24 Resources</p>
                </div>
                <div className="px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 font-medium">12 Discussions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Switcher - Enhanced with better visual feedback */}
          <div className="flex items-center gap-4 pb-4">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg border border-gray-200">
              <button
                onClick={() => setActiveTab('external')}
                className={`
                  relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform
                  ${activeTab === 'external'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-200 scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                  }
                `}
              >
                <Globe className={`w-4 h-4 ${activeTab === 'external' ? 'animate-pulse' : ''}`} />
                <span>External</span>
                {activeTab === 'external' && (
                  <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs rounded-lg font-bold backdrop-blur-sm">
                    Client Facing
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('internal')}
                className={`
                  relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform
                  ${activeTab === 'internal'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl shadow-purple-200 scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                  }
                `}
              >
                <Users className={`w-4 h-4 ${activeTab === 'internal' ? 'animate-pulse' : ''}`} />
                <span>Internal</span>
                {activeTab === 'internal' && (
                  <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs rounded-lg font-bold backdrop-blur-sm">
                    Team Only
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'external' ? (
          <ExternalResourcesTab />
        ) : (
          <InternalResourcesTab />
        )}
      </div>

      {/* Announcement Management Modal */}
      <AnnouncementManagementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
      />
    </div>
  );
}
