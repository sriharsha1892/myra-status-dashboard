'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';

interface MSAPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBytes: Uint8Array | null;
  filename: string;
  onDownload: () => void;
}

export function MSAPreviewModal({
  isOpen,
  onClose,
  pdfBytes,
  filename,
  onDownload,
}: MSAPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }
  }, [pdfBytes]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-5xl h-[90vh] rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-gradient-to-r from-violet-600 to-violet-700">
            <div>
              <h2 className="text-lg font-semibold text-white">MSA Preview</h2>
              <p className="text-sm text-violet-200">{filename}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white text-violet-700 rounded-lg font-medium hover:bg-violet-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors rounded-lg p-2 hover:bg-white/10"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 bg-neutral-100 overflow-hidden">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="MSA PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
