'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Users2,
  LogOut,
  Map,
  FileText,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import NotificationsBell from '@/components/NotificationsBell';

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user && pathname !== '/support/login') {
      router.push('/support/login');
    }
  }, [user, authLoading, router, pathname]);

  useEffect(() => {
    // Redirect to dashboard immediately after successful login
    if (!authLoading && user && pathname === '/support/login') {
      router.push('/support/dashboard');
    }
  }, [user, authLoading, router, pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Show loading state while checking auth
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show loading state if authenticated but still on login page (during redirect)
  if (user && pathname === '/support/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Signing in...</div>
      </div>
    );
  }

  // Show login page without sidebar
  if (!user) {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            success: {
              duration: 2500,
              style: {
                background: '#10b981',
                color: '#fff',
              },
            },
            error: {
              duration: 4000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
            },
          }}
        />
        {children}
      </>
    );
  }

  // Show authenticated pages with sidebar
  return (
    <div className="flex h-screen bg-slate-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          success: {
            duration: 2500,
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      >
        {(t) => (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              {t.message}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </Toaster>

      {/* Hamburger Button - Mobile Only */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5" strokeWidth={2} />
        ) : (
          <Menu className="w-5 h-5" strokeWidth={2} />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <aside className={`
        w-64 bg-white border-r border-slate-200 flex flex-col
        fixed lg:relative inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Header */}
        <div className="h-16 px-5 flex items-center border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Modern Neural Network / AI Brain Logo */}
                {/* Central node */}
                <circle cx="12" cy="12" r="2" fill="currentColor" opacity="1"/>

                {/* Outer orbital nodes */}
                <circle cx="12" cy="6" r="1.5" fill="currentColor" opacity="0.9"/>
                <circle cx="18" cy="12" r="1.5" fill="currentColor" opacity="0.9"/>
                <circle cx="12" cy="18" r="1.5" fill="currentColor" opacity="0.9"/>
                <circle cx="6" cy="12" r="1.5" fill="currentColor" opacity="0.9"/>

                {/* Connection lines with gradient effect */}
                <path d="M12 10 L12 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <path d="M13.5 11.5 L16.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <path d="M12 14 L12 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <path d="M10.5 12.5 L7.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>

                {/* Diagonal connections for neural network feel */}
                <path d="M13 10.5 L16.5 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
                <path d="M13 13.5 L16.5 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
                <path d="M11 13.5 L7.5 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
                <path d="M11 10.5 L7.5 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
              </svg>
            </div>
            <span className="text-base font-semibold text-slate-900">
              myRA AI
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
          <div className="space-y-1">
            <button
              onClick={() => {
                router.push('/support/dashboard');
                setMobileMenuOpen(false);
              }}
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full ${
                pathname === '/support/dashboard'
                  ? 'text-slate-900 bg-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 shrink-0 ${pathname === '/support/dashboard' ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={2} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                router.push('/support/trials');
                setMobileMenuOpen(false);
              }}
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full ${
                pathname?.startsWith('/support/trials')
                  ? 'text-slate-900 bg-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/trials') ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={2} />
              <span>Trial Orgs</span>
            </button>

            <button
              onClick={() => {
                router.push('/support/tickets');
                setMobileMenuOpen(false);
              }}
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full ${
                pathname?.startsWith('/support/tickets')
                  ? 'text-slate-900 bg-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/tickets') ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={2} />
              <span>Tickets</span>
            </button>

            <button
              onClick={() => {
                router.push('/support/reports');
                setMobileMenuOpen(false);
              }}
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full ${
                pathname === '/support/reports'
                  ? 'text-slate-900 bg-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className={`w-5 h-5 shrink-0 ${pathname === '/support/reports' ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={2} />
              <span>Reports</span>
            </button>

            <button
              onClick={() => {
                router.push('/support/users');
                setMobileMenuOpen(false);
              }}
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full ${
                pathname === '/support/users'
                  ? 'text-slate-900 bg-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users2 className={`w-5 h-5 shrink-0 ${pathname === '/support/users' ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={2} />
              <span>Users</span>
            </button>

            {/* Roadmap - Admin only */}
            {role?.toLowerCase() === 'admin' && (
              <button
                onClick={() => {
                  router.push('/support/admin/roadmap');
                  setMobileMenuOpen(false);
                }}
                className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full ${
                  pathname?.startsWith('/support/admin/roadmap') || pathname?.startsWith('/support/trials/roadmap')
                    ? 'text-slate-900 bg-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Map className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/admin/roadmap') || pathname?.startsWith('/support/trials/roadmap') ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={2} />
                <span>Roadmap</span>
              </button>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-auto pt-4 border-t border-slate-200 space-y-1">
            {/* Link to Public Status Page */}
            <a
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            >
              <ExternalLink className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span>Public Status</span>
            </a>

            {/* Sign Out Button */}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full text-slate-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-slate-200">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">Team</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:ml-0 relative">
        {/* Mobile header spacer */}
        <div className="lg:hidden h-16" />

        {/* Notification Bell - Fixed top-right corner */}
        <div className="fixed top-4 right-6 z-50">
          <NotificationsBell />
        </div>

        {children}
      </main>
    </div>
  );
}
