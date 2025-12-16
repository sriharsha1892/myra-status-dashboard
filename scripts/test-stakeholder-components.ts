/**
 * Test Stakeholder Components
 * Verifies the StakeholderMap and ContactBubble components structure
 */

import * as fs from 'fs';
import * as path from 'path';

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

console.log('\n========================================');
console.log('TESTING STAKEHOLDER COMPONENTS');
console.log('========================================\n');

// Test 1: Component files exist
console.log('--- Component File Existence ---');
{
  const stakeholderMapPath = path.join(__dirname, '../components/stakeholder/StakeholderMap.tsx');
  const exists = fs.existsSync(stakeholderMapPath);
  logTest('StakeholderMap.tsx exists', exists, stakeholderMapPath);
}

{
  const contactBubblePath = path.join(__dirname, '../components/stakeholder/ContactBubble.tsx');
  const exists = fs.existsSync(contactBubblePath);
  logTest('ContactBubble.tsx exists', exists, contactBubblePath);
}

// Test 2: Check StakeholderMap content
console.log('\n--- StakeholderMap Structure ---');
{
  const filePath = path.join(__dirname, '../components/stakeholder/StakeholderMap.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for INFLUENCE_TIERS
  const hasInfluenceTiers = content.includes('INFLUENCE_TIERS');
  logTest('INFLUENCE_TIERS defined', hasInfluenceTiers, '');

  // Check for all influence types
  const influenceTypes = ['champion', 'decision_maker', 'influencer', 'evaluator', 'blocker', 'unknown'];
  for (const type of influenceTypes) {
    const hasType = content.includes(`id: '${type}'`);
    logTest(`Influence type: ${type}`, hasType, '');
  }

  // Check for ContactBubble import
  const hasContactBubbleImport = content.includes("import ContactBubble from './ContactBubble'");
  logTest('ContactBubble imported', hasContactBubbleImport, '');

  // Check for filter functionality
  const hasFilter = content.includes('filterInfluence');
  logTest('Filter functionality', hasFilter, '');

  // Check for stats display
  const hasStats = content.includes('champions') && content.includes('blockers') && content.includes('unclassified');
  logTest('Stats display', hasStats, '');
}

// Test 3: Check ContactBubble content
console.log('\n--- ContactBubble Structure ---');
{
  const filePath = path.join(__dirname, '../components/stakeholder/ContactBubble.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for INFLUENCE_CONFIG
  const hasInfluenceConfig = content.includes('INFLUENCE_CONFIG');
  logTest('INFLUENCE_CONFIG defined', hasInfluenceConfig, '');

  // Check for SIZE_CONFIG
  const hasSizeConfig = content.includes('SIZE_CONFIG');
  logTest('SIZE_CONFIG defined', hasSizeConfig, '');

  // Check for all sizes
  const sizes = ['sm', 'md', 'lg'];
  for (const size of sizes) {
    const hasSize = content.includes(`${size}:`);
    logTest(`Size config: ${size}`, hasSize, '');
  }

  // Check for tooltip functionality
  const hasTooltip = content.includes('showTooltip');
  logTest('Tooltip functionality', hasTooltip, '');

  // Check for engagement score display
  const hasEngagement = content.includes('engagement_score');
  logTest('Engagement score display', hasEngagement, '');

  // Check for contact actions
  const hasMailAction = content.includes("href={`mailto:");
  const hasPhoneAction = content.includes("href={`tel:");
  const hasLinkedinAction = content.includes('linkedin_url');
  logTest('Contact actions (email, phone, linkedin)', hasMailAction && hasPhoneAction && hasLinkedinAction, '');
}

// Test 4: Check interface definitions
console.log('\n--- Interface Definitions ---');
{
  const stakeholderContent = fs.readFileSync(
    path.join(__dirname, '../components/stakeholder/StakeholderMap.tsx'),
    'utf-8'
  );

  const hasContactInterface = stakeholderContent.includes('interface Contact');
  logTest('Contact interface defined in StakeholderMap', hasContactInterface, '');

  const hasPropsInterface = stakeholderContent.includes('interface StakeholderMapProps');
  logTest('StakeholderMapProps interface defined', hasPropsInterface, '');
}

{
  const contactBubbleContent = fs.readFileSync(
    path.join(__dirname, '../components/stakeholder/ContactBubble.tsx'),
    'utf-8'
  );

  const hasContactBubbleProps = contactBubbleContent.includes('interface ContactBubbleProps');
  logTest('ContactBubbleProps interface defined', hasContactBubbleProps, '');
}

// Test 5: Check data fetching
console.log('\n--- Data Fetching ---');
{
  const content = fs.readFileSync(
    path.join(__dirname, '../components/stakeholder/StakeholderMap.tsx'),
    'utf-8'
  );

  const fetchesProspects = content.includes("from('prospects')");
  logTest('Fetches from prospects table', fetchesProspects, '');

  const fetchesTrialUsers = content.includes("from('trial_users')");
  logTest('Fetches from trial_users table', fetchesTrialUsers, '');

  const deduplicates = content.includes('deduplicate') || content.includes('!acc.find');
  logTest('Deduplicates contacts by email', deduplicates, '');
}

// ============ SUMMARY ============
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.test}: ${r.details}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
