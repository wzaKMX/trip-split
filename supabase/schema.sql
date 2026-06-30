-- TripSplit — схема Supabase
-- Выполнить в Supabase SQL Editor.

-- ── Таблицы ────────────────────────────────────────────────
create table if not exists trips (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  base_currency text not null default 'RUB',
  created_at    timestamptz not null default now()
);

create table if not exists members (
  id       uuid primary key default gen_random_uuid(),
  trip_id  uuid not null references trips(id) on delete cascade,
  name     text not null
);

create table if not exists receipts (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips(id) on delete cascade,
  path       text not null,
  extracted  jsonb,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips(id) on delete cascade,
  description   text not null,
  amount        numeric not null,
  currency      text not null,
  paid_by       uuid not null,
  split_between jsonb not null default '[]'::jsonb,
  split_mode    text not null default 'equal',
  date          int8 not null,
  receipt_id    uuid references receipts(id) on delete set null,
  source        text not null default 'manual',
  created_at    timestamptz not null default now()
);

create index if not exists idx_members_trip   on members(trip_id);
create index if not exists idx_expenses_trip   on expenses(trip_id);
create index if not exists idx_receipts_trip   on receipts(trip_id);

-- ── Realtime: публиковать изменения ───────────────────────
alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table expenses;

-- ── RLS ───────────────────────────────────────────────────
-- Доступ по неугадываемому UUID поездки в ссылке.
-- Политики разрешают anon-роли полный CRUD (без аккаунтов).
alter table trips    enable row level security;
alter table members  enable row level security;
alter table expenses enable row level security;
alter table receipts enable row level security;

create policy "anon all trips"    on trips    for all to anon using (true) with check (true);
create policy "anon all members"  on members  for all to anon using (true) with check (true);
create policy "anon all expenses" on expenses for all to anon using (true) with check (true);
create policy "anon all receipts" on receipts for all to anon using (true) with check (true);

-- ── Storage: bucket `receipts` создать в UI (Public), затем политики ниже ──
create policy "anon read receipts"   on storage.objects for select to anon using (bucket_id = 'receipts');
create policy "anon upload receipts" on storage.objects for insert to anon with check (bucket_id = 'receipts');
create policy "anon delete receipts" on storage.objects for delete to anon using (bucket_id = 'receipts');
