/**
 * Validation script for Command Center V2 UI polish
 * Checks that all design system patterns are correctly applied
 * Run with: npx tsx scripts/validate-command-v2-polish.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPONENT_DIR = path.join(__dirname, '../components/command/v2');

interface ValidationResult {
  file: string;
  checks: { name: string; passed: boolean; details?: string }[];
}

// Design system patterns to validate
const DESIGN_PATTERNS = {
  // Elevation system
  elevation: {
    shadowMd: /shadow-md/,
    shadowLg: /shadow-lg/,
    shadowXl: /shadow-xl/,
  },

  // Spacing (8px grid)
  spacing: {
    gap3: /gap-3/,
    gap4: /gap-4/,
    gap6: /gap-6/,
    p4: /p-4/,
    px4or5: /px-[45]/,
    py2to4: /py-[234]/,
  },

  // Border radius
  borderRadius: {
    rounded2xl: /rounded-2xl/,
    roundedXl: /rounded-xl/,
  },

  // Typography
  typography: {
    textBase: /text-base/,
    fontSemibold: /font-semibold/,
    fontMedium: /font-medium/,
  },

  // Dark theme colors
  colors: {
    gray800: /bg-gray-800/,
    gray900: /bg-gray-900/,
    textLight: /text-gray-100/,
    greenAccent: /bg-green-/,
    amberAccent: /bg-amber-/,
    violetAccent: /bg-violet-/,
  },

  // Transitions
  transitions: {
    transitionAll: /transition-all/,
    duration200: /duration-200/,
  },

  // Tactile buttons
  buttons: {
    hoverScale: /whileHover.*scale/,
    tapScale: /whileTap.*scale/,
    hoverY: /whileHover.*y.*-1/,
  },
};

// Component-specific requirements
const COMPONENT_REQUIREMENTS: Record<string, { patterns: RegExp[]; description: string }[]> = {
  'ActionPreview.tsx': [
    { patterns: [/rounded-2xl/, /shadow-md/], description: 'Card uses rounded-2xl with shadow-md' },
    { patterns: [/w-10 h-10/, /rounded-xl/], description: 'Status icon is w-10 h-10 rounded-xl' },
    { patterns: [/px-4 py-2\.5/, /rounded-xl/, /shadow-md/], description: 'Buttons have px-4 py-2.5 with shadows' },
    { patterns: [/w-16 h-1\.5/, /bg-gray-700/, /rounded-full/], description: 'Confidence meter bar exists' },
    { patterns: [/whileHover.*scale.*1\.02/], description: 'Buttons have tactile hover feedback' },
    { patterns: [/space-y-1\.5/, /text-base font-medium/], description: 'Two-row content layout' },
    { patterns: [/getConfidenceBarColor/], description: 'Uses confidence bar colors (not badges)' },
  ],
  'AIResponse.tsx': [
    { patterns: [/space-y-6/], description: 'Main container has space-y-6' },
    { patterns: [/w-9 h-9/, /rounded-xl/, /bg-gradient/], description: 'Header icon container styled' },
    { patterns: [/text-base font-medium/, /text-xs.*gray-500/], description: 'Two-line header text' },
    { patterns: [/TierSection/, /headerBorder/, /iconBg/, /countBg/], description: 'TierSection has distinct header styling' },
    { patterns: [/px-5 py-2\.5/, /rounded-xl/, /shadow-md/], description: 'Batch buttons have elevation' },
    { patterns: [/pt-4.*border-t.*border-gray-700\/50/], description: 'Section dividers styled' },
    { patterns: [/FollowUpSuggestions/, /shadow-sm.*shadow-violet/], description: 'Follow-up suggestions have shadow' },
  ],
  'CommandInput.tsx': [
    { patterns: [/rounded-2xl/, /border-2/], description: 'Input container uses rounded-2xl' },
    { patterns: [/focus-within:ring-4/, /focus-within:ring-violet/], description: 'Strong focus ring (ring-4)' },
    { patterns: [/shadow-lg.*shadow-black/, /focus-within:shadow-xl/], description: 'Input has elevation shadows' },
    { patterns: [/px-5 py-4/, /text-base/], description: 'Taller input (py-4, text-base)' },
    { patterns: [/minHeight.*56px/], description: 'Minimum height 56px' },
    { patterns: [/kbd.*px-2 py-1/, /rounded-md/, /border.*gray-700/, /shadow-sm/], description: 'Styled kbd elements' },
    { patterns: [/backdrop-blur-sm/, /rounded-2xl.*shadow-xl/], description: 'Slash dropdown has blur and shadow' },
  ],
  'MessageBubble.tsx': [
    { patterns: [/w-8 h-8/, /rounded-xl/], description: 'Avatar is w-8 h-8 rounded-xl' },
    { patterns: [/bg-gradient-to-br.*violet/], description: 'User avatar has gradient' },
    { patterns: [/rounded-2xl.*rounded-tr-md/, /shadow-lg/], description: 'User bubble rounded-2xl with shadow' },
    { patterns: [/rounded-2xl.*rounded-tl-md/, /shadow-lg.*black/], description: 'AI bubble rounded-2xl with shadow' },
    { patterns: [/gap-2\.5.*mb-1\.5/], description: 'Header spacing gap-2.5 mb-1.5' },
    { patterns: [/px-5 py-4/], description: 'Bubble padding px-5 py-4' },
    { patterns: [/font-semibold.*gray-300/], description: 'AI label is font-semibold' },
  ],
  'ConversationStream.tsx': [
    { patterns: [/px-6 py-8 space-y-6/], description: 'Container spacing increased' },
    { patterns: [/w-20 h-20/, /rounded-2xl/, /shadow-lg/], description: 'Empty state icon is larger with shadow' },
    { patterns: [/text-xl font-semibold/], description: 'Empty state title is text-xl' },
    { patterns: [/mb-8/], description: 'Empty state spacing mb-8' },
    { patterns: [/gap-3/], description: 'Example chips gap-3' },
    { patterns: [/px-5 py-2\.5/, /rounded-xl/, /shadow-sm/, /active:scale/], description: 'Example chips styled with press feedback' },
  ],
};

function validateFile(filename: string): ValidationResult {
  const filepath = path.join(COMPONENT_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  const checks: { name: string; passed: boolean; details?: string }[] = [];

  const requirements = COMPONENT_REQUIREMENTS[filename] || [];

  for (const req of requirements) {
    const allMatch = req.patterns.every(pattern => pattern.test(content));
    checks.push({
      name: req.description,
      passed: allMatch,
      details: allMatch ? undefined : `Missing pattern(s)`,
    });
  }

  return { file: filename, checks };
}

function runValidation() {
  console.log('\n🔍 Validating Command Center V2 UI Polish\n');
  console.log('='.repeat(60) + '\n');

  const files = [
    'ActionPreview.tsx',
    'AIResponse.tsx',
    'CommandInput.tsx',
    'MessageBubble.tsx',
    'ConversationStream.tsx',
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const file of files) {
    console.log(`📄 ${file}`);
    console.log('-'.repeat(40));

    const result = validateFile(file);

    for (const check of result.checks) {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}`);
      if (check.details) {
        console.log(`     └─ ${check.details}`);
      }

      if (check.passed) totalPassed++;
      else totalFailed++;
    }

    console.log('');
  }

  // Global design system checks
  console.log('🎨 Global Design System Checks');
  console.log('-'.repeat(40));

  const allContent = files
    .map(f => fs.readFileSync(path.join(COMPONENT_DIR, f), 'utf-8'))
    .join('\n');

  // Check elevation is used
  const hasElevation = Object.values(DESIGN_PATTERNS.elevation).every(p => p.test(allContent));
  console.log(`  ${hasElevation ? '✅' : '❌'} Elevation system (shadow-md/lg/xl)`);
  if (hasElevation) totalPassed++;
  else totalFailed++;

  // Check spacing is consistent
  const hasSpacing = Object.values(DESIGN_PATTERNS.spacing).some(p => p.test(allContent));
  console.log(`  ${hasSpacing ? '✅' : '❌'} 8px grid spacing`);
  if (hasSpacing) totalPassed++;
  else totalFailed++;

  // Check border radius
  const hasBorderRadius = Object.values(DESIGN_PATTERNS.borderRadius).every(p => p.test(allContent));
  console.log(`  ${hasBorderRadius ? '✅' : '❌'} Border radius (rounded-xl/2xl)`);
  if (hasBorderRadius) totalPassed++;
  else totalFailed++;

  // Check typography
  const hasTypography = Object.values(DESIGN_PATTERNS.typography).every(p => p.test(allContent));
  console.log(`  ${hasTypography ? '✅' : '❌'} Typography hierarchy`);
  if (hasTypography) totalPassed++;
  else totalFailed++;

  // Check dark theme colors
  const hasColors = Object.values(DESIGN_PATTERNS.colors).every(p => p.test(allContent));
  console.log(`  ${hasColors ? '✅' : '❌'} Dark theme colors`);
  if (hasColors) totalPassed++;
  else totalFailed++;

  // Check transitions
  const hasTransitions = Object.values(DESIGN_PATTERNS.transitions).every(p => p.test(allContent));
  console.log(`  ${hasTransitions ? '✅' : '❌'} Transitions (duration-200)`);
  if (hasTransitions) totalPassed++;
  else totalFailed++;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESULTS: ${totalPassed} passed, ${totalFailed} failed\n`);

  if (totalFailed === 0) {
    console.log('🎉 All UI polish validations passed!\n');
  } else {
    console.log('⚠️  Some validations failed. Please review the issues above.\n');
    process.exit(1);
  }
}

runValidation();
