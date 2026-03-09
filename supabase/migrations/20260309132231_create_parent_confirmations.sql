/*
  # Create parent_confirmations table

  ## Summary
  New table to store simple checkbox-style confirmations from parents who have visited a restaurant with a toddler.

  ## New Tables

  ### parent_confirmations
  - `id` (uuid, primary key) — unique row identifier
  - `restaurant_id` (text, not null) — links to the restaurant (matches the string ID in app data)
  - `confirmed_features` (text[], not null) — array of confirmed feature keys, e.g. ["high_chairs", "pram_space"]
  - `comment` (text, nullable) — optional free-text from the parent
  - `created_at` (timestamptz) — when the submission was made

  ## Valid feature keys (enforced at application layer)
  high_chairs, pram_space, changing_table, kids_menu, friendly_staff, easy_seating, toddler_tolerant

  ## Security
  - RLS enabled — anonymous users can INSERT and SELECT
  - INSERT policy: anyone can insert (public contribution form, no auth required)
  - SELECT policy: anyone can read (aggregations shown publicly)
  - No UPDATE / DELETE policies — submissions are immutable once made
*/

CREATE TABLE IF NOT EXISTS parent_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  confirmed_features text[] NOT NULL DEFAULT '{}',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_confirmations_restaurant_id_idx
  ON parent_confirmations (restaurant_id);

ALTER TABLE parent_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a parent confirmation"
  ON parent_confirmations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read parent confirmations"
  ON parent_confirmations
  FOR SELECT
  TO anon, authenticated
  USING (true);
