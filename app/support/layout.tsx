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
        <Toaster position="top-right" />
        {children}
      </>
    );
  }

  // Show authenticated pages with sidebar
  return (
    <div className="flex h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

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

      {/* Modern Sidebar */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:transform-none ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-base font-semibold text-slate-900">
              myRA AI
            </span>
          </div>
          <NotificationsBell />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/support/dashboard')}
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
              onClick={() => router.push('/support/trials')}
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
              onClick={() => router.push('/support/reports')}
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
              onClick={() => router.push('/support/users')}
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
                onClick={() => router.push('/support/admin/roadmap')}
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

          {/* Sign Out Button - Prominent placement */}
          <div className="mt-auto pt-4 border-t border-slate-200">
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
      <main className="flex-1 overflow-y-auto lg:ml-0">{children}</main>
    </div>
  );
}
