-- ============================================================
-- Safer (سفر) — Complete Database Schema
-- Run this once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbhamzwjinjfppqqfkun/sql/new
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ──────────────────────────────────────────────────────────────
-- PROFILES
-- Mirror of auth.users with display name + email cached
-- ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ──────────────────────────────────────────────────────────────
-- TRIPS
-- ──────────────────────────────────────────────────────────────
create table if not exists trips (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  organizer_id  uuid not null references profiles(id) on delete cascade,
  invite_code   text not null unique,
  start_date    date,
  end_date      date,
  status        text not null default 'planning'
                  check (status in ('planning', 'voting', 'booked', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);

create index if not exists trips_organizer_id_idx on trips(organizer_id);
create index if not exists trips_invite_code_idx  on trips(invite_code);


-- ──────────────────────────────────────────────────────────────
-- TRIP MEMBERS
-- ──────────────────────────────────────────────────────────────
create table if not exists trip_members (
  id         uuid primary key default uuid_generate_v4(),
  trip_id    uuid not null references trips(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null default 'traveler'
               check (role in ('organizer', 'traveler', 'guest')),
  joined_at  timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists trip_members_trip_id_idx  on trip_members(trip_id);
create index if not exists trip_members_user_id_idx  on trip_members(user_id);


-- ──────────────────────────────────────────────────────────────
-- USER PREFERENCES (per trip)
-- ──────────────────────────────────────────────────────────────
create table if not exists user_preferences (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references profiles(id) on delete cascade,
  trip_id            uuid references trips(id) on delete cascade,
  travel_style       text check (travel_style in ('relax', 'culture', 'adventure', 'luxury')),
  budget_min         integer,
  budget_max         integer,
  trip_length        text check (trip_length in ('weekend', 'one_week', 'two_weeks', 'three_plus')),
  flight_preference  text check (flight_preference in ('direct', 'layovers', 'flexible')),
  hotel_preference   text check (hotel_preference in ('budget', 'midrange', 'luxury', 'villa')),
  amenities          text[] not null default '{}',
  departure_city     text,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, trip_id)
);

create index if not exists user_preferences_trip_id_idx  on user_preferences(trip_id);
create index if not exists user_preferences_user_id_idx  on user_preferences(user_id);


-- ──────────────────────────────────────────────────────────────
-- DESTINATIONS
-- ──────────────────────────────────────────────────────────────
create table if not exists destinations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  country      text not null,
  description  text,
  image_url    text,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists destinations_tags_idx on destinations using gin(tags);


-- ──────────────────────────────────────────────────────────────
-- TRIP SHORTLIST (AI recommendations per trip)
-- ──────────────────────────────────────────────────────────────
create table if not exists trip_shortlist (
  id                   uuid primary key default uuid_generate_v4(),
  trip_id              uuid not null references trips(id) on delete cascade,
  destination_id       uuid not null references destinations(id) on delete cascade,
  ai_score             numeric(4,2),               -- 0.00 – 10.00
  match_explanation    text,
  personality_scores   jsonb not null default '{}', -- { relax: 8, culture: 6, ... }
  created_at           timestamptz not null default now(),
  unique (trip_id, destination_id)
);

create index if not exists trip_shortlist_trip_id_idx on trip_shortlist(trip_id);


-- ──────────────────────────────────────────────────────────────
-- BOOKINGS
-- ──────────────────────────────────────────────────────────────
create table if not exists bookings (
  id            uuid primary key default uuid_generate_v4(),
  trip_id       uuid not null references trips(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  type          text not null check (type in ('flight', 'hotel', 'experience')),
  provider_ref  text,          -- Duffel order ID, hotel booking ref, etc.
  amount        numeric(10,2),
  currency      text default 'USD',
  status        text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists bookings_trip_id_idx on bookings(trip_id);
create index if not exists bookings_user_id_idx on bookings(user_id);


-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────
alter table profiles         enable row level security;
alter table trips            enable row level security;
alter table trip_members     enable row level security;
alter table user_preferences enable row level security;
alter table destinations     enable row level security;
alter table trip_shortlist   enable row level security;
alter table bookings         enable row level security;


-- ── profiles ─────────────────────────────────────────────────
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Allow members to see fellow trip members' profiles
create policy "Trip members can view each other's profiles"
  on profiles for select
  using (
    exists (
      select 1 from trip_members tm1
      join trip_members tm2 on tm1.trip_id = tm2.trip_id
      where tm1.user_id = auth.uid()
        and tm2.user_id = profiles.id
    )
  );


-- ── trips ─────────────────────────────────────────────────────
create policy "Trip members can view their trips"
  on trips for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = trips.id and user_id = auth.uid()
    )
    or organizer_id = auth.uid()
  );

create policy "Authenticated users can create trips"
  on trips for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update their trips"
  on trips for update
  using (auth.uid() = organizer_id);

create policy "Organizers can delete their trips"
  on trips for delete
  using (auth.uid() = organizer_id);


-- ── trip_members ──────────────────────────────────────────────
create policy "Members can view members of their trips"
  on trip_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id and tm.user_id = auth.uid()
    )
  );

create policy "Users can join trips (insert own row)"
  on trip_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave trips (delete own row)"
  on trip_members for delete
  using (auth.uid() = user_id);

-- Organizers can remove members
create policy "Organizers can remove members"
  on trip_members for delete
  using (
    exists (
      select 1 from trips
      where id = trip_members.trip_id and organizer_id = auth.uid()
    )
  );


-- ── user_preferences ──────────────────────────────────────────
create policy "Users can view their own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);

-- Organizers can read all preferences for their trip
create policy "Organizers can read trip preferences"
  on user_preferences for select
  using (
    exists (
      select 1 from trips
      where id = user_preferences.trip_id and organizer_id = auth.uid()
    )
  );


-- ── destinations ──────────────────────────────────────────────
-- Public read; only service role can write (managed server-side)
create policy "Anyone authenticated can view destinations"
  on destinations for select
  using (auth.role() = 'authenticated');


-- ── trip_shortlist ────────────────────────────────────────────
create policy "Trip members can view shortlist"
  on trip_shortlist for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = trip_shortlist.trip_id and user_id = auth.uid()
    )
    or exists (
      select 1 from trips
      where id = trip_shortlist.trip_id and organizer_id = auth.uid()
    )
  );


-- ── bookings ──────────────────────────────────────────────────
create policy "Users can view their own bookings"
  on bookings for select
  using (auth.uid() = user_id);

create policy "Users can create their own bookings"
  on bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookings"
  on bookings for update
  using (auth.uid() = user_id);

-- Organizers can view all bookings for their trip
create policy "Organizers can view all trip bookings"
  on bookings for select
  using (
    exists (
      select 1 from trips
      where id = bookings.trip_id and organizer_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- SEED: A few sample destinations
-- ──────────────────────────────────────────────────────────────
insert into destinations (name, country, description, image_url, tags) values
  (
    'Bali',
    'Indonesia',
    'Lush rice terraces, ancient temples, world-class surf, and a vibrant wellness scene.',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    array['relax', 'culture', 'adventure', 'beach', 'wellness']
  ),
  (
    'Lisbon',
    'Portugal',
    'Cobblestone hills, fresh seafood, fado music, and golden-hour views over the Tagus.',
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
    array['culture', 'food', 'history', 'city', 'budget-friendly']
  ),
  (
    'Kyoto',
    'Japan',
    'Bamboo forests, geisha districts, Michelin-starred kaiseki, and a thousand-year history.',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    array['culture', 'history', 'food', 'luxury', 'temples']
  ),
  (
    'Maldives',
    'Maldives',
    'Overwater bungalows, crystal lagoons, house reefs at your doorstep, pure luxury.',
    'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
    array['luxury', 'relax', 'beach', 'diving', 'honeymoon']
  ),
  (
    'Patagonia',
    'Argentina / Chile',
    'Untamed wilderness, glaciers, guanacos, and the most dramatic peaks on earth.',
    'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800',
    array['adventure', 'hiking', 'nature', 'wildlife']
  ),
  (
    'Amalfi Coast',
    'Italy',
    'Clifftop villages, limoncello, Roman ruins, and sunsets that stop time.',
    'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800',
    array['luxury', 'culture', 'food', 'relax', 'scenic']
  ),
  (
    'Marrakech',
    'Morocco',
    'Souks, riads, Sahara dunes, and a sensory overload of colour, spice, and sound.',
    'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800',
    array['culture', 'adventure', 'food', 'history', 'budget-friendly']
  ),
  (
    'Tokyo',
    'Japan',
    'Hyper-modern neighbourhoods, centuries-old shrines, Michelin density, and perfect transit.',
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    array['culture', 'food', 'city', 'luxury', 'adventure']
  )
on conflict do nothing;
