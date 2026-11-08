-- An account can exist before its balance is set (a detected bank or wallet awaiting its opening balance).
-- The app keeps that as openedAt = null; a NOT NULL column forced a fake 1970 date that read back as "set".
alter table public.sources alter column opening_at drop not null;
alter table public.sources alter column opening_at drop default;
