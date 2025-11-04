/**
 * Script to seed the database with sample support tickets
 * Run with: npx tsx scripts/seed-tickets.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const organizations = [
  'Acme Corp',
  'TechStart Inc',
  'Global Solutions',
  'DataViz Systems',
  'CloudFirst Technologies',
  'Enterprise Solutions',
  'Innovation Labs',
  'Digital Dynamics',
  'Smart Systems',
  'FutureWorks',
];

const categories = [
  'Security',
  'Tool Functioning',
  'Feature Set',
  'Usage',
  'Requests',
  'Data Quality',
  'Performance',
  'Feature Request',
  'Other',
];

const statuses = ['New', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

const issues = [
  'Unable to login to dashboard',
  'API integration not working properly',
  'Data export feature is failing',
  'Performance issues with large datasets',
  'Mobile app crashes on startup',
  'Email notifications not being received',
  'Report generation taking too long',
  'User permissions not saving correctly',
  'Dashboard charts not displaying data',
  'Cannot update profile information',
  'Password reset link expired',
  'Two-factor authentication issues',
  'Bulk upload feature not working',
  'Calendar integration sync issues',
  'Search function returning incorrect results',
  'File attachments not uploading',
  'Webhook delivery failing',
  'Custom fields not appearing',
  'Team collaboration features broken',
  'Analytics data showing incorrect values',
];

const userNames = [
  'John Smith',
  'Sarah Johnson',
  'Mike Chen',
  'Emily Davis',
  'David Wilson',
  'Lisa Anderson',
  'Robert Taylor',
  'Jennifer Martinez',
  'Chris Brown',
  'Amanda White',
];

const userEmails = [
  'john.smith@company.com',
  'sarah.j@company.com',
  'mike.chen@company.com',
  'emily.d@company.com',
  'david.w@company.com',
  'lisa.a@company.com',
  'robert.t@company.com',
  'jennifer.m@company.com',
  'chris.b@company.com',
  'amanda.w@company.com',
];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

async function seedTickets() {
  console.log('Starting to seed tickets...\n');

  const tickets = [];
  const startingNumber = 1000;

  for (let i = 0; i < 20; i++) {
    const createdAt = getRandomDate(30);
    const status = getRandomItem(statuses);
    const organization = getRandomItem(organizations);
    const userName = getRandomItem(userNames);
    const userEmail = getRandomItem(userEmails);

    const ticket = {
      ticket_number: `SUP-${startingNumber + i}`,
      organization,
      user_name: userName,
      user_email: userEmail,
      category: getRandomItem(categories),
      priority: getRandomItem(priorities),
      status,
      description: getRandomItem(issues),
      created_at: createdAt,
      updated_at: createdAt,
      resolved_at: ['Resolved', 'Closed'].includes(status) ? getRandomDate(5) : null,
      assigned_to: null,
    };

    tickets.push(ticket);
  }

  // Insert tickets
  const { data, error } = await supabase
    .from('tickets')
    .insert(tickets)
    .select();

  if (error) {
    console.error('Error seeding tickets:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully created ${data?.length || 0} tickets\n`);
  console.log('Sample tickets:');
  data?.slice(0, 5).forEach((ticket: any) => {
    console.log(`  - ${ticket.ticket_number}: ${ticket.description}`);
  });
  console.log(`  ... and ${(data?.length || 0) - 5} more\n`);

  process.exit(0);
}

seedTickets();
