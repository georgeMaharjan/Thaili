# Thaili project review and design audit

Reviewed 5 October 2026. This reviews the current working tree, including existing uncommitted changes. No application source was changed.

## Assessment

Thaili has a distinctive and coherent visual identity, useful Nepal-specific calendar and number formatting, shared UI components, and owner-scoped database policies. The major release risks are persistence, privacy controls, and incorrect transaction classification. The interface currently communicates more certainty about storage, recovery, and budget advice than the implementation supports.

The project is a static Next.js/React application in a Capacitor Android wrapper. Most orchestration, calculations, and screen behavior live in a 2,061-line, type-check-disabled React class. The screen/component split is useful, but the financial domain and persistence need independently testable boundaries.

## Scope and validation

- Read application logic, screens, components, SMS parsing, persistence, migrations, notification handling, and the Android bridge.
- Completed browser onboarding, entered a synthetic Rs 5,000 cash balance and Rs 100 expense, and inspected Home, Quick add, Insights, Settings, light/dark themes, and English/Nepali text. Preview used explicitly empty Supabase environment variables; no cloud records were created.
- Inspected 390×844 and 320×568 phone layouts, plus the default desktop preview. Screenshots contain synthetic data; the floating Next.js development badge is not a product finding.
- `npm test`: passed SMS, navigation, and formatting checks.
- `npm run lint`: no errors; two warnings for remote font placement and an image element.
- `npx tsc --noEmit`: passed, but `logic.tsx` has `@ts-nocheck` and shared view models use `any`.
- Production build: passed after allowing Turbopack to bind its worker port outside the sandbox.
- `bash supabase/test.sh supabase/migrations/*.sql`: migrations applied; expected ownership, foreign-key, and validation rejection outputs observed. This is a smoke script with printed expectations, not assertion-based coverage of application behavior.
- Additional in-memory probes reproduced bank matching, refund deduplication, false transfer pairing, lost deletion retries, and raw app-notification upload. These probes did not access a live backend.
- Android behavior was reviewed from source, not executed on a physical device. Native permission, biometrics, cold-start notification, keyboard, and safe-area behavior still need device validation. Hosted database limits/settings were not inspected.

Priority: **P1** should be resolved before users depend on the app for real records; **P2** is a significant correctness or usability issue.

## Implementation findings

### 1. [P1] “Sync off” does not stop cloud persistence, and raw SMS is enabled by default

Evidence: [startup/save lifecycle](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:380), [unconditional save](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:408), [default settings](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:253), [raw serialization](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:18), [“local only” claim](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1158).

With Supabase configured, an anonymous session loads on startup and successful loading enables saves regardless of `account`, `syncCell`, or the UI sync setting. Skipping sync or selecting “Stop on this phone” only changes UI state. Meanwhile `syncRaw` starts true, so imported SMS text uploads even though onboarding promises that the message itself never travels. Raw SMS can contain more identifying information than the separately masked account suffix.

Make cloud storage explicitly opt-in, persist locally first, default raw retention off, and ensure the visible storage state controls the actual writer. Treat mobile-data restrictions as real transport policy or remove the setting.

### 2. [P1] Backup, authentication, restore, and remote deletion remain interactive simulations

Evidence: [OTP handler](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1081), [restore](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1121), [backup/device actions](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1134), [delete synced copy](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:987).

Any six digits enable the sync UI without sending or verifying an email. Restore and merge display hardcoded counts and devices but do not copy or merge records. “Backed up” changes a timestamp; “Synced copy deleted” does not delete server rows. The code screen mentions the prototype, but the main entry points promise recovery and completed operations. A lost phone therefore cannot be recovered through the presented email flow.

Hide or explicitly label these features until real identity linking, restore, device revocation, and deletion work. Derive success labels from completed operations. This is missing functionality, not evidence that arbitrary codes grant access to other users' database rows.

### 3. [P1] Offline entries can disappear on restart

Evidence: [memory-only retry queue](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:68), [save errors](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:119), [load failure handling](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:401).

There is no durable local transaction store or outbox. An offline edit lives in React state and a Promise queue; closing the app before a successful retry loses it. With no backend configured, the entire pouch is memory-only. A returning user who opens offline also receives empty onboarding state because the cloud pouch cannot load. Save failures only log a warning while UI actions still announce “saved.”

Store each accepted mutation locally before acknowledging success, retry a durable outbox, and expose pending/error status. Verify entry, edit, delete, and undo across airplane mode and restart.

### 4. [P1] Retrying a failed deletion forgets the deletion

Evidence: [resetting the previous snapshot](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:81), [transaction archival](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:95), [rule/goal deletion](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:106).

A failed write sets `allDirty`. The next save replaces the previous collection with empty arrays, so the “gone” comparisons cannot find deleted records. A probe failed the first transaction archive request, then saved a theme change; the retry issued **zero deletion/archive operations**. The transaction remains live on the server and returns after reopening. Accounts, rules, and goals have the same retry problem.

Keep durable deletion tombstones or replay explicit mutations until acknowledged; do not reconstruct deletions from an empty baseline.

### 5. [P1] SMS can be assigned to the wrong account

Evidence: [source matching](/Users/georgemaharjan/Projects/personal/thaili/src/lib/sms.ts:76), [existing test](/Users/georgemaharjan/Projects/personal/thaili/src/lib/sms.check.ts:71).

Suffix matching ignores the sender's bank. A Nabil debit ending 4821 matched NIC Asia when both accounts had that suffix. If the SMS has an untracked suffix, the fallback still chooses the first account from that bank, even when its known suffix differs. Both behaviors alter the wrong balance; an existing check explicitly expects cross-bank matching.

Resolve the institution first, then the account suffix within it. Preserve unmatched or ambiguous messages for review rather than assigning them to a known different account.

### 6. [P1] Deduplication drops valid entries, and pairing invents transfers

Evidence: [deduplication](/Users/georgemaharjan/Projects/personal/thaili/src/lib/sms.ts:124), [transfer pairing](/Users/georgemaharjan/Projects/personal/thaili/src/lib/sms.ts:101).

Deduplication only compares source, amount, and a three-minute window. A credit/refund of Rs 500 following a Rs 500 debit is reported as a duplicate; two different purchases for the same amount can also collapse. Pairing converts any equal debit and credit across different accounts within 15 minutes into a transfer. A probe merged an unrelated purchase and salary credit, removed the credit row, and erased the expense category. Pairing only considers one import batch, so real transfer sides arriving across reads stay separate.

Include direction and available bank references/message identity in duplicate detection. Require corroborating transfer evidence or ask for confirmation; reconcile across pending and existing records.

### 7. [P1] Manually added bank/wallet accounts are absent from notification capture

Evidence: [new account identity](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1857), [capture configuration](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:309), [notification matching](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:293), [native sender selection](/Users/georgemaharjan/Projects/personal/thaili/src/lib/sms.ts:116).

Manual creation gives accounts keys such as `src123`, while app-package and sender mappings require canonical keys like `nic` or `esewa`. Consequently hand-added wallets never enter the package capture map, and their notifications cannot become transactions. Hand-added banks can still import foreground SMS by bank-name matching, but their background review notifications are not configured. A direct probe of `nativeRules(['src123'])` returned no senders.

Store institution identity separately from account identity and build capture mappings from the institution. This also supports multiple accounts at one bank.

### 8. [P1] History silently stops at the configured API row limit

Evidence: [unpaginated read](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:42), [local API cap](/Users/georgemaharjan/Projects/personal/thaili/supabase/config.toml:18).

The local Supabase configuration caps responses at 1,000 rows, while loading issues one unpaginated transaction query. With more than 1,000 live entries, older records vanish from client state without an error. Balances omit older transactions after the opening timestamp and historical totals become incomplete. The deployed cap was not inspected; the bug applies whenever the dataset exceeds its configured cap.

Paginate the required history or use complete server aggregates plus paged detail data. Verify a pouch with more than 1,000 transactions.

### 9. [P2] “Keep raw text” does not cover app notifications

Evidence: [raw serialization](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:21), [toggle handling](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:90).

With `syncRaw=false`, `App` rows still upload their full raw notification body because only `SMS` is excluded. Switching the setting also reserializes only SMS rows, leaving uploaded app text intact. An in-memory save probe confirmed the notification text in the outgoing row.

Apply retention to all captured bank-message channels and remove previously uploaded raw text when the user disables it. If SMS-only behavior is intentional, make that scope explicit and add a separate notification policy.

### 10. [P2] Removing a transfer destination leaves stale foreign keys in memory

Evidence: [account deletion](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1866), [write ordering](/Users/georgemaharjan/Projects/personal/thaili/src/lib/store.ts:83), [transfer FK](/Users/georgemaharjan/Projects/personal/thaili/supabase/migrations/20260924073617_v9_data_model.sql:48).

Deleting an account filters transactions by `src` but leaves surviving transactions whose `to` points to the removed account. Postgres clears `to_src` on deletion; React keeps the old key. Editing that surviving transfer or performing a full retry tries to upsert the deleted destination and fails its foreign key.

Define the accounting behavior for a removed transfer peer and update both server and client references consistently, including undo.

### 11. [P2] Goal estimates count transfers that never add to savings

Evidence: [monthly rate](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:790).

`monthlyIn` sums every transfer, without checking whether it moves from spending to savings. Transfers between spending accounts and withdrawals from savings both increase the projected savings rate. With no transfers, it fabricates a Rs 1/month rate, producing enormous “About … months” estimates rather than an unknown state.

Use net flows into savings, avoid double-counting transfers within savings, and show “Not enough history” when no reliable rate exists.

### 12. [P2] Financial date windows do not advance while the app stays alive

Evidence: [module-level today](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:105), [derived transaction offsets](/Users/georgemaharjan/Projects/personal/thaili/src/lib/bs.ts:26), [resume handler](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:361).

The current BS day/month is fixed at module initialization, and existing transactions retain the `off` calculated on load. Resuming after midnight or a month boundary does not refresh these values. Today/week/month filters, headers, remaining days, and new transaction offsets can disagree until a reload.

Refresh the calendar reference and transaction offsets on resume/day rollover; test a BS month boundary.

## Design audit

### Preserve these strengths

- The pouch mark, warm canvas, navy dark theme, and rounded display typography give the product a recognizable identity.
- Large amounts, secondary metadata, and a prominent Quick add action establish clear hierarchy.
- Shared colors, spacing primitives, cards, keypads, and controls support consistent screens. Reduced-motion styles and safe-area handling are already present.
- Transaction kinds have text labels as well as colors. Search and the BS date picker are useful task-oriented controls.
- Measured token contrast is good for common text pairs: light secondary text on canvas 5.73:1; primary button text 5.18:1; dark secondary text 5.82:1. These are token measurements, not a complete accessibility certification.

### Highest-impact design changes

| Priority | Finding and observed evidence | Recommended change |
|---|---|---|
| P1 | Storage and recovery promises contradict behavior. “This pouch lives only on this phone,” “Code sent,” “Backed up,” and “Synced copy deleted” are unsupported in the states described above. | Make storage status factual, show pending/failed operations, and remove prototype actions from normal use. |
| P2 | First-run Home showed **“You're Rs 0 past what was free to spend”** with no transactions. After one cash purchase, Rs 5,000 opening cash was presented as a Rs 0 spending budget. | Separate available balance from a configured budget. Show “Record income or set your monthly budget” until enough information exists; use a neutral zero state. |
| P2 | Manual-only users can Quick add only a debit, so they cannot ordinarily record income or a transfer to supply the budget/goal calculations. | Let Quick add select expense, income, or transfer; offer source, date, and optional note without slowing the default expense path. |
| P2 | Setup requires name/phone, permissions, detection, account details, categories, a savings target, a baseline, and sync before Home. The manual path jumps from step 3 to step 5; “Next — sync” opens a baseline screen first. | Get users to a useful pouch after one account; defer categories/baseline/sync and make progress labels reflect the actual branch. Explain why the unverified phone number is needed, or make it optional. |
| P2 | Zero balances are treated as missing: `srcMissing` checks `!x.opening`, and `newSrcCreate` rejects a parsed zero. | Distinguish an unentered balance from a legitimate Rs 0 balance. Allow empty accounts and reconciliations to zero. |
| P2 | At 320px, **Insights becomes “Insig…”** because the full three-option period control shares its header row. Dense Settings metadata also truncates. | Put the period control below the title at narrow widths; allow useful metadata to wrap. Verify long Nepali labels and large amounts. |
| P2 | Nepali mode translates navigation/headings but leaves descriptions, settings values, category names, financial labels, and some accessible names in English. The document language stays `en`. | Centralize all user-facing strings; use Nepali number/date formatting consistently and update the document language with the selected language. |
| P2 | Selected category/segment/tab states are visual only; toggles are spans in buttons, gray CTAs remain enabled, the keypad backspace has no accessible name, and sheets have no dialog role/focus management. Several inputs lack associated labels and remove their outline. | Give controls explicit checked/selected/disabled state, name icon actions and inputs, restore visible focus, add headings, announce save/error status, and use accessible dialogs with focus containment/restoration. |
| P2 | `maximumScale: 1` restricts user zoom in clients that honor it. Much supporting text is 12–13.5px. | Permit zoom, test text scaling and reflow, and favor a larger readable secondary-text size. |
| P2 | “Hide balance” masks Home and account balances, but Insights calls `balHero(savingsPot)` without `hideBal`, and goals use unmasked savings values. | Define the privacy setting's scope and apply it consistently to every displayed savings/balance value. |
| P2 | Delete-entry copy promises an Archive restore path for 30 days, but Archive is hidden; the usable in-app recovery is a 3.8-second Undo that disappears on navigation. | Provide the restore flow before promising it, or describe the actual available recovery. Keep deletion success and recovery reachable. |

Code anchors: [first-run advice](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1309), [Quick add](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1915), [zero balance validation](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1843), [narrow Insights header](/Users/georgemaharjan/Projects/personal/thaili/src/screens/insights.tsx:48), [Settings copy](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1997), [shared control semantics](/Users/georgemaharjan/Projects/personal/thaili/src/components/ui.tsx:129), [sheet implementation](/Users/georgemaharjan/Projects/personal/thaili/src/screens/transactions.tsx:250), [zoom/language](/Users/georgemaharjan/Projects/personal/thaili/src/app/layout.tsx:10), [unmasked savings](/Users/georgemaharjan/Projects/personal/thaili/src/lib/logic.tsx:1693), [delete recovery claim](/Users/georgemaharjan/Projects/personal/thaili/src/screens/index.tsx:84).

The light `--warn` color on canvas measures 3.69:1. Prefer `--warnInk` for small warning text, including goal pace/shortfall text, and reserve the lighter token for bars and accents. A 44–48px mobile touch target is a useful product baseline; the 34–38px period chips and balance eye deserve larger hit areas. These are targeted design recommendations, not a claim that every smaller control violates an accessibility standard.

### Screenshot evidence

First-run Home: the visual hierarchy is strong, but the advice treats missing data as an overspend and leaves Recent empty without guidance.

![First-run Home with synthetic cash balance](/Users/georgemaharjan/Projects/personal/thaili/docs/audit-2026-10-05/home-empty.jpg)

Small-phone Insights: the period selector crowds out the screen title.

![Insights at 320px](/Users/georgemaharjan/Projects/personal/thaili/docs/audit-2026-10-05/insights-320.jpg)

Nepali Settings in dark mode: translated headings alongside English descriptions and values.

![Nepali Settings in dark mode](/Users/georgemaharjan/Projects/personal/thaili/docs/audit-2026-10-05/settings-nepali-dark.jpg)

## Suggested delivery order

1. Establish durable local storage, acknowledged mutations, deletion tombstones, and truthful cloud/privacy controls. Remove unsupported backup/restore/device actions from the normal product.
2. Correct institution/account matching, duplicate identity, transfer recognition, manual-account capture, and paginated history. Add regression cases for the reproduced failures.
3. Extract typed ledger, import, budget, and goals modules from the React class. Test financial invariants and outage/restart behavior; convert database smoke expectations to assertions.
4. Improve first-run states, zero balances, manual income/transfers, progress labels, and savings-rate uncertainty.
5. Finish localization and accessibility semantics, then verify small screens, scaled text, keyboard interaction, and native device flows.

A broad visual redesign is unnecessary. Preserve the identity and shared components while making the product's actions and numbers dependable.
