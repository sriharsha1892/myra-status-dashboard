'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import BulkEditPanel from '@/components/BulkEditPanel';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export default function BulkEditPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 text-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Edit Users</h1>
              <p className="text-sm text-gray-600 mt-1">Edit multiple trial users at once</p>
            </div>
            <button
              onClick={() => router.back()}
              className="h-9 px-4 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <BulkEditPanel
            onComplete={() => {
              // Stay on page after edit
            }}
          />
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">How to use bulk edit</h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>1. Search for users by email or name</p>
                <p>2. Select one or multiple users using checkboxes</p>
                <p>3. Click "Edit Users" button to update them</p>
                <p>4. Choose the field to edit and enter the new value</p>
                <p>5. Click "Apply Update" to save changes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
