# Validates migration, RLS, cross-user FKs, balances on a throwaway local Postgres 17 (no Docker).
# Usage: bash supabase/test.sh supabase/migrations/*.sql
set -u
S=$(mktemp -d); B=/opt/homebrew/opt/postgresql@17/bin
rm -rf $S/pg; $B/initdb -D $S/pg -U postgres -A trust >/dev/null
$B/pg_ctl -D $S/pg -o "-p 54999 -k '' -c listen_addresses=127.0.0.1" -l $S/pg.log -w start >/dev/null || { tail $S/pg.log; exit 1; }
trap '$B/pg_ctl -D $S/pg stop >/dev/null' EXIT
P="$B/psql -h 127.0.0.1 -p 54999 -U postgres -v ON_ERROR_STOP=1 -q"
$P <<'EOF'
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
EOF
for f in "$@"; do $P -f "$f" || exit 1; done; echo MIGRATION_OK
$P <<'EOF'
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into sources (key, name, base, short, type, dot, opening, acct, role) values
  ('nic', 'NIC Asia ••4821', 'NIC Asia', 'NIC Asia', 'Bank · SMS', '#D02A2E', 1000, '4821', 'spending'),
  ('sahakari', 'Prabhu Sahakari', 'Prabhu Sahakari', 'Sahakari', 'Savings · manual', '#1E7A5E', 0, null, 'savings');
insert into transactions (id, src, to_src, merchant, amount, dir, channel) values
  ('30000000-0000-0000-0000-000000000001', 'nic', null, 'Momo', 200, 'debit', 'Manual'),
  ('30000000-0000-0000-0000-000000000002', 'nic', 'sahakari', 'To sahakari', 300, 'transfer', 'SMS');
insert into rules (id, kw, cat) values ('40000000-0000-0000-0000-000000000001', 'PATHAO', 'transport');
insert into settings (prefs) values ('{"saveTarget": 10000}');
\echo expect 2 txns, 1 rule, 1 settings row for A
select (select count(*) from transactions) txns, (select count(*) from rules) rules, (select count(*) from settings) settings;
delete from sources where key = 'sahakari';
\echo expect transfer kept with to_src null after peer account deleted
select amount, dir, to_src from transactions where id = '30000000-0000-0000-0000-000000000002';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
\echo expect 0 0 0 for B
select (select count(*) from sources) s, (select count(*) from transactions) t, (select count(*) from settings) st;
EOF
echo "--- B posts to A's account key (expect FK error):"
$P -c "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b'; insert into transactions (id, src, merchant, amount, dir, channel) values (gen_random_uuid(), 'nic', 'x', 1, 'debit', 'Manual');" 2>&1 | head -1
echo "--- B upserts over A's transaction id (expect RLS error, then A's row still 'Momo'):"
$P -c "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b'; insert into sources (key, name, base, short, type, dot) values ('nic','x','x','x','x','x'); insert into transactions (id, src, merchant, amount, dir, channel) values ('30000000-0000-0000-0000-000000000001', 'nic', 'HIJACK', 1, 'debit', 'Manual') on conflict (id) do update set merchant = excluded.merchant;" 2>&1 | grep -m1 ERROR
$P -tAc "select merchant from transactions where id = '30000000-0000-0000-0000-000000000001'"
echo "--- full account number (expect check error):"
$P -c "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a'; insert into sources (key, name, base, short, type, dot, acct) values ('k','x','x','x','x','x','0123456789');" 2>&1 | head -1
echo "--- spoof user_id (expect RLS error):"
$P -c "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b'; insert into goals (id, user_id, name, target) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'x', 1);" 2>&1 | head -1
