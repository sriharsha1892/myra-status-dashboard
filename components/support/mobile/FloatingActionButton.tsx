'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FloatingActionButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/support/submit')}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 md:hidden z-50"
      aria-label="Create new ticket"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
