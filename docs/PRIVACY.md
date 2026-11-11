# Thaili privacy policy

Updated: 12 November 2026. Developer: George Maharjan. Contact: https://github.com/georgeMaharjan/Thaili/issues.

**Release scope:** the policy below describes the published [v1.4 APK](https://github.com/georgeMaharjan/Thaili/releases/tag/v1.4). The older v1.3 includes Firebase messaging, permits Android automatic backup, reads broad SMS body candidates before filtering, and has a notification buffer capped at 500 records without age expiry. There is no evidence from this review that financial message bodies were uploaded; cold-start network traffic has not been measured. The [security review](PLAY-PROTECT-SECURITY-REVIEW.md) records these limitations.

## Information stored on your phone

Thaili stores your name, mobile number, account details and last digits, balances, transactions, categories, rules, savings goals and preferences in private app storage on your phone. Imported transactions can include the original matching bank message. Thaili has no active cloud sync, advertising or financial-data upload service. App lock protects opening the app; it does not encrypt exported files.

## SMS: choose banks first

SMS permission is optional and Android grants access to the entire inbox. To suggest banks, Thaili checks sender names from the last 90 days without reading message bodies. After you select banks and tap Add, it reads bodies only from those banks’ sender addresses. OTPs and non-transactions are filtered locally. Other messages from a selected bank can be read before filtering; sender selection cannot distinguish accounts that share the same bank sender. Change banks under Settings → Bank SMS access.

## App discovery and notification access

Names and package identifiers of launchable apps are checked locally to identify banks and wallets. Thaili does not open banking apps or request their login credentials. Optional Android notification access can expose notifications from all apps. Thaili processes and retains transaction alerts only from configured detected bank and wallet packages, which can discover and add accounts. The SMS bank selection does not control this separate notification channel.

## Notifications and retention

A private replay buffer keeps up to 500 original transaction alerts so capture can catch up while Thaili is closed. Records older than 90 days are pruned when alerts are captured, the buffer is read, or the listener connects. Imported transactions and their saved original text remain in your ledger until deleted. Review notifications are generated on the phone and do not require Firebase or server push.

## Backups and restoration

This build excludes app data from Android automatic cloud backup and device transfer. Export all data writes a readable JSON file, without Thaili encryption, to the location you choose. A local folder keeps it local; choosing a provider such as Drive can upload it to that service. Protect the file because it contains financial and profile information. You can restore from an exported file.

## Network requests and external services

Update checks contact the public GitHub Releases API. GitHub can receive your IP address and technical request metadata; Thaili does not send your ledger or messages with the request. APK downloads and website visits are subject to their hosts’ policies. This build does not include Firebase Cloud Messaging.

## Your controls and deletion

Revoke SMS or notification access in Android Settings at any time. Manual entry works without either permission. Turning a bank off in Bank SMS access stops new body reads; it does not erase previously imported transactions. To erase the private ledger, profile and notification buffer, clear Thaili’s app storage in Android Settings or uninstall. Separately delete exported files, older OS backups and downloads outside the app.

## Contact and version scope

Developer: George Maharjan · https://github.com/georgeMaharjan/Thaili/issues. Policy date: 11 November 2026. This policy describes this build. The older public v1.3 included the Firebase SDK, enabled Android automatic backup and read broader SMS body candidates before sender filtering. New backup settings cannot delete existing backups.

The same policy is available offline in English and Nepali from the permission screen and Settings. The website policy describes v1.4 and includes the older v1.3 differences.
