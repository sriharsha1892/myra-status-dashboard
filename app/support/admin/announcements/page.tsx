'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect page for /support/admin/announcements
 *
 * Announcements are managed from the Resources page via a modal,
 * not a separate admin page. This redirect ensures old links/bookmarks
 * still work by redirecting to the Resources page.
 */
export default function AnnouncementsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to resources page where announcements are managed
    router.replace('/support/resources');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Resources...</p>
      </div>
    </div>
  );
}
