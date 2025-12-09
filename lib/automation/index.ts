/**
 * Automation Module
 * Visual workflow automation for alerts and actions
 */

// Types
export * from './types';

// Schemas
export * from './schemas';

// Service
export { automationService, default } from './service';
export {
  getAutomationRules,
  getAutomationRuleById,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  getRuleExecutions,
  createExecution,
  updateExecution,
  canExecuteRule,
} from './service';

// Engine
export { automationEngine } from './engine';
export {
  evaluateConditions,
  evaluateCondition,
  processTemplate,
  executeAction,
  executeActions,
} from './engine';
