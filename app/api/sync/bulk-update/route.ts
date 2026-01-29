import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  BulkUpdateRequest,
  CATEGORY_DB_MAPPING,
  SyncCategory,
} from '@/lib/sync/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body: BulkUpdateRequest = await request.json();
    const { updates = [], creates = [] } = body;

    const errors: string[] = [];
    let updatedCount = 0;
    let createdCount = 0;

    // Process updates
    for (const update of updates) {
      const { org_id, category } = update;

      if (!org_id || !category) {
        errors.push(`Invalid update: missing org_id or category`);
        continue;
      }

      const dbUpdates = getCategoryUpdates(category);
      if (!dbUpdates) {
        errors.push(`Unknown category: ${category}`);
        continue;
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString(),
          status_updated_at: dbUpdates.status ? new Date().toISOString() : undefined,
        })
        .eq('id', org_id);

      if (error) {
        errors.push(`Failed to update org ${org_id}: ${error.message}`);
      } else {
        updatedCount++;
      }
    }

    // Process creates
    for (const create of creates) {
      const { name, category } = create;

      if (!name || !category) {
        errors.push(`Invalid create: missing name or category`);
        continue;
      }

      const dbUpdates = getCategoryUpdates(category);
      if (!dbUpdates) {
        errors.push(`Unknown category: ${category}`);
        continue;
      }

      const insertData: Record<string, unknown> = {
        name: name.trim(),
        ...dbUpdates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // For new trials, set trial_start_date to now
      if (category === 'new_trials') {
        insertData.trial_start_date = new Date().toISOString();
      }

      const { error } = await supabase.from('organizations').insert(insertData);

      if (error) {
        // Check for duplicate
        if (error.code === '23505') {
          errors.push(`Organization "${name}" already exists`);
        } else {
          errors.push(`Failed to create org "${name}": ${error.message}`);
        }
      } else {
        createdCount++;
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      updated_count: updatedCount,
      created_count: createdCount,
      errors,
    });
  } catch (error) {
    console.error('POST bulk-update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function getCategoryUpdates(category: SyncCategory): Record<string, unknown> | null {
  const mapping = CATEGORY_DB_MAPPING[category];
  if (!mapping) return null;

  // Remove null values for cleaner updates
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(mapping)) {
    if (value !== null) {
      updates[key] = value;
    }
  }
  return updates;
}
