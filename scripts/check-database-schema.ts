import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');
  console.log('='.repeat(80) + '\n');

  // Check trial organizations table
  console.log('1. Trial Organizations Table:');
  const { data: trialOrgs, error: trialError } = await supabase
    .from('trial_organizations')
    .select('*')
    .limit(1);

  if (trialError) {
    console.log(`   ❌ Error: ${trialError.message}`);
  } else {
    console.log('   ✅ Table exists');
    if (trialOrgs && trialOrgs.length > 0) {
      console.log('   Columns:', Object.keys(trialOrgs[0]).join(', '));
    }
  }

  // Check tickets table
  console.log('\n2. Tickets Table:');
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*')
    .limit(1);

  if (ticketsError) {
    console.log(`   ❌ Error: ${ticketsError.message}`);
  } else {
    console.log('   ✅ Table exists');
    if (tickets && tickets.length > 0) {
      console.log('   Columns:', Object.keys(tickets[0]).join(', '));
    }
  }

  // Check roadmap table
  console.log('\n3. Roadmap Items Table:');
  const { data: roadmap1, error: roadmap1Error } = await supabase
    .from('roadmap_items')
    .select('*')
    .limit(1);

  if (roadmap1Error) {
    console.log(`   ❌ Error: ${roadmap1Error.message}`);

    // Try alternative table name
    console.log('\n   Trying "roadmap" table:');
    const { data: roadmap2, error: roadmap2Error } = await supabase
      .from('roadmap')
      .select('*')
      .limit(1);

    if (roadmap2Error) {
      console.log(`   ❌ Error: ${roadmap2Error.message}`);

      // Try roadmap_notes
      console.log('\n   Trying "roadmap_notes" table:');
      const { data: roadmap3, error: roadmap3Error } = await supabase
        .from('roadmap_notes')
        .select('*')
        .limit(1);

      if (roadmap3Error) {
        console.log(`   ❌ Error: ${roadmap3Error.message}`);
      } else {
        console.log('   ✅ Table exists as "roadmap_notes"');
        if (roadmap3 && roadmap3.length > 0) {
          console.log('   Columns:', Object.keys(roadmap3[0]).join(', '));
        }
      }
    } else {
      console.log('   ✅ Table exists as "roadmap"');
      if (roadmap2 && roadmap2.length > 0) {
        console.log('   Columns:', Object.keys(roadmap2[0]).join(', '));
      }
    }
  } else {
    console.log('   ✅ Table exists');
    if (roadmap1 && roadmap1.length > 0) {
      console.log('   Columns:', Object.keys(roadmap1[0]).join(', '));
    }
  }

  // Check documents/resources table
  console.log('\n4. Documents Table:');
  const { data: docs1, error: docs1Error } = await supabase
    .from('documents')
    .select('*')
    .limit(1);

  if (docs1Error) {
    console.log(`   ❌ Error: ${docs1Error.message}`);

    // Try alternative table name
    console.log('\n   Trying "resources" table:');
    const { data: docs2, error: docs2Error } = await supabase
      .from('resources')
      .select('*')
      .limit(1);

    if (docs2Error) {
      console.log(`   ❌ Error: ${docs2Error.message}`);
    } else {
      console.log('   ✅ Table exists as "resources"');
      if (docs2 && docs2.length > 0) {
        console.log('   Columns:', Object.keys(docs2[0]).join(', '));
      }
    }
  } else {
    console.log('   ✅ Table exists');
    if (docs1 && docs1.length > 0) {
      console.log('   Columns:', Object.keys(docs1[0]).join(', '));
    }
  }

  // Check ticket_comments table
  console.log('\n5. Ticket Comments Table:');
  const { data: comments, error: commentsError } = await supabase
    .from('ticket_comments')
    .select('*')
    .limit(1);

  if (commentsError) {
    console.log(`   ❌ Error: ${commentsError.message}`);
  } else {
    console.log('   ✅ Table exists');
    if (comments && comments.length > 0) {
      console.log('   Columns:', Object.keys(comments[0]).join(', '));
    }
  }

  // Check trial_org_activities table
  console.log('\n6. Trial Org Activities Table:');
  const { data: activities, error: activitiesError } = await supabase
    .from('trial_org_activities')
    .select('*')
    .limit(1);

  if (activitiesError) {
    console.log(`   ❌ Error: ${activitiesError.message}`);
  } else {
    console.log('   ✅ Table exists');
    if (activities && activities.length > 0) {
      console.log('   Columns:', Object.keys(activities[0]).join(', '));
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkSchema().catch(console.error);
