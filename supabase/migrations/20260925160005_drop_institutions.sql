-- The institution directory was never read: banks and wallets live in app code
-- (DETECTED / SRC_KINDS in src/lib/logic.tsx, BANKS in src/lib/sms.ts).
drop table institutions;
drop type source_type;
