import { NextRequest, NextResponse } from 'next/server';
import InternalStatusStore from '@/lib/internal-status';

export async function GET() {
  try {
    const store = InternalStatusStore.getInstance();
    const statuses = store.getAllStatuses();

    return NextResponse.json({
      statuses,
      success: true
    });
  } catch (error) {
    console.error('Error fetching internal statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch internal statuses', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization, status, message, updatedBy } = body;

    // Validate required fields
    if (!organization || !status || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: organization, status, message', success: false },
        { status: 400 }
      );
    }

    // Validate organization
    if (organization !== 'prodgain' && organization !== 'mordor') {
      return NextResponse.json(
        { error: 'Invalid organization. Must be "prodgain" or "mordor"', success: false },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`, success: false },
        { status: 400 }
      );
    }

    const store = InternalStatusStore.getInstance();
    store.updateStatus({
      organization,
      status,
      message,
      updatedBy,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
      status: store.getStatus(organization)
    });
  } catch (error) {
    console.error('Error updating internal status:', error);
    return NextResponse.json(
      { error: 'Failed to update status', success: false },
      { status: 500 }
    );
  }
}
