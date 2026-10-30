# Logic audit: removal decisions and recommended fixes

This follows the [20 October logic audit](LOGIC-AUDIT-2026-10-20.md). Finding IDs refer to that historical report. The recommendations below are a plan, not a claim that the remaining defects are fixed.

## Implemented now: remove unenforced features

- **F01:** Production storage is local-only. It has no cloud driver or Supabase session dependency, even when backend environment variables are present. Refresh reads SMS/push capture; it does not upload data.
- **F02:** Removed sync, email/OTP, restore, merge, backup, device management and cloud-deletion screens/actions, their entry points, demo remote data and toggles for mobile-data sync, raw-message sync and phone-join alerts. Removed remote push registration. Existing database adapters and their tests remain disconnected infrastructure for future work.
- **F19:** Removed review's fake Add note and Receipt controls. The working Details note editor remains available.
- Removed the Home sync warning badge and cloud success/permission promises. Settings states that Thaili cloud sync and backup are unavailable. Setup still completes into Home.

Local accounts, transaction IDs, opening balances, rules, goals, preferences and the existing ledger format are preserved. Legacy ownership/pending metadata does not prevent local reopening. The legacy `syncRaw` value continues to govern existing local raw-text retention; it is not exposed as a cloud feature. This change does not delete previously uploaded server records and does not provide recovery after app data is cleared. Previously cloud-only history is not downloaded by this version.

Acceptance coverage: `device-store.check.ts` exercises initialization, edits, retries, network callbacks and reopening with a configured backend and a fetch trap. `application-flow.check.ts` covers setup completion, local financial workflows, all 24 supported screens (96 empty/populated/language renders), absence of retired routes/actions, and the working remark editor.

## Recommended work, in order

Complete each batch independently, keep its changes reviewable, and convert the audit example into a test of the intended behavior. Do not combine this with another broad structural rewrite. Keep the application local-only until record integrity and recovery guarantees are established.

| Order | Finding | Recommended change | Acceptance criterion |
|---|---|---|---|
| 1 | F03 — SMS amount/direction | Use one contextual parsing policy for SMS and push. Bind currency/amount/direction to the movement clause; exclude balances/fees. Quarantine ambiguity instead of guessing. | Balance-first NPR text yields the 500 movement, unsupported-currency movement does not become the NPR balance, and conflicting direction is reviewed. |
| 1 | F04 — Credit absorption | Share reference/identity rules across ordinary deduplication and transfer reconciliation. Never absorb a credit with conflicting references. | LOAD12345 and GIFT99999 remain separate; a verified transfer and its matching credit still count once in either arrival order. |
| 1 | F05 — Wallet ownership | Normalize accepted phone formats consistently. Require a positive match to an owned wallet; do not infer ownership solely from the wallet name. | The fixture's different 96-prefix recipient is an expense/review item, never a transfer to the user's saved wallet. |
| 1 | F06 — Occurrence date | Store occurrence and delivery times separately. Parse provider-specific AD/BS formats and Nepal time explicitly. If dates disagree and cannot be resolved, review before applying to a reconciled balance. | A delayed pre-opening transaction cannot reduce a balance that already includes it; original history remains visible with correct dates. |
| 1 | F10 — Provider trust | Treat label-only detection as an untrusted suggestion. Bind trusted providers to verified package/signature identity and require explicit approval for unknown apps. Use cautious account-tail matching. | An unrelated package labelled Nabil Bank cannot silently post a debit to the real Nabil account. |
| 1 | F21 — Native OTP filtering | Require authentication-specific OTP context. Keep generic merchant/reference codes valid. Align native prefilters with the shared parser's accepted messages. | A merchant code does not drop a completed debit, while real OTPs and authentication messages remain excluded. |
| 2 | F09 — Save failures | Retain the latest unsaved snapshot/revision, expose a real local-save retry and propagate durable-save results. Keep failed state available until saved or explicitly discarded. | A one-time disk failure followed by recovery persists the entry exactly once; reopen verifies it. The UI cannot claim durable success before commit. |
| 2 | F08 — Undo | Replace whole-array snapshots with per-record inverse commands and revision checks. Reverse only the user's operation while retaining unrelated newer records. | Undoing an edit/delete preserves an intervening background entry and unrelated edits after persistence/restart. |
| 2 | F07 — Current balance | Separate metadata editing from explicit balance reconciliation. Pre-fill current derived balance; confirming it stores amount and cutoff atomically even if it equals the original opening. | Opening 1000 → expense 100 → reconcile to 1000 produces 1000, including after restart; metadata-only editing does not rebase history. |
| 2 | F12 — Account deletion | Authenticate the bulk destructive action and confirm its scope. Prefer archive over permanent deletion once a real restore flow exists. | Denied/cancelled authentication removes nothing; confirmation identifies the account and affected records. |
| 2 | F13 — Destination deletion | Define one transfer policy for local state and storage. Prefer retaining an archived account identity, or explicitly normalize a missing destination without inventing an expense. | No dangling destination remains in UI/state; totals and transfer representation agree before and after reload. |
| 2 | F14 — Institution editing | Make institution identity immutable for an established ledger. Allow renaming separately; creating another bank should create another source. If migration is necessary, implement it explicitly. | Renaming cannot switch capture identity; a new institution receives only its own alerts and has clear history ownership. |
| 3 | F11 — Provider selection | Persist approved/ignored providers separately from discovery. Apply the allowlist to package watching, SMS matching and automatic account additions. | A deselected provider's new alert neither imports nor creates an account; opting in later is explicit. |
| 3 | F15 — Rule validation | Route all rule creation/editing, including suggestions, through one validated domain command. Validate duplicate, short and payment-rail keywords before refiling. | TRANSFER is rejected consistently in both the editor and suggestion flow; existing manual categories remain unchanged. |
| 3 | F20 — Nepali rules | Use Unicode-aware normalization consistently across JavaScript and Java. Define meaningful matching/token boundaries for Nepali and mixed-script merchants. | किराना can be learned and matched; unrelated merchants and payment rails do not become false matches. |
| 3 | F16 — Import bounds | Validate representable dates, supported calendar range, positive amount precision and database-compatible limits at import boundaries. Quarantine bad messages per record. | One invalid date/oversized amount does not abort valid imports or repeatedly poison a sync batch. |
| 3 | F22 — Notification routing | Carry a stable source/capture identity through the native review intent. Resolve exactly; fall back to the review list when ambiguous. | With two nearby same-amount debits, a tap opens its own record or the list, never a guessed transaction. |
| 4 | F17 — Goal ETA | Model reserve filling and goal allocation as one contribution timeline. Carry fractional months and redistribute capped shares. | One 50 goal + 50 reserve gap at 100/month takes one month in Queue and Share; multi-goal estimates respect completed goals. |
| 4 | F18 — Allowance | Use conservative rounding and cap recommendations at nonnegative remaining budget. Define inclusion of today explicitly. | With 6 left on the last day, allowance is at most 6; negative remaining never produces positive spending advice. |
| Later | F01 — Future cloud consent | Reintroduce cloud only behind explicit persisted opt-in, authoritative transport/network policy and cancellation of queued requests. Keep raw-text consent separate. | No initial request or retry after opt-out; Wi-Fi-only rules are verified on device; raw text never uploads without the chosen consent. |
| Later | F02 — Future recovery | Implement verified identity, actual snapshots/restoration, conflict previews, device/session revocation and server-confirmed deletion. Prefer portable export/import first to establish independent recovery. | Recover real fixture data onto a clean second install; revoked sessions fail; errors never display success. |
| Later | F19 — Future review tools | If restoring quick Add note, reuse the real editor. Add receipts only with actual capture, persistence, permission denial/cancellation and deletion behavior. | Only user-confirmed text or captured content is saved; no placeholder records or camera-only toast. |

## Other audit risks to address

| Risk | Recommendation |
|---|---|
| Device cursors/security settings shared in cloud | Keep capture cursors, setup history decisions, app lock and visibility per-device before any multi-device release. Share financial data and intentionally shared preferences only. |
| Native raw cache / 500-alert eviction | Define explicit local retention and purge/acknowledgment behavior. Add backlog visibility and catch-up tests beyond the cap. Make retention controls cover the cache as well as ledger storage if that is the promise. |
| Android backup and debug APK | Configure explicit backup/extraction rules for financial/auth data. Use a signed release build and verify upgrade compatibility and lock behavior before wider distribution. |
| Picker Android Back | Give overlays one dismissal registry/stack visible to native Back. Test picker, filter, note editor and nested-sheet dismissal on a physical phone. |
| Heuristic SMS/push deduplication | Prefer stable provider IDs/references. When no positive identity exists, retain uncertain matches in review rather than silently dropping records. Test repeated equal payments and delayed/reposted alerts. |
| Unmatched SMS | Keep a durable review/quarantine inbox with a reason and reprocess action after account/provider details change. Advancing a read cursor must not destroy the opportunity to resolve an orphan. |
| Future dates in weekly totals | Enforce `0 <= off < 7` and quarantine unreasonable future occurrence dates; cover clock changes. |
| Hosted infrastructure | Before re-enabling cloud, verify deployed JWT enforcement, RLS, retention jobs, backup recovery, revocation and deletion against staging. Source inspection is insufficient. |
| Provider coverage | Maintain sanitized real-alert fixtures per institution/channel/version and verified app identity. Publish confidence/limitations; catalog membership alone is not a support guarantee. |

Financial-data fixes should include a preview/reconciliation path for already imported records. Do not silently recalculate or delete the user's existing ledger using a new parser. Identify affected entries, preserve original capture evidence, and make corrections explicit and reversible.
