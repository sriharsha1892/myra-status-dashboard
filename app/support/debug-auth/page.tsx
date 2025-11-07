'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DebugAuthPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getSessionInfo() {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setSessionInfo({ error: error.message });
      } else if (session) {
        setSessionInfo({
          email: session.user.email,
          role: session.user.user_metadata?.role,
          fullName: session.user.user_metadata?.full_name,
          allMetadata: session.user.user_metadata,
          userId: session.user.id,
          createdAt: session.user.created_at,
          lastSignIn: session.user.last_sign_in_at,
        });
      } else {
        setSessionInfo({ notLoggedIn: true });
      }
      setLoading(false);
    }

    getSessionInfo();
  }, []);

  const handleForceLogout = async () => {
    // Clear all Supabase data
    await supabase.auth.signOut();

    // Clear local storage
    localStorage.clear();

    // Clear session storage
    sessionStorage.clear();

    // Redirect to login
    router.push('/support/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Session Debug Info</h1>

          {sessionInfo?.notLoggedIn ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
              <p className="text-yellow-900 font-semibold">❌ Not logged in</p>
              <p className="text-yellow-700 text-sm mt-2">You need to login first</p>
              <button
                onClick={() => router.push('/support/login')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          ) : sessionInfo?.error ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
              <p className="text-red-900 font-semibold">❌ Error</p>
              <p className="text-red-700 text-sm mt-2">{sessionInfo.error}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Email</p>
                  <p className="text-lg text-gray-900">{sessionInfo?.email}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Role (from session)</p>
                  <p className="text-lg font-mono text-gray-900">
                    "{sessionInfo?.role}"
                    {sessionInfo?.role?.toLowerCase() === 'admin' ? (
                      <span className="ml-3 text-green-600">✅ Should work</span>
                    ) : (
                      <span className="ml-3 text-red-600">❌ Wrong role!</span>
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">User ID</p>
                  <p className="text-sm font-mono text-gray-700">{sessionInfo?.userId}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Last Sign In</p>
                  <p className="text-sm text-gray-700">
                    {sessionInfo?.lastSignIn ? new Date(sessionInfo.lastSignIn).toLocaleString() : 'Never'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">All Metadata (raw)</p>
                  <pre className="text-xs text-gray-700 overflow-auto">
                    {JSON.stringify(sessionInfo?.allMetadata, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">🔧 Fix Session Issue</h2>

                {sessionInfo?.role?.toLowerCase() !== 'admin' ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-4">
                    <p className="text-red-900 font-semibold mb-2">❌ Your session has the wrong role!</p>
                    <p className="text-red-700 text-sm mb-4">
                      Your browser session has role: "{sessionInfo?.role}"<br/>
                      Database has role: "Admin"<br/>
                      <br/>
                      You need to logout and login again to refresh your session.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-4">
                    <p className="text-green-900 font-semibold mb-2">✅ Your role is correct!</p>
                    <p className="text-green-700 text-sm">
                      If you're still getting "Access Denied", try clearing your browser cache.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleForceLogout}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  🚪 Force Logout & Clear All Data
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  This will clear your session and all cached data, then redirect to login
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
