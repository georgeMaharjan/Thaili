-- Reshape the domain tables to the v9 design's data model (src/lib/logic.tsx).
-- Pre-launch: every table dropped here was empty. institutions and
-- device_tokens are kept.
--
-- The app keys accounts and categories by short text keys ("cash", "food"),
-- so the database does too — no uuid<->key mapping layer on the device.
-- Built-in categories live in app code; the user's own are in settings.prefs.

drop view source_balances;
drop table adjustments, income_sources, merchant_map, transactions, goals, categories, sources;
drop type goal_kind, income_kind, txn_channel;

create table sources (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  name text not null,
  base text not null,
  short text not null,
  type text not null, -- "Bank · SMS" | "Wallet · notifications" | "Manual entry" ...
  dot text not null,
  opening numeric(14, 2) not null default 0,
  -- Last four digits only — the app promises full account numbers never leave the phone.
  acct text check (acct ~ '^[0-9]{1,4}$'),
  role text not null default 'spending' check (role in ('spending', 'savings')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table transactions (
  id uuid primary key, -- made on the phone, so an entry keeps its id before it syncs
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  src text not null,
  to_src text, -- transfer destination
  merchant text not null,
  amount numeric(14, 2) not null check (amount > 0), -- NPR
  dir txn_direction not null,
  cat text,
  remarks text,
  auto_rule text, -- keyword of the rule that filed it; dropping the rule un-files it
  channel text not null,
  raw text,
  occurred_at timestamptz not null default now(),
  archived_at timestamptz, -- deleted: kept 30 days, restorable (spec §19)
  created_at timestamptz not null default now(),
  check ((dir = 'transfer') or to_src is null),
  foreign key (user_id, src) references sources (user_id, key) on delete cascade,
  foreign key (user_id, to_src) references sources (user_id, key) on delete set null (to_src)
);
create index on transactions (user_id, occurred_at desc) where archived_at is null;

-- Auto-filing: a keyword seen in merchant/remark/raw text means a category.
create table rules (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kw text not null,
  cat text not null,
  own boolean not null default false, -- false = shipped with the app
  sort int not null default 0
);

-- Order is priority: sort 0 is funded first.
create table goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target numeric(14, 2) not null check (target > 0),
  sort int not null default 0
);

-- Small per-user preferences: picked categories, custom categories, leak flags,
-- savings target and floor, theme, language, toggles.
create table settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['sources', 'transactions', 'rules', 'goals', 'settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner" on %I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
