'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import ImportModal from '@/components/quote/ImportModal';
import type { SalesPipelineEntry } from '@/lib/quote/pipeline-types';

interface ImportTabProps {
  onImport: (entries: Partial<SalesPipelineEntry>[]) => Promise<void>;
  onRefresh: () => void;
}

interface ImportHistoryItem {
  id: string;
  timestamp: Date;
  count: number;
  status: 'success' | 'partial' | 'failed';
  message?: string;
}

export default function ImportTab({ onImport, onRefresh }: ImportTabProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);

  const handleImport = async (entries: Partial<SalesPipelineEntry>[]) => {
    try {
      await onImport(entries);
      setImportHistory(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        count: entries.length,
        status: 'success',
        message: `Successfully imported ${entries.length} entries`,
      }, ...prev.slice(0, 9)]);
      setShowImportModal(false);
      onRefresh();
    } catch (err) {
      setImportHistory(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        count: entries.length,
        status: 'failed',
        message: err instanceof Error ? err.message : 'Import failed',
      }, ...prev.slice(0, 9)]);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Import CTA */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Import Organizations</h2>
              <p className="text-blue-100 max-w-md">
                Bulk import organizations from CSV or TSV files. Map columns to fields and preview before importing.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            Start Import
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Import History */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-500" />
            Recent Imports
          </h3>
        </div>
        {importHistory.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {importHistory.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : item.status === 'partial' ? (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{item.count} entries</p>
                    <p className="text-xs text-neutral-500">{item.message}</p>
                  </div>
                </div>
                <span className="text-xs text-neutral-400">
                  {item.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No recent imports</p>
            <p className="text-sm text-neutral-400">Import history will appear here</p>
          </div>
        )}
      </div>

      {/* Help Card */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200/60 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-2">Import Tips</h3>
            <ul className="text-sm text-neutral-600 space-y-1">
              <li>- CSV or TSV format supported</li>
              <li>- First row should contain column headers</li>
              <li>- Required: Organization name</li>
              <li>- Optional: Contact name, email, status, deal value, etc.</li>
              <li>- Duplicate emails will be flagged for review</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}
