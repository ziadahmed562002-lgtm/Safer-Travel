-- ============================================================
-- Migration 004: trip_hotels table
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================

create table if not exists trip_hotels (
  id                  uuid primary key default uuid_generate_v4(),
  trip_id             uuid not null references trips(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,
  hotelbeds_rate_key  text,                          -- null OK in test mode
  hotel_data          jsonb not null default '{}',
  status              text not null default 'selected'
                        check (status in ('selected', 'booked')),
  created_at          timestamptz not null default now()
);

create index if not exists trip_hotels_trip_id_idx on trip_hotels(trip_id);
create index if not exists trip_hotels_user_id_idx on trip_hotels(user_id);

alter table trip_hotels enable row level security;

create policy "Trip members can view hotel selections"
  on trip_hotels for select
  using (
    exists (select 1 from trip_members where trip_id = trip_hotels.trip_id and user_id = auth.uid())
    or exists (select 1 from trips where id = trip_hotels.trip_id and organizer_id = auth.uid())
  );

create policy "Trip members can select hotels"
  on trip_hotels for insert
  with check (
    auth.uid() = user_id
    and (
      exists (select 1 from trip_members where trip_id = trip_hotels.trip_id and user_id = auth.uid())
      or exists (select 1 from trips where id = trip_hotels.trip_id and organizer_id = auth.uid())
    )
  );

create policy "Users can update their own hotel selection"
  on trip_hotels for update
  using (auth.uid() = user_id);

create policy "Users can delete their own hotel selection"
  on trip_hotels for delete
  using (auth.uid() = user_id);
