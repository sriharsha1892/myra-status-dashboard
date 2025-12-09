/**
 * Action Module Tests
 * Tests for the new action layer including validation and error handling
 */

import { z } from 'zod';
import {
  validationError,
  fieldError,
  notFoundError,
  transformDbError,
  failedResult,
} from '../_shared/errors';
import { TABLES, getIdColumn, ID_COLUMNS } from '../_shared/db';
import {
  createOrganizationSchema,
  mapToCreateOrgInput,
} from '../createOrganization';
import {
  createUserSchema,
  mapToCreateUserInput,
} from '../createUser';
import {
  updateStageSchema,
  LIFECYCLE_STAGES,
  TRIAL_STATUSES,
} from '../updateStage';
import {
  getMigratedActions,
  isActionMigrated,
} from '../index';

// ============ SCHEMA REGISTRY TESTS ============

describe('Schema Registry', () => {
  it('should have all expected tables defined', () => {
    expect(TABLES.ORGANIZATIONS).toBe('trial_organizations');
    expect(TABLES.USERS).toBe('trial_users');
    expect(TABLES.TIMELINE_EVENTS).toBe('trial_timeline_events');
    expect(TABLES.DEAL_TRACKING).toBe('org_deal_tracking');
    expect(TABLES.ACTIVITY_NOTES).toBe('org_activity_notes');
    expect(TABLES.TICKETS).toBe('tickets');
    expect(TABLES.FEATURE_REQUESTS).toBe('feature_requests');
    expect(TABLES.PRODUCT_ROADMAP).toBe('org_product_roadmap');
  });

  it('should return correct ID columns for tables', () => {
    expect(getIdColumn(TABLES.ORGANIZATIONS)).toBe('org_id');
    expect(getIdColumn(TABLES.USERS)).toBe('user_id');
    expect(getIdColumn(TABLES.TIMELINE_EVENTS)).toBe('id');
    expect(getIdColumn(TABLES.TICKETS)).toBe('id');
  });

  it('should default to "id" for unknown tables', () => {
    expect(getIdColumn('unknown_table')).toBe('id');
  });
});

// ============ ERROR TRANSFORMATION TESTS ============

describe('Error Transformation', () => {
  describe('transformDbError', () => {
    it('should transform duplicate key error', () => {
      const error = { message: 'duplicate key violates unique constraint', code: '23505' };
      const result = transformDbError(error, 'org');

      expect(result.code).toBe('DUPLICATE_ENTRY');
      expect(result.message).toBe('This record already exists');
      expect(result.suggestion).toContain('organization');
    });

    it('should transform foreign key error', () => {
      const error = { message: 'foreign key constraint violation', code: '23503' };
      const result = transformDbError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Referenced record not found');
    });

    it('should transform permission error', () => {
      const error = { message: 'permission denied for table' };
      const result = transformDbError(error);

      expect(result.code).toBe('PERMISSION_DENIED');
    });

    it('should return generic error for unknown errors', () => {
      const error = { message: 'some unknown error' };
      const result = transformDbError(error);

      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.message).toBe('Unable to save changes');
    });
  });

  describe('validationError', () => {
    it('should transform Zod validation error', () => {
      const schema = z.object({ email: z.string().email() });
      const parseResult = schema.safeParse({ email: 'invalid' });

      if (!parseResult.success) {
        const result = validationError(parseResult.error);
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.field).toBe('email');
      }
    });
  });

  describe('fieldError', () => {
    it('should create field-specific error', () => {
      const result = fieldError('orgName', 'Organization name is required');

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('orgName');
      expect(result.message).toBe('Organization name is required');
    });
  });

  describe('notFoundError', () => {
    it('should create not found error with identifier', () => {
      const result = notFoundError('Organization', 'Acme Corp');

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toContain('Acme Corp');
    });
  });

  describe('failedResult', () => {
    it('should create failed action result', () => {
      const error = fieldError('test', 'Test error');
      const result = failedResult(error, 'Test failed');

      expect(result.success).toBe(false);
      expect(result.changes).toEqual([]);
      expect(result.error).toBe(error);
    });
  });
});

// ============ INPUT VALIDATION TESTS ============

describe('Input Validation', () => {
  describe('createOrganizationSchema', () => {
    it('should validate valid input', () => {
      const input = { orgName: 'Acme Corp', website: 'https://acme.com' };
      const result = createOrganizationSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject short org name', () => {
      const input = { orgName: 'A' };
      const result = createOrganizationSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid website URL', () => {
      const input = { orgName: 'Acme Corp', website: 'not-a-url' };
      const result = createOrganizationSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should allow empty website', () => {
      const input = { orgName: 'Acme Corp', website: '' };
      const result = createOrganizationSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid input', () => {
      const input = { email: 'user@example.com', orgId: 'org_123' };
      const result = createUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = { email: 'not-an-email', orgId: 'org_123' };
      const result = createUserSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing orgId', () => {
      const input = { email: 'user@example.com' };
      const result = createUserSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('updateStageSchema', () => {
    it('should validate valid stage input', () => {
      const input = { orgId: 'org_123', lifecycleStage: 'customer' };
      const result = updateStageSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ============ INPUT MAPPER TESTS ============

describe('Input Mappers', () => {
  describe('mapToCreateOrgInput', () => {
    it('should map fields to input', () => {
      const fields = {
        website: 'https://acme.com',
        team_size: 50,
        contract_value: 10000,
      };
      const result = mapToCreateOrgInput(fields, 'Acme Corp');

      expect(result.orgName).toBe('Acme Corp');
      expect(result.website).toBe('https://acme.com');
      expect(result.teamSize).toBe(50);
      expect(result.contractValue).toBe(10000);
    });
  });

  describe('mapToCreateUserInput', () => {
    it('should map fields to input', () => {
      const fields = {
        email: 'user@example.com',
        role: 'Developer',
      };
      const result = mapToCreateUserInput(fields, 'org_123', 'John Doe');

      expect(result.email).toBe('user@example.com');
      expect(result.orgId).toBe('org_123');
      expect(result.name).toBe('John Doe');
      expect(result.designation).toBe('Developer');
    });
  });
});

// ============ ACTION REGISTRY TESTS ============

describe('Action Registry', () => {
  it('should have all 13 actions migrated', () => {
    const migrated = getMigratedActions();
    expect(migrated.length).toBe(13);
  });

  it('should recognize migrated actions', () => {
    expect(isActionMigrated('CREATE_ORG')).toBe(true);
    expect(isActionMigrated('CREATE_USER')).toBe(true);
    expect(isActionMigrated('LOG_ACTIVITY')).toBe(true);
    expect(isActionMigrated('UPDATE_STAGE')).toBe(true);
    expect(isActionMigrated('UPDATE_DEAL')).toBe(true);
    expect(isActionMigrated('ADD_NOTE')).toBe(true);
  });

  it('should include all expected actions', () => {
    const migrated = getMigratedActions();
    const expectedActions = [
      'CREATE_ORG',
      'CREATE_USER',
      'CREATE_TICKET',
      'CREATE_FEATURE_REQUEST',
      'CREATE_ROADMAP_ITEM',
      'CREATE_TIMELINE_EVENT',
      'LOG_ACTIVITY',
      'UPDATE_STAGE',
      'UPDATE_DEAL',
      'UPDATE_ORG',
      'UPDATE_USER',
      'ADD_NOTE',
      'ASSIGN_ACCOUNT_MANAGER',
    ];

    for (const action of expectedActions) {
      expect(migrated).toContain(action);
    }
  });
});

// ============ CONSTANTS TESTS ============

describe('Action Constants', () => {
  it('should have valid lifecycle stages', () => {
    expect(LIFECYCLE_STAGES).toContain('prospect');
    expect(LIFECYCLE_STAGES).toContain('customer');
    expect(LIFECYCLE_STAGES).toContain('lost');
  });

  it('should have valid trial statuses', () => {
    expect(TRIAL_STATUSES).toContain('requested');
    expect(TRIAL_STATUSES).toContain('active');
    expect(TRIAL_STATUSES).toContain('completed');
  });
});
