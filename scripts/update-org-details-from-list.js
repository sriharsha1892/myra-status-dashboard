#!/usr/bin/env node
/**
 * One-time import: Update organization details from curated list
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Curated organization data
const orgData = [
  {
    name: "Cereal Docks",
    description: "Cereal Docks is an Italian industrial group that processes agricultural raw materials for food, feed, and bioenergy applications. It operates in the agri-food sector, focusing on sustainable supply chains and ingredient production.",
    website: "https://www.cerealdocks.it/",
    logo: "https://www.cerealdocks.it/wp-content/themes/cerealdocks/img/logo_cerealdocks.svg"
  },
  {
    name: "Wacker",
    description: "Wacker Chemie AG is a global chemical company headquartered in Munich, Germany, specializing in polymers, silicones, and fine chemicals. It develops and produces high-quality products for diverse industries, including construction, electronics, and health care.",
    website: "https://www.wacker.com/",
    logo: "https://www.wacker.com/cms/media/images/logo/logo-wacker.svg"
  },
  {
    name: "GCC Makers",
    description: "GCC Makers is a strategic transformation partner that helps global organizations establish and scale their Global Capability Centres (GCCs). They provide comprehensive services across location strategy, talent solutions, and business operations for rapid and sustained offshore growth.",
    website: "https://www.gccmakers.com/",
    logo: "https://www.gccmakers.com/img/logo.png"
  },
  {
    name: "BP-Castrol",
    description: "BP is a global integrated energy company that explores, produces, refines, and markets oil, gas, and low-carbon power. The company is actively focusing on a strategic transition to deliver cleaner energy solutions and achieve net-zero ambitions.",
    website: "https://www.bp.com/",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/22/BP_Helios_logo.svg"
  },
  {
    name: "BASF",
    description: "BASF is a multinational chemical producer that manufactures and sells products across six business segments, including Materials, Industrial Solutions, and Agricultural Solutions. The company operates a global network of production sites and subsidiaries to serve a diverse range of customers in nearly all sectors worldwide.",
    website: "https://www.basf.com/",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/BASF_logo.svg"
  },
  {
    name: "Vanderlande",
    description: "Vanderlande is a Dutch subsidiary of Toyota Industries that designs and installs automated material handling systems globally. The firm provides technical solutions, software, and life-cycle services for clients in the airports, warehousing, and parcel logistics sectors.",
    website: "https://www.vanderlande.com/",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Vanderlande_logo.svg"
  },
  {
    name: "CircleK",
    description: "Circle K is a multinational convenience and fuel retailer operating a wide network of branded service stations across Europe. The company is a subsidiary of Alimentation Couche-Tard and offers road fuel, electric vehicle charging, and convenience goods.",
    website: "https://www.circlek.eu/",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/90/Circle_K_logo_2015.svg"
  },
  {
    name: "Kemin",
    description: "Kemin Industries is a family-owned manufacturer that develops specialty ingredients based on molecular science across multiple industries. The company focuses on providing solutions for animal nutrition and health, food technologies, human health, and crop technologies.",
    website: "https://www.kemin.com/",
    logo: "https://www.kemin.com/content/dam/kemin/logos/kemin-logo-red.svg"
  },
  {
    name: "Tony Blair Institute for Global Change (TBI)",
    description: "The Tony Blair Institute for Global Change is a think tank and consultancy established by the former UK Prime Minister Tony Blair. The organization advises governments and leaders globally on strategy, policy, and technology adoption to promote open and prosperous societies.",
    website: "https://institute.global/",
    logo: "https://institute.global/wp-content/themes/tbi/assets/images/logo-tbi-white.svg"
  },
  {
    name: "Schneider Electric",
    description: "Schneider Electric is a global energy technology leader driving efficiency through the convergence of electrification, automation, and digital intelligence. The company provides IoT-enabled architectures (EcoStruxure) and services for buildings, data centers, industry, and infrastructure sectors.",
    website: "https://www.se.com/ww/en/",
    logo: "https://www.se.com/assets/css/ecom-v3/css/images/logo-schneider-electric-rgb.svg"
  },
  {
    name: "Foremost Farms",
    description: "Foremost Farms USA is a farmer-owned dairy cooperative that processes and supplies high-quality milk from Midwest member farms. The organization manufactures and markets cheese, butter, and fluid/powdered dairy ingredients for the retail, food service, and nutritional sectors.",
    website: "https://www.foremostfarms.com/",
    logo: "https://www.foremostfarms.com/wp-content/uploads/2023/11/Foremost-Farms-Logo-RGB-PNG.png"
  },
  {
    name: "Unit Consulting",
    description: "Unit Consulting AG is a Swiss-based advisory firm providing tailored consulting services to entrepreneurs and small-to-medium enterprises. The firm's core services include corporate finance advisory, succession planning, financial management, and tax accounting.",
    website: "https://www.unit.consulting/",
    logo: "https://www.unit.consulting/wp-content/themes/unit-consulting-theme/assets/logo.svg"
  },
  {
    name: "Andeco",
    description: "ANDECO is a nonprofit advisory organization that aligns commercially available information (CAI) with national security outcomes for federal agencies. It provides vendor-neutral guidance on data strategy, procurement, and analysis, operating independently of data vendors.",
    website: "https://andeco.org/",
    logo: "https://andeco.org/wp-content/uploads/2024/07/andeco-logo-main.svg"
  },
  {
    name: "H&H Group",
    description: "H&H Global is a recognized leader in tech-enabled marketing execution, specializing in creative production and procurement solutions for major global brands.",
    website: "https://www.hhglobal.com/",
    logo: "https://www.hhglobal.com/assets/themes/hhglobal/images/logo.svg"
  }
];

async function updateOrganizations() {
  console.log('\n📝 Starting one-time organization details update...\n');

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  const notFoundList = [];

  for (const org of orgData) {
    console.log(`\n🔍 Looking for: ${org.name}`);

    try {
      // Find organization by name (case-insensitive)
      const { data: existingOrgs, error: searchError } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, description, org_url, logo_url')
        .ilike('org_name', org.name);

      if (searchError) throw searchError;

      if (!existingOrgs || existingOrgs.length === 0) {
        console.log(`   ⚠️  Not found in database`);
        notFoundCount++;
        notFoundList.push(org.name);
        continue;
      }

      const existingOrg = existingOrgs[0];
      console.log(`   ✓ Found: ${existingOrg.org_name}`);

      // Update organization details
      const { error: updateError } = await supabase
        .from('trial_organizations')
        .update({
          description: org.description,
          org_url: org.website,
          logo_url: org.logo,
        })
        .eq('org_id', existingOrg.org_id);

      if (updateError) throw updateError;

      console.log(`   ✅ Updated:`);
      console.log(`      Description: ${org.description.substring(0, 60)}...`);
      console.log(`      Website: ${org.website}`);
      console.log(`      Logo: ${org.logo}`);

      successCount++;

    } catch (error) {
      console.error(`   ❌ Error updating ${org.name}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total organizations in list:  ${orgData.length}`);
  console.log(`✅ Successfully updated:       ${successCount}`);
  console.log(`⚠️  Not found in database:     ${notFoundCount}`);
  console.log(`❌ Errors:                     ${errorCount}`);
  console.log('='.repeat(70));

  if (notFoundList.length > 0) {
    console.log('\n⚠️  Organizations not found in database:');
    notFoundList.forEach(name => console.log(`   - ${name}`));
  }

  console.log('\n✅ Organization details update complete!\n');
}

updateOrganizations();
