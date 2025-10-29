import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OVERRIDES_FILE = path.join(process.cwd(), 'data', 'provider-overrides.json');

interface ProviderOverride {
  providerId: string;
  status: string;
  message: string;
  overrideUntil?: string;
  updatedBy?: string;
  createdAt: string;
  active: boolean;
}

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read overrides from file
function readOverrides(): ProviderOverride[] {
  ensureDataDir();
  if (!fs.existsSync(OVERRIDES_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
    const overrides = JSON.parse(data);

    // Check if any time-based overrides have expired
    const now = new Date().toISOString();
    const activeOverrides = overrides.map((override: ProviderOverride) => {
      if (override.overrideUntil && override.overrideUntil < now) {
        return { ...override, active: false };
      }
      return override;
    });

    // Write back if any changed
    if (JSON.stringify(activeOverrides) !== JSON.stringify(overrides)) {
      fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(activeOverrides, null, 2));
    }

    return activeOverrides;
  } catch (error) {
    console.error('Error reading overrides:', error);
    return [];
  }
}

// Write overrides to file
function writeOverrides(overrides: ProviderOverride[]) {
  ensureDataDir();
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

// GET - Fetch all overrides
export async function GET() {
  try {
    const overrides = readOverrides();
    return NextResponse.json({
      success: true,
      overrides,
    });
  } catch (error) {
    console.error('Error fetching overrides:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overrides' },
      { status: 500 }
    );
  }
}

// POST - Create/update override
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, status, message, overrideUntil, updatedBy } = body;

    if (!providerId || !status || !message) {
      return NextResponse.json(
        { success: false, error: 'Provider ID, status, and message are required' },
        { status: 400 }
      );
    }

    const overrides = readOverrides();

    // Remove existing override for this provider if any
    const filteredOverrides = overrides.filter((o) => o.providerId !== providerId);

    // Add new override
    const newOverride: ProviderOverride = {
      providerId,
      status,
      message,
      overrideUntil,
      updatedBy,
      createdAt: new Date().toISOString(),
      active: true,
    };

    filteredOverrides.push(newOverride);
    writeOverrides(filteredOverrides);

    return NextResponse.json({
      success: true,
      override: newOverride,
    });
  } catch (error) {
    console.error('Error creating override:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create override' },
      { status: 500 }
    );
  }
}

// DELETE - Remove override
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const overrides = readOverrides();
    const filteredOverrides = overrides.filter((o) => o.providerId !== providerId);

    writeOverrides(filteredOverrides);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting override:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete override' },
      { status: 500 }
    );
  }
}
