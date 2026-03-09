/*
  # Add indexes on restaurant_id for all parent submission tables

  ## Summary
  All three parent data tables (parent_submissions, parent_confirmations,
  parent_detailed_submissions) are queried by restaurant_id on every page load.
  Without indexes, these queries do a full sequential scan which becomes slow
  as submission volume grows.

  ## Changes
  - Adds a B-tree index on restaurant_id for parent_submissions
  - Adds a B-tree index on restaurant_id for parent_confirmations
  - Adds a B-tree index on restaurant_id for parent_detailed_submissions

  All indexes use IF NOT EXISTS to be safe to re-run.
*/

CREATE INDEX IF NOT EXISTS idx_parent_submissions_restaurant_id
  ON parent_submissions (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_parent_confirmations_restaurant_id
  ON parent_confirmations (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_parent_detailed_submissions_restaurant_id
  ON parent_detailed_submissions (restaurant_id);
