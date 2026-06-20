-- 035: Care system — QR-based walker connection for pet parents
-- Pet parents register dogs, generate a QR code, walker scans to link.
-- All walk logs then flow to the parent's dashboard.

create table if not exists dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  name text not null,
  breed text,
  dob date,
  photo_url text,
  health_notes text,
  created_at timestamptz default now()
);

create table if not exists walker_connections (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  dog_id uuid references dogs not null,
  owner_id uuid references auth.users not null,
  walker_name text,
  walker_phone text,
  walker_role text default 'walker', -- 'watchman' | 'maid' | 'hired' | 'walker'
  status text default 'pending',     -- 'pending' | 'active' | 'revoked'
  qr_generated_at timestamptz default now(),
  claimed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists walk_logs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references walker_connections not null,
  dog_id uuid references dogs not null,
  owner_id uuid references auth.users not null,
  walker_name text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_mins int,
  distance_km numeric(4,2),
  gps_route jsonb,
  poop_count int default 0,
  pee_count int default 0,
  mood text, -- 'great' | 'good' | 'okay' | 'tired' | 'anxious'
  photo_url text,
  notes text,
  report_sent_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table dogs enable row level security;
alter table walker_connections enable row level security;
alter table walk_logs enable row level security;

-- Owners can manage their own dogs
create policy "dogs_owner_all" on dogs
  for all using (auth.uid() = owner_id);

-- Owners can see their own connections
create policy "connections_owner_select" on walker_connections
  for select using (auth.uid() = owner_id);

-- Owners can see their own walk logs
create policy "walk_logs_owner_select" on walk_logs
  for select using (auth.uid() = owner_id);
