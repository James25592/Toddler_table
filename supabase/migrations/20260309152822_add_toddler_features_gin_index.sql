/*
  # Add GIN index on restaurants.toddler_features

  ## Summary
  Adds a GIN (Generalized Inverted Index) on the toddler_features JSONB column of the restaurants table.
  This enables fast containment queries (e.g. toddler_features @> '{"high_chairs": true}') used by the filter system.

  ## Changes
  - New GIN index: restaurants_toddler_features_gin_idx on restaurants(toddler_features)
*/

CREATE INDEX IF NOT EXISTS restaurants_toddler_features_gin_idx
  ON restaurants USING GIN (toddler_features);
