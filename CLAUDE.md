# Thaili

Overview and module map: @README.md. Module contracts and invariants: docs/ARCHITECTURE.md.

## Checks

Run before calling a change done (CI runs the same, plus the Android unit tests):

```bash
npm run typecheck && npm test && npm run lint
```

- Tests are plain `*.check.ts` files run by `tsx --test` — no Jest/Vitest. The `test` script globs only the
  top level of `src/lib`, `src/application`, `src/infrastructure`, `src/features`; a check file in a deeper
  folder is silently skipped unless you add its glob.
- Android: `cd android && ./gradlew :app:testDebugUnitTest`.

## Install on the phone

```bash
npm run sync                                   # next build + cap sync
cd android && ./gradlew installDebug
cp android/app/build/outputs/apk/debug/app-debug.apk ~/Downloads/Thaili-latest.apk
```

Keep exactly one APK in `~/Downloads` (`Thaili-latest.apk`); no dated copies.

## Conventions

- Screens (`src/screens/*.tsx`) only render. State, strings and handlers come from the feature view model
  (`src/features/<feature>/view-model.ts`). A new view-model key must also be added to that feature's
  `screen-model.ts` `Pick<>` list or the screen can't see it.
- UI strings are bilingual: branch on `np` in the view model (English / Nepali), never in the screen.
- Colours, fonts and radii come from the `@theme` tokens in `src/app/globals.css` (`bg-tint-n`, `text-ink-3`,
  `var(--action)`…). No raw hex in screens.
- Amounts are stored in rupees but money math runs in integer paisa via `paisa()`/`rupees()` in
  `src/lib/finance.ts` — never add or split rupee floats directly. Dates are Bikram Sambat (`src/lib/bs.ts`).
- Static export (`output: "export"`) wrapped by Capacitor: no API routes, server actions or SSR.

## Don't

- Don't reconnect cloud sync / Supabase in the production path — it was removed deliberately (see
  docs/LOGIC-REMEDIATION.md). Backend adapters stay disconnected.
- Don't treat capture heuristics as verified: bank SMS/notification formats need a fixture in the matching
  `*.check.ts` before a parser change.
