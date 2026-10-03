-- The opening balance is what the account held when it was typed, so only
-- transactions after that moment move it. Older SMS read at setup are history.
alter table sources add column opening_at timestamptz not null default now();
update sources set opening_at = created_at;
