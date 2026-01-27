import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all duplicate groups
export async function GET() {
  try {
    // Fetch all quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, quote_reference, company_name, contact_email, total_value, created_at, version, content_hash, currency, line_items')
      .order('created_at', { ascending: false });

    if (quotesError) {
      return NextResponse.json({ error: quotesError.message }, { status: 500 });
    }

    // Group by content hash or by company+email if no hash
    const groupsByHash = new Map<string, typeof quotes>();
    const groupsByKey = new Map<string, typeof quotes>();

    (quotes || []).forEach((q) => {
      if (q.content_hash) {
        if (!groupsByHash.has(q.content_hash)) {
          groupsByHash.set(q.content_hash, []);
        }
        groupsByHash.get(q.content_hash)!.push(q);
      } else {
        // Fallback for quotes without content_hash
        const key = `${q.contact_email}|${q.company_name}`;
        if (!groupsByKey.has(key)) {
          groupsByKey.set(key, []);
        }
        groupsByKey.get(key)!.push(q);
      }
    });

    // Find groups with more than 1 quote (duplicates)
    const duplicateGroups: Array<{
      groupKey: string;
      companyName: string;
      contactEmail: string;
      totalVersions: number;
      quotes: Array<{
        id: string;
        quoteReference: string;
        version: number;
        totalValue: number;
        createdAt: string;
        isLatest: boolean;
      }>;
    }> = [];

    // Process hash-based duplicates
    groupsByHash.forEach((group, hash) => {
      if (group.length > 1) {
        const sorted = group.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        duplicateGroups.push({
          groupKey: hash,
          companyName: sorted[0].company_name,
          contactEmail: sorted[0].contact_email,
          totalVersions: sorted.length,
          quotes: sorted.map((q, i) => ({
            id: q.id,
            quoteReference: q.quote_reference,
            version: q.version || 1,
            totalValue: q.total_value,
            createdAt: q.created_at,
            isLatest: i === 0,
          })),
        });
      }
    });

    // Process key-based duplicates (for quotes without content_hash)
    groupsByKey.forEach((group, key) => {
      if (group.length > 1) {
        const sorted = group.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        duplicateGroups.push({
          groupKey: key,
          companyName: sorted[0].company_name,
          contactEmail: sorted[0].contact_email,
          totalVersions: sorted.length,
          quotes: sorted.map((q, i) => ({
            id: q.id,
            quoteReference: q.quote_reference,
            version: q.version || 1,
            totalValue: q.total_value,
            createdAt: q.created_at,
            isLatest: i === 0,
          })),
        });
      }
    });

    // Sort by number of duplicates (most first)
    duplicateGroups.sort((a, b) => b.totalVersions - a.totalVersions);

    // Calculate stats
    const totalDuplicateQuotes = duplicateGroups.reduce(
      (sum, g) => sum + g.totalVersions - 1,
      0
    );

    return NextResponse.json({
      groups: duplicateGroups,
      stats: {
        totalGroups: duplicateGroups.length,
        totalDuplicates: totalDuplicateQuotes,
        totalQuotes: quotes?.length || 0,
      },
    });
  } catch (error) {
    console.error('Duplicates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duplicates' },
      { status: 500 }
    );
  }
}

// DELETE: Delete specific quotes by ID
export async function DELETE(request: Request) {
  try {
    const { quoteIds } = await request.json();

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return NextResponse.json(
        { error: 'quoteIds array required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quotes')
      .delete()
      .in('id', quoteIds)
      .select('id');

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
      deletedIds: data?.map((d) => d.id) || [],
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quotes' },
      { status: 500 }
    );
  }
}

// POST: Keep latest only for a group (delete all but the newest)
export async function POST(request: Request) {
  try {
    const { action, groupKey } = await request.json();

    if (action === 'keep-latest') {
      // Fetch quotes in this group
      const { data: quotes, error: fetchError } = await supabase
        .from('quotes')
        .select('id, created_at, content_hash, company_name, contact_email')
        .or(`content_hash.eq.${groupKey},and(company_name.ilike.%${groupKey.split('|')[1] || ''}%,contact_email.eq.${groupKey.split('|')[0] || ''})`)
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Try alternative approach - fetch by content hash only
        const { data: hashQuotes, error: hashError } = await supabase
          .from('quotes')
          .select('id, created_at')
          .eq('content_hash', groupKey)
          .order('created_at', { ascending: false });

        if (hashError || !hashQuotes || hashQuotes.length < 2) {
          return NextResponse.json(
            { error: 'Could not find duplicate group' },
            { status: 404 }
          );
        }

        // Delete all but the first (newest)
        const toDelete = hashQuotes.slice(1).map((q) => q.id);
        const { error: deleteError } = await supabase
          .from('quotes')
          .delete()
          .in('id', toDelete);

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          kept: hashQuotes[0].id,
          deleted: toDelete.length,
        });
      }

      if (!quotes || quotes.length < 2) {
        return NextResponse.json(
          { error: 'No duplicates found for this group' },
          { status: 404 }
        );
      }

      // Delete all but the first (newest)
      const toDelete = quotes.slice(1).map((q) => q.id);
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        kept: quotes[0].id,
        deleted: toDelete.length,
      });
    }

    if (action === 'clean-all') {
      // Get all duplicate groups and clean them
      const { data: allQuotes } = await supabase
        .from('quotes')
        .select('id, created_at, content_hash, company_name, contact_email')
        .order('created_at', { ascending: false });

      if (!allQuotes) {
        return NextResponse.json({ error: 'No quotes found' }, { status: 404 });
      }

      // Group by content hash
      const groups = new Map<string, typeof allQuotes>();
      allQuotes.forEach((q) => {
        const key = q.content_hash || `${q.contact_email}|${q.company_name}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(q);
      });

      // Find IDs to delete (all but first in each group with >1 quotes)
      const toDelete: string[] = [];
      groups.forEach((group) => {
        if (group.length > 1) {
          // Sort by created_at desc, keep first, delete rest
          const sorted = group.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          sorted.slice(1).forEach((q) => toDelete.push(q.id));
        }
      });

      if (toDelete.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No duplicates to clean',
          deleted: 0,
        });
      }

      // Delete in batches of 50
      let totalDeleted = 0;
      for (let i = 0; i < toDelete.length; i += 50) {
        const batch = toDelete.slice(i, i + 50);
        const { error } = await supabase
          .from('quotes')
          .delete()
          .in('id', batch);

        if (error) {
          console.error('Batch delete error:', error);
        } else {
          totalDeleted += batch.length;
        }
      }

      return NextResponse.json({
        success: true,
        deleted: totalDeleted,
        message: `Cleaned up ${totalDeleted} duplicate quotes`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
