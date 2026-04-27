import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_STATUSES = ['draft', 'downloaded', 'sent', 'signed'] as const;
type MsaStatus = typeof VALID_STATUSES[number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('msas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: error?.message || 'MSA not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, msa: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: MsaStatus };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('msas')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Update failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, msa: data });
  } catch (error) {
    console.error('MSA PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
