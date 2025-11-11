'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { reportErrorToSupport, type ErrorContext } from '@/lib/errorHandler';

interface ErrorToastWithReportProps {
  error: any;
  context: ErrorContext;
  message: string;
  suggestion?: string;
  userEmail?: string;
  userId?: string;
  onReportSuccess?: (ticketId: string) => void;
}

/**
 * Error Toast Component with Support Reporting
 * Displays error message with option to report to support team
 */
export function ErrorToastWithReport({
  error,
  context,
  message,
  suggestion,
  userEmail,
  userId,
  onReportSuccess
}: ErrorToastWithReportProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const handleReport = async () => {
    setIsReporting(true);

    try {
      const result = await reportErrorToSupport(error, context, userEmail, userId);

      if (result.success && result.ticketId) {
        setHasReported(true);
        toast.success(
          <div>
            <div className="font-semibold">Error reported successfully ✅</div>
            <div className="text-xs mt-1">
              Ticket #{result.ticketId} created. Support team has been notified.
            </div>
          </div>,
          { duration: 5000 }
        );

        if (onReportSuccess) {
          onReportSuccess(result.ticketId);
        }
      } else {
        throw new Error(result.error || 'Failed to report error');
      }
    } catch (reportError: any) {
      toast.error(
        <div>
          <div className="font-semibold">Failed to report error</div>
          <div className="text-xs mt-1">{reportError.message}</div>
        </div>
      );
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 max-w-sm">
      {/* Error Message */}
      <div>
        <div className="font-semibold text-sm">{message}</div>
        {suggestion && (
          <div className="text-xs mt-1 text-gray-700">{suggestion}</div>
        )}
      </div>

      {/* Report Button */}
      {!hasReported && (
        <button
          onClick={handleReport}
          disabled={isReporting}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReporting ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Reporting...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report to Support
            </>
          )}
        </button>
      )}

      {hasReported && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Reported to support team
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to show error toast with report option
 * Use this instead of toast.error() when you want to allow error reporting
 */
export function showErrorWithReport(
  error: any,
  context: ErrorContext,
  message: string,
  suggestion?: string,
  userEmail?: string,
  userId?: string
) {
  toast.error(
    (t) => (
      <ErrorToastWithReport
        error={error}
        context={context}
        message={message}
        suggestion={suggestion}
        userEmail={userEmail}
        userId={userId}
        onReportSuccess={(ticketId) => {
          // Auto-dismiss the error toast after successful report
          setTimeout(() => toast.dismiss(t.id), 2000);
        }}
      />
    ),
    {
      duration: 10000, // Keep error visible longer to allow reporting
      style: {
        background: '#FEE2E2',
        border: '1px solid #FCA5A5',
        padding: '12px',
      }
    }
  );
}
