-- Preserve SMS/app matching evidence when raw message retention is disabled.
-- Existing owner RLS also covers this column; no raw notification bodies are added.
alter table public.transactions add column capture jsonb not null default '[]'::jsonb
  check (jsonb_typeof(capture) = 'array');
comment on column public.transactions.capture is
  'Capture channel, opaque message id, account key, direction, timestamp, transaction reference and text fingerprint for reconciliation.';

-- Remember discovered package names for institutions recognized by app label.
alter table public.sources add column packages text[] not null default '{}';
comment on column public.sources.packages is
  'Discovered Android financial-app packages used for notification capture after restart.';
