-- 040: Live walk tracking — real-time GPS sessions

create table if not exists walk_sessions (
  id                    uuid primary key default gen_random_uuid(),
  walker_connection_id  uuid references walker_connections(id) on delete cascade,
  dog_id                uuid references dogs(id) on delete cascade,
  walker_name           text not null,
  walker_phone          text not null,
  parent_user_id        uuid references profiles(id) on delete cascade,
  status                text not null default 'active' check (status in ('active', 'ended')),
  started_at            timestamptz not null default now(),
  ended_at              timestamptz,
  distance_meters       int default 0,
  duration_seconds      int default 0,
  route                 jsonb,
  created_at            timestamptz not null default now()
);

create table if not exists walk_locations (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references walk_sessions(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  accuracy     float,
  recorded_at  timestamptz not null default now()
);

alter table walk_sessions enable row level security;
alter table walk_locations enable row level security;

create policy "walk_sessions_select_all" on walk_sessions
  for select using (true);

create policy "walk_sessions_insert_auth" on walk_sessions
  for insert with check (auth.uid() is not null);

create policy "walk_sessions_update_auth" on walk_sessions
  for update using (auth.uid() is not null);

create policy "walk_locations_select_all" on walk_locations
  for select using (true);

create policy "walk_locations_insert_auth" on walk_locations
  for insert with check (auth.uid() is not null);

alter publication supabase_realtime add table walk_locations;

create index walk_sessions_parent_user_id_idx on walk_sessions(parent_user_id);
create index walk_sessions_status_idx on walk_sessions(status);
create index walk_locations_session_id_idx on walk_locations(session_id);
create index walk_locations_recorded_at_idx on walk_locations(recorded_at);
