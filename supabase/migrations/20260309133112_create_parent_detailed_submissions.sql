/*
  # Create parent_detailed_submissions table

  ## Summary
  New table for rich parent submissions collected via the "Help other parents" form on the restaurant page.
  This is distinct from parent_confirmations (quick checkbox) — this captures more structured experience data.

  ## New Tables

  ### parent_detailed_submissions
  - `id` (uuid, primary key)
  - `restaurant_id` (text, not null) — matches string ID used throughout the app
  - `facilities` (text[], not null, default empty) — confirmed facility keys
  - `experience_tags` (text[], not null, default empty) — confirmed experience keys
  - `toddler_friendliness_rating` (smallint, nullable) — 1–5 star rating
  - `noise_tolerance_rating` (smallint, nullable) — 1–5 star rating
  - `family_space_rating` (smallint, nullable) — 1–5 star rating
  - `comment` (text, nullable) — optional free-text up to 500 chars
  - `created_at` (timestamptz) — submission timestamp

  ## Valid facility keys (enforced at application layer)
  high_chairs, pram_space, changing_table, kids_menu, outdoor_seating, play_area, baby_friendly_toilets

  ## Valid experience keys
  friendly_staff, relaxed_atmosphere, pram_near_table, toddler_tolerant

  ## Security
  - RLS enabled
  - Public INSERT (anonymous contribution, no auth required)
  - Public SELECT (used for aggregation display)
  - No UPDATE / DELETE policies — submissions are append-only
*/

CREATE TABLE IF NOT EXISTS parent_detailed_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  facilities text[] NOT NULL DEFAULT '{}',
  experience_tags text[] NOT NULL DEFAULT '{}',
  toddler_friendliness_rating smallint CHECK (toddler_friendliness_rating BETWEEN 1 AND 5),
  noise_tolerance_rating smallint CHECK (noise_tolerance_rating BETWEEN 1 AND 5),
  family_space_rating smallint CHECK (family_space_rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_detailed_submissions_restaurant_id_idx
  ON parent_detailed_submissions (restaurant_id);

ALTER TABLE parent_detailed_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a detailed submission"
  ON parent_detailed_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read detailed submissions"
  ON parent_detailed_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);
