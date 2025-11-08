'use client';

import DocumentLibrary from '@/components/DocumentLibrary';

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Document Library</h1>
          <p className="mt-2 text-sm text-slate-600">
            Centralized resource hub for training materials, documentation, and support resources
          </p>
        </div>

        <DocumentLibrary viewMode="global" />
      </div>
    </div>
  );
}
