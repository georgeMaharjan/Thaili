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

Thaili has no account, server or cloud sync. Everything is stored on the phone and nothing is uploaded. The only
network request is the check for a new version on GitHub, and you can also run it from Settings → App update.

Because the phone holds the only copy, **uninstalling Thaili or clearing its data deletes everything** unless you have
a backup:

- **Export:** Settings → Export all data saves a `thaili-backup-<date>.json` file wherever you choose (Downloads by
  default). Export again whenever you want a newer copy; nothing is backed up automatically. The file isn't
  encrypted, so keep it private.
- **Restore:** after reinstalling, choose **Restore from a backup** on the Welcome screen and pick the file. Thaili
  checks the file before restoring anything: it must be a Thaili backup, pass its checksum (edited or damaged files
  are refused) and contain consistent data. Restore never replaces data already on the phone. Afterwards, turn SMS
  and notification access back on.

Cloud sync was removed on purpose until opt-in consent and server security are in place; see the
[logic audit](docs/LOGIC-AUDIT-2026-10-20.md) and [recommended fixes](docs/LOGIC-REMEDIATION.md).

## Getting started

1. Download `thaili.apk` from the [latest release](https://github.com/georgeMaharjan/Thaili/releases/latest), open it
   on your phone and allow installs from your browser when Android asks.
2. Register with your name and mobile number (kept on the phone), then allow SMS access.
3. Let Thaili find your bank and wallet apps, add each account's balance, and import your SMS history.
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
