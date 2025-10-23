import { NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const config = await request.json();

    const notificationService = NotificationService.getInstance();
    notificationService.configure(config);

    return NextResponse.json({ success: true, message: 'Notifications configured' });
  } catch (error) {
    console.error('Error configuring notifications:', error);
    return NextResponse.json(
      { error: 'Failed to configure notifications' },
      { status: 500 }
    );
  }
}
