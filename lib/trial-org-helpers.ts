/**
 * Trial Organization Helper Functions
 * Centralized data preparation and validation for trial org forms
 * Prevents field name inconsistencies and ensures data integrity
 */

/**
 * Get default trial dates
 * @returns Object with start and end dates in YYYY-MM-DD format
 */
export function getDefaultTrialDates(): { start: string; end: string } {
  const today = new Date();
  const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    start: today.toISOString().split('T')[0],
    end: twoWeeksLater.toISOString().split('T')[0],
  };
}

/**
 * Validate trial date range
 * @param startDate - Trial start date (YYYY-MM-DD or ISO string)
 * @param endDate - Trial end date (YYYY-MM-DD or ISO string)
 * @returns Validation result with success flag and error message
 */
export function validateTrialOrgDates(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: true }; // Dates are optional for validation
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid trial start date format' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid trial end date format' };
  }

  if (end < start) {
    return { valid: false, error: 'Trial end date must be after start date' };
  }

  return { valid: true };
}

/**
 * Prepare trial organization data for creation
 * Ensures all required fields are set with correct naming conventions
 *
 * @param formData - Raw form data from creation form
 * @param user - Current authenticated user (for parent_company)
 * @returns Sanitized data object ready for database insert
 */
export function prepareTrialOrgForCreation(
  formData: {
    org_name: string;
    domain: string;
    account_manager_id: string;
    org_url?: string;
    logo_url?: string;
    description?: string;
    sales_poc?: string;
    trial_start_date?: string;
    trial_end_date?: string;
    org_lifecycle_stage?: string;
    trial_status?: string;
  },
  user: {
    parent_company?: string;
  }
): Record<string, any> {
  // Get default trial dates if not provided
  const defaultDates = getDefaultTrialDates();

  // Determine parent company from user or use default
  const parentCompany = user.parent_company || 'Mordor Intelligence';

  return {
    // Required fields
    org_name: formData.org_name.trim(),
    domain: formData.domain,
    account_manager_id: formData.account_manager_id, // UUID - canonical field

    // Parent company (for RLS policies)
    parent_company: parentCompany,
    parent_organization: parentCompany, // Backward compatibility

    // Trial dates with defaults
    trial_start_date: formData.trial_start_date || defaultDates.start,
    trial_end_date: formData.trial_end_date || defaultDates.end,

    // Optional fields
    org_url: formData.org_url?.trim() || null,
    logo_url: formData.logo_url?.trim() || null,
    description: formData.description?.trim() || null,
    sales_poc: formData.sales_poc?.trim() || null,

    // Status fields
    org_lifecycle_stage: formData.org_lifecycle_stage || 'prospect',
    trial_status: formData.trial_status || 'requested',

    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    // DEPRECATED: Do NOT include account_manager (TEXT field has been removed from schema)
  };
}

/**
 * Prepare trial organization data for update
 * Sanitizes form data to only include fields that should be updated
 * Prevents corruption of read-only fields like created_at, org_id
 *
 * @param formData - Raw form data from edit modal
 * @returns Sanitized data object ready for database update
 */
export function prepareTrialOrgForUpdate(
  formData: Record<string, any>
): Record<string, any> {
  // Explicitly whitelist fields that can be updated
  const updateData: Record<string, any> = {};

  // Basic org info
  if (formData.org_name !== undefined) {
    updateData.org_name = formData.org_name?.trim();
  }
  if (formData.domain !== undefined) {
    updateData.domain = formData.domain;
  }

  // Account manager (UUID only)
  if (formData.account_manager_id !== undefined) {
    updateData.account_manager_id = formData.account_manager_id;
  }

  // Lifecycle and status
  if (formData.org_lifecycle_stage !== undefined) {
    updateData.org_lifecycle_stage = formData.org_lifecycle_stage;
  }
  if (formData.trial_status !== undefined) {
    updateData.trial_status = formData.trial_status;
  }

  // Trial dates
  if (formData.trial_start_date !== undefined) {
    updateData.trial_start_date = formData.trial_start_date;
  }
  if (formData.trial_end_date !== undefined) {
    updateData.trial_end_date = formData.trial_end_date;
  }
  if (formData.trial_expiry_date !== undefined) {
    updateData.trial_expiry_date = formData.trial_expiry_date;
  }

  // URLs and metadata
  if (formData.org_url !== undefined) {
    updateData.org_url = formData.org_url?.trim() || null;
  }
  if (formData.logo_url !== undefined) {
    updateData.logo_url = formData.logo_url?.trim() || null;
  }
  if (formData.description !== undefined) {
    updateData.description = formData.description?.trim() || null;
  }
  if (formData.sales_poc !== undefined) {
    updateData.sales_poc = formData.sales_poc?.trim() || null;
  }
  if (formData.sales_poc_id !== undefined) {
    updateData.sales_poc_id = formData.sales_poc_id;
  }

  // Parent company/organization
  if (formData.parent_company !== undefined) {
    updateData.parent_company = formData.parent_company;
  }
  if (formData.parent_organization !== undefined) {
    updateData.parent_organization = formData.parent_organization;
  }

  // Always update the updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  // BLACKLIST: Never update these fields
  // - created_at (should never change)
  // - org_id (primary key, immutable)
  // - account_manager (deprecated TEXT field, removed from schema)
  // - account_manager_name (derived field, not in schema)

  return updateData;
}

/**
 * Validate trial organization form data
 * @param formData - Form data to validate
 * @param mode - 'create' or 'update'
 * @returns Validation result with errors object
 */
export function validateTrialOrgForm(
  formData: Record<string, any>,
  mode: 'create' | 'update'
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Required field validations
  if (!formData.org_name?.trim()) {
    errors.org_name = 'Organization name is required';
  } else if (formData.org_name.length > 200) {
    errors.org_name = 'Organization name must be 200 characters or less';
  }

  if (!formData.domain) {
    errors.domain = 'Domain is required';
  }

  if (!formData.account_manager_id) {
    errors.account_manager_id = 'Account Manager is required';
  }

  // Optional field validations
  if (formData.description && formData.description.length > 300) {
    errors.description = 'Description must be 300 characters or less';
  }

  if (formData.org_url && !isValidUrl(formData.org_url)) {
    errors.org_url = 'Please enter a valid URL (e.g., https://example.com)';
  }

  if (formData.logo_url && !isValidUrl(formData.logo_url)) {
    errors.logo_url = 'Please enter a valid URL (e.g., https://example.com/logo.png)';
  }

  // Trial date validation
  const dateValidation = validateTrialOrgDates(
    formData.trial_start_date,
    formData.trial_end_date
  );
  if (!dateValidation.valid) {
    errors.trial_dates = dateValidation.error || 'Invalid trial dates';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize URL by ensuring it has a protocol
 * @param url - URL string to normalize
 * @returns Normalized URL with https:// protocol
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // If already has protocol, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Add https:// by default
  return `https://${trimmed}`;
}
