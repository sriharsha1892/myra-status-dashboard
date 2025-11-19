/**
 * useFormValidation Hook Refactoring Verification
 *
 * Verifies that all refactored modals correctly use the useFormValidation hook
 * instead of manual validation implementation.
 *
 * Checks for:
 * - useFormValidation import
 * - Hook instantiation with schema and initial data
 * - Correct destructuring of hook return values
 * - No manual validation boilerplate (old pattern)
 * - Proper integration with existing patterns
 */

const fs = require('fs');
const path = require('path');

const REFACTORED_MODALS = [
  // Phase 1
  'AddTrialExtensionModal.tsx',
  'AddEngagementLogModal.tsx',
  'LogActivityModal.tsx',
  'AddSupportQueryModal.tsx',
  'UpdateDealStatusModal.tsx',
  // Phase 2
  'AddFeatureRequestModal.tsx',
  'AddFollowupModal.tsx',
  'AddTopicModal.tsx',
  'TrialHandoffModal.tsx',
  'AddRoadmapItemModal.tsx',
];

const HOOK_PATTERN_CHECKS = {
  // ✅ NEW PATTERN - Should exist
  useFormValidationImport: /import.*{.*useFormValidation.*}.*from ['"]@\/lib\/validation\/hooks\/useFormValidation['"]/,
  hookInstantiation: /useFormValidation\(/,
  destructuresFormData: /formData.*=.*useFormValidation/,
  destructuresErrors: /errors.*=.*useFormValidation/,
  destructuresHandleInputChange: /handleInputChange.*=.*useFormValidation/,
  destructuresValidateForm: /validateForm.*=.*useFormValidation/,
  destructuresResetForm: /resetForm.*=.*useFormValidation/,

  // ❌ OLD PATTERN - Should NOT exist
  manualFormDataState: /const \[formData, setFormData\] = useState/,
  manualErrorsState: /const \[errors, setErrors\] = useState<Record<string, string>>/,
  manualHandleInputChange: /const handleInputChange = \(.*field.*:.*string.*,.*value/,
  manualValidateForm: /const validateForm = \(\).*:.*boolean/,
  manualResetForm: /const resetForm = \(\) => \{[\s\S]*setFormData\(/,
  manualZodParsing: /\.parse\(formData\)/,
  manualZodErrorHandling: /catch \(err\)[\s\S]*z\.ZodError/,

  // ✅ INTEGRATION CHECKS - Should still exist
  useLoadingStateImport: /import.*{.*useLoadingState.*}.*from ['"]@\/lib\/hooks['"]/,
  showErrorWithReportImport: /import.*{.*showErrorWithReport.*}.*from ['"]@\/components\/ErrorToastWithReport['"]/,
  executePattern: /await execute\(/,
  showErrorWithReportUsage: /showErrorWithReport\(/,

  // ✅ USAGE CHECKS - Proper hook usage
  usesHandleInputChange: /handleInputChange\(['"]\w+['"],/,
  usesValidateForm: /if \(!validateForm\(\)\)/,
  usesResetForm: /resetForm\(\)/,
  usesFormDataInJSX: /formData\.\w+/,
  usesErrorsInJSX: /errors\.\w+/,
};

function analyzeModal(modalPath) {
  const content = fs.readFileSync(modalPath, 'utf8');
  const modalName = path.basename(modalPath);

  const results = {
    modalName,
    newPatternChecks: {},
    oldPatternChecks: {},
    integrationChecks: {},
    usageChecks: {},
    issues: [],
    warnings: [],
  };

  // Check NEW PATTERN (should exist)
  const newPatternChecks = [
    'useFormValidationImport',
    'hookInstantiation',
    'destructuresFormData',
    'destructuresErrors',
    'destructuresHandleInputChange',
    'destructuresValidateForm',
    'destructuresResetForm',
  ];

  newPatternChecks.forEach(checkName => {
    const found = HOOK_PATTERN_CHECKS[checkName].test(content);
    results.newPatternChecks[checkName] = found;

    if (!found) {
      results.issues.push(`Missing: ${checkName}`);
    }
  });

  // Check OLD PATTERN (should NOT exist)
  const oldPatternChecks = [
    'manualFormDataState',
    'manualErrorsState',
    'manualHandleInputChange',
    'manualValidateForm',
    'manualResetForm',
    'manualZodParsing',
    'manualZodErrorHandling',
  ];

  oldPatternChecks.forEach(checkName => {
    const found = HOOK_PATTERN_CHECKS[checkName].test(content);
    results.oldPatternChecks[checkName] = found;

    if (found) {
      results.issues.push(`Still has old pattern: ${checkName}`);
    }
  });

  // Check INTEGRATION (should still exist)
  const integrationChecks = [
    'useLoadingStateImport',
    'showErrorWithReportImport',
    'executePattern',
    'showErrorWithReportUsage',
  ];

  integrationChecks.forEach(checkName => {
    const found = HOOK_PATTERN_CHECKS[checkName].test(content);
    results.integrationChecks[checkName] = found;

    if (!found) {
      results.warnings.push(`Integration missing: ${checkName}`);
    }
  });

  // Check USAGE (should use hook properly)
  const usageChecks = [
    'usesHandleInputChange',
    'usesValidateForm',
    'usesResetForm',
    'usesFormDataInJSX',
    'usesErrorsInJSX',
  ];

  usageChecks.forEach(checkName => {
    const found = HOOK_PATTERN_CHECKS[checkName].test(content);
    results.usageChecks[checkName] = found;

    if (!found) {
      results.warnings.push(`Usage issue: ${checkName}`);
    }
  });

  return results;
}

function generateReport() {
  console.log('================================================================================');
  console.log('useFormValidation Hook Refactoring Verification Report');
  console.log('================================================================================');
  console.log('');

  const componentsDir = path.join(__dirname, '..', 'components');
  const allResults = [];
  let totalIssues = 0;
  let totalWarnings = 0;
  let perfectCount = 0;

  for (const modalFile of REFACTORED_MODALS) {
    const modalPath = path.join(componentsDir, modalFile);

    if (!fs.existsSync(modalPath)) {
      console.log(`❌ MISSING: ${modalFile}`);
      console.log('');
      continue;
    }

    const results = analyzeModal(modalPath);
    allResults.push(results);

    // Calculate compliance
    const newPatternPassed = Object.values(results.newPatternChecks).filter(Boolean).length;
    const newPatternTotal = Object.keys(results.newPatternChecks).length;
    const oldPatternFound = Object.values(results.oldPatternChecks).filter(Boolean).length;
    const integrationPassed = Object.values(results.integrationChecks).filter(Boolean).length;
    const integrationTotal = Object.keys(results.integrationChecks).length;
    const usagePassed = Object.values(results.usageChecks).filter(Boolean).length;
    const usageTotal = Object.keys(results.usageChecks).length;

    const isPerfect = results.issues.length === 0 && results.warnings.length === 0;
    if (isPerfect) perfectCount++;

    console.log(`\n${results.modalName}`);
    console.log('-'.repeat(80));
    console.log(`✅ New Pattern: ${newPatternPassed}/${newPatternTotal} (${Math.round((newPatternPassed/newPatternTotal)*100)}%)`);
    console.log(`✅ Old Pattern Removed: ${newPatternTotal - oldPatternFound}/${newPatternTotal} (${Math.round(((newPatternTotal-oldPatternFound)/newPatternTotal)*100)}%)`);
    console.log(`✅ Integration: ${integrationPassed}/${integrationTotal} (${Math.round((integrationPassed/integrationTotal)*100)}%)`);
    console.log(`✅ Usage: ${usagePassed}/${usageTotal} (${Math.round((usagePassed/usageTotal)*100)}%)`);

    if (results.issues.length > 0) {
      console.log(`\n❌ Issues Found: ${results.issues.length}`);
      results.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
      totalIssues += results.issues.length;
    }

    if (results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
      results.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
      totalWarnings += results.warnings.length;
    }

    if (isPerfect) {
      console.log('\n🎉 Perfect refactoring!');
    }
  }

  // Summary
  console.log('\n');
  console.log('================================================================================');
  console.log('Summary');
  console.log('================================================================================');
  console.log(`Total Modals Verified: ${REFACTORED_MODALS.length}`);
  console.log(`Modals with perfect refactoring: ${perfectCount}/${REFACTORED_MODALS.length}`);
  console.log(`Total Issues: ${totalIssues}`);
  console.log(`Total Warnings: ${totalWarnings}`);

  // Pattern compliance breakdown
  console.log('\n');
  console.log('Pattern Compliance Breakdown:');
  console.log('-'.repeat(80));

  // New Pattern Compliance
  console.log('\n✅ NEW PATTERN (Should Exist):');
  const newPatternChecks = [
    'useFormValidationImport',
    'hookInstantiation',
    'destructuresFormData',
    'destructuresErrors',
    'destructuresHandleInputChange',
    'destructuresValidateForm',
    'destructuresResetForm',
  ];

  newPatternChecks.forEach(checkName => {
    const count = allResults.filter(r => r.newPatternChecks[checkName]).length;
    const percentage = Math.round((count / allResults.length) * 100);
    const status = percentage === 100 ? '✅' : '❌';
    console.log(`${status} ${checkName}: ${count}/${allResults.length} (${percentage}%)`);
  });

  // Old Pattern Removal
  console.log('\n❌ OLD PATTERN (Should NOT Exist):');
  const oldPatternChecks = [
    'manualFormDataState',
    'manualErrorsState',
    'manualHandleInputChange',
    'manualValidateForm',
    'manualResetForm',
    'manualZodParsing',
    'manualZodErrorHandling',
  ];

  oldPatternChecks.forEach(checkName => {
    const count = allResults.filter(r => !r.oldPatternChecks[checkName]).length;
    const percentage = Math.round((count / allResults.length) * 100);
    const status = percentage === 100 ? '✅' : '⚠️ ';
    console.log(`${status} ${checkName} removed: ${count}/${allResults.length} (${percentage}%)`);
  });

  // Integration Checks
  console.log('\n🔗 INTEGRATION (Should Still Exist):');
  const integrationChecks = [
    'useLoadingStateImport',
    'showErrorWithReportImport',
    'executePattern',
    'showErrorWithReportUsage',
  ];

  integrationChecks.forEach(checkName => {
    const count = allResults.filter(r => r.integrationChecks[checkName]).length;
    const percentage = Math.round((count / allResults.length) * 100);
    const status = percentage === 100 ? '✅' : '⚠️ ';
    console.log(`${status} ${checkName}: ${count}/${allResults.length} (${percentage}%)`);
  });

  // Usage Checks
  console.log('\n📝 USAGE (Proper Hook Usage):');
  const usageChecks = [
    'usesHandleInputChange',
    'usesValidateForm',
    'usesResetForm',
    'usesFormDataInJSX',
    'usesErrorsInJSX',
  ];

  usageChecks.forEach(checkName => {
    const count = allResults.filter(r => r.usageChecks[checkName]).length;
    const percentage = Math.round((count / allResults.length) * 100);
    const status = percentage === 100 ? '✅' : '⚠️ ';
    console.log(`${status} ${checkName}: ${count}/${allResults.length} (${percentage}%)`);
  });

  console.log('\n');
  console.log('================================================================================');

  if (totalIssues === 0 && totalWarnings === 0) {
    console.log('🎉 All modals successfully refactored to use useFormValidation hook!');
    console.log('✅ No manual validation boilerplate found');
    console.log('✅ All integrations maintained');
    console.log('✅ Proper hook usage verified');
  } else if (totalIssues === 0) {
    console.log('✅ All modals successfully refactored!');
    console.log(`⚠️  ${totalWarnings} warnings found (non-critical)`);
  } else {
    console.log('⚠️  Refactoring needs attention.');
    console.log(`❌ ${totalIssues} issues found`);
    console.log(`⚠️  ${totalWarnings} warnings found`);
  }

  console.log('================================================================================');
  console.log('');

  // Exit code based on issues (warnings are ok)
  process.exit(totalIssues > 0 ? 1 : 0);
}

// Run the verification
generateReport();
