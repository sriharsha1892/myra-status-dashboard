'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Legacy /support/documents page - redirects to new /support/resources
export default function DocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/support/resources');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-gray-600 font-medium">Redirecting to Resources...</p>
      </div>
    </div>
  );
}
