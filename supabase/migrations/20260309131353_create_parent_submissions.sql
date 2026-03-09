/*
  # Create parent_submissions table

  ## Summary
  Stores structured toddler-amenity submissions from parents for each restaurant.
  Each submission captures one or more category verdicts alongside optional free-text notes.

  ## New Tables

  ### parent_submissions
  - `id` (uuid, primary key)
  - `restaurant_id` (text) — matches the restaurant slug used in lib/data.ts
  - `high_chair` (text, nullable) — one of: 'available', 'limited', 'unknown', 'not_suitable'
  - `kids_menu` (text, nullable)
  - `pram_space` (text, nullable)
  - `changing_table` (text, nullable)
  - `noise_level` (text, nullable)
  - `staff_friendliness` (text, nullable)
  - `notes` (text, nullable) — free-text parent comment
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anyone (including unauthenticated) can INSERT (public contribution)
  - Anyone can SELECT (public read for aggregation)
  - No update/delete (append-only)

  ## Notes
  1. Status values are stored as text rather than an enum to allow future values without migrations.
  2. All category columns are nullable — a submission only needs to fill in what the parent knows.
  3. This is an anonymous, append-only contribution table. No auth required.
*/

CREATE TABLE IF NOT EXISTS parent_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  high_chair text,
  kids_menu text,
  pram_space text,
  changing_table text,
  noise_level text,
  staff_friendliness text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parent_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a parent submission"
  ON parent_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read parent submissions"
  ON parent_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS parent_submissions_restaurant_id_idx
  ON parent_submissions (restaurant_id);
