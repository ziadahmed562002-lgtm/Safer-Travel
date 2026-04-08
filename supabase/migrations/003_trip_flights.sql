-- ============================================================
-- Migration 003: trip_flights table
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

create table if not exists trip_flights (
  id              uuid primary key default uuid_generate_v4(),
  trip_id         uuid not null references trips(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  duffel_offer_id text not null,
  offer_data      jsonb not null default '{}',
  status          text not null default 'selected'
                    check (status in ('selected', 'booked')),
  created_at      timestamptz not null default now()
);

create index if not exists trip_flights_trip_id_idx on trip_flights(trip_id);
create index if not exists trip_flights_user_id_idx on trip_flights(user_id);

alter table trip_flights enable row level security;

-- Trip members can view all flight selections for their trip
create policy "Trip members can view flight selections"
  on trip_flights for select
  using (
    exists (select 1 from trip_members where trip_id = trip_flights.trip_id and user_id = auth.uid())
    or exists (select 1 from trips where id = trip_flights.trip_id and organizer_id = auth.uid())
  );

-- Trip members can insert their own selection
create policy "Trip members can select flights"
  on trip_flights for insert
  with check (
    auth.uid() = user_id
    and (
      exists (select 1 from trip_members where trip_id = trip_flights.trip_id and user_id = auth.uid())
      or exists (select 1 from trips where id = trip_flights.trip_id and organizer_id = auth.uid())
    )
  );

-- Users can update their own selection (e.g. status: selected → booked)
create policy "Users can update their own flight selection"
  on trip_flights for update
  using (auth.uid() = user_id);

-- Users can remove and reselect
create policy "Users can delete their own flight selection"
  on trip_flights for delete
  using (auth.uid() = user_id);
