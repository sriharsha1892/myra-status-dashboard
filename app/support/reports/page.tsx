'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to Engagement Waves
    router.replace('/support/reports/engagement');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-gray-600 text-sm">Brewing your engagement insights...</div>
      </div>
    </div>
  );
}
