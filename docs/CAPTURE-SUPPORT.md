# Provider recognition and transaction capture

The catalog recognizes 25 bank names and 15 wallet/payment-app names. This is a list of code recognition rules,
not a claim that every provider/version has been tested or emits readable transaction notifications.
Only apps actually returned by Android discovery appear in setup. Other apps whose labels/packages look like
banking or wallet apps can also be discovered by the generic heuristics.

## Named institutions

| Banks | Wallets and payment apps |
| --- | --- |
| NIC Asia | eSewa |
| Nabil Bank | Khalti |
| Standard Chartered | IME Pay |
| Everest Bank | Fonepay |
| Global IME | connectIPS |
| Prabhu Bank | Moru |
| Kumari Bank | Namaste Pay |
| Siddhartha Bank | Prabhu Pay |
| Sanima Bank | CellPay |
| Machhapuchchhre Bank | QR Pay |
| Laxmi Sunrise Bank | PayPal |
| Himalayan Bank | Venmo |
| NMB Bank | Cash App |
| Nepal Investment Mega Bank | Google Pay |
| Nepal Bank | Samsung Pay |
| Agricultural Development Bank | |
| Rastriya Banijya Bank | |
| Nepal SBI Bank | |
| Shangrila Development Bank | |
| Muktinath Development Bank | |
| Garima Bikas Bank | |
| Jyoti Bikas Bank | |
| Mahalaxmi Bikas Bank | |
| Kamana Sewa Bikas Bank | |
| Shine Resunga Development Bank | |

`src/lib/institutions.ts` owns names, aliases, package hints and SMS sender rules. Existing package hints cover
NIC Asia, Nabil, Standard Chartered, Everest, Global IME, eSewa, Khalti and IME Pay; other names rely on the
installed app's label. Discovered packages are saved with accounts, including accounts added by hand,
so a failed discovery after restart does not disable their saved capture configuration.
An app's recognition does not add foreign-currency support: the parser currently handles NPR/Rs/रु/रू and
Nepali digits. International payment apps are recognized by name but USD or other foreign-currency alerts
are outside the supported parsing formats.

## SMS coverage

Explicit sender rules currently cover **NIC Asia, Nabil Bank, Standard Chartered, Everest Bank, Global IME
and Khalti**. Known bank wording is parsed first; recognized senders can also use the shared notification
wording parser. Unknown SMS senders are ignored rather than automatically treated as a bank.
Additional banks require representative sender names and transaction examples before enabling SMS rules.
These sender patterns identify messages; they are not authentication of their origin.

## Android setup and capture

Grant SMS permission for inbox reads and live SMS capture. Enable **Accounts → Transaction notifications**
in Android's notification-access settings for bank/wallet push alerts. App permissions are independent:
either channel can work without the other. Browser preview cannot read another app's notifications or SMS.

The Android listener extracts regular, expanded and inbox-style notification bodies, buffers candidate
alerts while Thaili is closed, and wakes the importer while it is open. New-bank SMS also wakes the open app;
an overlapping inbox read handles the interval before the SMS provider saves a received message.
Already visible app alerts are inspected when access connects or capture configuration changes.
The notification buffer keeps the latest 500 candidates; it is not unlimited historical notification access.

The shared parser requires an amount and a completed movement with a clear direction. It handles payments,
receipts, debits, credits, refunds and wallet loads. Failed/pending payments, payment requests, offers,
OTPs, balance-only alerts and conflicting directions are skipped. Valid alerts from newly discovered
financial apps can create an account; they do not replace existing balances or roles.
With multiple accounts at one bank, the account suffix resolves the account. Missing or ambiguous suffixes
remain unmatched rather than choosing the first account.

## SMS and push reconciliation

`transaction-capture.ts` owns capture evidence and duplicate matching; `import-transactions.ts` owns the
parse/resolve/file/reconcile pipeline. Both capture channels feed this same pipeline.

- Match amount, account and direction; a debit and credit of the same amount remain separate.
- Exact IDs identify rereads. SMS IDs derive from the inbox row and message identity; notification IDs
  derive from the Android notification identity, time, body and repeated-line position.
- Matching transaction references join alerts up to seven days apart, including delayed SMS/push reads.
- Without a shared reference, pair at most one SMS and one app alert per account/direction within three
  minutes; different named merchants and distinct same-channel IDs remain separate.
- Identified bank-to-own-wallet transfers absorb a matching wallet credit within fifteen minutes,
  including when the two sides arrive in separate reads. Both sides' evidence prevents replay duplication.
- Manual entries remain independent. Matching updates preserve the saved category and user notes.

Reference-less pairing is a heuristic: separate equal-amount transactions with generic descriptions can
still be ambiguous. Late alerts without shared references remain separate. Hidden/redacted notification
text, new wording, fees that change the two amounts, or changed notification identity without a shared
reference can prevent matching. Wallet-credit pairing also relies on amount, destination and time; a
simultaneous unrelated receipt for the same amount can be ambiguous.

Channel, opaque capture ID, account, direction, timestamp, parsed reference and deterministic text
fingerprint persist independently of the raw body. Raw-text retention being disabled does not remove
this matching evidence. The fingerprint is a matching digest, not encryption or proof of authenticity.
Details displays both channels as **SMS + App** after reconciliation.

## Migration and verification

Apply `supabase/migrations/20261011090000_transaction_capture.sql` before cloud syncing this version.
It adds transaction capture evidence and source package metadata under the existing owner RLS.
Local capture continues to use the phone's durable storage. This migration was applied to the hosted
`thaili` project (`bvflaenxlxgspiondvwp`) on 11 October 2026. Remote verification confirmed both columns,
their non-null empty defaults, the capture-array constraint, enabled RLS and the recorded migration.
The older opening-balance migration's local filename was aligned with its already-applied remote version
`20261001092557`; its SQL was unchanged.

`npm test` covers all catalog labels with synthetic installed-package fixtures, trusted SMS exclusions,
account ambiguity, both SMS/push orders, separate reads, delayed references, distinct references/directions,
one-to-one reference-less pairing, replay, raw-off disk restart, and cross-read wallet transfer conservation.
Money-app and cloud-adapter checks cover saved packages and their mapping round trip.
Android unit tests cover notification text extraction, including identical inbox lines. The native Java
compilation and local migration/RLS tests pass. TypeScript, lint and production build checks also pass
(lint retains the existing Home image warning).

Fixtures do not establish support for actual installed provider versions. A physical Android device and
representative real messages/notifications from each provider still need validation. The hosted schema
was verified after deployment; live application capture and sync against it were not exercised.
