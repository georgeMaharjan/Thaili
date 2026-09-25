-- FCM registration tokens, one row per installed device. send-push reads them.
create table device_tokens (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table device_tokens enable row level security;
create policy "owner" on device_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
