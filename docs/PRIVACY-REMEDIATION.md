# Privacy remediation — v1.4

Prepared 11 November 2026; updated 12 November after connected-device testing. **Published:** [v1.4](https://github.com/georgeMaharjan/Thaili/releases/tag/v1.4) on 12 November 2026,
using the exact candidate APK verified below. The public v1.3 APK and its submitted appeal remain
unchanged; v1.4 is a separate release and is not claimed to have Google approval. The website policy
at https://thaili.georgemaharjan.com.np/privacy now describes v1.4 and retains the older-version
privacy differences. Website commit: `067f3b4`.

## Preserved features

Bank SMS history/import, account-tail detection, background SMS review alerts, installed bank/wallet
app discovery, transaction notification capture, notification catch-up, manual finance tracking,
local transaction-review notifications, JSON export and restore remain available. No production
cloud adapter was connected. Firebase messaging was unused by these features; it is removed.

## Changes

- Discovery queries SMS **sender names only**, not bodies. Suggestions start unselected. Tapping
  Add with selected banks reads only those senders' message bodies to find account details.
- A persisted `smsBanks` allowlist controls ongoing body reads independently of the account list.
  **Settings → Bank SMS access** offers switches for recognized SMS institutions with accounts.
  Empty selection means no inbox body query. Old local snapshots/backups default to empty and need
  one explicit selection after upgrade. Choosing a bank applies to all its shared sender addresses,
  not a cryptographic proof of origin or an account-specific Android permission.
- The native inbox reader enumerates addresses first, then queries bodies with parameterized exact
  address predicates in bounded batches. A personal or unselected sender does not enter a body query.
  Amount/OTP checks remain; transaction parsing remains unchanged. Background SMS checks its sender
  before requesting the body. Legacy v1.3 native capture configuration cannot grant SMS capture
  before the updated app synchronizes its explicit selection.
- Revoking a bank while a catch-up read is pending prevents importing that bank's returned SMS.
  Existing ledger data is retained. Account choices and selected sender patterns also control native
  background review alerts. Notification-package discovery is a separate, disclosed capture channel.
- Android automatic backup and device transfer exclude every supported app-data domain through
  both legacy and Android 12+ rules, with `allowBackup=false`. This cannot delete older OS backups.
  User-initiated JSON export/restore stays available. Export files are readable and can be uploaded
  by a cloud document provider chosen by the user.
- The native notification replay buffer stays capped at 500 and expires records older than 90 days
  when capturing, reading or connecting the listener. This is separate from saved ledger/raw text;
  old files are not asynchronously wiped while the service is inactive.
- A bilingual offline privacy policy is accessible before permission consent and from Settings.
  It covers local profile/ledger/raw text, broad Android permission scope, selected senders,
  notification discovery/retention, export providers, deletion, GitHub update metadata and old-version
  differences. Contact uses the public repository issue tracker.
- FileProvider is limited to Capacitor's app-specific Pictures directory instead of external/cache
  roots. Telephony hardware is optional. Unused exact-alarm permission is removed; review alerts
  post immediately and the obsolete scheduled reminder can still be cancelled.
- Next.js and its ESLint config are updated to 16.4.6; compatible source-map-js update is locked.
  Production npm audit reports zero known advisory findings for the app and website trees checked.
  This does not assess all Maven dependencies, WebView or every possible vulnerability.

## Restored backup recovery

Android SMS and notification access do not come back with a JSON backup. Settings now includes
permission status/actions and **Check for missed bank SMS**. Select banks explicitly after granting
Android SMS permission. Disabled/denied SMS reads preserve the history checkpoint; manual refresh
rescans up to 90 days of retained selected-bank SMS, respecting the existing history cutoff and
transaction deduplication. Choosing a bank or granting SMS permission also triggers catch-up.
Notifications received while the app was uninstalled cannot be recovered from its deleted replay
buffer. No real messages were read during the synthetic-only device tests.

## Validation

- Typecheck passed; 55 application checks passed, including consent persistence/revocation, legacy
  opt-in, selective reads, cancellation, finance/capture regressions and all route/language/theme renders.
- ESLint: zero errors, two existing image-element warnings.
- Android: nine unit tests passed, including new sender-query and retention tests.
- Full release lint passed: zero errors, 18 remaining warnings (not a security certification).
- Static production export, Capacitor sync and signed `:app:assembleRelease` passed.
- Local browser check verified the pre-permission link and readable offline policy. The deployed
  website policy was checked through HTTP and browser rendering. Website build passed; production
  dependency audit reports zero known advisories.
- Final APK inspected: versionName 1.4, versionCode 5, non-debuggable, no Firebase defined classes,
  SMS/notification capture declarations retained, no exact-alarm permission, backup settings and
  compiled XML exclusions verified, FileProvider path verified.
- APK signature verifies using v2 with the same certificate as public v1.3:
  `c581a727f0c4b6e6ca8b93e6dc07bb8daaf3d15e7a3e7cf504c97e399655e9bb`.
- Candidate SHA-256: `9917a4adbcc7008c30fd342f4976db1ee5af04c76646d09b65fc89bf675d929d`.
  Build output: `android/app/build/outputs/apk/release/app-release.apk` (5,826,892 bytes).

Machine-readable results and the policy screenshot are in
[`audits/2026-11-11-play-protect/`](audits/2026-11-11-play-protect/).

## Remaining verification before public release

A Samsung S24 Ultra (Android 17/API 37) was connected on 12 November. The candidate was installed
as an in-place, same-signer update over v1.3 after the owner restored their backup. Synthetic-only
checks run in an isolated package; see [device validation](DEVICE-VALIDATION.md). Real inbox reads,
system-delivered background capture, and OEM-specific behavior remain unverified. An attempted
before/after financial hash comparison had a test-harness persistence error; it is inconclusive,
so the upgrade is not claimed to have passed an exact financial-data comparison.
No cold-start packet capture, actual cloud backup/transfer attempt or independent penetration test
was performed. The exact tested APK is published as v1.4 with its SHA-256 checksum.

Google explicitly lists READ_SMS, RECEIVE_SMS and notification-listener access as triggers for the
sensitive-permission sideloading block in supported markets. Restricting usage in app code does not
remove these manifest capabilities. The fixes improve actual privacy and disclosure while preserving
capture; they do not guarantee a different Play Protect decision. A review of v1.3 is not automatically
a review of this new candidate. See [Google's warning guidance](https://developers.google.com/android/play-protect/warning-dev-guidance).
