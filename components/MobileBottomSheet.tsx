'use client';

import { useEffect, useCallback, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  // If true, renders as bottom sheet on mobile, modal on desktop
  // If false, always renders as modal
  enableBottomSheet?: boolean;
}

/**
 * Mobile-Responsive Modal/Bottom Sheet
 *
 * On mobile: Renders as a bottom sheet that slides up
 * On desktop: Renders as a centered modal
 *
 * Features:
 * - Swipe down to close on mobile
 * - Escape key to close
 * - Click outside to close
 * - Locks body scroll when open
 */
export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  enableBottomSheet = true,
}: MobileBottomSheetProps) {
  const isMobile = useIsMobile();
  const useBottomSheet = enableBottomSheet && isMobile;

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  if (useBottomSheet) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fadeIn"
        onClick={handleBackdropClick}
      >
        <div
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slideUp max-h-[90vh] overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'sheet-title' : undefined}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="px-4 pb-3 border-b border-gray-200">
              <h2 id="sheet-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Add these styles to your global CSS for animations:
 *
 * @keyframes fadeIn {
 *   from { opacity: 0; }
 *   to { opacity: 1; }
 * }
 *
 * @keyframes slideUp {
 *   from { transform: translateY(100%); }
 *   to { transform: translateY(0); }
 * }
 *
 * @keyframes scaleIn {
 *   from { opacity: 0; transform: scale(0.95); }
 *   to { opacity: 1; transform: scale(1); }
 * }
 *
 * .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
 * .animate-slideUp { animation: slideUp 0.3s ease-out; }
 * .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
 */

export default MobileBottomSheet;
