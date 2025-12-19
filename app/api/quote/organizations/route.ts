import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch organizations with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const trialStatus = searchParams.get('trialStatus');
    const search = searchParams.get('search');
    const employee = searchParams.get('employee');
    const includeContacts = searchParams.get('includeContacts') === 'true';
    const includeSubsidiaries = searchParams.get('includeSubsidiaries') === 'true';
    const parentOnly = searchParams.get('parentOnly') === 'true';

    let query = supabase
      .from('organizations')
      .select('*')
      .order('name');

    // Filter to parent orgs only (no parent_id)
    if (parentOnly) {
      query = query.is('parent_id', null);
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (trialStatus && trialStatus !== 'all') {
      query = query.eq('trial_status', trialStatus);
    }

    if (employee) {
      query = query.eq('employee_name', employee);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data: orgs, error } = await query;

    if (error) {
      console.error('Organizations fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let result = orgs || [];

    // Fetch contacts for each org if requested
    if (includeContacts && result.length > 0) {
      const orgIds = result.map(o => o.id);
      const { data: contacts } = await supabase
        .from('sales_pipeline')
        .select('id, organization_id, client_name, primary_email, client_title')
        .in('organization_id', orgIds);

      // Group contacts by org
      const contactsByOrg: Record<string, typeof contacts> = {};
      (contacts || []).forEach(c => {
        if (!contactsByOrg[c.organization_id]) contactsByOrg[c.organization_id] = [];
        contactsByOrg[c.organization_id].push(c);
      });

      result = result.map(org => ({
        ...org,
        contacts: contactsByOrg[org.id] || [],
        contact_count: (contactsByOrg[org.id] || []).length,
      }));
    }

    // Fetch subsidiaries if requested
    if (includeSubsidiaries && result.length > 0) {
      const parentIds = result.filter(o => !o.parent_id).map(o => o.id);
      if (parentIds.length > 0) {
        const { data: subs } = await supabase
          .from('organizations')
          .select('*')
          .in('parent_id', parentIds);

        // Group subsidiaries by parent
        const subsByParent: Record<string, typeof subs> = {};
        (subs || []).forEach(s => {
          if (!subsByParent[s.parent_id]) subsByParent[s.parent_id] = [];
          subsByParent[s.parent_id].push(s);
        });

        result = result.map(org => ({
          ...org,
          subsidiaries: subsByParent[org.id] || [],
          subsidiary_count: (subsByParent[org.id] || []).length,
        }));
      }
    }

    // Calculate stats
    const stats = {
      total: result.length,
      byStatus: {} as Record<string, number>,
      byTrialStatus: {} as Record<string, number>,
      totalDealValue: 0,
    };

    result.forEach(org => {
      stats.byStatus[org.status] = (stats.byStatus[org.status] || 0) + 1;
      stats.byTrialStatus[org.trial_status] = (stats.byTrialStatus[org.trial_status] || 0) + 1;
      stats.totalDealValue += org.deal_value || 0;
    });

    return NextResponse.json({ data: result, stats });
  } catch (error) {
    console.error('Organizations GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

// POST - Create new organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...rest } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const orgData = {
      name,
      display_name: rest.display_name || name,
      status: rest.status || 'prospect',
      status_updated_at: new Date().toISOString(),
      trial_status: rest.trial_status || 'not_requested',
      login_status: rest.login_status || 'not_logged_in',
      ...rest,
    };

    const { data, error } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();

    if (error) {
      console.error('Organization create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Organizations POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

// PATCH - Update organization(s)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, updates } = body;

    if (!updates) {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.updated_at = new Date().toISOString();

    // If status is changing, update status_updated_at
    if (updates.status) {
      updates.status_updated_at = new Date().toISOString();
    }

    // Single update
    if (id) {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // Bulk update
    if (ids && Array.isArray(ids)) {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: data?.length || 0 });
    }

    return NextResponse.json(
      { error: 'id or ids required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Organizations PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// DELETE - Delete organization(s)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids } = body;

    if (id) {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: 1 });
    }

    if (ids && Array.isArray(ids)) {
      const { error } = await supabase
        .from('organizations')
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
    console.error('Organizations DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
