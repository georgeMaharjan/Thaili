# Play Protect investigation — 11 November 2026

Follow-through completed on the same date: the published APK was scanned, the appeal was submitted
while signed in, and website/release-note guidance was corrected. See the
[submission record and evidence](PLAY-PROTECT-APPEAL.md). A Google classification decision is pending.

The subsequent [security and disclosure review](PLAY-PROTECT-SECURITY-REVIEW.md) found additional
issues to address. The screenshot diagnosis is not a claim that permissions are the app's only
security or review concern.

## Diagnosis

The supplied screenshot confirms Google's **sensitive-permission installation block** for
`com.george.thaili`. Its title is “App blocked to protect your device” and it describes a risk of
identity theft or financial fraud. There is only an OK button.

Thaili is downloaded through a browser and declares `READ_SMS`, `RECEIVE_SMS`, and a notification
listener service. This matches Google's documented conditions for this block in markets where the
protection is active. It is distinct from an unknown-app scan prompt or a specific malware finding.
The screenshot alone does not establish a malware detection. See
[Google's warning guidance](https://developers.google.com/android/play-protect/warning-dev-guidance#app-blocked-to-protect-your-device).

These permissions enable the product's core automatic capture. Moving them to a later consent
screen, changing hosting, or publishing the source does not remove their declarations from the APK.
Removing SMS access loses SMS capture/history; using notification capture alone still leaves another
permission covered by this protection. SMS Retriever and SMS User Consent are verification APIs,
not replacements for reading a bank transaction history.

## Published APK verification

The live page at `https://thaili-chi.vercel.app` links to GitHub Releases, rather than a separate
Vercel-hosted APK. On the investigation date, the latest release was:

| Check | Result |
| --- | --- |
| Release | v1.3, published 8 November 2026 |
| Asset | `https://github.com/georgeMaharjan/Thaili/releases/download/v1.3/thaili.apk` |
| Package | `com.george.thaili` |
| Version name / code | `1.3` / `4` |
| Downloaded size | 7,127,014 bytes |
| APK SHA-256 | `01bfaf8eb2c4352ea02871711b13e0f67de2910d4e9852a87703d843e624347e` |
| Signing certificate SHA-256 | `c581a727f0c4b6e6ca8b93e6dc07bb8daaf3d15e7a3e7cf504c97e399655e9bb` |
| Signature | `apksigner verify` passes; APK Signature Scheme v2; RSA 4096 |
| Signer | `CN=George Maharjan, O=Thaili, C=NP` |
| Debuggable | `false` |
| Minimum / target Android API | `24` / `36` |
| ZIP integrity | No corrupt entries found |
| Compared with pre-change local release | Identical SHA-256 |

This rules out an unsigned/debug build and a stale target SDK as explanations for the supplied
warning. A valid signature authenticates the APK; it does not guarantee a Play Protect approval.
This was a targeted source/build inspection, not a full malware or penetration audit. No device
installation or live network-traffic capture was performed; phone model, Android version and
country remain unconfirmed.

## Features and their permissions

| Feature | Implementation | Why access remains necessary |
| --- | --- | --- |
| Import up to 90 days of bank SMS and catch up on missed messages | `ThailiPlugin.readSms`, application capture/discovery | `READ_SMS` reads the inbox; native code filters amount/OTP patterns and the application matches recognized transaction senders |
| React to bank SMS while closed | `SmsReceiver`, `Capture` | `RECEIVE_SMS`; receiver is guarded by `BROADCAST_SMS` |
| Capture bank/wallet app alerts | `ThailiNotificationListener` | Notification access; capture is limited to configured account packages and transaction patterns |
| Notify the user to review transactions | `Capture`, `src/lib/notifications.ts` | Local notifications and `POST_NOTIFICATIONS`; independent of Firebase remote push |
| App lock | `ThailiPlugin.authenticate` | AndroidX biometric/device credential authentication |
| Backup export/restore | `ThailiPlugin.saveFile`, `src/lib/backup.ts` | User-selected document export; no remote push required |

The inspected manifest does not request accessibility, SMS sending, contacts, call logs,
`QUERY_ALL_PACKAGES`, or APK installation permission. Production ledger storage is explicitly local
in `src/lib/store.ts`; Supabase adapters are disconnected.

## App-side cleanup completed

The published v1.3 APK still contains `@capacitor/push-notifications`, Firebase messaging services,
Firebase initialization, and Google project resources. There are no production `PushNotifications`
calls. This is separate from the native service that reads bank/wallet notifications.

Removed the unused remote push dependency and Google Services Gradle wiring, then regenerated the
Capacitor Android project. SMS capture, notification listening, local review alerts and all other
product features remain in place. Firebase documents that automatic registration can send an
identifier and configuration to its backend, so merely disconnecting JavaScript registration was
insufficient to substantiate the README's only-GitHub-network-request claim. See
[Firebase initialization guidance](https://firebase.google.com/docs/cloud-messaging/android/get-started#prevent-auto-init).
No runtime traffic from v1.3 was measured. **This cleanup does not remove the permissions responsible
for the installation block and is not a promised Play Protect fix.**

Other observations for a subsequent privacy pass:

- `android:allowBackup="true"` permits Android-managed backups, while the README says nothing is
  backed up automatically. Align the backup policy and disclosure; account for Android version/OEM
  behavior. See [Android backup guidance](https://developer.android.com/privacy-and-security/risks/backup-best-practices).
- The app FileProvider declares broad external/cache `.` paths. It is not exported, and no external
  exploit was demonstrated, but narrow or remove unused paths. Export currently uses Android's
  document picker. See [FileProvider guidance](https://developer.android.com/privacy-and-security/risks/file-providers).
- Permission explanations should acknowledge that Android grants broad SMS/notification access,
  then describe Thaili's filtering, local processing and revocation controls. A public privacy page
  should describe OS backup and exported files accurately.

These observations are not established causes of the screenshot's block. This change leaves backup
behavior, parsing, storage, and permission flows untouched.

## Resolution while retaining automatic capture

1. **Request a Play Protect classification review for the exact distributed APK.** Use the
   [Play Protect appeal form](https://support.google.com/googleplay/android-developer/contact/protectappeals)
   and the [submission record](PLAY-PROTECT-APPEAL.md). The form currently requires the package,
   SHA-256 of the APK uploaded to VirusTotal, contact details, and supporting information. Supply
   the warning screenshot and consent/capture evidence through available form fields or public
   supporting links. Google must decide the outcome; an appeal is not a guaranteed exemption.
2. **Keep the existing signing key and package.** A different key can prevent upgrades and force an
   uninstall, risking local data. For the next public release, raise version code/name, build and
   verify the final APK, publish its checksum, and use that APK's hash for any review. The current
   submitted appeal identifies the existing v1.3 bytes, not a rebuilt APK with the same version name.
3. **Correct installation guidance on the website and GitHub release.** Both currently suggest
   an Install anyway path. The supplied dialog has no such path. Suggested replacement:

   > Thaili uses optional SMS and notification access for automatic transaction capture. On some
   > devices, Play Protect blocks browser-downloaded apps with these permissions. If you see a
   > sensitive-data installation block, installation cannot continue through that dialog. Report
   > the warning with your Android version and country so we can track compatibility and request
   > review. Allowing installs from your browser and allowing notification access are separate
   > Android settings.

   The website's source is in the sibling `thaili_website` repository. Its guidance was corrected,
   built, published as commit `aa048ef`, and verified live. The v1.3 release notes were also corrected.
   The uploaded APK was scanned and the appeal was submitted; the existing public APK and checksum
   assets were left unchanged. No new APK version was released.
4. **Handle developer identity verification separately.** Google provides Android Developer Console
   for distribution outside Play, including open-source apps. Register the package and existing
   signing certificate when applicable; this does not require publishing on Play. It also does
   not replace a Play Protect classification review. Google's current timeline starts regional
   protections for participating stores on 30 September 2026, with wider expansion in 2027.
   See [verification overview](https://developer.android.com/developer-verification) and
   [open-source registration](https://developer.android.com/developer-verification/guides/open-source-app-registration?hl=en).

If review does not resolve browser installation, evaluate a reviewed alternative distribution
channel on the affected devices before promising it to users. A different store or installer is not
proof of exemption: [Play Protect also scans apps regardless of source](https://developers.google.com/android/play-protect/client-protections).
Open source and Play distribution are compatible, but Play publication is not required for filing
this appeal. If that distribution decision ever changes, Google's
[SMS permission policy](https://support.google.com/googleplay/android-developer/answer/10208820?hl=en)
lists SMS-based money management as an exception subject to review, not automatic eligibility.

There is no manifest setting that guarantees unrestricted browser installation on every protected
device while keeping these same sensitive capabilities.

## Cleanup validation

- Type checking passed; all 53 application checks passed.
- ESLint passed with two existing image-element warnings; production static export passed.
- Android unit tests passed (4 tests), and the release APK built successfully.
- Rebuilt APK signature verified against the existing release certificate.
- Rebuilt manifest retained SMS capture, the bank/wallet notification listener, local notification
  components and biometric permissions. Firebase components, Google project resources and the
  Firebase receive permission were absent.

That initial cleanup APK was a local validation candidate without a version increase. The later
v1.4 candidate is documented in [PRIVACY-REMEDIATION.md](PRIVACY-REMEDIATION.md). Neither has
replaced the public v1.3 asset, and no Play Protect acceptance has been established for either build.

## Repeat the APK checks

Run against the APK actually offered to users, using the installed Android SDK build tools:

```bash
shasum -a 256 thaili.apk
apksigner verify --verbose --print-certs thaili.apk
aapt dump permissions thaili.apk
apkanalyzer manifest debuggable thaili.apk
apkanalyzer manifest target-sdk thaili.apk
apkanalyzer manifest print thaili.apk
```

For a candidate built after this cleanup, verify that the SMS permissions, notification listener and
local notification components remain, while Firebase services/resources and the
`com.google.android.c2dm.permission.RECEIVE` permission are absent. Keep the old published APK's
hash distinct from the new candidate's hash.
