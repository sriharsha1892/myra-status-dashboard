import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUserAccess } from '@/lib/auth-helper';

// Create Supabase Admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * GET /api/timeline/templates
 * Get user's custom templates
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user access
    const { authorized, userId } = await verifyUserAccess(request);
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user preferences
    const { data: preferences, error } = await supabaseAdmin
      .from('user_timeline_preferences')
      .select('custom_templates')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found (acceptable)
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: preferences?.custom_templates || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/timeline/templates:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timeline/templates
 * Create or update user template
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user access
    const { authorized, userId } = await verifyUserAccess(request);
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { template_name, template_data } = body;

    if (!template_name || !template_data) {
      return NextResponse.json(
        { error: 'Missing required fields: template_name, template_data' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get existing preferences
    const { data: existing } = await supabaseAdmin
      .from('user_timeline_preferences')
      .select('custom_templates')
      .eq('user_id', userId)
      .single();

    // Build new templates array
    const existingTemplates = (existing?.custom_templates || []) as any[];
    const newTemplates = [
      ...existingTemplates.filter((t: any) => t.name !== template_name), // Remove old version
      {
        name: template_name,
        ...template_data,
        created_at: new Date().toISOString(),
      },
    ];

    // Upsert preferences
    const { error } = await supabaseAdmin
      .from('user_timeline_preferences')
      .upsert({
        user_id: userId,
        custom_templates: newTemplates,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving template:', error);
      return NextResponse.json(
        { error: 'Failed to save template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        name: template_name,
        ...template_data,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/timeline/templates:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/timeline/templates
 * Delete user template
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user access
    const { authorized, userId } = await verifyUserAccess(request);
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { template_name } = body;

    if (!template_name) {
      return NextResponse.json(
        { error: 'Missing required field: template_name' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get existing preferences
    const { data: existing } = await supabaseAdmin
      .from('user_timeline_preferences')
      .select('custom_templates')
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'No templates found' },
        { status: 404 }
      );
    }

    // Filter out deleted template
    const newTemplates = (existing.custom_templates || []).filter(
      (t: any) => t.name !== template_name
    );

    // Update preferences
    const { error } = await supabaseAdmin
      .from('user_timeline_preferences')
      .update({
        custom_templates: newTemplates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/timeline/templates:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
