/**
 * Command Undo API - Revert executed commands
 * POST /api/command/undo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeUndo } from '@/lib/command/actionExecutor';
import type { UndoResponse } from '@/lib/command/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { undo_id } = body;

    if (!undo_id) {
      return NextResponse.json(
        { error: 'No undo_id provided' },
        { status: 400 }
      );
    }

    // Execute undo
    const result = await executeUndo(undo_id, user.id);

    const response: UndoResponse = {
      success: result.success,
      reverted_changes: result.reverted,
      error: result.error,
    };

    if (!result.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Undo error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
