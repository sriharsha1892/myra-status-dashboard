import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyze() {
  const { data, error } = await supabase
    .from('sales_pipeline')
    .select('id, company_name, client_name, primary_email, stage, trial_status, deal_value')
    .order('company_name');

  if (error) { console.log('Error:', error.message); return; }

  console.log('Total contacts:', data.length);

  // Group by company
  const byCompany: Record<string, any[]> = {};
  data.forEach((e: any) => {
    if (!byCompany[e.company_name]) byCompany[e.company_name] = [];
    byCompany[e.company_name].push(e);
  });

  const companies = Object.keys(byCompany);
  console.log('Unique companies:', companies.length);

  // Show companies with multiple contacts
  const multi = Object.entries(byCompany).filter(([k, v]) => v.length > 1);
  console.log('\nCompanies with multiple contacts:', multi.length);
  multi.forEach(([name, contacts]) => {
    console.log('  ' + name + ': ' + contacts.map((c: any) => c.client_name || c.primary_email).join(', '));
  });

  // Show sample of single-contact companies
  console.log('\nSample single-contact companies:');
  Object.entries(byCompany).filter(([k, v]) => v.length === 1).slice(0, 15).forEach(([name, contacts]) => {
    const c = contacts[0];
    console.log('  ' + name + ' | ' + (c.client_name || '-') + ' | ' + c.stage + ' | trial:' + (c.trial_status || 'none'));
  });
}

analyze();
