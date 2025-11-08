'use client';

import toast, { Toaster, Toast } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        containerStyle={{
          top: 80,
          right: 20,
        }}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#fff',
            color: '#0f172a',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxWidth: '500px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          },
          success: {
            duration: 4000,
            style: {
              background: '#f0fdf4',
              border: '1px solid #86efac',
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
              border: '1px solid #fca5a5',
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
              border: '1px solid #fde047',
            },
            iconTheme: {
              primary: '#f59e0b',
              secondary: '#fff',
            },
          },
        }}
      >
        {(t: Toast) => (
          <div
            className={`flex items-center gap-3 ${
              t.visible ? 'animate-enter' : 'animate-leave'
            }`}
          >
            <div className="flex-1">{t.message}</div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
        )}
      </Toaster>

      <style jsx global>{`
        @keyframes enter {
          0% {
            transform: translate3d(100%, 0, 0);
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
            transform: translate3d(100%, 0, 0);
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
    </AuthProvider>
  );
}
