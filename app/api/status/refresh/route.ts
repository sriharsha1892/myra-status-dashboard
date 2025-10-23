import { NextResponse } from 'next/server';
import { StatusCache } from '@/lib/status-cache';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cache = StatusCache.getInstance();
    await cache.refresh();

    return NextResponse.json({ success: true, message: 'Cache refreshed' });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}
