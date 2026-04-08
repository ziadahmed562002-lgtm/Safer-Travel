-- ============================================================
-- Migration 007: Add booking_needs to trips
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

alter table trips
  add column if not exists booking_needs jsonb;

comment on column trips.booking_needs is
  'Which booking modules the organizer needs. Shape: { flights: boolean, accommodation: boolean, experiences: boolean }';
