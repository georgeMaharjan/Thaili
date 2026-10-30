# Thaili application logic audit — 20 October 2026

## Follow-up status

After this audit, the unenforced cloud/recovery feature and fake review note/receipt actions were removed at the user's request (F01, F02, F19). The app now uses local-only production storage. The findings below document the pre-removal working tree; removed source links are historical. See [current decisions and recommendations for every finding](LOGIC-REMEDIATION.md). Original observations remain in `evidence.json`; the updated reproduction script skips removed features and writes `remaining-evidence.json` for outstanding scenarios.

## Result

**22 confirmed findings: 10 high priority (P1), 12 medium priority (P2).** The highest risks are unwanted cloud uploads, misleading recovery controls, incorrect captured amounts and transfer reconciliation, and loss of entries through undo or failed persistence. These affect the app's records; this audit did not demonstrate control over bank funds or another user's cloud account.

This reviews the current working tree, including the ongoing refactor and earlier fixes, rather than only the last commit. No application logic was changed for this audit. Existing uncommitted work was preserved. The separately requested toast dismissal change was completed before the audit.

P1 means address before relying on the app for real financial records. P2 means a confirmed functional or integrity gap that should follow. Severity reflects user impact, not a formal security score. Prototype features are identified explicitly.

| ID | Priority | Confirmed issue |
|---|---|---|
| F01 | P1 | Sync opt-out and stop controls do not stop cloud writes |
| F02 | P1 | Sign-in, restore, backup, merge and device controls contain simulated success paths |
| F03 | P1 | SMS parser can use the balance as the transaction amount or reverse direction |
| F04 | P1 | Transfer reconciliation swallows unrelated wallet credits with different references |
| F05 | P1 | A payment to someone else's 96-prefix wallet can become an own-account transfer |
| F06 | P1 | Transaction dates in message bodies are ignored, corrupting opening-balance cutoffs |
| F07 | P1 | Saving a current balance equal to the original opening does not reconcile it |
| F08 | P1 | Undo can overwrite later background changes and remove entries |
| F09 | P1 | Failed local saves resolve successfully and the unsaved state is not retried |
| F10 | P1 | An untrusted app label can impersonate a known bank's capture identity |
| F11 | P2 | Deselected providers remain watched and can be automatically added back |
| F12 | P2 | Account deletion bypasses the authentication required for individual transaction deletion |
| F13 | P2 | Deleting a transfer destination leaves a dangling transfer |
| F14 | P2 | Changing an account's institution preserves its old capture identity |
| F15 | P2 | Suggested rules bypass the normal rule validator |
| F16 | P2 | Import validation permits batch-breaking dates and amounts outside the database range |
| F17 | P2 | Share-mode goal ETA double-rounds the floor and goal phases |
| F18 | P2 | Recommended daily spending can exceed all remaining money |
| F19 | P2 | Review's Add note action saves invented placeholder text |
| F20 | P2 | Nepali-script merchant rules are rejected or cannot be learned |
| F21 | P2 | Native OTP filtering drops valid transactions containing merchant codes |
| F22 | P2 | A review notification can open a different nearby transaction |

## Scope and evidence

Reviewed application startup/lifecycle, setup and history decisions, account editing, capture and discovery, SMS/push parsing and reconciliation, transactions/rules, finance/budgets, goals, review/navigation, preferences, local persistence, cloud synchronization, SQL migrations/RLS, native receivers/listener/bridge, and push-function boundaries.

Validation performed:

- `npm test`: all **24 check files passed**, including the application flow's 112 route renders and setup skip/history/zero-balance cases.
- `npm run typecheck`: passed for both application and check fixtures.
- `npm run lint`: zero errors; two existing `<img>` warnings.
- `bash supabase/test.sh supabase/migrations/*.sql`: passed against a throwaway local PostgreSQL database. Cross-user reads, cross-user upserts and foreign-key ownership checks were exercised. No live database was reset or mutated.
- **21 JavaScript reproduction scenarios** using the real application modules and synthetic data, with injected memory/storage/cloud adapters; plus **one Java reproduction** using the actual native text-filter implementation. Some scenarios establish multiple findings.

[JavaScript observations](audits/2026-10-20/evidence.json), [reproduction script](audits/2026-10-20/reproduce.mts), [native observation](audits/2026-10-20/native-evidence.json), [native reproduction](audits/2026-10-20/NativeAudit.java).

These evidence scripts intentionally assert the currently observed defects. A successful run confirms the findings; it does **not** mean the application behavior is correct. They are separate from the regression suite and must change as findings are fixed.

Run the JavaScript evidence from the project root with cloud configuration disabled:

```sh
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' npx tsx docs/audits/2026-10-20/reproduce.mts
```

It refreshes `remaining-evidence.json`; the original `evidence.json` is preserved. The simulated storage failure prints an expected error. No real SMS, bank account, phone storage or cloud transport is used by these scenarios. Run the native fixture with a JDK:

```sh
javac -d /tmp/thaili-native-audit android/app/src/main/java/com/george/thaili/MoneyNotificationText.java docs/audits/2026-10-20/NativeAudit.java
java -cp /tmp/thaili-native-audit com.george.thaili.NativeAudit
```

## High-priority findings

### F01 — Sync opt-out does not stop uploads

**Evidence:** `SYNC_OPT_OUT`, `RAW_DEFAULT_UPLOAD`. With a configured cloud driver, setting the UI account to null through Stop sync still permits a cloud write. `syncCell: false` also does not influence transport decisions. Raw message storage defaults to enabled and flows into the cloud payload.

**Cause:** [store.ts:10](../src/lib/store.ts#L10) enables cloud solely from backend configuration. [ledger-store.ts:33](../src/application/ledger-store.ts#L33) checks connectivity, not sync consent or connection type. [shell/view-model.ts:25](../src/features/shell/view-model.ts#L25) only changes display state. [sync/view-model.ts:125](../src/features/sync/view-model.ts#L125) announces “Sync off” without disabling transport. Raw handling is in [pouch.ts:17](../src/lib/pouch.ts#L17) and [cloud-store.ts:79](../src/lib/cloud-store.ts#L79).

**Impact:** Financial records, potentially including full alert text, can leave the phone after an explicit local-only choice. The mobile-data promise is also unenforced. The fixture proves the gating defect without sending real data.

**Fix:** Make persisted sync consent and network policy authoritative inputs to the store, cancel queued work when disabled, and gate initial reads/writes as well as retries. Default raw retention should be an explicit product choice.

### F02 — Recovery and account controls report simulated success

**Evidence:** `SIMULATED_IDENTITY`. Any six-digit value completes the create flow. Restore announces 214 restored entries while an empty ledger remains empty. Backup only changes a timestamp; merge choices do not merge the displayed remote ledger. Remote-device removal changes a local array, and Delete synced copy does not delete backend records.

**Cause:** [sync/view-model.ts:105](../src/features/sync/view-model.ts#L105), [restore:144](../src/features/sync/view-model.ts#L144), [backup/devices:156](../src/features/sync/view-model.ts#L156), [merge:58](../src/features/sync/view-model.ts#L58), [shell/view-model.ts:30](../src/features/shell/view-model.ts#L30). Actual transport uses an anonymous session in [supabase.ts:32](../src/lib/supabase.ts#L32); the email linking mentioned in its comment is not implemented by these controls.

**Impact:** Users can believe they have a recoverable, email-linked backup or that a device/copy has been revoked when neither is true. The code labels OTP as a prototype, but subsequent success messages make real claims.

**Boundary:** This is an unfinished-feature/recovery finding, **not** evidence that arbitrary digits grant access to another user's records. Local RLS isolation checks passed.

**Fix:** Wire verified identity, actual restore/merge, revocation and deletion to backend results. Until then, disable the actions and remove success claims and fabricated remote statistics.

### F03 — SMS amount and direction are selected without enough context

**Evidence:** `SMS_AMOUNT_DIRECTION`. “Available balance NPR 10000 … has been debited by NPR 500” imports 10000. A USD 20 debit followed by an NPR 10000 balance also imports 10000 NPR. A debit sentence mentioning that the receiver “has been credited” becomes a credit.

**Cause:** [sms.ts:25](../src/lib/sms.ts#L25) takes the first supported amount; [sms.ts:28](../src/lib/sms.ts#L28) checks credit before debit; [sms.ts:57](../src/lib/sms.ts#L57) accepts this fast path rather than applying the stricter generic parser's ambiguity checks.

**Impact:** Wrong expense, income, account balance, budget and savings figures from plausible bank wording.

**Fix:** Bind amount, currency and direction to the movement clause. Exclude balances/fees, recognize unsupported currencies, and send ambiguous messages to review rather than guessing. Share the SMS/push validation path.

### F04 — An unrelated wallet credit is absorbed into a transfer

**Evidence:** `UNRELATED_WALLET_CREDIT_ABSORBED`. A bank-to-own-wallet transfer of 500 with reference `LOAD12345`, followed one minute later by a wallet credit of 500 with reference `GIFT99999`, produces only one transfer entry. Both distinct references end up attached to it.

**Cause:** [import-transactions.ts:44](../src/lib/import-transactions.ts#L44) matches transfer credits by destination, amount and a 15-minute window without rejecting conflicting references. This bypasses the stricter reference comparison used for ordinary duplicates.

**Impact:** Separate income disappears and wallet/total balances are understated. Existing credits can also be removed by this reconciliation pass.

**Fix:** Require compatible evidence, reject conflicting references, and retain ambiguous credits for review. Apply the same identity policy across ordinary deduplication and transfer reconciliation.

### F05 — Another person's wallet payment can be counted as your own transfer

**Evidence:** `WALLET_96_RECIPIENT`. The fixture's own eSewa account ends in 4821; a debit remark names a different recipient, `9612349999`. It is still classified as a transfer to the saved eSewa wallet.

**Cause:** [sms.ts:93](../src/lib/sms.ts#L93) detects only mobile prefixes 97/98, whereas phone validation permits 96 too. If no mobile is recognized, [transferTo:94](../src/lib/sms.ts#L94) falls back to the wallet name alone.

**Impact:** A real outgoing payment can be excluded from expenses and incorrectly credited to the user's wallet, conserving money that actually left their accounts.

**Fix:** Normalize all accepted phone formats and require positive evidence that the destination belongs to the user. Unknown recipients should remain an expense or require confirmation.

### F06 — Delivery timestamps override the transaction date in the body

**Evidence:** `BODY_DATE_IGNORED`. A newly received alert whose body dates the transaction to 1 January 2026 is saved at the envelope timestamp. With an opening balance confirmed yesterday, an old 100 debit still reduces the current 1000 balance to 900.

**Cause:** [sms.ts:72](../src/lib/sms.ts#L72) and [notification-transactions.ts:60](../src/lib/notification-transactions.ts#L60) use `msg.at`; [import-transactions.ts:65](../src/lib/import-transactions.ts#L65) persists that as occurrence time. [finance.ts:18](../src/lib/finance.ts#L18) relies on occurrence time for opening cutoffs.

**Impact:** Delayed or reissued alerts can double-count movements already included in the user's confirmed balance, and appear in the wrong period. The existing skip-history boundary fixes do not resolve body/envelope date disagreement.

**Fix:** Preserve delivery and occurrence timestamps separately. Parse supported provider date formats with explicit AD/BS/time-zone rules; review disagreements rather than applying uncertain movements to a confirmed opening.

### F07 — Current-balance editing fails when the value equals the old opening

**Evidence:** `OPENING_EDIT`. Opening 1000 minus a later 100 expense gives 900. Edit pre-fills 1000, describes it as the balance “right now”, and saving 1000 leaves the balance at 900.

**Cause:** [controller.ts:274](../src/application/controller.ts#L274) pre-fills the original opening. [accounts/view-model.ts:81](../src/features/accounts/view-model.ts#L81) refreshes the cutoff only if the number differs from that opening or no timestamp exists.

**Impact:** Users cannot reliably reconcile the account to the balance they confirm. This is separate from the already covered initial-setup zero/missing-timestamp fix.

**Fix:** Distinguish editing account metadata from confirming a current balance. Pre-fill the derived current balance and atomically store the confirmed amount and reconciliation time when that operation is requested.

### F08 — Undo restores entire arrays over newer state

**Evidence:** `UNDO_ERASES_BACKGROUND`. Save a transaction-array undo snapshot, apply a later silent background entry, then Undo. The later entry disappears.

**Cause:** [shell/view-model.ts:111](../src/features/shell/view-model.ts#L111) applies the entire saved state patch. Transaction/account/rule/goal mutations commonly capture full arrays rather than per-record inverse operations.

**Impact:** Undoing one user action can erase unrelated remote updates or silent capture changes. These removals can subsequently persist and sync. A new visible toast may replace the undo state, but silent remote changes do not provide that protection.

**Fix:** Store operation-specific inverses and rebase them onto current state. Use record/revision checks where reversal conflicts with a later edit.

### F09 — Local persistence errors are swallowed without retrying the unsaved state

**Evidence:** `LOCAL_SAVE_NO_RETRY`. An injected transient write error leaves one transaction in UI memory and zero in durable storage. `save()` resolves; after the disk recovers, Retry sync still leaves zero durable entries.

**Cause:** [ledger-store.ts:70](../src/application/ledger-store.ts#L70) catches the rejection without retaining/retrying the snapshot. `retrySync()` retries cloud synchronization of the durable ledger. [home/view-model.ts:92](../src/features/home/view-model.ts#L92) reports “saved” before persistence is confirmed.

**Impact:** A user can believe an entry is saved, close the app and lose it. The error status exists, but does not make the current UI state durable.

**Fix:** Retain and retry the latest unsaved revision, propagate save outcomes to callers, and distinguish pending/failed local persistence from cloud backlog. Confirm durable success before claiming it.

### F10 — Label-based app discovery permits bank impersonation

**Evidence:** `APP_LABEL_SPOOF`. A fixture package `example.untrusted.fakebank` with display label “Nabil Bank” is assigned the Nabil identity. Its no-tail debit notification reduces the existing Nabil account from 1000 to 100.

**Cause:** [money-apps.ts:19](../src/lib/money-apps.ts#L19) accepts the label as a known identity even when the package is unknown. [notification-transactions.ts:83](../src/lib/notification-transactions.ts#L83) routes it to that account; single-account fallback accepts the missing tail in [sms.ts:78](../src/lib/sms.ts#L78).

**Impact:** An installed untrusted app can forge financial records through notifications if it is discovered and notification access is enabled. This was reproduced at the discovery/import boundary; an adversarial APK was not installed. It does not authorize bank transactions.

**Fix:** Use verified package/signing identity for trusted providers. Treat label-only discovery as an untrusted suggestion requiring explicit approval; never silently bind it to an existing financial account.

## Medium-priority findings

### F11 — Deselected providers are still captured

**Evidence:** `UNSELECTED_ACCOUNT`. With only Nabil selected and Prabhu merely discovered, capture configuration still includes the Prabhu package. A new Prabhu notification automatically creates that account.

**Cause:** [money-apps.ts:102](../src/lib/money-apps.ts#L102) includes every discovered package; [capture.ts:49](../src/application/capture.ts#L49) accepts account additions from its notification inbox.

**Impact / fix:** Selection cannot reliably exclude a provider. Persist approved/ignored providers and use that allowlist for capture and automatic account creation, separately from discovery. This concerns new alerts after setup, not a failure of the skip-history floor.

### F12 — Bulk account deletion has a weaker gate than single-entry deletion

**Evidence:** `ACCOUNT_REMOVAL`. With an authentication stub that denies access, account deletion makes zero authentication calls and still removes the account. Individual transaction deletion explicitly authenticates.

**Cause:** [accounts/view-model.ts:98](../src/features/accounts/view-model.ts#L98) deletes immediately; compare [shell/view-model.ts:83](../src/features/shell/view-model.ts#L83).

**Impact / fix:** Someone using an already open app can remove an entire account/history without the gate required for one transaction. Add authentication and a meaningful destructive-action confirmation consistent with the transaction policy. This is not a locked-app bypass.

### F13 — Removing a destination leaves a transfer pointing to nothing

**Evidence:** `ACCOUNT_REMOVAL`. Delete the destination of a transfer originating from another account: the transfer survives with its deleted destination key.

**Cause:** [accounts/view-model.ts:103](../src/features/accounts/view-model.ts#L103) filters only the originating source. [local-ledger.ts:61](../src/lib/local-ledger.ts#L61) and [cloud-store.ts:14](../src/lib/cloud-store.ts#L14) may later null the destination while preserving transfer direction.

**Impact / fix:** The in-memory ledger retains an invalid destination while storage normalizes it to null, so transfer identity is inconsistent across reload/sync. It still remains a transfer; deleting an account should not silently invent a new expense. Define an explicit account-removal policy, preserve archived destination identity, and handle affected transfers atomically.

### F14 — Editing an institution leaves the old capture identity

**Evidence:** `INSTITUTION_EDIT_STALE_ID`. Change a Nabil source to Kumari Bank. Its display changes but key stays `nabil`; a valid Kumari alert becomes an unmatched orphan.

**Cause:** [accounts/view-model.ts:79](../src/features/accounts/view-model.ts#L79) changes metadata without migrating the canonical key or saved packages; institution matching prioritizes the old identity.

**Impact / fix:** New-bank alerts can be missed while old-bank alerts remain associated. Prohibit institution replacement for an existing ledger, or explicitly migrate identity, package bindings and history under a well-defined policy.

### F15 — Auto-learned rules bypass validation

**Evidence:** `AUTO_LEARN_BYPASSES_VALIDATION`. Accepting the suggestion for merchant `TRANSFER` creates that rule, although the normal editor blocks it as a payment rail.

**Cause:** [transactions/commands.ts:31](../src/features/transactions/commands.ts#L31) only normalizes and checks nonempty text; editor validation is separate at line 44.

**Impact / fix:** Overbroad or otherwise rejected rules can file unrelated payments automatically. Validate every rule through one domain mutation, including suggestions, before creating it or refiling history.

### F16 — Invalid capture values can poison an import or cloud batch

**Evidence:** `UNBOUNDED_IMPORT`. A finite but out-of-range JavaScript timestamp (`Number.MAX_VALUE`) throws during import. A parsed amount of 1,000,000,000,000 is accepted even though SQL uses `numeric(14,2)` (maximum 999,999,999,999.99).

**Cause:** [import-transactions.ts:20](../src/lib/import-transactions.ts#L20) checks finiteness only, then calls `toISOString()` at line 65. [sms.ts:61](../src/lib/sms.ts#L61) has no database-compatible upper bound. [cloud-store.ts:84](../src/lib/cloud-store.ts#L84) uploads transaction batches.

**Impact / fix:** One malformed timestamp aborts a whole import; oversized amounts can repeatedly block the cloud batch. The parser and import failures were executed; the cloud overflow consequence follows from the checked-in schema, not a live backend write. Validate date/calendar/database bounds and quarantine invalid records individually.

### F17 — Share ETA adds independently rounded phases

**Evidence:** `BUDGET_AND_ETA`. One goal of 50, a reserve shortfall of 50 and a monthly savings rate of 100 yields Queue = one month, Share = two months, despite there being only one goal.

**Cause:** [goals.ts:39](../src/lib/goals.ts#L39) rounds reserve time up, then [goals.ts:44](../src/lib/goals.ts#L44) adds separately rounded goal time.

**Impact / fix:** Goal completion estimates are overstated. Carry the unused part of the reserve-filling month into goal contributions, or simulate contribution allocation consistently for both strategies.

### F18 — Allowance rounding recommends more money than remains

**Evidence:** `BUDGET_AND_ETA`. On the last day with 6 remaining, daily allowance is 10.

**Cause:** [finance.ts:40](../src/lib/finance.ts#L40) rounds to the nearest ten without capping at the remaining budget.

**Impact / fix:** The spend recommendation can push the user over budget. Cap it at nonnegative remaining money, use conservative rounding, and define whether the current day is included in days left.

### F19 — Add note saves a fabricated remark

**Evidence:** `REVIEW_FABRICATES_REMARK`. Tap Add note on a review card with no remark: it stores `Typed in the notification` and announces Note saved without any text entry.

**Cause:** [home/view-model.ts:59](../src/features/home/view-model.ts#L59). The adjacent receipt action at line 65 only displays a camera message and does not capture a receipt; that is a related prototype gap.

**Impact / fix:** Stored financial records acquire text the user never supplied. Open a real note editor and save only confirmed input. Disable unfinished receipt actions until implemented.

### F20 — Nepali-script rules are stripped to empty text

**Evidence:** `NEPALI_RULES`. `किराना पसल` produces no learnable keyword; the otherwise meaningful keyword `किराना` is rejected.

**Cause:** [rules.ts:4](../src/lib/rules.ts#L4) retains only ASCII letters/digits and `&`. Native rule matching also strips non-ASCII characters.

**Impact / fix:** Nepali merchant names cannot participate in rule learning/filing despite the app's Nepali UI. Normalize Unicode letters and digits consistently in JavaScript and Java, with script-specific fixtures.

### F21 — Generic merchant codes are mistaken for OTPs

**Evidence:** Native fixture: `NPR 500 has been debited from A/C XXXX4821. Merchant code 123456.` matches both the native amount detector and OTP exclusion.

**Cause:** [MoneyNotificationText.java:10](../android/app/src/main/java/com/george/thaili/MoneyNotificationText.java#L10) treats any generic `code` followed by 4–8 digits as OTP. [ThailiPlugin.java:247](../android/app/src/main/java/com/george/thaili/ThailiPlugin.java#L247) and [ThailiNotificationListener.java:78](../android/app/src/main/java/com/george/thaili/ThailiNotificationListener.java#L78) discard it before import.

**Impact / fix:** Valid SMS and push transactions can disappear before the tested JavaScript parser sees them. Require authentication-specific OTP context and test positive transaction examples containing reference/merchant codes against both native and web filters.

### F22 — Tapping a review notification can open the wrong entry

**Evidence:** `WRONG_REVIEW_ENTRY`. With two debits one minute apart, a notification timestamp matching the older debit opens the newer one because it appears first in the array.

**Cause:** [Capture.java:89](../android/app/src/main/java/com/george/thaili/Capture.java#L89) includes only a review flag and timestamp; [controller.ts:70](../src/application/controller.ts#L70) opens the first debit within three minutes, without checking source, amount or identity.

**Impact / fix:** The user can categorize or edit the wrong payment. Carry a stable capture identity through the notification and resolve the exact record; if uncertain, open the review list rather than guessing.

## Additional risks and boundaries

These are not included in the 22 confirmed functional findings because their deployment consequence or full user flow was not exercised.

- **Device-local settings are synchronized as shared preferences.** [pouch.ts:7](../src/lib/pouch.ts#L7) includes capture cursors, history cutoff, app lock and balance visibility; [local-ledger.ts:37](../src/lib/local-ledger.ts#L37) accepts remote field changes when the local field is unchanged from its acknowledged baseline. `DEVICE_CAPTURE_POLICY_MERGED` confirms a local cutoff of 200 becomes a remote cutoff of 50. In a working multi-device identity flow, this could re-enable old history or apply another phone's cursor/security preferences. Separate per-device policy from shared financial settings. Ordinary restart/skip-history regression checks still pass.
- **Native raw-message retention is independent of syncRaw.** The listener keeps the newest 500 raw alert bodies in SharedPreferences ([ThailiNotificationListener.java:29](../android/app/src/main/java/com/george/thaili/ThailiNotificationListener.java#L29), [line 87](../android/app/src/main/java/com/george/thaili/ThailiNotificationListener.java#L87)). The UI's toggle describes cloud payload behavior; it does not purge that native cache. Define local retention/acknowledgment separately. More than 500 buffered alerts can also be evicted before an extended offline catch-up.
- **Backup/release policy needs review.** [AndroidManifest.xml:4](../android/app/src/main/AndroidManifest.xml#L4) enables Android backup with no project-specific extraction rules. The distributed APK is a debug build. No OS-backup extraction or device compromise was attempted; do not interpret this as proof of unencrypted backups or arbitrary access.
- **Android Back and local picker state are not integrated.** `Picker` manages its own open state in [sheet.tsx](../src/components/sheet.tsx); native Back delegates to controller state, which cannot see it. The overlay marker has no consumer. Static inspection indicates that a picker can remain undismissed while navigation/backgrounding occurs. This needs a physical-device UX reproduction.
- **Heuristic deduplication remains ambiguous.** Without references, same-amount cross-channel alerts within three minutes can be joined. Reposted native inbox lines can receive changed identities/timestamps. The report does not claim perfect SMS/push identity for providers that do not expose stable transaction IDs.
- **Unmatched SMS are not durably quarantined.** Import counts an orphan then skips it; successful reads still advance capture cursors. Adding the missing account later may not recover alerts outside the overlap window. A durable review inbox/reprocess flow deserves explicit coverage.
- **Future dates enter weekly totals.** Weekly filters use `off < 7` without `off >= 0` in [insight-context.ts:11](../src/features/insight-context.ts#L11). Impact depends on a future-dated record or clock error reaching state.
- **Production infrastructure was not audited live.** Hosted push gateway JWT configuration, scheduled archive purging, remote retention, actual device revocation and operational backup recovery need separate deployment verification. Their absence from local code alone is not proof that a hosted control is absent.
- **A provider catalog is not validated parser coverage.** Synthetic fixtures exercise catalog recognition and common formats. Real alert samples, package/signature identities, AD/BS dates, account variants and SMS/push pairs still require provider-by-provider device validation. No claim of reliable support for every Nepali institution follows merely from listing it.

## What checked out

The existing tests cover important foundations: opening cutoff arithmetic and integer-paisa accounting, ordinary transfer conservation, selected setup/history decisions, capture serialization and failed-channel cursor handling, local-ledger ownership guards and replay, cloud pagination and mappings, lifecycle cleanup, and authentication prompt concurrency/cancellation. Local SQL checks demonstrated tenant isolation and ownership constraints. No confirmed cross-user database disclosure or biometric fail-open was found in this audit.

Passing those tests does not cover the adversarial inputs and cross-feature sequences above. The structural refactor makes isolated reproduction easier, but interfaces alone do not enforce sync consent, transaction identity or durable-save guarantees.

## Recommended fix order

1. Enforce actual sync consent, and remove or implement simulated account/recovery controls (F01–F02).
2. Correct parsing, transfer identity and occurrence time; harden provider trust (F03–F06, F10, F21).
3. Make balance reconciliation, undo and persistence safe; repair account/transfer deletion invariants (F07–F09, F12–F14).
4. Fix provider selection, rule validation, import bounds and exact notification routing (F11, F15–F16, F20, F22).
5. Correct estimates/recommendations and finish review actions (F17–F19).

For each fix, convert the corresponding evidence case into an assertion of the intended behavior, plus an end-to-end case covering storage/restart where relevant. Do not use the current defect-asserting evidence scripts as acceptance tests.
