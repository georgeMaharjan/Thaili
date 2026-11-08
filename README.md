# Thaili

Personal money tracker for Nepal: reads bank SMS and transaction notifications, spots money apps, and runs on the Bikram Sambat calendar.
The catalog covers all 20 commercial and 17 development banks in NRB’s Mid-August 2026 directory, plus its finance, microfinance, infrastructure and cooperative institutions.
Next.js static export wrapped with Capacitor (Android), durable storage on the phone. Cloud sync and recovery features are currently removed.

```bash
cp .env.local.example .env.local   # optional; the app runs locally without backend setup
npm run dev                        # browser preview (no device features)
npm run android                    # build, sync and open in Android Studio
npm run typecheck                  # application and test fixture type checking
npm test                           # domain, application, adapter and screen flow checks
bash supabase/test.sh supabase/migrations/*.sql   # migrations + RLS on a throwaway Postgres 17
```

- `src/application/` — typed application state, controller, capture/discovery/lifecycle coordinators and ledger retry coordination. `src/lib/logic.tsx` keeps the app entry point compatible.
- `src/features/` — feature view models, selectors, transaction commands and feature-specific screen contracts (MVVM). `src/domain/` holds shared models; `src/infrastructure/` holds saved-data validation and the database schema.
- `src/lib/finance.ts`, `goals.ts`, `rules.ts` — typed financial calculations and filing rules. Goal funding uses Queue/Share allocation strategies; money is allocated in integer paisa.
- `src/lib/import-transactions.ts` — shared SMS/notification import pipeline with an explicit clock and ID generator.
- `src/screens/*.tsx` — the screens, hand-written with Tailwind. Shared pieces live in `src/components/ui.tsx`;
  colour/font/radius tokens are in the `@theme` block of `src/app/globals.css`. `design/Thaili v9.dc.html` is a visual reference only.
- `src/lib/store.ts` — persistence composition and background retries. `local-ledger.ts` — durable snapshot, pending changes and merge rules; `indexed-db-storage.ts` and `cloud-store.ts` implement its storage drivers. `pouch.ts` selects durable data and applies raw-text retention. `sms.ts` — SMS parser. `bs.ts`/`calendar.ts` — BS dates and render-time calendar context. `nav.ts` — back stack.
- `android/.../ThailiPlugin.java` — native bridge: SMS, installed apps, biometrics, haptics.

See [architecture and refactor review](docs/ARCHITECTURE.md) for module interfaces, design patterns, checks and remaining findings.

## Offline use

The Android app starts from its on-device IndexedDB copy without waiting for authentication or the server.
Setup, accounts, transactions, goals, rules, preferences and SMS/notification import work locally.
The app bundles its fonts and interface assets. Changes and deletion markers are saved together,
so they survive closing the app or restarting the phone while offline.

Production storage is local-only, even if Supabase environment variables are configured.
Sync/OTP/restore/merge/backup/device controls and remote push registration are removed.
Existing on-device records remain available; backend adapters remain disconnected for future development.
This version does not download cloud-only history or delete copies uploaded by earlier versions.
Clearing app data or uninstalling removes the local copy; cloud recovery and export are unavailable.
Settings reports local storage status. SMS/notification permissions still apply.

See the [logic audit](docs/LOGIC-AUDIT-2026-10-20.md) and [recommended fixes](docs/LOGIC-REMEDIATION.md)
for confirmed limitations and the removal decisions. Current capture heuristics have known defects;
the descriptions below are intended behavior, not verified support for every bank format.

## Transaction notifications

Enable **Accounts → Transaction notifications** in Android's notification-access settings.
Thaili watches detected bank/wallet apps, reads ordinary, expanded and inbox-style alerts,
and extracts completed payments, receipts, credits, debits, refunds and wallet loads in NPR/Rs/रु.
Alerts with failed/pending payments, OTPs, offers, balance-only text or ambiguous directions are skipped.
Recognized alerts update the open app immediately; the Android listener buffers them while it is closed.
Already-visible alerts are checked when access connects or the financial-app list changes.

A valid alert from a new financial app creates its account without replacing existing accounts.
Set that account's opening balance in Accounts. Rescan Accounts after installing another bank/wallet app.
SMS and push alerts for the same transaction share one entry, showing **SMS + App** as its capture channels.
Stable capture IDs prevent reread duplicates. Matching account, amount, direction and reference can join delayed
alerts; reference-less alerts use a conservative three-minute, one-to-one match. Distinct references,
same-channel IDs and same-amount debit/credit transactions stay separate. Identified bank-to-wallet loads
reconcile against existing history even when their two sides arrive in separate reads.
Minimal matching evidence and discovered app packages survive restart and raw-text retention being disabled.
Apply `supabase/migrations/20261011090000_transaction_capture.sql` before syncing this version with Supabase.
See [provider recognition and capture support](docs/CAPTURE-SUPPORT.md) for the full list, SMS coverage and limitations.
`src/lib/notification-transactions.ts` contains parsing/import rules, with format and exclusion fixtures
in `notification-transactions.check.ts`; Android text extraction has local unit tests.

## To do

- **Export everything** — CSV of every entry, account, rule and goal. Hidden from Settings until built.
- **Archive** — browse and restore deleted entries (rows keep `archived_at` for 30 days). Hidden from Settings until built.
- **Cloud/recovery and receipts** — removed until their real behavior, consent and recovery are implemented. Local transaction-review notifications still work.

## Download

Get the latest signed APK from [Releases](https://github.com/georgeMaharjan/Thaili/releases/latest).

## Release build

`npm run sync`, then `cd android && ./gradlew assembleRelease`. Without `android/keystore.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`; git-ignored) the release APK is built unsigned.

In-app updates (Settings → App update) read the latest GitHub release. For each release: raise `versionCode`
and `versionName` in `android/app/build.gradle`, tag it `v<versionName>`, and attach the signed APK as
`thaili.apk`. Sign every release with the same keystore, or Android refuses to install it over the old one.

## License

[MIT](LICENSE)
