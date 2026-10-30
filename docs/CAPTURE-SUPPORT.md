# Provider recognition and transaction capture

The catalog covers **106 Nepal banks and financial institutions** from [NRB’s Mid-August 2026 licensed directory](https://www.nrb.org.np/bfr/bfis-list-in-english-mid-aug-2026/), the latest published list checked on 12 October 2026. It also recognizes 15 wallet/payment apps.

| NRB category | Catalog entries |
| --- | ---: |
| Commercial banks (Class A) | 20 |
| Development banks (Class B) | 17 |
| Finance companies (Class C) | 16 |
| Microfinance institutions (Class D) | 51 |
| Infrastructure bank | 1 |
| Cooperative bank | 1 |

Central banking, foreign representative offices, hire-purchase companies and hydropower investment companies are outside the retail account catalog. Listing an institution does not establish that it offers a consumer app or readable alerts, or that its operations are unrestricted.

## Banks

**Commercial banks**

Nepal Bank, Agricultural Development Bank, Nabil Bank, Nepal Investment Mega Bank, Standard Chartered, Himalayan Bank, Nepal SBI Bank, Everest Bank, Kumari Bank, Laxmi Sunrise Bank, Citizens Bank International, Prime Commercial Bank, Sanima Bank, Machhapuchchhre Bank, NIC Asia, Global IME, NMB Bank, Prabhu Bank, Siddhartha Bank, Rastriya Banijya Bank.

**Development banks**

Narayani Development Bank, Karnali Development Bank, Excel Development Bank, Miteri Development Bank, Muktinath Development Bank, Corporate Development Bank, Sindhu Bikas Bank, Salapa Bikash Bank, Green Development Bank, Shangrila Development Bank, Shine Resunga Development Bank, Jyoti Bikas Bank, Garima Bikas Bank, Mahalaxmi Bikas Bank, Lumbini Bikas Bank, Kamana Sewa Bikas Bank, Saptakoshi Development Bank.

**Infrastructure bank**

Nepal Infrastructure Bank.

**Cooperative bank**

Rastriya Sahakari Bank.

The complete finance-company and microfinance lists are in `src/lib/nepal-bfis.ts` and available in the manual account picker. Existing account keys remain stable. The picker and discovery share one catalog, replacing the earlier six-bank manual list and 25-bank recognition list.

**Wallets/payment apps:** eSewa, Khalti, IME Pay, Fonepay, connectIPS, Moru, Namaste Pay, Prabhu Pay, CellPay, QR Pay, PayPal, Venmo, Cash App, Google Pay and Samsung Pay.

## Discovery and push alerts

Only apps returned by Android discovery, or institutions identified from completed transaction SMS, appear in scan results. A bank found from SMS does not acquire a fabricated app package. Existing app/SMS evidence is combined into one institution and saved packages are preserved. Nontransaction SMS, OTPs and unknown senders do not create scan results. Accounts can also be added by hand from the full catalog.

`nepal-bfis.ts` owns the dated licensed directory and name aliases. `institutions.ts` combines it with existing package hints and sender rules. Specific identities win over broad brand matches, so NIC Asia, NMB, Global IME, Laxmi and Himalayan microfinance subsidiaries stay separate from their parent banks. Prabhu Pay stays separate from Prabhu Bank.

Package hints remain for NIC Asia, Nabil, Standard Chartered, Everest, Global IME, eSewa, Khalti and IME Pay. Other providers use their discovered package and label. Unknown banking apps can still be recognized through generic banking-label heuristics. App recognition does not add foreign-currency support: the parser handles NPR/Rs/रु/रू and Nepali digits; USD and other currencies are outside current parsing formats.

## SMS coverage

All catalog institutions have exact name-based sender recognition, allowing spaces, underscores/hyphens and optional ALERT/SMS/INFO suffixes. Selected bank brands and common institution abbreviations are also included. Existing sender patterns for NIC Asia, Nabil, Standard Chartered, Everest, Global IME and Khalti remain compatible. These are identity recognition rules, **not verified SMS sender IDs for every bank** or proof of a message’s origin.

The shared parser requires completed transaction wording, direction and a supported amount; it excludes OTPs, promotions, failed/pending payments and balance-only messages. Named senders and abbreviations can vary by carrier or provider. Numeric short codes and unrecognized/truncated sender variants remain ignored; representative alerts are needed to add them precisely. Full catalog recognition does not mean every real provider format has been tested.

The same generated sender patterns are sent to Android background capture for selected accounts. SMS and push permissions remain independent, and both feed the same reconciliation pipeline.

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

## Choosing history during setup

Discovery and history preview do not commit transactions automatically. Live import waits for setup to finish. **Skip — start from today** saves a lower timestamp boundary for both SMS and app notifications, including old notifications buffered recently. The boundary survives restart and cannot be crossed by overlapping reads. Choosing **Import them** explicitly accepts the history window; imported history at or before an account’s confirmed opening timestamp does not change its current balance.

Zero is a valid opening balance when explicitly saved. Old unwanted imports from earlier builds are not deleted automatically.

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

`npm test` runs 24 check files and covers all 106 NRB catalog entries with synthetic installed-package and SMS/push fixtures, name/abbreviation recognition, SMS-only discovery, the complete manual picker, parent/subsidiary separation, unknown sender and OTP exclusions,
account ambiguity, both SMS/push orders, separate reads, delayed references, distinct references/directions,
one-to-one reference-less pairing, replay, raw-off disk restart, and cross-read wallet transfer conservation.
Money-app and cloud-adapter checks cover saved packages and their mapping round trip.
Android unit tests cover notification text extraction, including identical inbox lines. The native Java
compilation and local migration/RLS tests pass. TypeScript, lint and production build checks also pass
(lint reports two image performance warnings).

Fixtures do not establish support for actual installed provider versions. A physical Android device and
representative real messages/notifications from each provider still need validation. The hosted schema
was verified after deployment; live application capture and sync against it were not exercised.
