import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';

interface QuotePayload {
  quoteReference: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactTitle?: string;
  quoteDate: string;
  validUntil: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  totalValue: number;
  lineItems: Array<{
    term: string;
    users: string;
    consultingHours: string;
    investment: string;
  }>;
  preparedBy: string;
  dealContext?: {
    discountReason?: string;
    specialTerms?: string;
    decisionDate?: string;
    urgency?: string;
  };
}

// Generate content hash client-side to match the DB function
function generateContentHash(
  companyName: string,
  contactEmail: string,
  lineItems: Array<{
    term: string;
    users: string;
    consultingHours: string;
    investment: string;
  }>,
  totalValue: number,
  currency: string
): string {
  const content = [
    companyName || '',
    contactEmail || '',
    JSON.stringify(lineItems || []),
    String(totalValue || 0),
    currency || 'USD',
  ].join('|');

  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function POST(request: Request) {
  try {
    const payload: QuotePayload = await request.json();

    // Validate required fields
    if (!payload.quoteReference || !payload.companyName || !payload.preparedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate content hash for deduplication
    const contentHash = generateContentHash(
      payload.companyName,
      payload.contactEmail,
      payload.lineItems,
      payload.totalValue,
      payload.currency
    );

    // Check if quote with identical content already exists
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id, quote_reference, version, download_count')
      .eq('content_hash', contentHash)
      .single();

    if (existingQuote) {
      // Quote already exists - increment download count and update status
      const { data: updated, error: updateError } = await supabase
        .from('quotes')
        .update({
          download_count: (existingQuote.download_count || 0) + 1,
          status: 'downloaded',
          first_sent_at: new Date().toISOString(),
        })
        .eq('id', existingQuote.id)
        .select()
        .single();

      if (updateError) {
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

    // New quote - check for existing quotes to this client to determine version
    const { data: existingQuotes } = await supabase
      .from('quotes')
      .select('version')
      .eq('contact_email', payload.contactEmail)
      .eq('company_name', payload.companyName)
      .order('version', { ascending: false })
      .limit(1);

    const version = existingQuotes && existingQuotes.length > 0
      ? existingQuotes[0].version + 1
      : 1;

    // Insert the new quote
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
        total_value: payload.totalValue,
        line_items: payload.lineItems,
        prepared_by: payload.preparedBy,
        deal_context: payload.dealContext || {},
        content_hash: contentHash,
        status: 'downloaded',
        download_count: 1,
        first_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate key error (race condition)
      if (error.code === '23505' && error.message.includes('content_hash')) {
        // Another request created this quote - fetch and update
        const { data: raceQuote } = await supabase
          .from('quotes')
          .select('id, quote_reference, version, download_count')
          .eq('content_hash', contentHash)
          .single();

        if (raceQuote) {
          await supabase
            .from('quotes')
            .update({
              download_count: (raceQuote.download_count || 0) + 1,
            })
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
