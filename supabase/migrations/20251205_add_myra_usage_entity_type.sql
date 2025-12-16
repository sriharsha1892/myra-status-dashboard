-- Migration: Add myra_usage entity type to import_staging
-- Allows importing myRA AI usage data through the bulk import pipeline

-- Drop the existing check constraint and add a new one with myra_usage
ALTER TABLE import_staging
  DROP CONSTRAINT IF EXISTS import_staging_entity_type_check;

ALTER TABLE import_staging
  ADD CONSTRAINT import_staging_entity_type_check
  CHECK (entity_type IN (
    'organization',
    'status_update',
    'activity',
    'user',
    'myra_usage'
  ));
