import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

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

    // Check for existing quotes to this client to determine version
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

    // Insert the quote
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving quote:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save quote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: data.id,
        quoteReference: data.quote_reference,
        version: data.version,
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
