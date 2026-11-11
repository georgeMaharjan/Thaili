# Developer setup

How to build, test, run and release Thaili. For what the app does, see the [README](../README.md).

## Requirements

- Node.js 22 and npm
- JDK 21 and the Android SDK (Android Studio, or the command-line tools)
- An Android phone with USB debugging, for anything that needs SMS, notifications or the native bridge

## Commands

```bash
npm ci                 # install dependencies
npm run dev            # browser preview (no device features)
npm run android        # build, sync and open in Android Studio
npm run typecheck      # application and test fixture type checking
npm test               # domain, application, adapter and screen flow checks
npm run lint
```

Run `npm run typecheck && npm test && npm run lint` before calling a change done. CI runs the same, plus a
production build and the Android unit tests (`cd android && ./gradlew :app:testDebugUnitTest`).

Tests are plain `*.check.ts` files run by `tsx --test` in Nepal time (`TZ=Asia/Kathmandu`), with no Jest or Vitest.
The `test` script only globs the top level of `src/lib`, `src/application`, `src/infrastructure` and
`src/features`; a check file in a deeper folder is skipped unless you add its glob.

## Project structure

Next.js static export (`output: "export"`) wrapped with Capacitor for Android: no API routes, server actions or SSR.

- `src/application/`: typed application state, controller, capture/discovery/lifecycle coordinators and ledger
  retry coordination. `src/lib/logic.tsx` keeps the app entry point compatible.
- `src/features/`: feature view models, selectors, transaction commands and feature-specific screen contracts
  (MVVM). `src/domain/` holds shared models; `src/infrastructure/` holds saved-data validation and the database schema.
- `src/screens/*.tsx`: the screens, hand-written with Tailwind. They only render; state, strings and handlers come
  from the feature view model. Shared pieces live in `src/components/ui.tsx`; colour, font and radius tokens are in
  the `@theme` block of `src/app/globals.css`. `design/Thaili v9.dc.html` is a visual reference only.
- `src/lib/finance.ts`, `goals.ts`, `rules.ts`: financial calculations and filing rules. Money math runs in integer
  paisa; goal funding uses Queue/Share allocation strategies.
- `src/lib/import-transactions.ts`: shared SMS/notification import pipeline with an explicit clock and ID generator.
  `sms.ts` is the SMS parser; `notification-transactions.ts` holds the notification rules.
- `src/lib/store.ts`: persistence composition and background retries. `local-ledger.ts` holds the durable snapshot,
  pending changes and merge rules; `indexed-db-storage.ts` is its storage driver. `pouch.ts` selects durable data and
  applies raw-text retention. `backup.ts` is the export file format and import validation.
- `src/lib/bs.ts`, `calendar.ts`: Bikram Sambat dates and render-time calendar context. `nav.ts`: back stack.
  `update.ts`: the GitHub Releases update check.
- `android/.../ThailiPlugin.java`: native bridge for SMS, installed apps, biometrics, haptics and saving the backup file.

See [architecture](ARCHITECTURE.md) for module interfaces, design patterns and remaining findings.

Bank SMS and notification formats need a fixture in the matching `*.check.ts` before a parser change; see
[capture support](CAPTURE-SUPPORT.md).

## Run on a phone

```bash
npm run sync                     # next build + cap sync
cd android && ./gradlew installDebug
```

`installDebug` signs with this machine's debug key. Android only installs an update over an app signed with the same
key, so a phone with a debug build can't take release APKs (or the reverse) without uninstalling, and uninstalling
deletes the app's data. Export a backup first (Settings → Export all data).

## Release

1. Raise `versionCode` and `versionName` in `android/app/build.gradle`.
2. `npm run sync`, then `cd android && ./gradlew assembleRelease`. Signing reads `android/keystore.properties`
   (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`; git-ignored). Without it the APK is built unsigned.
   Sign every release with the same keystore.
3. Tag the commit `v<versionName>` and publish a GitHub release with the APK attached as `thaili.apk` (plus its
   `thaili.apk.sha256`).

The app's update check (Settings → App update) and the website both read the latest GitHub release, so it has to
follow this naming.

For browser-installation blocks, see the [Play Protect investigation](PLAY-PROTECT.md) and
[appeal submission record](PLAY-PROTECT-APPEAL.md). A valid signature does not guarantee installation: Play Protect
can block SMS/notification permissions before the app runs. Preserve the signing key and use the
exact distributed APK's hash when requesting review.

## Supabase (disconnected)

Production storage is local-only: Supabase variables in `.env.local` are ignored, and nothing in the app imports the
adapter. `src/lib/supabase.ts`, `cloud-store.ts` and `supabase/migrations/` are kept in step with the data model for a
future opt-in cloud backup; see [recommended fixes](LOGIC-REMEDIATION.md) for what must happen before it is
reconnected. Check the migrations and RLS on a throwaway Postgres 17 with:

```bash
bash supabase/test.sh supabase/migrations/*.sql
```

The published v1.4 privacy changes are described in [PRIVACY.md](PRIVACY.md) and [PRIVACY-REMEDIATION.md](PRIVACY-REMEDIATION.md). After restoring or upgrading, open **Settings → Permissions → Read bank SMS**, allow Android SMS access, then choose banks in **Bank SMS access**. **Check for missed bank SMS** rescans retained selected-bank messages from up to the last 90 days, subject to the saved history cutoff. See [device validation](DEVICE-VALIDATION.md) for the isolated synthetic phone tests.
