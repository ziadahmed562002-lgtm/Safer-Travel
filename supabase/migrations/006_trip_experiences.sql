-- ============================================================
-- Migration 006: trip_experiences table
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

create table if not exists trip_experiences (
  id           uuid primary key default uuid_generate_v4(),
  trip_id      uuid not null references trips(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  title        text not null,
  description  text,
  why_matches  text,
  est_cost     text,
  duration     text,
  created_at   timestamptz not null default now()
);

create index if not exists trip_experiences_trip_id_idx on trip_experiences(trip_id);
create index if not exists trip_experiences_user_id_idx on trip_experiences(user_id);

alter table trip_experiences enable row level security;

create policy "Trip members can view saved experiences"
  on trip_experiences for select
  using (
    exists (select 1 from trip_members where trip_id = trip_experiences.trip_id and user_id = auth.uid())
    or exists (select 1 from trips where id = trip_experiences.trip_id and organizer_id = auth.uid())
  );

create policy "Trip members can save experiences"
  on trip_experiences for insert
  with check (
    auth.uid() = user_id
    and (
      exists (select 1 from trip_members where trip_id = trip_experiences.trip_id and user_id = auth.uid())
      or exists (select 1 from trips where id = trip_experiences.trip_id and organizer_id = auth.uid())
    )
  );

create policy "Users can delete their own saved experiences"
  on trip_experiences for delete
  using (auth.uid() = user_id);
