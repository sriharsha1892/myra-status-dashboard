/**
 * Generate magic access links for GTM dashboard users.
 *
 * Usage: npx tsx scripts/generate-gtm-links.ts
 *
 * Reads GTM_EMAILS and GTM_COOKIE_SECRET from .env.local,
 * generates a 7-day access link per email, and prints them.
 */

import { config } from 'dotenv';
import { createAccessToken } from '../lib/gtm/token';

// Load .env.local
config({ path: '.env.local' });

const emails = (process.env.GTM_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const secret = process.env.GTM_COOKIE_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

if (!secret) {
  console.error('ERROR: GTM_COOKIE_SECRET is not set in .env.local');
  process.exit(1);
}

if (emails.length === 0) {
  console.error('ERROR: GTM_EMAILS is not set or empty in .env.local');
  process.exit(1);
}

console.log('');
console.log('GTM Dashboard Access Links');
console.log('==========================');
console.log(`Generated: ${new Date().toLocaleString()}`);
console.log(`Valid for: 7 days`);
console.log(`Session duration: 90 days after first click`);
console.log('');

for (const email of emails) {
  const token = createAccessToken(email);
  const url = `${appUrl}/api/gtm/auth/verify?token=${encodeURIComponent(token)}`;
  console.log(`${email}`);
  console.log(`  ${url}`);
  console.log('');
}

console.log('Share these links via Slack, WhatsApp, or in-person.');
console.log('Each link works once to set a 90-day session cookie.');
console.log('');
