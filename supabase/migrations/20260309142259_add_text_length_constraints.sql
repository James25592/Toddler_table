/*
  # Add length constraints on free-text fields

  ## Summary
  All three parent data tables accept free-text comments / notes from users.
  These fields are currently unconstrained at the database level, meaning
  a malicious or buggy client could insert arbitrarily large text values.
  This migration adds CHECK constraints capping these fields at 500 characters,
  matching the application-level truncation already enforced in the API routes.

  ## Changes

  ### parent_submissions
  - `notes` column: max 500 characters

  ### parent_confirmations
  - `comment` column: max 500 characters

  ### parent_detailed_submissions
  - `comment` column: max 500 characters (already has CHECK on ratings, now adds text cap)

  ## Notes
  1. Uses `char_length()` (not `length()`) to count Unicode characters correctly.
  2. Constraints are added with IF NOT EXISTS equivalents via DO blocks to be idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'parent_submissions' AND constraint_name = 'parent_submissions_notes_length'
  ) THEN
    ALTER TABLE parent_submissions
      ADD CONSTRAINT parent_submissions_notes_length
      CHECK (notes IS NULL OR char_length(notes) <= 500);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'parent_confirmations' AND constraint_name = 'parent_confirmations_comment_length'
  ) THEN
    ALTER TABLE parent_confirmations
      ADD CONSTRAINT parent_confirmations_comment_length
      CHECK (comment IS NULL OR char_length(comment) <= 500);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'parent_detailed_submissions' AND constraint_name = 'parent_detailed_submissions_comment_length'
  ) THEN
    ALTER TABLE parent_detailed_submissions
      ADD CONSTRAINT parent_detailed_submissions_comment_length
      CHECK (comment IS NULL OR char_length(comment) <= 500);
  END IF;
END $$;
