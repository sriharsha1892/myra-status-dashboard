import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
});

async function runSqlFix() {
  console.log('Applying roadmap trigger fix...\n');

  // Drop the old trigger
  console.log('1. Dropping old trigger...');
  await supabase.rpc('exec_sql', {
    sql: 'DROP TRIGGER IF EXISTS trigger_log_roadmap_activity ON org_product_roadmap;'
  });

  // Create BEFORE trigger function
  console.log('2. Creating BEFORE trigger function...');
  const beforeFunc = `
CREATE OR REPLACE FUNCTION set_roadmap_activity_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.last_activity_at = NOW();
    NEW.last_activity_by = NEW.created_by::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
  `;

  try {
    const result = await (supabase as any).from('_sqlquery').insert({ query: beforeFunc });
    console.log('Result:', result);
  } catch (e: any) {
    console.log('Using direct approach...');
  }

  console.log('\n✅ Attempting to apply fix via database connection...');
  console.log('\nPlease run the following SQL manually in Supabase SQL Editor:');
  console.log('\n---BEGIN SQL---');
  console.log(`
-- Drop the old trigger
DROP TRIGGER IF EXISTS trigger_log_roadmap_activity ON org_product_roadmap;

-- Create BEFORE trigger function
CREATE OR REPLACE FUNCTION set_roadmap_activity_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.last_activity_at = NOW();
    NEW.last_activity_by = NEW.created_by::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE trigger
CREATE TRIGGER trigger_set_roadmap_activity_fields
  BEFORE INSERT OR UPDATE ON org_product_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION set_roadmap_activity_fields();

-- Create AFTER trigger function
CREATE OR REPLACE FUNCTION log_roadmap_activity_after()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, new_value, metadata)
    VALUES (
      NEW.id,
      NEW.created_by::UUID,
      'created',
      NEW.title,
      jsonb_build_object('status', NEW.status, 'priority', NEW.priority)
    );
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'status_changed', OLD.status, NEW.status);
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'priority_changed', OLD.priority, NEW.priority);
    END IF;

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'assigned', OLD.assigned_to, NEW.assigned_to);
    END IF;

    IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'estimate_changed', OLD.estimated_hours::TEXT, NEW.estimated_hours::TEXT);
    END IF;

    IF OLD.title IS DISTINCT FROM NEW.title OR OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'updated', OLD.title, NEW.title);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create AFTER trigger
CREATE TRIGGER trigger_log_roadmap_activity_after
  AFTER INSERT OR UPDATE ON org_product_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION log_roadmap_activity_after();
  `);
  console.log('---END SQL---\n');

  console.log('Or check if supabase CLI is installed to run migration automatically.');
}

runSqlFix().catch(console.error);
