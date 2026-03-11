/*
  # Add signal_breakdown column to restaurants

  1. Changes
    - Adds `signal_breakdown` (jsonb) column to the `restaurants` table
      - Stores structured breakdown of scoring signals:
        venue_profile signals, AI review signals, and parent confirmations
*/

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS signal_breakdown jsonb;
