import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_STATUSES = ['draft', 'downloaded', 'sent', 'signed'] as const;
type QuoteStatus = typeof VALID_STATUSES[number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Quote not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, quote: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: QuoteStatus };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('quotes')
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

    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error('Quote PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
