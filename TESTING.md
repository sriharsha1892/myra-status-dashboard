# Testing Guide

## Quick Start

```bash
# Run all unit tests
npm test

# Run E2E tests
npm run test:e2e
```

## Available Test Commands

### Unit Tests (Jest + React Testing Library)

```bash
# Run all tests
npm test

# Run with coverage report
npm test:coverage

# Run in watch mode (re-runs on file changes)
npm test:watch

# Run specific test file
npm test -- MagneticCard.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="renders"
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see the browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- support-dashboard.spec.ts

# Show last test report
npm run test:e2e:report

# Run on specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
```

## Test Structure

```
myra-status-dashboard/
├── components/
│   └── animations/
│       └── __tests__/           # Unit tests for animation components
│           ├── MagneticCard.test.tsx
│           ├── StatusGlow.test.tsx
│           ├── AnimatedNumber.test.tsx
│           ├── ChromaticShift.test.tsx
│           ├── HolographicOverlay.test.tsx
│           └── MorphingBlob.test.tsx
├── e2e/                         # End-to-end tests
│   ├── auth.setup.ts
│   ├── support-dashboard.spec.ts
│   ├── support-tickets.spec.ts
│   ├── support-reports-engagement.spec.ts
│   └── animation-components.spec.ts
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup and mocks
└── playwright.config.ts         # Playwright configuration
```

## Writing New Tests

### Unit Test Example

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<YourComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Your Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
    await page.waitForLoadState('networkidle');
  });

  test('should display content', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle user interaction', async ({ page }) => {
    await page.click('button:text("Click Me")');
    await expect(page.locator('.result')).toContainText('Success');
  });
});
```

## Testing Best Practices

### 1. Test Naming
- Use descriptive test names
- Follow "should/it" pattern
- Example: "should render children correctly"

### 2. Test Organization
- Group related tests with `describe` blocks
- Use `beforeEach` for setup
- Keep tests independent and isolated

### 3. What to Test
✅ **Do test:**
- Component renders without crashing
- Props are handled correctly
- User interactions work
- Accessibility features
- Error states

❌ **Don't test:**
- Implementation details
- Third-party libraries
- CSS styling (use visual regression instead)

### 4. Async Testing
```typescript
// Wait for elements
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// User events (better than fireEvent)
import userEvent from '@testing-library/user-event';
const user = userEvent.setup();
await user.click(screen.getByRole('button'));
```

### 5. E2E Testing Tips
- Always wait for network to be idle
- Use semantic locators (role, label, text)
- Test user flows, not implementation
- Keep tests independent
- Use fixtures for test data

## Debugging Tests

### Unit Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code: Add breakpoint and press F5
```

### E2E Tests

```bash
# Run with UI mode (best for debugging)
npm run test:e2e:ui

# Run in headed mode to see browser
npm run test:e2e:headed

# Generate trace for failed tests
npm run test:e2e -- --trace on

# Debug specific test
npx playwright test support-dashboard.spec.ts --debug
```

## Coverage Reports

After running `npm test:coverage`, view the detailed report:

```bash
# Open HTML coverage report
open coverage/lcov-report/index.html
```

Coverage thresholds are set to 80% in `jest.config.js`:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Common Issues and Solutions

### Issue: Tests failing with "Cannot find module"
**Solution:** Install missing dependencies
```bash
npm install
```

### Issue: Framer-motion errors in tests
**Solution:** Already mocked in `jest.setup.js`. If issues persist, check the mock implementation.

### Issue: E2E tests timing out
**Solution:**
- Increase timeout in test
- Use more specific selectors
- Wait for network idle
```typescript
await page.waitForLoadState('networkidle', { timeout: 10000 });
```

### Issue: Snapshot tests failing
**Solution:** Update snapshots
```bash
npm test -- -u
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Maintenance

### Regular Tasks
1. **Review coverage reports** - Aim for 80%+ coverage
2. **Update tests** when features change
3. **Remove obsolete tests** for deleted features
4. **Refactor duplicated test code** into utilities
5. **Check for flaky tests** and fix them

### When to Add Tests
- ✅ New feature development
- ✅ Bug fixes (add regression test)
- ✅ Refactoring (ensure behavior stays same)
- ✅ Performance improvements (add benchmark)

### When to Update Tests
- ✅ API changes
- ✅ Component interface changes
- ✅ User flow modifications
- ✅ Accessibility improvements

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Useful Tools
- [Testing Playground](https://testing-playground.com/) - Find the best queries
- [Playwright Codegen](https://playwright.dev/docs/codegen) - Generate tests
- [Jest Coverage](https://jestjs.io/docs/configuration#collectcoverage-boolean) - Track coverage

## Support

For issues or questions about testing:
1. Check existing test files for examples
2. Review this documentation
3. Check official documentation links above
4. Ask the team for help

---

**Remember:** Good tests make refactoring safer and development faster. Invest time in writing quality tests!
