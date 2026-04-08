-- ============================================================
-- Migration 005: Add interests and travel_pace to user_preferences
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

alter table user_preferences
  add column if not exists interests text[] not null default '{}',
  add column if not exists travel_pace text;
