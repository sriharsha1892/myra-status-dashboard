/**
 * Zod Migration Code Consistency Analyzer
 *
 * Analyzes all 11 migrated modals to ensure:
 * - Consistent import patterns
 * - Proper formData/errors state usage
 * - useLoadingState hook usage
 * - handleInputChange implementation
 * - validateForm implementation
 * - resetForm implementation
 * - execute() pattern usage
 * - showErrorWithReport integration
 * - aria-label attributes
 */

const fs = require('fs');
const path = require('path');

const MIGRATED_MODALS = [
  // Phase 1
  'AddTrialExtensionModal.tsx',
  'AddEngagementLogModal.tsx',
  'LogActivityModal.tsx',
  'AddSupportQueryModal.tsx',
  'UpdateDealStatusModal.tsx',
  'AddMeetingNoteModal.tsx',
  // Phase 2
  'AddFeatureRequestModal.tsx',
  'AddFollowupModal.tsx',
  'AddTopicModal.tsx',
  'TrialHandoffModal.tsx',
  'AddRoadmapItemModal.tsx',
];

const PATTERN_CHECKS = {
  zodImport: /import.*{.*z.*}.*from ['"]zod['"]/,
  useLoadingStateImport: /import.*{.*useLoadingState.*}.*from ['"]@\/lib\/hooks['"]/,
  showErrorWithReportImport: /import.*{.*showErrorWithReport.*}.*from ['"]@\/components\/ErrorToastWithReport['"]/,
  getErrorMessageImport: /import.*{.*getErrorMessage.*}.*from ['"]@\/lib\/errorHandler['"]/,
  schemaImport: /import.*from ['"]@\/lib\/validation\/schemas\//,

  formDataState: /const \[formData, setFormData\] = useState/,
  errorsState: /const \[errors, setErrors\] = useState<Record<string, string>>/,
  useLoadingStateHook: /const.*{.*isLoading.*execute.*}.*=.*useLoadingState\(\)/,

  handleInputChange: /const handleInputChange = \(.*field.*:.*string.*,.*value.*:.*string/,
  validateForm: /const validateForm = \(\).*:.*boolean/,
  resetForm: /const resetForm = \(\)/,
  handleClose: /const handleClose = \(\)/,

  executePattern: /await execute\(/,
  showErrorWithReportUsage: /showErrorWithReport\(/,
  zodValidation: /\.parse\(formData\)/,
  zodErrorHandling: /z\.ZodError/,

  ariaLabel: /aria-label=["']Close modal["']/,

  successMessage: /successMessage:/,
  errorMessage: /errorMessage:/,
  onSuccess: /onSuccess:/,
  onError: /onError:/,
};

function analyzeModal(modalPath) {
  const content = fs.readFileSync(modalPath, 'utf8');
  const modalName = path.basename(modalPath);

  const results = {
    modalName,
    checks: {},
    issues: [],
  };

  // Check each pattern
  for (const [checkName, pattern] of Object.entries(PATTERN_CHECKS)) {
    const found = pattern.test(content);
    results.checks[checkName] = found;

    if (!found) {
      results.issues.push(`Missing: ${checkName}`);
    }
  }

  // Additional checks

  // Check if errors are cleared in handleInputChange
  if (results.checks.handleInputChange) {
    const hasErrorClearing = /if \(errors\[field\]\)/.test(content);
    if (!hasErrorClearing) {
      results.issues.push('handleInputChange does not clear errors');
    }
  }

  // Check if resetForm clears both formData and errors
  if (results.checks.resetForm) {
    const resetsFormData = /setFormData\({/.test(content);
    const resetsErrors = /setErrors\({}\)/.test(content);

    if (!resetsFormData) results.issues.push('resetForm does not reset formData');
    if (!resetsErrors) results.issues.push('resetForm does not clear errors');
  }

  // Check if handleClose calls resetForm
  if (results.checks.handleClose) {
    const callsResetForm = /resetForm\(\)/.test(content);
    if (!callsResetForm) {
      results.issues.push('handleClose does not call resetForm');
    }
  }

  return results;
}

function generateReport() {
  console.log('='.repeat(80));
  console.log('Zod Migration Code Consistency Report');
  console.log('='.repeat(80));
  console.log('');

  const componentsDir = path.join(__dirname, '..', 'components');
  const allResults = [];
  let totalIssues = 0;

  for (const modalFile of MIGRATED_MODALS) {
    const modalPath = path.join(componentsDir, modalFile);

    if (!fs.existsSync(modalPath)) {
      console.log(`❌ MISSING: ${modalFile}`);
      console.log('');
      continue;
    }

    const results = analyzeModal(modalPath);
    allResults.push(results);

    const passedChecks = Object.values(results.checks).filter(Boolean).length;
    const totalChecks = Object.keys(results.checks).length;
    const percentage = Math.round((passedChecks / totalChecks) * 100);

    console.log(`\n${results.modalName}`);
    console.log('-'.repeat(80));
    console.log(`✓ Passed: ${passedChecks}/${totalChecks} (${percentage}%)`);

    if (results.issues.length > 0) {
      console.log(`❌ Issues Found: ${results.issues.length}`);
      results.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
      totalIssues += results.issues.length;
    } else {
      console.log('✅ All checks passed!');
    }
  }

  // Summary
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Total Modals Analyzed: ${MIGRATED_MODALS.length}`);
  console.log(`Total Issues Found: ${totalIssues}`);

  const modalsWithoutIssues = allResults.filter(r => r.issues.length === 0).length;
  console.log(`Modals with 100% compliance: ${modalsWithoutIssues}/${MIGRATED_MODALS.length}`);

  // Pattern compliance breakdown
  console.log('\n');
  console.log('Pattern Compliance Breakdown:');
  console.log('-'.repeat(80));

  const patternCompliance = {};
  Object.keys(PATTERN_CHECKS).forEach(checkName => {
    const count = allResults.filter(r => r.checks[checkName]).length;
    const percentage = Math.round((count / allResults.length) * 100);
    patternCompliance[checkName] = { count, percentage };
  });

  Object.entries(patternCompliance)
    .sort((a, b) => a[1].percentage - b[1].percentage)
    .forEach(([checkName, { count, percentage }]) => {
      const status = percentage === 100 ? '✅' : '⚠️ ';
      console.log(`${status} ${checkName}: ${count}/${allResults.length} (${percentage}%)`);
    });

  console.log('\n');
  console.log('='.repeat(80));

  if (totalIssues === 0) {
    console.log('🎉 All modals follow the migration pattern perfectly!');
  } else {
    console.log('⚠️  Some modals need attention to achieve full compliance.');
  }

  console.log('='.repeat(80));
}

// Run the analysis
generateReport();
