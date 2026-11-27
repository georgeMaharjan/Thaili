# Project audit — 27 November 2026

This audit checks the current source against the earlier logic audit, reviews shared screen patterns, and inspects the running onboarding screen. It is source and visual inspection; tests and device flows were not run.

## Findings by priority

| Priority | Finding | Status | Action |
|---|---|---|---|
| P1 | SMS parsing could choose a balance amount before the transaction amount, or accept an ambiguous direction. | Fixed | Route SMS amounts and direction through the same movement-aware parser used for app notifications. |
| P1 | Wallet reconciliation could merge equal-value credits with a different transaction reference. | Fixed | Keep records separate when both sides provide references and they conflict. |
| P1 | A failed local write has no scheduled retry. The app shows an error, but a process exit before another edit or successful write can lose that change. | Open | Needs a durable recovery policy and restart/offline acceptance flow. In-memory retry alone cannot guarantee recovery after process death. |
| P1 | Imported transactions use the message delivery time; provider-specific dates in the message are not parsed. This can affect opening-balance cutoffs and monthly reports. | Open | Requires provider-specific date fixtures and a correction/reconciliation path for existing entries. |
| P1 | Installed-app recognition can treat a matching display label as a known institution. A different app can use a bank-like label. | Open | Requires verified package identity/signature data and a review path for unknown providers. |
| P2 | The daily allowance rounded to the nearest Rs 10 and could recommend more than the remaining budget. | Fixed | Round down and cap the advice at the available amount. |
| P2 | The add-transaction and transaction-detail category pickers duplicated chip layout. | Fixed | Both now use the shared `Chips`/`Chip` UI, including category icon and color. |
| P2 | A money notification searched only debit entries, then fell back to Needs review. Income, transfers, filed entries, and unmatched captures could open an empty list. | Fixed | Open a unique timestamp match regardless of direction. For ambiguous or missing matches, clear stale filters and show the recent transaction list. Daily review taps also reset stale filters. |
| P2 | Removing an account can leave a transfer whose destination points to the removed account in current in-memory state. | Open | Define and apply one transfer-destination policy to UI state, local storage, undo, and reload. |
| P2 | Removing an account immediately deletes its transactions and relies on a short undo toast. | Open | Add a clear confirmation that names the account and affected entry count before removal. |
| P3 | Settings and insights still contain explanatory copy in several places. Some copy explains privacy or calculation rules and should remain; a screen-by-screen copy pass is still needed for redundant helper text. | Open | Trim only copy that repeats the visible control or result, while retaining privacy and financial-rule explanations. |

## Changes made

- `src/lib/sms.ts` now gets SMS amount and direction from the contextual movement parser, which filters balance/fee amounts and rejects conflicting movements.
- `src/lib/import-transactions.ts` now refuses wallet pairing when both records have references and any references conflict.
- `src/lib/finance.ts` now rounds the daily allowance down to a ten-rupee step.
- `src/components/ui.tsx` adds chip sizing to the existing shared list; both category assignment screens use it.
- Removed the obsolete add-category picker value/setter from the Home screen contract.

## Scope notes

The 5 October visual audit and 20 October logic audit are historical. Local persistence, storage recovery, and several privacy findings have since changed; this report carries forward only issues still visible in current source. It does not claim Android device, parser-fixture, or persistence-failure validation.
