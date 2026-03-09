/*
  # Add cached_reviews column to restaurants

  ## Purpose
  Store raw Google review text in the database so that re-analysis can happen
  without making a new Google Places API call. This enforces the rule that
  Google API is only called when last_review_fetch is older than 7 days.

  ## Changes
  - `restaurants`
    - Add `cached_reviews` (jsonb) — stores array of raw review strings fetched
      from Google Places. Empty array means no reviews cached yet.

  ## Notes
  - Existing rows default to an empty array (no cached reviews).
  - The ingest function will populate this on first fetch and on each refresh.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'cached_reviews'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN cached_reviews jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;
