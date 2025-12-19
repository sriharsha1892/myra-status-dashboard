import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch pipeline entries with optional filters
// Also supports checkEmails param for duplicate detection
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Handle email check for duplicate detection
    const checkEmails = searchParams.get('checkEmails');
    if (checkEmails) {
      const emails = checkEmails.split(',').map(e => e.toLowerCase().trim()).filter(Boolean);

      if (emails.length === 0) {
        return NextResponse.json({ existing: [] });
      }

      const { data, error } = await supabase
        .from('sales_pipeline')
        .select('primary_email')
        .in('primary_email', emails);

      if (error) {
        console.error('Email check error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const existing = data?.map(e => e.primary_email.toLowerCase()) || [];
      return NextResponse.json({ existing });
    }

    const stage = searchParams.get('stage');
    const trialStatus = searchParams.get('trialStatus');
    const search = searchParams.get('search');
    const employee = searchParams.get('employee');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const dedupeByEmail = searchParams.get('dedupe') === 'true';

    let query = supabase
      .from('sales_pipeline')
      .select('*', { count: 'exact' });

    // Apply filters
    if (stage && stage !== 'all') {
      query = query.eq('stage', stage);
    }

    if (trialStatus && trialStatus !== 'all') {
      query = query.eq('trial_status', trialStatus);
    }

    if (employee) {
      query = query.eq('employee_name', employee);
    }

    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,client_name.ilike.%${search}%,primary_email.ilike.%${search}%`
      );
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Pipeline fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Dedupe by email if requested (show latest per email)
    let result = data || [];
    if (dedupeByEmail && result.length > 0) {
      const seen = new Set<string>();
      result = result.filter(entry => {
        const email = entry.primary_email?.toLowerCase();
        if (!email || seen.has(email)) return false;
        seen.add(email);
        return true;
      });
    }

    return NextResponse.json({
      data: result,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline entries' },
      { status: 500 }
    );
  }
}

// POST - Create new pipeline entries (bulk import)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries, created_by } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const validEntries = entries.filter(entry =>
      entry.company_name && entry.primary_email
    );

    if (validEntries.length === 0) {
      return NextResponse.json(
        { error: 'No valid entries (company_name and primary_email required)' },
        { status: 400 }
      );
    }

    // Add metadata to each entry
    const enrichedEntries = validEntries.map(entry => ({
      ...entry,
      created_by: created_by || 'import',
      created_at: new Date().toISOString(),
      stage_updated_at: new Date().toISOString(),
    }));

    // Insert in batches of 50
    const batchSize = 50;
    const results = [];
    const errors = [];

    for (let i = 0; i < enrichedEntries.length; i += batchSize) {
      const batch = enrichedEntries.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('sales_pipeline')
        .insert(batch)
        .select();

      if (error) {
        errors.push({ batch: Math.floor(i / batchSize), error: error.message });
      } else if (data) {
        results.push(...data);

        // Log activity for each created entry
        const activityLogs = data.map(entry => ({
          pipeline_id: entry.id,
          action: 'created',
          changed_by: created_by || 'import',
        }));

        await supabase.from('pipeline_activity_log').insert(activityLogs);
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      total: entries.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Pipeline POST error:', error);
    return NextResponse.json(
      { error: 'Failed to import entries' },
      { status: 500 }
    );
  }
}

// PATCH - Update pipeline entries (single or bulk)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, updates, changed_by } = body;

    // Single update
    if (id && updates) {
      const { data: oldData } = await supabase
        .from('sales_pipeline')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('sales_pipeline')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log changes
      if (oldData && data) {
        const changedFields = Object.keys(updates).filter(
          key => oldData[key] !== updates[key]
        );

        for (const field of changedFields) {
          await supabase.from('pipeline_activity_log').insert({
            pipeline_id: id,
            action: field === 'stage' ? 'stage_changed' : 'updated',
            field_changed: field,
            old_value: String(oldData[field] ?? ''),
            new_value: String(updates[field] ?? ''),
            changed_by: changed_by || 'user',
          });
        }
      }

      return NextResponse.json({ success: true, data });
    }

    // Bulk update
    if (ids && Array.isArray(ids) && updates) {
      const { data, error } = await supabase
        .from('sales_pipeline')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log bulk activity
      const activityLogs = ids.map(entryId => ({
        pipeline_id: entryId,
        action: 'updated',
        changed_by: changed_by || 'bulk_update',
        field_changed: Object.keys(updates).join(', '),
      }));

      await supabase.from('pipeline_activity_log').insert(activityLogs);

      return NextResponse.json({ success: true, updated: data?.length || 0 });
    }

    return NextResponse.json(
      { error: 'id or ids with updates required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Pipeline PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update entries' },
      { status: 500 }
    );
  }
}

// DELETE - Delete pipeline entries
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids } = body;

    if (id) {
      const { error } = await supabase
        .from('sales_pipeline')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: 1 });
    }

    if (ids && Array.isArray(ids)) {
      const { error } = await supabase
        .from('sales_pipeline')
        .delete()
        .in('id', ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    }

    return NextResponse.json(
      { error: 'id or ids required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Pipeline DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete entries' },
      { status: 500 }
    );
  }
}
