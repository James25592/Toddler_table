/*
  # Add manual_amenities column to restaurants

  ## Summary
  Adds a `manual_amenities` JSONB column to the restaurants table, used by admins
  to override or supplement the AI-inferred amenity data with 100% trusted data.

  ## New Columns
  - `manual_amenities` (jsonb, nullable) — Admin-specified amenity overrides.
    Structure mirrors the toddler feature keys:
    {
      high_chairs: true | false | null,
      kids_menu: true | false | null,
      pram_space: true | false | null,
      changing_table: true | false | null,
      outdoor_seating: true | false | null,
      play_area: true | false | null,
      noise_tolerant: true | false | null,
      staff_child_friendly: true | false | null,
      notes: string | null
    }
    Null values mean "not set by admin". true/false are definitive.

  ## Notes
  - No RLS changes needed; existing write policies on the restaurants table apply.
  - Default is NULL (no manual override).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'manual_amenities'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN manual_amenities jsonb DEFAULT NULL;
  END IF;
END $$;
