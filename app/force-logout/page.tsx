'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForceLogoutPage() {
  useEffect(() => {
    async function forceLogout() {
      const supabase = createClient();

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();

        // Clear all cookies
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }

      // Wait a moment then redirect
      setTimeout(() => {
        window.location.href = '/support/login';
      }, 500);
    }

    forceLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-semibold text-gray-900">Clearing your session...</p>
        <p className="text-sm text-gray-600 mt-2">You'll be redirected to login in a moment</p>
      </div>
    </div>
  );
}
