/**
 * Field Definitions for Import Column Mapping
 *
 * Defines expected fields for each entity type with aliases for flexible CSV parsing
 */

import { EntityType } from './types';

// ============================================================================
// Types
// ============================================================================

export interface FieldDefinition {
  key: string;           // Internal field name
  label: string;         // Display label
  required: boolean;     // Is this field required?
  description?: string;  // Help text
  aliases: string[];     // Alternative column names to match
}

export interface EntityFieldConfig {
  entityType: EntityType;
  displayName: string;
  fields: FieldDefinition[];
}

// ============================================================================
// Field Definitions by Entity Type
// ============================================================================

export const ORGANIZATION_FIELDS: FieldDefinition[] = [
  {
    key: 'org_name',
    label: 'Organization Name',
    required: true,
    description: 'Company or organization name',
    aliases: ['organization', 'company', 'name', 'org', 'company_name', 'Company Name', 'Organization'],
  },
  {
    key: 'website_url',
    label: 'Website URL',
    required: false,
    description: 'Company website',
    aliases: ['website', 'url', 'site', 'web', 'Website', 'URL'],
  },
  {
    key: 'domain_category',
    label: 'Domain/Industry',
    required: false,
    description: 'Industry category (TMT, NEO, AF&B, E&C, HC, AAD)',
    aliases: ['domain', 'category', 'industry', 'sector', 'Domain', 'Industry'],
  },
  {
    key: 'contact_email',
    label: 'Contact Email',
    required: false,
    description: 'Primary contact email address',
    aliases: ['email', 'primary_email', 'contact', 'Email', 'Contact Email'],
  },
  {
    key: 'contact_name',
    label: 'Contact Name',
    required: false,
    description: 'Primary contact person',
    aliases: ['contact', 'primary_contact', 'Contact Name', 'Contact', 'person'],
  },
  {
    key: 'contact_role',
    label: 'Contact Role',
    required: false,
    description: 'Contact\'s job title or role',
    aliases: ['designation', 'title', 'role', 'position', 'job_title', 'Title', 'Role'],
  },
  {
    key: 'sales_poc',
    label: 'Account Manager',
    required: false,
    description: 'Sales POC or account manager name',
    aliases: ['account_manager', 'poc', 'am', 'sales_poc_name', 'Account Manager', 'AM', 'POC'],
  },
  {
    key: 'prospect_source',
    label: 'Lead Source',
    required: false,
    description: 'Where the lead came from',
    aliases: ['source', 'lead_source', 'Source', 'Lead Source', 'origin'],
  },
  {
    key: 'icp_score',
    label: 'ICP Score',
    required: false,
    description: 'Ideal Customer Profile fit score (0-100)',
    aliases: ['icp_fit_score', 'icp', 'fit_score', 'ICP Score', 'ICP', 'score'],
  },
  {
    key: 'description',
    label: 'Description',
    required: false,
    description: 'Notes or description about the organization',
    aliases: ['about', 'notes', 'summary', 'desc', 'Description', 'Notes'],
  },
];

export const STATUS_UPDATE_FIELDS: FieldDefinition[] = [
  {
    key: 'org_name',
    label: 'Organization Name',
    required: true,
    description: 'Organization to update',
    aliases: ['organization', 'company', 'name', 'org', 'Company', 'Organization'],
  },
  {
    key: 'new_status',
    label: 'New Status',
    required: true,
    description: 'New trial status (expired, churned, converted, etc.)',
    aliases: ['status', 'trial_status', 'Status', 'Trial Status'],
  },
  {
    key: 'new_lifecycle_stage',
    label: 'Lifecycle Stage',
    required: false,
    description: 'New lifecycle stage',
    aliases: ['lifecycle', 'stage', 'lifecycle_stage', 'Lifecycle', 'Stage'],
  },
  {
    key: 'reason',
    label: 'Reason',
    required: false,
    description: 'Reason for status change',
    aliases: ['notes', 'note', 'Reason', 'Notes'],
  },
];

export const ACTIVITY_FIELDS: FieldDefinition[] = [
  {
    key: 'org_name',
    label: 'Organization Name',
    required: true,
    description: 'Organization this activity is for',
    aliases: ['organization', 'company', 'org', 'Company', 'Organization'],
  },
  {
    key: 'activity_type',
    label: 'Activity Type',
    required: true,
    description: 'Type of activity (email_sent, call, meeting, demo, etc.)',
    aliases: ['type', 'action', 'Activity Type', 'Type'],
  },
  {
    key: 'subject',
    label: 'Subject',
    required: false,
    description: 'Subject or title of the activity',
    aliases: ['title', 'topic', 'Subject', 'Title'],
  },
  {
    key: 'content',
    label: 'Content/Notes',
    required: false,
    description: 'Activity details or notes',
    aliases: ['notes', 'description', 'details', 'body', 'Content', 'Notes', 'Description'],
  },
  {
    key: 'activity_date',
    label: 'Date',
    required: false,
    description: 'When the activity occurred',
    aliases: ['date', 'timestamp', 'datetime', 'Date', 'Timestamp'],
  },
  {
    key: 'user_email',
    label: 'User Email',
    required: false,
    description: 'Email of the user who performed the activity',
    aliases: ['email', 'logged_by', 'user', 'User Email', 'Email'],
  },
];

export const MYRA_USAGE_FIELDS: FieldDefinition[] = [
  {
    key: 'org_name',
    label: 'Organization Name',
    required: true,
    description: 'Organization the user belongs to',
    aliases: ['organization', 'company', 'org', 'Company', 'Organization'],
  },
  {
    key: 'user_name',
    label: 'User Name',
    required: true,
    description: 'Name of the user',
    aliases: ['user', 'name', 'username', 'User', 'User Name', 'Name'],
  },
  {
    key: 'title',
    label: 'Conversation Title',
    required: true,
    description: 'Title or topic of the conversation',
    aliases: ['insight_title', 'topic', 'query', 'conversation', 'Title', 'Insight', 'Topic'],
  },
  {
    key: 'timestamp',
    label: 'Timestamp',
    required: true,
    description: 'When the conversation occurred',
    aliases: ['date', 'time', 'datetime', 'created_at', 'Date', 'Timestamp', 'Time'],
  },
  {
    key: 'cost',
    label: 'Cost (USD)',
    required: false,
    description: 'Cost of the conversation in USD',
    aliases: ['cost_usd', 'price', 'amount', 'Cost', '$', 'Amount'],
  },
];

export const PROSPECT_FIELDS: FieldDefinition[] = [
  {
    key: 'name',
    label: 'Contact Name',
    required: true,
    description: 'Full name of the prospect (person)',
    aliases: ['contact_name', 'full_name', 'person', 'contact', 'Name', 'Contact Name', 'Full Name'],
  },
  {
    key: 'org_name',
    label: 'Organization',
    required: true,
    description: 'Company/organization the contact belongs to',
    aliases: ['company', 'organization', 'company_name', 'org', 'Company', 'Organization', 'Company Name'],
  },
  {
    key: 'email',
    label: 'Email',
    required: false,
    description: 'Contact email address',
    aliases: ['contact_email', 'email_address', 'Email', 'Contact Email', 'E-mail'],
  },
  {
    key: 'title',
    label: 'Job Title',
    required: false,
    description: 'Contact\'s job title or role',
    aliases: ['role', 'position', 'designation', 'job_title', 'Title', 'Role', 'Position'],
  },
  {
    key: 'phone',
    label: 'Phone',
    required: false,
    description: 'Phone number',
    aliases: ['phone_number', 'mobile', 'cell', 'Phone', 'Mobile', 'Phone Number'],
  },
  {
    key: 'linkedin_url',
    label: 'LinkedIn URL',
    required: false,
    description: 'LinkedIn profile URL',
    aliases: ['linkedin', 'linkedin_profile', 'LinkedIn', 'LinkedIn URL', 'Li'],
  },
  {
    key: 'source',
    label: 'Source',
    required: false,
    description: 'How the prospect was sourced (cold_outreach, linkedin, referral, inbound, event)',
    aliases: ['lead_source', 'prospect_source', 'Source', 'Lead Source', 'Origin'],
  },
  {
    key: 'assigned_to_email',
    label: 'Assigned To',
    required: false,
    description: 'Email of the sales rep assigned to this prospect',
    aliases: ['sales_poc', 'account_manager', 'assigned', 'Assigned To', 'AM', 'POC'],
  },
  {
    key: 'is_primary_contact',
    label: 'Primary Contact',
    required: false,
    description: 'Is this the primary contact for the org? (yes/no/true/false)',
    aliases: ['primary', 'is_primary', 'Primary', 'Primary Contact', 'Main Contact'],
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    description: 'Additional notes about the prospect',
    aliases: ['description', 'comments', 'Notes', 'Description', 'Comments'],
  },
];

// ============================================================================
// Entity Config Map
// ============================================================================

export const ENTITY_FIELD_CONFIGS: Record<string, EntityFieldConfig> = {
  organization: {
    entityType: 'organization',
    displayName: 'Organizations',
    fields: ORGANIZATION_FIELDS,
  },
  status_update: {
    entityType: 'status_update',
    displayName: 'Status Updates',
    fields: STATUS_UPDATE_FIELDS,
  },
  activity: {
    entityType: 'activity',
    displayName: 'Activities',
    fields: ACTIVITY_FIELDS,
  },
  myra_usage: {
    entityType: 'myra_usage',
    displayName: 'myRA Usage',
    fields: MYRA_USAGE_FIELDS,
  },
  prospect: {
    entityType: 'prospect',
    displayName: 'Prospects (Contacts)',
    fields: PROSPECT_FIELDS,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get field definitions for an entity type
 */
export function getFieldsForEntity(entityType: string): FieldDefinition[] {
  return ENTITY_FIELD_CONFIGS[entityType]?.fields || [];
}

/**
 * Auto-detect column mapping from CSV headers
 * Returns a mapping of CSV column -> expected field key
 */
export function autoDetectColumnMapping(
  csvHeaders: string[],
  entityType: string
): Record<string, string> {
  const fields = getFieldsForEntity(entityType);
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of csvHeaders) {
    const normalizedHeader = header.toLowerCase().trim();

    // Try to find a matching field
    for (const field of fields) {
      if (usedFields.has(field.key)) continue;

      // Check if header matches field key or any alias
      const allNames = [field.key, ...field.aliases].map((n) => n.toLowerCase());

      if (allNames.includes(normalizedHeader)) {
        mapping[header] = field.key;
        usedFields.add(field.key);
        break;
      }
    }
  }

  return mapping;
}

/**
 * Check if column mapping covers all required fields
 */
export function validateColumnMapping(
  mapping: Record<string, string>,
  entityType: string
): { valid: boolean; missingRequired: string[] } {
  const fields = getFieldsForEntity(entityType);
  const mappedFields = new Set(Object.values(mapping));
  const missingRequired: string[] = [];

  for (const field of fields) {
    if (field.required && !mappedFields.has(field.key)) {
      missingRequired.push(field.label);
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
  };
}

/**
 * Apply column mapping to transform raw data
 */
export function applyColumnMapping(
  rawData: Record<string, unknown>[],
  mapping: Record<string, string>
): Record<string, unknown>[] {
  return rawData.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [csvCol, fieldKey] of Object.entries(mapping)) {
      if (row[csvCol] !== undefined) {
        mapped[fieldKey] = row[csvCol];
      }
    }
    // Also include any unmapped columns as-is
    for (const [key, value] of Object.entries(row)) {
      if (!mapping[key]) {
        mapped[key] = value;
      }
    }
    return mapped;
  });
}
