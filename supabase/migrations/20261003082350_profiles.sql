-- The registered person behind a pouch: one row per Supabase user, so every
-- source, transaction, rule, goal and setting they own (by user_id) is theirs.
-- The phone is not verified yet, so it is not unique: a typed number must not
-- lock its real owner out. Make it unique once registration checks a code.
create table profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  phone text not null check (phone ~ '^\+9779[678][0-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "owner" on profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The app kept the registered user in settings.prefs until this table existed.
insert into profiles (user_id, name, phone, created_at)
select user_id, prefs->'user'->>'name', prefs->'user'->>'phone', coalesce((prefs->'user'->>'createdAt')::timestamptz, now())
from settings
where jsonb_typeof(prefs->'user') = 'object'
  and char_length(btrim(prefs->'user'->>'name')) between 2 and 40
  and prefs->'user'->>'phone' ~ '^\+9779[678][0-9]{8}$';
update settings set prefs = prefs - 'user' where prefs ? 'user';
