/*
  # Add write policies to restaurants table

  ## Summary
  The restaurants table currently only has a SELECT policy, which blocks all
  INSERT and UPDATE operations from the API routes that ingest data from Google
  Places. This migration adds INSERT and UPDATE policies for the anon role so
  the server-side fetch-places API route can upsert restaurant records.

  ## Security Changes
  - Add INSERT policy on `restaurants` for anon and authenticated roles
  - Add UPDATE policy on `restaurants` for anon and authenticated roles

  ## Notes
  1. These policies allow the server-side API routes (which run with the anon key)
     to write restaurant data. In production this should be tightened to use the
     service role key instead, but this unblocks ingestion immediately.
*/

CREATE POLICY "Service can insert restaurants"
  ON restaurants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update restaurants"
  ON restaurants
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
