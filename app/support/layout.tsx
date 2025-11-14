'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Users2,
  LogOut,
  Map,
  Menu,
  X,
  FolderOpen,
  Bell,
  Sparkles,
  MessageSquare,
  FileText,
  User,
  MessageCircle,
  Lightbulb
} from 'lucide-react';
import FeedbackWidget from '@/components/support/FeedbackWidget';
import CustomerSupportChat from '@/components/CustomerSupportChat';
import { LoadingProvider } from '@/lib/loading';
import { GlobalSearch } from '@/components/GlobalSearch';

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center shadow-md animate-pulse">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="2" fill="currentColor" opacity="1"/>
              <circle cx="12" cy="6" r="1.5" fill="currentColor" opacity="0.9"/>
              <circle cx="18" cy="12" r="1.5" fill="currentColor" opacity="0.9"/>
              <circle cx="12" cy="18" r="1.5" fill="currentColor" opacity="0.9"/>
              <circle cx="6" cy="12" r="1.5" fill="currentColor" opacity="0.9"/>
            </svg>
          </div>
          <p className="text-sm text-neutral-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state if authenticated but still on login page (during redirect)
  if (user && pathname === '/support/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center shadow-md">
            <svg
              className="w-6 h-6 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-sm text-neutral-600 font-medium">Signing in...</p>
        </div>
      </div>
    );
  }

  // Show login page without sidebar
  if (!user) {
    return (
      <LoadingProvider>
        {children}
        {/* Customer Support Chat Widget - Available to everyone including anonymous visitors */}
        <CustomerSupportChat />
      </LoadingProvider>
    );
  }

  // Show authenticated pages with sidebar
  return (
    <LoadingProvider>
      <div className="flex h-screen bg-neutral-50">
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
          className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" strokeWidth={2} />
          ) : (
            <Menu className="w-5 h-5" strokeWidth={2} />
          )}
        </button>

      {/* Glassmorphism Sidebar - Asana-inspired */}
      <aside className={`w-64 bg-white/95 backdrop-blur-xl backdrop-saturate-180 border-r border-neutral-200/80 flex flex-col fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:transform-none shadow-glass ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo Header - No gradients */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center shrink-0 shadow-md">
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
            <span className="text-base font-semibold text-neutral-900">
              myRA AI
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
          <div className="space-y-1">
            <Link
              href="/support/dashboard"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/support/dashboard'
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 shrink-0 ${pathname === '/support/dashboard' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/support/notifications"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/support/notifications'
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Bell className={`w-5 h-5 shrink-0 ${pathname === '/support/notifications' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Notifications</span>
            </Link>

            <Link
              href="/support/trials"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname?.startsWith('/support/trials')
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Building2 className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/trials') ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Trial Orgs</span>
            </Link>

            <Link
              href="/support/reports"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/support/reports'
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <BarChart3 className={`w-5 h-5 shrink-0 ${pathname === '/support/reports' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Reports</span>
            </Link>

            <Link
              href="/support/resources"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/support/resources'
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Sparkles className={`w-5 h-5 shrink-0 ${pathname === '/support/resources' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Resources</span>
            </Link>

            <Link
              href="/support/feature-requests"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/support/feature-requests'
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Lightbulb className={`w-5 h-5 shrink-0 ${pathname === '/support/feature-requests' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Feature Requests</span>
            </Link>

            {/* Tickets - All users */}
            <Link
              href="/support/tickets"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname?.startsWith('/support/tickets')
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <MessageSquare className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/tickets') ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Tickets</span>
            </Link>

            {/* Users - Admin and Super Admin only */}
            {(role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'super admin') && (
              <Link
                href="/support/users"
                className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname === '/support/users'
                    ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Users2 className={`w-5 h-5 shrink-0 ${pathname === '/support/users' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
                <span>Users</span>
              </Link>
            )}

            {/* Roadmap - Admin and Super Admin only */}
            {(role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'super admin') && (
              <Link
                href="/support/admin/roadmap"
                className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname?.startsWith('/support/admin/roadmap') || pathname?.startsWith('/support/trials/roadmap')
                    ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Map className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/admin/roadmap') || pathname?.startsWith('/support/trials/roadmap') ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
                <span>Roadmap</span>
              </Link>
            )}

            {/* Customer Support - Super Admin only */}
            {(role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'super admin') && (
              <Link
                href="/support/admin/customer-support"
                className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname?.startsWith('/support/admin/customer-support')
                    ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <MessageCircle className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/support/admin/customer-support') ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
                <span>Customer Support</span>
              </Link>
            )}

          </div>

          {/* Profile & Sign Out - Bottom Section */}
          <div className="mt-auto pt-4 border-t border-neutral-200 space-y-1">
            <Link
              href="/support/profile"
              className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/support/profile'
                  ? 'text-neutral-900 bg-accent-50 border border-accent-100'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <User className={`w-5 h-5 shrink-0 ${pathname === '/support/profile' ? 'text-accent-600' : 'text-neutral-400'}`} strokeWidth={2} />
              <span>Profile</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-200 w-full text-neutral-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-neutral-200">
          <div className="p-2.5 bg-white/70 backdrop-blur-sm rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-900 truncate">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-[10px] text-neutral-500 truncate">Team</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:ml-0">
        {/* Header Bar with Global Search */}
        <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-6 py-3">
          <div className="flex items-center justify-end">
            <GlobalSearch />
          </div>
        </div>
        {children}
      </main>

      {/* Feedback Widget - Always visible for all logged-in users */}
      <FeedbackWidget userId={user?.id} />

      {/* Customer Support Chat Widget - Available to everyone */}
      <CustomerSupportChat />
      </div>
    </LoadingProvider>
  );
}
