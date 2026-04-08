-- ============================================================
-- Migration 002: Add selected_destination to trips
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

-- Store the AI-selected destination inline so the plan page can read it
-- without joining to destinations (since worldwide picks have no DB row).
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS selected_destination jsonb;
