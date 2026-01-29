'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CustomerSyncTool from '@/components/quote/CustomerSyncTool';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';

export default function SyncPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check if already authenticated from session
    const authStatus = sessionStorage.getItem('quote-admin-auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  const handleAuthSuccess = () => {
    sessionStorage.setItem('quote-admin-auth', 'true');
    setIsAuthenticated(true);
  };

  // Loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth modal
  if (!isAuthenticated) {
    return <QuoteAdminAuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/quote/admin"
              className="text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">
                Customer Sync Tool
              </h1>
              <p className="text-sm text-neutral-500">
                Bulk sync customer lists with AI-powered matching
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <CustomerSyncTool />
      </main>
    </div>
  );
}
