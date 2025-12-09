/**
 * Shared Action Utilities
 * Re-exports all shared utilities for action modules
 */

// Types
export type {
  ActionResult,
  ActionError,
  ActionErrorCode,
  ActionContext,
  Action,
  InputMapper,
  DatabaseChange,
  CreateOrgOutput,
  CreateUserOutput,
  CreateTicketOutput,
  CreateFeatureRequestOutput,
  CreateRoadmapItemOutput,
  CreateTimelineEventOutput,
  UpdateStageOutput,
  UpdateDealOutput,
  AddNoteOutput,
  LogActivityOutput,
  // Sales Intelligence outputs
  ScheduleFollowupOutput,
  UpdateStakeholderOutput,
  LogCompetitorOutput,
  TrackFeatureInterestOutput,
  UpdateMomentumOutput,
  // Prospect lifecycle outputs
  CreateProspectOrgOutput,
  AddProspectContactOutput,
  LogOutreachOutput,
  LogResponseOutput,
  LogScreeningOutput,
  UpdateProspectStageOutput,
  DisqualifyProspectOutput,
  ConvertToTrialOutput,
  // Deal outcome outputs
  UpdateDealStageOutput,
  CloseDealWonOutput,
  CloseDealLostOutput,
  DeferDealOutput,
} from './types';

// Error utilities
export {
  transformDbError,
  validationError,
  fieldError,
  notFoundError,
  permissionError,
  invalidStateError,
  undoExpiredError,
  alreadyUndoneError,
  rateLimitedError,
  failedResult,
} from './errors';

// Database helpers
export {
  TABLES,
  ID_COLUMNS,
  getIdColumn,
  fetchById,
  fetchMany,
  exists,
  insertOne,
  insertMany,
  updateById,
  updateMany,
  deleteById,
  executeSequential,
} from './db';
export type {
  TableName,
  QueryResult,
  QueryManyResult,
  InsertResult,
} from './db';

// Timeline utilities
export {
  createTimelineEvent,
  orgCreatedEvent,
  stageChangedEvent,
  userAddedEvent,
  dealUpdatedEvent,
  ticketCreatedEvent,
  featureRequestCreatedEvent,
  noteAddedEvent,
  activityLoggedEvent,
} from './timeline';
export type {
  EventCategory,
  ActionEventType,
  Sentiment,
  Severity,
  TimelineEventInput,
  TimelineEventOutput,
} from './timeline';

// Transaction and undo support
export {
  generateUndoId,
  storeUndoInfo,
  executeUndo,
  trackInsert,
  trackUpdate,
  trackDelete,
  withUndoInfo,
  executeWithTracking,
} from './transaction';
export type {
  StoreUndoInput,
  StoreUndoResult,
  ExecuteUndoInput,
  ExecuteUndoResult,
} from './transaction';

// Date utilities
export { parseRelativeDate, formatDateOnly, isFutureDate } from './dates';
