-- ============================================================
-- Migration 001: Fix trip_shortlist for worldwide AI destinations
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

-- 1. Make destination_id nullable so worldwide destinations (not in our DB)
--    can be stored with destination_id = null.
ALTER TABLE trip_shortlist
  ALTER COLUMN destination_id DROP NOT NULL;

-- 2. The old unique constraint (trip_id, destination_id) doesn't work well
--    once destination_id can be null (multiple null rows are allowed by PG,
--    but we want to avoid duplicate non-null pairs). Replace it.
ALTER TABLE trip_shortlist
  DROP CONSTRAINT IF EXISTS trip_shortlist_trip_id_destination_id_key;

-- Partial unique index: only enforce uniqueness when destination_id is not null.
CREATE UNIQUE INDEX IF NOT EXISTS trip_shortlist_trip_dest_unique
  ON trip_shortlist (trip_id, destination_id)
  WHERE destination_id IS NOT NULL;

-- 3. Add INSERT policy so organizers can save AI results.
--    (The API route now uses the service-role key which bypasses RLS,
--     but this policy also covers any future client-side use.)
CREATE POLICY "Organizers can insert shortlist"
  ON trip_shortlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_shortlist.trip_id AND organizer_id = auth.uid()
    )
  );

-- 4. Add DELETE policy so organizers can clear and regenerate results.
CREATE POLICY "Organizers can delete shortlist"
  ON trip_shortlist FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_shortlist.trip_id AND organizer_id = auth.uid()
    )
  );
