/**
 * Form and Notes Test Helpers
 *
 * Reusable helper functions for E2E testing of forms and notes across all tabs
 */

import { Page, Locator, expect } from '@playwright/test';

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export async function loginAsAccountManager(page: Page, email: string = 'admin@myra.ai', password: string = 'admin123') {
  console.log(`\n  Checking authentication status...`);

  // Check if already logged in by trying to navigate to a protected route
  await page.goto('/support/trials');

  // Wait a moment to see if we get redirected to login
  await page.waitForTimeout(1000);

  const currentUrl = page.url();

  // If we're on the login page, perform login
  if (currentUrl.includes('/login')) {
    console.log(`  Not authenticated, logging in as: ${email}`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/support/, { timeout: 10000 });
    console.log('  Logged in successfully\n');
  } else {
    console.log('  Already authenticated, skipping login\n');
  }
}

export async function loginAsAdmin(page: Page) {
  return loginAsAccountManager(page, 'admin@myra.ai', 'admin123');
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

export async function navigateToTrialOrg(page: Page, orgId: string) {
  console.log(`\n  Navigating to trial org: ${orgId}`);
  await page.goto(`/support/trials/${orgId}`);
  await page.waitForLoadState('networkidle');
  console.log('  Page loaded\n');
}

export async function switchToTab(page: Page, tabName: 'overview' | 'peopleEngagement' | 'timeline' | 'support') {
  console.log(`\n  Switching to tab: ${tabName}`);

  const tabSelectors = {
    overview: 'button:has-text("Overview"), [role="tab"]:has-text("Overview")',
    peopleEngagement: 'button:has-text("People"), [role="tab"]:has-text("People")',
    timeline: 'button:has-text("Timeline"), [role="tab"]:has-text("Timeline")',
    support: 'button:has-text("Support"), [role="tab"]:has-text("Support")'
  };

  const tabButton = page.locator(tabSelectors[tabName]).first();
  await tabButton.click();
  await page.waitForTimeout(1000); // Wait for tab content to render
  console.log(`  Switched to ${tabName} tab\n`);
}

// ============================================================================
// FORM HELPERS
// ============================================================================

export async function openModal(page: Page, buttonText: string) {
  console.log(`\n  Opening modal: ${buttonText}`);
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') }).first();
  await expect(button).toBeVisible({ timeout: 5000 });
  await button.click();
  await page.waitForTimeout(500);
  console.log('  Modal opened\n');
}

export async function closeModal(page: Page) {
  console.log('\n  Closing modal');
  // Try multiple ways to close modal
  const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel"), button:has-text("Close")').first();
  if (await closeButton.isVisible({ timeout: 1000 })) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);
  console.log('  Modal closed\n');
}

export async function fillForm(page: Page, fields: Record<string, string>) {
  console.log('\n  Filling form fields:');

  for (const [fieldName, value] of Object.entries(fields)) {
    console.log(`    ${fieldName}: "${value}"`);

    // Try different field selectors
    const inputSelectors = [
      `input[name="${fieldName}"]`,
      `input[placeholder*="${fieldName}" i]`,
      `textarea[name="${fieldName}"]`,
      `textarea[placeholder*="${fieldName}" i]`,
      `select[name="${fieldName}"]`
    ];

    for (const selector of inputSelectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 500 })) {
        const tagName = await field.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'select') {
          await field.selectOption(value);
        } else {
          await field.fill(value);
        }
        break;
      }
    }
  }

  console.log('  Form filled\n');
}

export async function selectFromDropdown(page: Page, dropdownLabel: string, optionValue: string) {
  console.log(`\n  Selecting from dropdown: ${dropdownLabel} -> ${optionValue}`);

  // Find select by label
  const label = page.locator(`label:has-text("${dropdownLabel}")`).first();
  const selectId = await label.getAttribute('for');

  let select: Locator;
  if (selectId) {
    select = page.locator(`#${selectId}`);
  } else {
    // Fallback: find select near the label
    select = label.locator('+ select, ~ select').first();
  }

  await select.selectOption(optionValue);
  console.log('  Option selected\n');
}

export async function submitForm(page: Page, buttonText: string = 'Save') {
  console.log(`\n  Submitting form: ${buttonText}`);
  const submitButton = page.getByRole('button', { name: new RegExp(buttonText, 'i') }).first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  console.log('  Form submitted\n');
}

export async function fillAndSubmitForm(page: Page, fields: Record<string, string>, submitText: string = 'Save') {
  await fillForm(page, fields);
  await submitForm(page, submitText);
}

// ============================================================================
// TOAST/NOTIFICATION HELPERS
// ============================================================================

export async function verifyToastMessage(page: Page, expectedMessage: string | RegExp, type: 'success' | 'error' | 'info' = 'success') {
  console.log(`\n  Verifying toast message: ${expectedMessage}`);

  // Common toast selectors
  const toastSelectors = [
    '[role="status"]',
    '.toast',
    '[class*="toast"]',
    '[class*="notification"]',
    'text=/success|error|saved|created|updated|deleted/i'
  ];

  let toastFound = false;
  for (const selector of toastSelectors) {
    const toast = page.locator(selector).first();
    if (await toast.isVisible({ timeout: 3000 })) {
      const text = await toast.textContent();
      if (text) {
        if (typeof expectedMessage === 'string') {
          if (text.includes(expectedMessage)) {
            console.log(`  Toast found: "${text}"\n`);
            toastFound = true;
            break;
          }
        } else {
          if (expectedMessage.test(text)) {
            console.log(`  Toast found: "${text}"\n`);
            toastFound = true;
            break;
          }
        }
      }
    }
  }

  if (!toastFound) {
    console.log(`  Warning: Toast message not found\n`);
  }

  return toastFound;
}

export async function waitForToast(page: Page, timeout: number = 5000) {
  console.log('\n  Waiting for toast notification...');
  try {
    await page.waitForSelector('[role="status"], .toast, [class*="toast"]', { timeout });
    console.log('  Toast appeared\n');
    return true;
  } catch {
    console.log('  No toast appeared\n');
    return false;
  }
}

// ============================================================================
// DATA VERIFICATION HELPERS
// ============================================================================

export async function waitForDataSync(page: Page, milliseconds: number = 2000) {
  console.log(`\n  Waiting ${milliseconds}ms for data sync...`);
  await page.waitForTimeout(milliseconds);
  console.log('  Data sync wait complete\n');
}

export async function refreshPage(page: Page) {
  console.log('\n  Refreshing page...');
  await page.reload({ waitUntil: 'networkidle' });
  console.log('  Page refreshed\n');
}

export async function verifyTextExists(page: Page, text: string | RegExp, within?: string) {
  console.log(`\n  Verifying text exists: ${text}`);

  const locator = within ? page.locator(within) : page;
  const textLocator = typeof text === 'string'
    ? locator.locator(`text="${text}"`).first()
    : locator.locator(text).first();

  await expect(textLocator).toBeVisible({ timeout: 5000 });
  console.log('  Text verified\n');
}

export async function verifyElementCount(page: Page, selector: string, expectedCount: number) {
  console.log(`\n  Verifying element count: ${selector} should be ${expectedCount}`);

  const elements = page.locator(selector);
  await expect(elements).toHaveCount(expectedCount, { timeout: 5000 });
  console.log('  Count verified\n');
}

// ============================================================================
// LOG ACTIVITY MODAL HELPERS
// ============================================================================

export async function logActivity(
  page: Page,
  activityType: string,
  description: string,
  observations?: string,
  userId?: string
) {
  console.log('\n  Logging activity via LogActivityModal');

  await openModal(page, 'Log Activity');

  // Select activity type
  await selectFromDropdown(page, 'Activity Type', activityType);

  // Optional: Select user
  if (userId) {
    await selectFromDropdown(page, 'User', userId);
  }

  // Fill description
  await fillForm(page, { description });

  // Optional: Fill observations
  if (observations) {
    await fillForm(page, { observations });
  }

  await submitForm(page, 'Log Activity');
  await waitForToast(page);

  console.log('  Activity logged\n');
}

// ============================================================================
// USER ACTIVITY MODAL HELPERS
// ============================================================================

export async function addUserActivity(
  page: Page,
  userId: string,
  activityType: string,
  title: string,
  description?: string
) {
  console.log('\n  Adding user activity via AddUserActivityModal');

  await openModal(page, 'Log Activity');

  await selectFromDropdown(page, 'User', userId);
  await selectFromDropdown(page, 'Activity Type', activityType);
  await fillForm(page, { title });

  if (description) {
    // Handle rich text editor
    const editor = page.locator('[contenteditable="true"], textarea[name="description"]').first();
    await editor.fill(description);
  }

  await submitForm(page, 'Add Activity');
  await waitForToast(page);

  console.log('  User activity added\n');
}

export async function addUserActivityWithAI(page: Page, text: string) {
  console.log('\n  Adding user activity via AI Parser');

  await openModal(page, 'Log Activity');

  // Switch to AI Parser mode
  const aiParserTab = page.locator('button:has-text("AI Parser"), [role="tab"]:has-text("AI Parser")').first();
  if (await aiParserTab.isVisible({ timeout: 2000 })) {
    await aiParserTab.click();
    await page.waitForTimeout(500);
  }

  // Paste text
  const textArea = page.locator('textarea').first();
  await textArea.fill(text);

  // Click parse button
  const parseButton = page.getByRole('button', { name: /parse|extract/i }).first();
  await parseButton.click();

  // Wait for parsing
  await page.waitForTimeout(3000);

  await submitForm(page, 'Add Activity');
  await waitForToast(page);

  console.log('  User activity added via AI\n');
}

// ============================================================================
// SUPPORT QUERY HELPERS
// ============================================================================

export async function addSupportQuery(
  page: Page,
  queryType: string,
  title: string,
  description?: string,
  queryLevel: 'organization' | 'user' = 'organization',
  userId?: string
) {
  console.log('\n  Adding support query');

  await openModal(page, 'Add Support Query');

  await selectFromDropdown(page, 'Query Type', queryType);
  await fillForm(page, { title });

  if (description) {
    const editor = page.locator('[contenteditable="true"], textarea[name="description"]').first();
    await editor.fill(description);
  }

  // Select query level
  const levelRadio = page.locator(`input[value="${queryLevel}"]`).first();
  if (await levelRadio.isVisible({ timeout: 2000 })) {
    await levelRadio.click();
  }

  if (queryLevel === 'user' && userId) {
    await selectFromDropdown(page, 'User', userId);
  }

  await submitForm(page, 'Add Query');
  await waitForToast(page);

  console.log('  Support query added\n');
}

// ============================================================================
// TIMELINE HELPERS
// ============================================================================

export async function addTimelineEvent(
  page: Page,
  eventType: string,
  title: string,
  description?: string,
  sentiment?: 'positive' | 'neutral' | 'negative',
  followUpRequired?: boolean,
  followUpDate?: string
) {
  console.log('\n  Adding timeline event via Quick Entry');

  // Click Add Event button
  await openModal(page, 'Add Event');

  // Search and select event type
  const eventTypeSearch = page.locator('input[placeholder*="Search event type" i], input[placeholder*="event type" i]').first();
  if (await eventTypeSearch.isVisible({ timeout: 2000 })) {
    await eventTypeSearch.fill(eventType);
    await page.waitForTimeout(500);
    // Click first option
    await page.locator(`li:has-text("${eventType}"), [role="option"]:has-text("${eventType}")`).first().click();
  } else {
    // Fallback to dropdown
    await selectFromDropdown(page, 'Event Type', eventType);
  }

  await fillForm(page, { title });

  if (description) {
    await fillForm(page, { description });
  }

  if (sentiment) {
    // Select sentiment radio button
    const sentimentRadio = page.locator(`input[value="${sentiment}"]`).first();
    if (await sentimentRadio.isVisible({ timeout: 2000 })) {
      await sentimentRadio.click();
    }
  }

  if (followUpRequired) {
    const followUpCheckbox = page.locator('input[type="checkbox"][name*="follow"], input[type="checkbox"][id*="follow"]').first();
    await followUpCheckbox.check();

    if (followUpDate) {
      await fillForm(page, { follow_up_date: followUpDate });
    }
  }

  await submitForm(page, 'Add Event');
  await waitForToast(page);

  console.log('  Timeline event added\n');
}

export async function useTimelineTemplate(page: Page, templateName: string) {
  console.log(`\n  Using timeline template: ${templateName}`);

  const template = page.locator(`button:has-text("${templateName}")`).first();
  await template.click();
  await page.waitForTimeout(500);

  console.log('  Template applied\n');
}

// ============================================================================
// NOTES HELPERS
// ============================================================================

export async function addNote(
  page: Page,
  content: string,
  noteType?: string,
  visibility?: 'team' | 'internal' | 'private'
) {
  console.log('\n  Adding note via UnifiedNotesPanel');

  // Click Add Note button
  const addNoteButton = page.locator('button:has-text("Add Note"), button:has-text("New Note")').first();
  await addNoteButton.click();
  await page.waitForTimeout(500);

  // Select note type if provided
  if (noteType) {
    const noteTypeSelect = page.locator('select[name*="type"], select[id*="type"]').first();
    if (await noteTypeSelect.isVisible({ timeout: 2000 })) {
      await noteTypeSelect.selectOption(noteType);
    }
  }

  // Fill content (rich text editor)
  const editor = page.locator('[contenteditable="true"]').last();
  await editor.fill(content);

  // Select visibility if provided
  if (visibility) {
    const visibilitySelect = page.locator('select[name*="visibility"], select[id*="visibility"]').first();
    if (await visibilitySelect.isVisible({ timeout: 2000 })) {
      await visibilitySelect.selectOption(visibility);
    }
  }

  // Submit
  const saveButton = page.locator('button:has-text("Save"), button:has-text("Add Note")').last();
  await saveButton.click();
  await waitForToast(page);

  console.log('  Note added\n');
}

export async function replyToNote(page: Page, noteContent: string, replyContent: string) {
  console.log(`\n  Replying to note: "${noteContent.substring(0, 30)}..."`);

  // Find the note card by content
  const noteCard = page.locator(`text="${noteContent}"`).locator('..').locator('..').first();

  // Click Reply button
  const replyButton = noteCard.locator('button:has-text("Reply")').first();
  await replyButton.click();
  await page.waitForTimeout(500);

  // Fill reply
  const replyEditor = page.locator('[contenteditable="true"]').last();
  await replyEditor.fill(replyContent);

  // Submit reply
  const saveButton = page.locator('button:has-text("Reply"), button:has-text("Save")').last();
  await saveButton.click();
  await waitForToast(page);

  console.log('  Reply added\n');
}

export async function addNoteWithMention(page: Page, content: string, username: string) {
  console.log(`\n  Adding note with mention: @${username}`);

  const contentWithMention = `${content} @${username}`;
  await addNote(page, contentWithMention);

  console.log('  Note with mention added\n');
}

export async function editNote(page: Page, originalContent: string, newContent: string) {
  console.log('\n  Editing note');

  // Find the note card
  const noteCard = page.locator(`text="${originalContent}"`).locator('..').locator('..').first();

  // Click Edit button (usually in a menu)
  const menuButton = noteCard.locator('button[aria-label*="menu"], button:has-text("⋮")').first();
  if (await menuButton.isVisible({ timeout: 2000 })) {
    await menuButton.click();
    await page.waitForTimeout(300);
    const editButton = page.locator('button:has-text("Edit"), [role="menuitem"]:has-text("Edit")').first();
    await editButton.click();
  } else {
    const editButton = noteCard.locator('button:has-text("Edit")').first();
    await editButton.click();
  }

  await page.waitForTimeout(500);

  // Update content
  const editor = page.locator('[contenteditable="true"]').last();
  await editor.clear();
  await editor.fill(newContent);

  // Save
  const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
  await saveButton.click();
  await waitForToast(page);

  console.log('  Note edited\n');
}

export async function deleteNote(page: Page, noteContent: string) {
  console.log('\n  Deleting note');

  // Find the note card
  const noteCard = page.locator(`text="${noteContent}"`).locator('..').locator('..').first();

  // Click Delete button (usually in a menu)
  const menuButton = noteCard.locator('button[aria-label*="menu"], button:has-text("⋮")').first();
  if (await menuButton.isVisible({ timeout: 2000 })) {
    await menuButton.click();
    await page.waitForTimeout(300);
    const deleteButton = page.locator('button:has-text("Delete"), [role="menuitem"]:has-text("Delete")').first();
    await deleteButton.click();
  } else {
    const deleteButton = noteCard.locator('button:has-text("Delete")').first();
    await deleteButton.click();
  }

  // Confirm deletion if modal appears
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
  if (await confirmButton.isVisible({ timeout: 2000 })) {
    await confirmButton.click();
  }

  await waitForToast(page);

  console.log('  Note deleted\n');
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export async function verifyFieldValidation(page: Page, fieldName: string, errorMessage?: string) {
  console.log(`\n  Verifying field validation: ${fieldName}`);

  if (errorMessage) {
    const errorLocator = page.locator(`text="${errorMessage}"`).first();
    await expect(errorLocator).toBeVisible({ timeout: 3000 });
    console.log(`  Validation error found: "${errorMessage}"\n`);
  } else {
    // Generic validation check
    const errorLocator = page.locator('[class*="error"], [role="alert"], .text-red-500, .text-danger').first();
    await expect(errorLocator).toBeVisible({ timeout: 3000 });
    console.log('  Validation error found\n');
  }
}

export async function verifyFormCannotSubmit(page: Page, submitButtonText: string = 'Save') {
  console.log('\n  Verifying form cannot submit');

  const submitButton = page.getByRole('button', { name: new RegExp(submitButtonText, 'i') }).first();
  const isDisabled = await submitButton.isDisabled();

  expect(isDisabled).toBe(true);
  console.log('  Submit button is disabled (as expected)\n');
}
