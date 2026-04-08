-- ============================================================
-- Migration 008: Traveler profiles
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

create table if not exists traveler_profiles (
  id                      uuid primary key default uuid_generate_v4(),
  owner_id                uuid not null references profiles(id) on delete cascade,
  relationship            text not null default 'other',
  full_name               text not null,
  date_of_birth           date,
  nationality             text,
  passport_number         text,
  passport_expiry         date,
  passport_country        text,
  seat_preference         text not null default 'no_preference',
  meal_preference         text not null default 'standard',
  known_traveler_number   text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  created_at              timestamptz not null default now()
);

-- RLS
alter table traveler_profiles enable row level security;

create policy "Users can read their own traveler profiles"
  on traveler_profiles for select
  using (owner_id = auth.uid());

create policy "Users can insert their own traveler profiles"
  on traveler_profiles for insert
  with check (owner_id = auth.uid());

create policy "Users can update their own traveler profiles"
  on traveler_profiles for update
  using (owner_id = auth.uid());

create policy "Users can delete their own traveler profiles"
  on traveler_profiles for delete
  using (owner_id = auth.uid());

comment on table traveler_profiles is
  'Saved traveler details (passport, preferences) owned by a user, reusable across trips.';
