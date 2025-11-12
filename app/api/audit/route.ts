import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditStats } from '@/lib/audit-log';
import { requireAdmin } from '@/lib/api-auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication (sensitive audit logs)
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const organization = searchParams.get('organization') as 'prodgain' | 'mordor' | null;
    const since = searchParams.get('since');

    const logs = getAuditLogs({
      limit,
      organization: organization || undefined,
      since: since || undefined,
    });

    const stats = getAuditStats();

    return NextResponse.json({
      success: true,
      logs,
      stats,
      total: logs.length,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', success: false },
      { status: 500 }
    );
  }
}
