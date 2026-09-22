import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { quoteSavePayloadSchema } from '@/lib/validation/schemas/quote';
import { flattenOptions, valueRange } from '@/lib/quote/register';
import type { StoredPricingOption } from '@/lib/quote/types';

/**
 * Deterministic hash of what was actually quoted. Two downloads of the same
 * options for the same client collapse onto one row (download_count++).
 */
function generateContentHash(
  companyName: string,
  contactEmail: string,
  pricingOptions: StoredPricingOption[],
  currency: string
): string {
  const content = [
    companyName || '',
    contactEmail || '',
    JSON.stringify(pricingOptions || []),
    currency || 'USD',
  ].join('|');

  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function POST(request: Request) {
  try {
    const parsed = quoteSavePayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid quote payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const payload = parsed.data;

    const options = flattenOptions(payload.pricingOptions, null);
    const { min: valueMin, max: valueMax } = valueRange(options);
    const optionCount = options.length;

    const supabase = createServiceClient();
    const contentHash = generateContentHash(
      payload.companyName,
      payload.contactEmail,
      payload.pricingOptions,
      payload.currency
    );

    // Identical content already saved → count the download, leave lifecycle status alone.
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id, quote_reference, version, download_count')
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (existingQuote) {
      const { data: updated, error: updateError } = await supabase
        .from('quotes')
        .update({ download_count: (existingQuote.download_count || 0) + 1 })
        .eq('id', existingQuote.id)
        .select('id, quote_reference, version, download_count')
        .single();

      if (updateError || !updated) {
        console.error('Error updating quote download count:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update quote' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isNew: false,
        quote: {
          id: updated.id,
          quoteReference: updated.quote_reference,
          version: updated.version,
          downloadCount: updated.download_count,
        },
        message: 'Quote already exists - download count incremented',
      });
    }

    // New content → next version for this client.
    const { data: existingQuotes } = await supabase
      .from('quotes')
      .select('version')
      .eq('contact_email', payload.contactEmail)
      .eq('company_name', payload.companyName)
      .order('version', { ascending: false })
      .limit(1);

    const version =
      existingQuotes && existingQuotes.length > 0 ? (existingQuotes[0].version || 0) + 1 : 1;

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        quote_reference: payload.quoteReference,
        version,
        company_name: payload.companyName,
        contact_name: payload.contactName,
        contact_email: payload.contactEmail,
        contact_title: payload.contactTitle || null,
        quote_date: payload.quoteDate,
        valid_until: payload.validUntil,
        currency: payload.currency,
        pricing_options: payload.pricingOptions,
        line_items: payload.lineItems,
        option_count: optionCount,
        value_min: valueMin,
        value_max: valueMax,
        // total_value is legacy: equals the largest option quoted, never a sum.
        total_value: valueMax ?? 0,
        prepared_by: payload.preparedBy,
        deal_context: payload.dealContext || {},
        content_hash: contentHash,
        status: 'draft',
        download_count: 1,
      })
      .select('id, quote_reference, version, download_count')
      .single();

    if (error) {
      // Race: another request inserted the same content first.
      if (error.code === '23505' && error.message.includes('content_hash')) {
        const { data: raceQuote } = await supabase
          .from('quotes')
          .select('id, quote_reference, version, download_count')
          .eq('content_hash', contentHash)
          .maybeSingle();

        if (raceQuote) {
          await supabase
            .from('quotes')
            .update({ download_count: (raceQuote.download_count || 0) + 1 })
            .eq('id', raceQuote.id);

          return NextResponse.json({
            success: true,
            isNew: false,
            quote: {
              id: raceQuote.id,
              quoteReference: raceQuote.quote_reference,
              version: raceQuote.version,
              downloadCount: (raceQuote.download_count || 0) + 1,
            },
            message: 'Quote already exists (race condition handled)',
          });
        }
      }

      console.error('Error saving quote:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save quote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isNew: true,
      quote: {
        id: data.id,
        quoteReference: data.quote_reference,
        version: data.version,
        downloadCount: data.download_count,
      },
    });
  } catch (error) {
    console.error('Quote save error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
