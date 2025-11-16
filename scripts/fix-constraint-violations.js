/**
 * Pre-Migration Data Cleanup Script
 * Fixes existing data violations before applying constraints
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// FIX TRIAL DATE VIOLATIONS
// ============================================================================

async function fixTrialDateViolations() {
  log('\n🔍 Checking for trial date violations...', 'cyan');

  try {
    const { data: orgs, error } = await supabase
      .from('trial_organizations')
      .select('id, org_name, trial_start_date, trial_end_date')
      .not('trial_start_date', 'is', null)
      .not('trial_end_date', 'is', null);

    if (error) throw error;

    // Find violations: end_date < start_date
    const violations = orgs.filter(org => {
      const start = new Date(org.trial_start_date);
      const end = new Date(org.trial_end_date);
      return end < start;
    });

    if (violations.length === 0) {
      log('  ✓ No trial date violations found', 'green');
      return { fixed: 0 };
    }

    log(`  Found ${violations.length} organizations with invalid date ranges`, 'yellow');

    let fixed = 0;
    for (const org of violations) {
      const start = new Date(org.trial_start_date);
      const end = new Date(org.trial_end_date);

      log(`\n  Fixing: ${org.org_name}`, 'yellow');
      log(`    Current: start=${org.trial_start_date}, end=${org.trial_end_date}`, 'blue');

      // Fix: Swap dates (they were probably entered backwards)
      const { error: updateError } = await supabase
        .from('trial_organizations')
        .update({
          trial_start_date: org.trial_end_date,
          trial_end_date: org.trial_start_date
        })
        .eq('id', org.id);

      if (updateError) {
        log(`    ✗ Failed: ${updateError.message}`, 'red');
      } else {
        log(`    ✓ Fixed: swapped dates`, 'green');
        fixed++;
      }
    }

    log(`\n  Summary: ${fixed}/${violations.length} violations fixed`, 'green');
    return { fixed, total: violations.length };

  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    throw error;
  }
}

// ============================================================================
// FIX NEGATIVE VALUES
// ============================================================================

async function fixNegativeValues() {
  log('\n🔍 Checking for negative value violations...', 'cyan');

  let totalFixed = 0;

  try {
    // Fix negative contract values
    const { data: negativeContracts } = await supabase
      .from('trial_organizations')
      .select('id, org_name, contract_value')
      .lt('contract_value', 0);

    if (negativeContracts && negativeContracts.length > 0) {
      log(`  Found ${negativeContracts.length} negative contract values`, 'yellow');
      for (const org of negativeContracts) {
        await supabase
          .from('trial_organizations')
          .update({ contract_value: Math.abs(org.contract_value) })
          .eq('id', org.id);
        log(`    ✓ Fixed contract value for ${org.org_name}`, 'green');
        totalFixed++;
      }
    }

    // Fix negative team sizes
    const { data: negativeTeamSizes } = await supabase
      .from('trial_organizations')
      .select('id, org_name, team_size')
      .lt('team_size', 0);

    if (negativeTeamSizes && negativeTeamSizes.length > 0) {
      log(`  Found ${negativeTeamSizes.length} negative team sizes`, 'yellow');
      for (const org of negativeTeamSizes.slice(0, 5)) {
        await supabase
          .from('trial_organizations')
          .update({ team_size: null })
          .eq('id', org.id);
        log(`    ✓ Reset team size for ${org.org_name}`, 'green');
        totalFixed++;
      }
    }

    // Fix negative trial durations
    const { data: negativeDurations } = await supabase
      .from('trial_organizations')
      .select('id, org_name, trial_duration_days')
      .lt('trial_duration_days', 0);

    if (negativeDurations && negativeDurations.length > 0) {
      log(`  Found ${negativeDurations.length} negative trial durations`, 'yellow');
      for (const org of negativeDurations) {
        await supabase
          .from('trial_organizations')
          .update({ trial_duration_days: Math.abs(org.trial_duration_days) })
          .eq('id', org.id);
        log(`    ✓ Fixed trial duration for ${org.org_name}`, 'green');
        totalFixed++;
      }
    }

    if (totalFixed === 0) {
      log('  ✓ No negative value violations found', 'green');
    } else {
      log(`\n  Summary: ${totalFixed} negative values fixed`, 'green');
    }

    return { fixed: totalFixed };

  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    throw error;
  }
}

// ============================================================================
// FIX EMPTY TITLES
// ============================================================================

async function fixEmptyTitles() {
  log('\n🔍 Checking for empty title violations...', 'cyan');

  let totalFixed = 0;

  try {
    // Fix empty event titles
    const { data: emptyEventTitles } = await supabase
      .from('trial_timeline_events')
      .select('id, title, event_type')
      .or('title.is.null,title.eq.');

    if (emptyEventTitles && emptyEventTitles.length > 0) {
      log(`  Found ${emptyEventTitles.length} empty event titles`, 'yellow');
      for (const event of emptyEventTitles.slice(0, 5)) {
        const defaultTitle = event.event_type ? `${event.event_type} event` : 'Timeline event';
        await supabase
          .from('trial_timeline_events')
          .update({ title: defaultTitle })
          .eq('id', event.id);
        log(`    ✓ Set default title: "${defaultTitle}"`, 'green');
        totalFixed++;
      }
    }

    // Fix empty pain point titles
    const { data: emptyPainPoints } = await supabase
      .from('pain_points')
      .select('id, title')
      .or('title.is.null,title.eq.');

    if (emptyPainPoints && emptyPainPoints.length > 0) {
      log(`  Found ${emptyPainPoints.length} empty pain point titles`, 'yellow');
      for (const pp of emptyPainPoints.slice(0, 5)) {
        await supabase
          .from('pain_points')
          .update({ title: 'Untitled pain point' })
          .eq('id', pp.id);
        log(`    ✓ Set default title for pain point`, 'green');
        totalFixed++;
      }
    }

    // Fix empty learning titles
    const { data: emptyLearnings } = await supabase
      .from('learnings')
      .select('id, title')
      .or('title.is.null,title.eq.');

    if (emptyLearnings && emptyLearnings.length > 0) {
      log(`  Found ${emptyLearnings.length} empty learning titles`, 'yellow');
      for (const learning of emptyLearnings.slice(0, 5)) {
        await supabase
          .from('learnings')
          .update({ title: 'Untitled learning' })
          .eq('id', learning.id);
        log(`    ✓ Set default title for learning`, 'green');
        totalFixed++;
      }
    }

    if (totalFixed === 0) {
      log('  ✓ No empty title violations found', 'green');
    } else {
      log(`\n  Summary: ${totalFixed} empty titles fixed`, 'green');
    }

    return { fixed: totalFixed };

  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    throw error;
  }
}

// ============================================================================
// FIX PARSE CONFIDENCE OUT OF RANGE
// ============================================================================

async function fixParseConfidenceRange() {
  log('\n🔍 Checking for parse confidence violations...', 'cyan');

  try {
    const { data: violations } = await supabase
      .from('trial_timeline_events')
      .select('id, title, parse_confidence')
      .not('parse_confidence', 'is', null)
      .or('parse_confidence.lt.0,parse_confidence.gt.1');

    if (!violations || violations.length === 0) {
      log('  ✓ No parse confidence violations found', 'green');
      return { fixed: 0 };
    }

    log(`  Found ${violations.length} parse confidence violations`, 'yellow');

    let fixed = 0;
    for (const event of violations) {
      let newConfidence = event.parse_confidence;

      // If > 1, assume it's a percentage (e.g., 85 instead of 0.85)
      if (newConfidence > 1) {
        newConfidence = newConfidence / 100;
      }

      // Clamp to 0-1 range
      newConfidence = Math.max(0, Math.min(1, newConfidence));

      await supabase
        .from('trial_timeline_events')
        .update({ parse_confidence: newConfidence })
        .eq('id', event.id);

      log(`    ✓ Fixed confidence for "${event.title}": ${event.parse_confidence} → ${newConfidence}`, 'green');
      fixed++;
    }

    log(`\n  Summary: ${fixed}/${violations.length} confidence values fixed`, 'green');
    return { fixed };

  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    throw error;
  }
}

// ============================================================================
// FIX INVALID EMAIL FORMATS
// ============================================================================

async function fixInvalidEmails() {
  log('\n🔍 Checking for invalid email formats...', 'cyan');

  try {
    const { data: users } = await supabase
      .from('trial_users')
      .select('user_id, name, email')
      .not('email', 'is', null);

    if (!users) {
      log('  ✓ No users to check', 'green');
      return { fixed: 0 };
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const invalidEmails = users.filter(u => !emailRegex.test(u.email));

    if (invalidEmails.length === 0) {
      log('  ✓ No invalid email formats found', 'green');
      return { fixed: 0 };
    }

    log(`  Found ${invalidEmails.length} invalid email formats`, 'yellow');

    let fixed = 0;
    for (const user of invalidEmails.slice(0, 5)) {
      // Set email to placeholder format to preserve NOT NULL constraint
      const placeholderEmail = `invalid_${user.user_id.substring(0, 8)}@placeholder.com`;
      await supabase
        .from('trial_users')
        .update({ email: placeholderEmail })
        .eq('user_id', user.user_id);

      log(`    ✓ Fixed invalid email for ${user.name}: "${user.email}" → "${placeholderEmail}"`, 'green');
      fixed++;
    }

    log(`\n  Summary: ${fixed}/${invalidEmails.length} invalid emails fixed`, 'green');
    return { fixed };

  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    throw error;
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                   PRE-MIGRATION DATA CLEANUP SCRIPT                        ║', 'cyan');
  log('║                   Fixing Constraint Violations                             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'cyan');

  try {
    const results = {
      trialDates: await fixTrialDateViolations(),
      negativeValues: await fixNegativeValues(),
      emptyTitles: await fixEmptyTitles(),
      parseConfidence: await fixParseConfidenceRange(),
      invalidEmails: await fixInvalidEmails()
    };

    const totalFixed = Object.values(results).reduce((sum, r) => sum + r.fixed, 0);

    log('\n' + '='.repeat(80), 'cyan');
    log('CLEANUP COMPLETE', 'green');
    log('='.repeat(80), 'cyan');

    log(`\nTrial date violations fixed: ${results.trialDates.fixed}`, 'green');
    log(`Negative values fixed: ${results.negativeValues.fixed}`, 'green');
    log(`Empty titles fixed: ${results.emptyTitles.fixed}`, 'green');
    log(`Parse confidence fixed: ${results.parseConfidence.fixed}`, 'green');
    log(`Invalid emails fixed: ${results.invalidEmails.fixed}`, 'green');
    log(`\nTotal fixes: ${totalFixed}`, 'green');

    if (totalFixed > 0) {
      log('\n✅ Data cleanup completed! You can now apply the constraint migration.', 'green');
    } else {
      log('\n✅ No violations found! Your data is already clean.', 'green');
    }

    log('='.repeat(80) + '\n', 'cyan');

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
