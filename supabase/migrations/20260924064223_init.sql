-- Thaili schema. Spec: ../thaili-spec.md §35.
-- Every row is owned by auth.uid(); users start anonymous (§22) and link an
-- identity later, so user_id never changes.

create type source_type as enum ('bank', 'wallet', 'cash', 'sahakari', 'fd', 'sip', 'custom');
create type txn_direction as enum ('debit', 'credit', 'transfer');
create type txn_channel as enum ('sms', 'notification', 'csv', 'manual');
create type goal_kind as enum ('monthly_savings', 'purchase');
create type income_kind as enum ('salary', 'refund', 'transfer', 'interest', 'other');

-- Built-in directory of Nepali banks and wallets (§5). Read-only to users.
create table institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type source_type not null check (type in ('bank', 'wallet')),
  sms_sender_ids text[] not null default '{}',
  app_package text,
  parser_template jsonb
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  type source_type not null,
  institution_id uuid references institutions,
  masked_number text,
  opening_balance numeric(14, 2) not null default 0,
  opening_balance_locked boolean not null default false,
  last_reconciled_at timestamptz,
  maturity_date date,
  recurring_amount numeric(14, 2),
  recurring_day smallint check (recurring_day between 1 and 32),
  created_at timestamptz not null default now(),
  unique (id, user_id) -- target for composite FKs: no cross-user references
);

-- Flat, per-user (§17). Starter list lives in app code; picked ones are inserted here.
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  icon text,
  monthly_limit numeric(14, 2) check (monthly_limit > 0),
  is_custom boolean not null default false,
  unique (user_id, name),
  unique (id, user_id)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0), -- NPR (§7)
  direction txn_direction not null,
  transfer_peer_source_id uuid,
  occurred_at_ad timestamptz not null default now(),
  occurred_at_bs text not null, -- 'YYYY-MM-DD' Bikram Sambat; periods run on BS (§6)
  merchant_raw text,
  category_id uuid,
  remarks text,
  remarks_source text check (remarks_source in ('sms', 'user')),
  original_currency text,
  original_amount numeric(14, 2),
  receipt_url text,
  channel txn_channel not null,
  edited_fields text[] not null default '{}', -- user-edited; never overwritten (§19)
  raw_message text,
  archived_at timestamptz, -- soft delete, purged after 30 days (§19)
  -- §18: missing category or remarks.
  needs_review boolean generated always as (category_id is null or coalesce(remarks, '') = '') stored,
  created_at timestamptz not null default now(),
  check ((direction = 'transfer') = (transfer_peer_source_id is not null)),
  foreign key (source_id, user_id) references sources (id, user_id) on delete cascade,
  foreign key (transfer_peer_source_id, user_id) references sources (id, user_id),
  foreign key (category_id, user_id) references categories (id, user_id) on delete set null (category_id)
);
create index on transactions (user_id, occurred_at_ad desc) where archived_at is null;
create index on transactions (source_id);

create table merchant_map (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  merchant_raw text not null,
  category_id uuid not null,
  primary key (user_id, merchant_raw),
  foreign key (category_id, user_id) references categories (id, user_id) on delete cascade
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind goal_kind not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date_bs text,
  saved_amount numeric(14, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'reached', 'abandoned')),
  created_at timestamptz not null default now()
);

create table income_sources (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  sender_raw text not null,
  kind income_kind not null,
  primary key (user_id, sender_raw)
);

-- Weekly balance-check corrections (§10). Signed amount.
create table adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_id uuid not null,
  amount numeric(14, 2) not null,
  occurred_at_bs text not null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (source_id, user_id) references sources (id, user_id) on delete cascade
);

-- §10: balance = opening ± transactions ± adjustments. Computed, never stored.
-- A transfer debits source_id and credits transfer_peer_source_id.
create view source_balances with (security_invoker = true) as
select s.id as source_id,
       s.opening_balance
       + coalesce((select sum(case when t.direction = 'credit' then t.amount else -t.amount end)
                   from transactions t where t.source_id = s.id and t.archived_at is null), 0)
       + coalesce((select sum(t.amount) from transactions t
                   where t.transfer_peer_source_id = s.id and t.archived_at is null), 0)
       + coalesce((select sum(a.amount) from adjustments a where a.source_id = s.id), 0)
       as balance
from sources s;

-- RLS: owner-only on every user table; institutions readable by any signed-in user.
alter table institutions enable row level security;
create policy "read directory" on institutions for select to authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array['sources', 'categories', 'transactions', 'merchant_map',
                           'goals', 'income_sources', 'adjustments'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner" on %I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
