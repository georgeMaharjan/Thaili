# Thaili

A personal money tracker for Nepal. Thaili (थैली, "pouch") puts every rupee that moves through your banks, wallets,
sahakari and cash in one place, so you can see where it goes. It reads bank SMS and wallet notifications for you,
runs on the Bikram Sambat calendar, and keeps all of your data on your phone.

**[Download the latest APK](https://github.com/georgeMaharjan/Thaili/releases/latest)** · Android 7.0+ · English and नेपाली

## What it does

- **Captures transactions automatically.** Thaili reads transaction SMS from recognized bank senders and alerts from
  detected bank and wallet apps, including the 90 days of SMS before you install. An SMS and an app alert for the
  same payment become one entry. Wallet loads are paired with the bank debit that funded them, so they aren't
  counted twice.
- **Covers Nepal's institutions.** The catalog includes all 20 commercial and 17 development banks in NRB's
  Mid-August 2026 directory, plus finance, microfinance, infrastructure and cooperative institutions, and the major
  wallets. Thaili spots the money apps installed on your phone and offers to add them.
- **Files spending for you.** Pick a category once and Thaili offers a rule, so the same shop files itself next
  time. New spends wait in a short review queue until they have a category and a note.
- **Shows where money goes.** Home shows what's free to spend this month. Insights splits spending into essential
  and optional and shows cash flow by Bikram Sambat month.
- **Plans savings.** Set a protected savings baseline, then fund goals from the surplus, one at a time (Queue) or
  side by side (Share).
- **Keeps it private.** App lock with fingerprint or phone PIN, a hide-balances switch, light and dark themes.

## Your data stays on your phone

The source in this checkout stores the ledger and local profile on your phone, with no active cloud sync or
financial-data upload service. GitHub update checks send normal network metadata, such as your IP address,
but do not send messages or transactions. Review alerts are generated on the phone without Firebase.

**Version scope:** the public v1.3 APK predates these privacy fixes: it includes the Firebase SDK, enables
Android automatic backup and reads broader SMS body candidates before filtering. These changes need a new
release; they do not alter an APK already downloaded. See the [privacy policy](docs/PRIVACY.md).

Because the phone holds the only copy, **uninstalling Thaili or clearing its data deletes everything** unless you have
a backup:

- **Export:** Settings → Export all data saves a `thaili-backup-<date>.json` file wherever you choose (Downloads by
  default). A cloud document provider can upload the file if you choose one. The current source opts out of
  Android automatic backup and device transfer; this cannot delete backups made by older versions. Export
  again whenever you want a newer copy. The file isn't encrypted by Thaili, so keep it private.
- **Restore:** after reinstalling, choose **Restore from a backup** on the Welcome screen and pick the file. Thaili
  checks the file before restoring anything: it must be a Thaili backup, pass its checksum (edited or damaged files
  are refused) and contain consistent data. Restore never replaces data already on the phone. Afterwards, turn SMS
  and notification access back on, and choose the banks allowed for SMS capture.

Cloud sync was removed on purpose until opt-in consent and server security are in place; see the
[logic audit](docs/LOGIC-AUDIT-2026-10-20.md) and [recommended fixes](docs/LOGIC-REMEDIATION.md).

## Getting started

1. Download `thaili.apk` from the [latest release](https://github.com/georgeMaharjan/Thaili/releases/latest), open it
   on your phone and allow installs from your browser when Android asks.
2. Register with your name and mobile number (kept on the phone), review the privacy policy, then optionally allow SMS access.
3. Discovery checks installed apps and SMS sender names. Select banks to allow body reads, add account balances, and optionally import up to 90 days of history. Settings → Bank SMS access controls each bank separately.
4. Turn on **Accounts → Transaction notifications** so alerts from bank and wallet apps are captured too.

Thaili checks for new versions when it opens; install updates from Settings → App update.

## Limitations

Bank SMS and alert wording varies, and the capture rules don't yet recognize every format. Failed or pending
payments, OTPs, offers and balance-only messages are skipped on purpose. See
[capture support](docs/CAPTURE-SUPPORT.md) for the providers recognized and known gaps.

Planned: a spreadsheet (CSV) export, browsing and restoring deleted entries, and an opt-in cloud backup.

## Development

Built with Next.js (static export) and Capacitor for Android. See [developer setup](docs/SETUP.md) for building,
testing, running on a phone and releasing, and [architecture](docs/ARCHITECTURE.md) for how the code is organized.

## License

[MIT](LICENSE)
