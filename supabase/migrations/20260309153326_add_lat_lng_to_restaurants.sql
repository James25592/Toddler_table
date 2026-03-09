/*
  # Add latitude and longitude to restaurants table

  ## Summary
  Adds lat/lng coordinates to each restaurant to enable distance-based sorting
  on the "Near Me" feature. Coordinates are seeded for the current Guildford-area
  restaurants using known real-world locations.

  ## Changes
  - New columns: `lat` (double precision, nullable) and `lng` (double precision, nullable)
  - Seed data: Real-world coordinates for all 8 existing Guildford-area restaurants
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'lat'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN lat double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'lng'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN lng double precision;
  END IF;
END $$;

UPDATE restaurants SET lat = 51.2354, lng = -0.5703 WHERE id = 'boston-tea-party';
UPDATE restaurants SET lat = 51.3257, lng = -0.4918 WHERE id = 'the-anchor-pub';
UPDATE restaurants SET lat = 51.2362, lng = -0.5695 WHERE id = 'the-boileroom-cafe';
UPDATE restaurants SET lat = 51.2368, lng = -0.5709 WHERE id = 'the-ivy-guildford';
UPDATE restaurants SET lat = 51.2441, lng = -0.5724 WHERE id = 'the-weyside';
UPDATE restaurants SET lat = 51.2033, lng = -0.6072 WHERE id = 'watts-gallery-cafe';
UPDATE restaurants SET lat = 51.2489, lng = -0.5631 WHERE id = 'white-house-tea-rooms';
UPDATE restaurants SET lat = 51.2355, lng = -0.5712 WHERE id = 'zizzi-guildford';
