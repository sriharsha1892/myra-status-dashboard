-- ============================================================
-- Quote register: structured pricing options, option value range,
-- lifecycle statuses.
--
-- Background: quotes.total_value was the SUM of every pricing option on a
-- quote (a client only ever picks one), and multi-option groups were never
-- persisted. This migration adds the real shape and backfills from the
-- flat line_items that were saved so far.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New columns
-- ------------------------------------------------------------
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS pricing_options JSONB,
  ADD COLUMN IF NOT EXISTS option_count INT,
  ADD COLUMN IF NOT EXISTS value_min NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS value_max NUMERIC(15, 2);

COMMENT ON COLUMN quotes.pricing_options IS
  'Structured option groups as quoted: [{label, pricingModel, rows:[{term, users|namedUsers|projectsIncluded, consultingHours, listPrice, offerPrice, ...}], scopeDefinition?}]';
COMMENT ON COLUMN quotes.option_count IS 'Total selectable options (rows across all groups).';
COMMENT ON COLUMN quotes.value_min IS 'Cheapest option offered on this quote.';
COMMENT ON COLUMN quotes.value_max IS 'Most expensive option offered on this quote. Also written to total_value.';
COMMENT ON COLUMN quotes.total_value IS 'DEPRECATED for aggregation: equals value_max going forward. Historically the sum of all options.';

-- ------------------------------------------------------------
-- 2. Status lifecycle: draft | sent | accepted | declined
--    downloaded -> draft (download is an event, not a stage)
--    signed     -> accepted
-- ------------------------------------------------------------
UPDATE quotes SET status = 'draft'    WHERE status IS NULL OR status = 'downloaded';
UPDATE quotes SET status = 'accepted' WHERE status = 'signed';

ALTER TABLE quotes ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE quotes ALTER COLUMN status SET NOT NULL;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'declined'));

-- ------------------------------------------------------------
-- 3. Backfill pricing_options / option_count / value_min / value_max
--    from flat line_items: [{term, users, consultingHours, investment:"45,000"}]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION quote_money_to_numeric(p_value TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_value IS NULL THEN NULL
    WHEN regexp_replace(p_value, '[^0-9.]', '', 'g') = '' THEN NULL
    ELSE regexp_replace(p_value, '[^0-9.]', '', 'g')::NUMERIC
  END;
$$;

DO $$
DECLARE
  r RECORD;
  v_rows JSONB;
  v_min NUMERIC;
  v_max NUMERIC;
  v_count INT;
BEGIN
  FOR r IN
    SELECT id, line_items
    FROM quotes
    WHERE pricing_options IS NULL
  LOOP
    IF r.line_items IS NULL OR jsonb_typeof(r.line_items) <> 'array' THEN
      CONTINUE;
    END IF;

    -- Legacy rows -> per-seat option rows (offerPrice <- investment)
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'term',            COALESCE(item->>'term', ''),
        'users',           COALESCE(item->>'users', ''),
        'consultingHours', COALESCE(item->>'consultingHours', ''),
        'listPrice',       '',
        'offerPrice',      COALESCE(item->>'investment', '')
      )
    ), '[]'::jsonb)
    INTO v_rows
    FROM jsonb_array_elements(r.line_items) AS item;

    SELECT
      MIN(quote_money_to_numeric(item->>'investment')),
      MAX(quote_money_to_numeric(item->>'investment')),
      COUNT(*)
    INTO v_min, v_max, v_count
    FROM jsonb_array_elements(r.line_items) AS item;

    UPDATE quotes
    SET
      pricing_options = jsonb_build_array(
        jsonb_build_object(
          'label',        'Option A: User-Based',
          'pricingModel', 'per-seat',
          'rows',         v_rows
        )
      ),
      option_count = v_count,
      value_min    = v_min,
      value_max    = v_max,
      total_value  = COALESCE(v_max, total_value)
    WHERE id = r.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. quotes_unique is a `SELECT *` view; its column list was frozen at
--    creation. Recreate so the new columns are exposed.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS quotes_unique;
CREATE VIEW quotes_unique AS
SELECT DISTINCT ON (contact_email, company_name) *
FROM quotes
ORDER BY contact_email, company_name, version DESC, created_at DESC;

-- ------------------------------------------------------------
-- 5. Indexes for the register's filters
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_quotes_status      ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);
