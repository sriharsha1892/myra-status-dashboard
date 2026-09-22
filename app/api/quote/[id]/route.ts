import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { quoteStatusPatchSchema } from '@/lib/validation/schemas/quote';

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
    const parsed = quoteStatusPatchSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid status' },
        { status: 400 }
      );
    }
    const { status } = parsed.data;

    const supabase = createServiceClient();

    const { data: current, error: readError } = await supabase
      .from('quotes')
      .select('id, first_sent_at')
      .eq('id', id)
      .single();

    if (readError || !current) {
      return NextResponse.json(
        { success: false, error: readError?.message || 'Quote not found' },
        { status: 404 }
      );
    }

    const patch: { status: string; first_sent_at?: string } = { status };
    if (status === 'sent' && !current.first_sent_at) {
      patch.first_sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(patch)
      .eq('id', id)
      .select('id, status, first_sent_at')
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
