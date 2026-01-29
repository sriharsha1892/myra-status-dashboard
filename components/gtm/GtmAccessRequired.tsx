'use client';

import { Building2 } from 'lucide-react';

export function GtmAccessRequired() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">GTM Dashboard</h1>
        <p className="text-neutral-500 mt-2">
          Access required. Contact your administrator for a login link.
        </p>
      </div>
    </div>
  );
}
