# E2E Tests for Bulk Import Framework

Comprehensive end-to-end tests using Playwright for all 7 bulk import tools.

## Overview

These tests run in real browsers (Chrome, Firefox) and test the complete user workflow:
- File uploads
- Form interactions
- Progress tracking
- Results display
- Error handling

## Test Coverage

### 1. CSV Organizations Import
- ✅ Successful import workflow
- ✅ Invalid CSV file handling
- ✅ Missing required fields validation
- ✅ File size display

### 2. Activity Timeline Import
- ✅ Successful event import
- ✅ Event type validation
- ✅ Organization lookup
- ✅ Date format handling

### 3. Smart Import
- ✅ Flexible column name mapping
- ✅ Domain category auto-detection
- ✅ Smart defaults for missing fields
- ✅ Minimal data handling

### 4. Timeline Events Import (AI)
- ✅ Unstructured text parsing
- ✅ AI extraction of events
- ✅ Date parsing from various formats
- ✅ Error handling for garbage input

### 5. Trial Users Import (AI)
- ✅ Mixed format email extraction
- ✅ Role inference from context
- ✅ Name extraction from emails
- ✅ Flexible input handling

### 6. Error Handling & Edge Cases
- ✅ Wrong file type rejection
- ✅ Empty file handling
- ✅ Large file processing
- ✅ Progress bar visibility
- ✅ Modal close/cancel

### 7. Performance & Reliability
- ✅ Performance benchmarks
- ✅ Concurrent modal handling
- ✅ Retry functionality

### 8. UI/UX Validation
- ✅ Clear instructions
- ✅ File size display
- ✅ Results with counts
- ✅ Download/export options

## Running Tests

### Prerequisites

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright Browsers**:
   ```bash
   npx playwright install
   ```

3. **Environment Setup**:
   Create `.env.local` with required variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GROQ_API_KEY=your_groq_api_key  # For AI tests
   ```

### Run All Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with headed browsers (see the browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test bulk-import.spec.ts

# Run specific test by name
npx playwright test -g "CSV Organizations"
```

### Run Tests in CI

```bash
# CI mode with retries
CI=1 npm run test:e2e
```

## Test Data

Test data files are located in `tests/test-data/`:

- `csv-organizations.csv` - 6 organizations with full fields
- `activity-timeline.csv` - 6 activity events
- `smart-import.csv` - 3 organizations with flexible columns
- `timeline-events.txt` - 7 unstructured timeline events
- `trial-users.txt` - 6 users in mixed formats

### Generating Test Data

To create custom test data:

```bash
# Create a new CSV file
cat > tests/test-data/my-test.csv << 'EOF'
org_name,contact_email
Test Org,test@example.com
EOF
```

## Test Structure

```typescript
test.describe('Import Tool Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to page
  });

  test('should do something', async ({ page }) => {
    // 1. Open modal
    // 2. Upload file
    // 3. Start import
    // 4. Wait for completion
    // 5. Verify results
  });
});
```

## Debugging

### View Test Report

```bash
npx playwright show-report
```

### Debug Specific Test

```bash
# Run test in debug mode
npx playwright test --debug bulk-import.spec.ts

# Run specific test with debug
npx playwright test --debug -g "CSV Organizations"
```

### Screenshots on Failure

Screenshots are automatically saved to `tests/screenshots/` on test failures.

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout in `playwright.config.ts`:
```typescript
timeout: 120000, // 2 minutes
```

### Issue: Port 3000 already in use
**Solution**: Stop other dev servers:
```bash
lsof -ti:3000 | xargs kill -9
```

### Issue: AI tests fail (GROQ_API_KEY)
**Solution**:
- Ensure `GROQ_API_KEY` is set in `.env.local`
- AI tests are automatically skipped if key is missing
- Check rate limits on Groq API

### Issue: File uploads don't work
**Solution**:
- Check file paths are correct
- Ensure test data files exist
- Verify file permissions

### Issue: Modal doesn't open
**Solution**:
- Check selectors match your UI
- Ensure page is fully loaded (`waitForLoadState`)
- Verify navigation URL is correct

## Selector Strategy

Tests use multiple selector strategies for robustness:

1. **Text Content**: `button:has-text("Import")` - Most readable
2. **Role-based**: `[role="dialog"]` - Semantic HTML
3. **Test IDs**: `data-testid="import-modal"` - Most reliable (add to components)

### Recommended: Add Test IDs

```tsx
// In your React components
<button data-testid="csv-import-button">
  CSV Organizations
</button>
```

Then in tests:
```typescript
await page.click('[data-testid="csv-import-button"]');
```

## Performance Expectations

| Test Suite | Expected Duration | Max Duration |
|------------|-------------------|--------------|
| CSV Organizations | 5-10s | 30s |
| Activity Timeline | 5-10s | 30s |
| Smart Import | 10-15s | 45s |
| Timeline Events (AI) | 15-30s | 90s |
| Trial Users (AI) | 15-30s | 90s |
| Error Handling | 5-10s | 30s |
| Performance | 10-15s | 45s |
| UI/UX | 5-10s | 30s |

**Total Test Suite**: ~5-10 minutes (all tests, both browsers)

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### 1. **Idempotent Tests**
Tests should be able to run multiple times:
```typescript
// Clean up test data
test.afterEach(async () => {
  // Delete test records from database
});
```

### 2. **Wait Strategies**
Use appropriate waiting:
```typescript
// ✅ Good: Wait for specific element
await page.waitForSelector('text=Import Complete');

// ❌ Bad: Arbitrary sleep
await page.waitForTimeout(5000);
```

### 3. **Error Handling**
Always handle potential errors:
```typescript
test('should handle error', async ({ page }) => {
  try {
    await page.click('button:has-text("Import")');
    await waitForImportComplete(page);
  } catch (error) {
    await screenshotOnFailure(page, 'import-error');
    throw error;
  }
});
```

### 4. **Test Independence**
Each test should be independent:
```typescript
// ✅ Each test creates its own data
test('test 1', async ({ page }) => {
  const testFile = createTestFile('data1.csv');
  // ...
});

test('test 2', async ({ page }) => {
  const testFile = createTestFile('data2.csv');
  // ...
});
```

## Contributing

### Adding New Tests

1. **Create test data** in `tests/test-data/`
2. **Write test** in `bulk-import.spec.ts` or new file
3. **Run test** locally: `npm run test:e2e:ui`
4. **Verify** test passes in both Chrome and Firefox
5. **Document** any special setup needed

### Test Naming Convention

```typescript
test('should [action] [expected result]', async ({ page }) => {
  // Test implementation
});
```

Examples:
- `should successfully import CSV organizations`
- `should handle invalid file format gracefully`
- `should display validation errors for missing fields`

## Troubleshooting

### Enable Verbose Logging

```bash
DEBUG=pw:api npm run test:e2e
```

### Video Recording

Add to `playwright.config.ts`:
```typescript
use: {
  video: 'on-first-retry',
}
```

### Slow Motion

Slow down test execution to see what's happening:
```bash
npx playwright test --headed --slow-mo=1000
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)

## Test Metrics

Track test health with these metrics:

- **Pass Rate**: Should be >95%
- **Flakiness**: Should be <5%
- **Execution Time**: Should be stable
- **Coverage**: All critical user paths

## Next Steps

- [ ] Add visual regression tests
- [ ] Add accessibility (a11y) tests
- [ ] Add mobile viewport tests
- [ ] Add network condition tests (slow 3G, offline)
- [ ] Add load testing (concurrent imports)
- [ ] Integrate with monitoring (Sentry, etc.)

---

**Last Updated**: January 20, 2025
**Test Suite Version**: 1.0.0
**Framework Version**: 2.0.0
