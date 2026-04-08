-- ============================================================
-- Migration 009: Add Viator fields to trip_experiences
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

alter table trip_experiences
  add column if not exists product_code text,
  add column if not exists web_url      text,
  add column if not exists photo_url    text;
