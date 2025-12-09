'use client';

import { useState } from 'react';
import toast, { Toaster, Toast as RHToast } from 'react-hot-toast';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CommandModalProvider } from '@/contexts/CommandModalContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { X } from 'lucide-react';
import { EnhancedToast } from './toast/EnhancedToast';
import { toastManager } from '@/lib/toast/manager';
import type { Toast } from '@/lib/toast/types';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance with optimized defaults and global error handling
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Only show error toast for background refetch failures
            // Initial fetch errors are handled by component error boundaries
            if (query.state.data !== undefined) {
              toast.error(`Background refresh failed: ${error.message}`);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            // Show error toast for mutations without their own error handling
            if (!mutation.options.onError) {
              toast.error(`Operation failed: ${error.message}`);
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // Data fresh for 2 minutes (reduced from 5)
            gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
            refetchOnWindowFocus: true, // Refresh data when user returns to tab
            refetchOnMount: true, // Refresh on component mount
            retry: 1, // Only retry failed queries once
            refetchInterval: false, // Components can override for auto-refresh
          },
          mutations: {
            retry: 0, // Don't retry mutations by default
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <CommandModalProvider>
            {children}
      <Toaster
        position="top-right"
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '2px solid #cbd5e1',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: '500',
          },
          success: {
            duration: 4000,
            style: {
              background: '#f0fdf4',
              border: '2px solid #86efac',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.15)',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 6000,
            style: {
              background: '#fef2f2',
              border: '2px solid #fca5a5',
              boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -2px rgba(239, 68, 68, 0.15)',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            duration: Infinity,
            style: {
              background: '#fef3c7',
              border: '2px solid #fde047',
              boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -2px rgba(245, 158, 11, 0.15)',
            },
            iconTheme: {
              primary: '#f59e0b',
              secondary: '#fff',
            },
          },
        }}
      >
        {(t: RHToast) => {
          // Check if this is an enhanced toast
          const enhancedToastData =
            typeof window !== 'undefined'
              ? ((window as any).__ENHANCED_TOAST_DATA__ as Map<string, Toast>)?.get(t.id)
              : null;

          // If enhanced toast data exists, use EnhancedToast component
          if (enhancedToastData) {
            return (
              <div className={t.visible ? 'animate-enter' : 'animate-leave'}>
                <EnhancedToast
                  toast={enhancedToastData}
                  onDismiss={(id) => toastManager.dismiss(id, 'user')}
                />
              </div>
            );
          }

          // Otherwise, use simple rendering for backward compatibility
          return (
            <div
              className={`flex items-center gap-3 ${
                t.visible ? 'animate-enter' : 'animate-leave'
              }`}
            >
              <div className="flex-1">{t.message}</div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-shrink-0 p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
              </button>
            </div>
          );
        }}
      </Toaster>

      <style jsx global>{`
        @keyframes enter {
          0% {
            transform: translate3d(0, -100%, 0);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }

        @keyframes leave {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, -100%, 0);
            opacity: 0;
          }
        }

        .animate-enter {
          animation: enter 0.3s ease-out;
        }

        .animate-leave {
          animation: leave 0.2s ease-in forwards;
        }
      `}</style>
          </CommandModalProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
