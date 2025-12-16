import { NextResponse } from 'next/server';

// Temporary debug endpoint - DELETE after troubleshooting
export async function GET() {
  const password = process.env.QUOTE_ACCESS_PASSWORD;

  return NextResponse.json({
    hasPassword: !!password,
    passwordLength: password?.length || 0,
    firstChar: password?.[0] || 'N/A',
    lastChar: password?.[password.length - 1] || 'N/A',
    // Show first 3 and last 3 chars for verification
    preview: password ? `${password.slice(0, 3)}...${password.slice(-3)}` : 'NOT SET',
  });
}
