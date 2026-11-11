# Additional security and disclosure review — 11 November 2026

## Conclusion

**The app has not been shown to be free of all other issues.** The supplied screenshot identifies
Google's sensitive-permission installation block, but does not establish that Google will approve
the APK after review. The additional source/build checks below found issues worth addressing.
None has been established as an additional Google rejection reason, and no Google decision has
been received.

This review covers the downloaded, published v1.3 APK (SHA-256
`01bfaf8eb2c4352ea02871711b13e0f67de2910d4e9852a87703d843e624347e`), first-party source, Capacitor
bridge defaults, dependency advisories and the current local Android release lint report. The local
source differs from the published APK in the previously prepared Firebase removal. Findings that
remain in the published version are distinguished below.

## Findings

### 1. Privacy statements do not fully describe the published build — priority 1

The README says that nothing is uploaded and GitHub update checks are the only network requests
(`README.md:28`). The published APK includes Firebase messaging, its initialization provider and
Google project resources. No production JavaScript caller uses remote push, but a native SDK's
automatic initialization is independent of those calls.

Firebase documents that automatic registration can upload an identifier and configuration to its
backend. This is **not evidence that Thaili uploads financial message bodies**, nor has runtime
traffic from v1.3 been captured. It is enough that the blanket network/privacy claim is not
substantiated by disconnecting the JavaScript registration alone.

**Status:** unused Firebase messaging and Google Services build wiring were removed locally earlier
in this task. A rebuilt APK was inspected to confirm their absence. The public v1.3 APK intentionally
remains unchanged for the submitted appeal and still has the SDK.

**Remediation:** include the prepared removal in a future version and verify cold-start network
traffic. Keep the app's own notification listener and local review notifications. Align the public
privacy statements with the exact distributed binary and any remaining OS-managed behavior.

Source: [Firebase automatic initialization](https://firebase.google.com/docs/cloud-messaging/android/get-started#prevent-auto-init).

### 2. Android backups are enabled despite the automatic-backup claim — priority 1

`android/app/src/main/AndroidManifest.xml:4` sets `allowBackup="true"` and declares no
`fullBackupContent` or `dataExtractionRules`. The published manifest has the same setting.
The README says nothing is backed up automatically (`README.md:35`). Native notification records
are in private SharedPreferences, which need an explicit backup policy along with the financial
ledger and profile. Exact inclusion and cloud/device-transfer behavior depend on Android and OEM
behavior; actual cloud upload or restoration was not tested.

**Remediation:** define version-appropriate backup/extraction rules and accurately disclose the
chosen behavior. Preserving user-initiated JSON export/restore does not require enabling automatic
cloud backup. If retaining OS-managed backup, document it and protect sensitive data appropriately.

Sources: [Auto Backup](https://developer.android.com/identity/data/autobackup),
[Android backup security](https://developer.android.com/privacy-and-security/risks/backup-best-practices).

### 3. SMS access is broader than the onboarding wording suggests — priority 1

The onboarding title says only bank transaction messages are read (`src/application/config.ts:101`).
But `ThailiPlugin.readSms` queries all inbox addresses/bodies since a timestamp
(`android/app/src/main/java/com/george/thaili/ThailiPlugin.java:284`). Its native filter checks amount
and OTP patterns, not whether the sender is a recognized bank. Candidate messages then cross into
JavaScript, where transaction import/discovery performs bank identification. A personal SMS
mentioning a rupee amount can therefore be read and returned to the app layer before being rejected.
This is local processing; no remote exfiltration path for these bodies was identified.

The native API's lower bound is caller-controlled, while the application currently requests the
90-day onboarding window. Android itself grants broad inbox access; it does not grant bank-only
permission.

**Remediation:** accurately explain the scope before permission is granted. Minimize native body
reads/bridge output by identifying recognized senders as early as practical, while preserving
onboarding discovery and catch-up. Retain optional permission controls. Replace dismissive wording
about an alarming system dialog (`src/features/onboarding/view-model.ts:184`) with an accurate
explanation of access, processing and revocation.

### 4. No dedicated, accessible privacy policy was found — priority 1

The app permission and settings screens have local-storage statements but no privacy policy link.
The inspected website has a privacy marketing section, rather than a complete policy covering
SMS/notification scope, installed-app discovery, SDK metadata, native retention, OS backups,
exported files, deletion and contact details. An explicit local name/mobile profile is also required
during onboarding (`src/features/onboarding/view-model.ts:269`). That information stays in the
production ledger, but the need for a mandatory mobile number should be justified or reduced.

**Remediation:** publish a policy that matches the shipped build and link it before capture consent
and from Settings. Explain local processing and all exceptions precisely. This is a transparency
recommendation for off-Play review; absence of a particular policy-page format has not been shown
to be an automatic Play Protect rejection condition.

Google's [Mobile Unwanted Software principles](https://developers.google.com/android/play-protect/mobile-unwanted-software)
require transparent functionality and responsible handling/disclosure of sensitive data.

### 5. Native notification history has incomplete retention controls — priority 2

`ThailiNotificationListener` stores the full body of up to 500 matching notifications in private
SharedPreferences (`ThailiNotificationListener.java:76`). It has a count cap but no age expiry or
post-import acknowledgement/removal. The `syncRaw` preference controls the ledger snapshot
(`src/lib/pouch.ts:17`) but is absent from the native capture configuration
(`src/domain/capture-contract.ts:2`). Turning that legacy preference off would not erase/prevent
native raw-body storage. No current Settings toggle for that legacy preference was found, so this
is not presented as a proven broken user-facing toggle.

**Remediation:** define and disclose retention for both storage layers. Purge acknowledged native
records or expire them safely, retaining enough replay evidence for background catch-up. Ensure
data-deletion/retention choices also cover native storage. Full Android app-data clearing remains
the existing way to erase all app-private data.

### 6. FileProvider paths are unnecessarily broad — priority 2

`android/app/src/main/res/xml/file_paths.xml:3` exposes the external and cache roots as provider
paths (`path="."`). The provider is not exported and requires URI grants, so this does not
establish that another app can freely read those directories. No exploit was demonstrated.

**Remediation:** narrow paths to needed files after checking Capacitor file-chooser use. Backup
export already uses the document picker. See
[Android FileProvider guidance](https://developer.android.com/privacy-and-security/risks/file-providers).

### 7. Dependency audit reports vulnerable packages — priority 2 for maintenance

`npm audit --omit=dev --json` completed against npm's advisory service. It reported **four package
nodes: one critical and three high**: `next`, `postcss`, `sharp`, `source-map-js`. These are package
severity summaries, not four demonstrated attacks or four distinct CVEs. The raw audit lists
multiple underlying advisories. The suggested Next.js update was `16.4.6`.

Reachability matters: Thaili packages `out/` static HTML/CSS/JavaScript into Capacitor, with image
optimization disabled. It does not run a Next.js server on the phone. For example, the maintainer's
[Windows server RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
requires a Windows-hosted server; the audited phone build does not meet that condition.
[PostCSS's source-map issue](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q)
requires an affected Node CSS-processing context with attacker-influenced CSS. No such production
phone feature was found. The examined web assets contained no Next server, Sharp or Node
`child_process` indicators. String checks alone are not a proof of complete vulnerability absence.

**Remediation:** update compatible dependencies, rebuild and rerun capture/storage tests. Do not
represent these raw severity scores as evidence of an exploitable critical Android vulnerability
or as a confirmed cause of Play Protect rejection. The separate Vercel website has its own dependency
tree and needs its own assessment; this npm report is for the Android app repository.

Evidence: [production dependency audit](audits/2026-11-11-play-protect/production-dependency-audit.json).
Architecture reference: [Next static export](https://nextjs.org/docs/app/guides/static-exports).

### 8. Full Android lint is not clean — priority 3, compatibility

The earlier release build/vital lint and unit tests passed. The additional **full**
`:app:lintRelease` check completed its analysis and failed with **2 errors and 19 warnings**.
Both errors are `PermissionImpliesUnsupportedChromeOsHardware`: SMS permissions imply telephony
hardware without an explicit optional `android.hardware.telephony` feature declaration.
Warnings include locale handling, resource/icon issues and outdated dependency notices. These
results are not a malware verdict and do not explain the screenshot's fraud-protection dialog.

**Remediation:** declare telephony optional if manual/notification-only use is intended on devices
without it, check behavior there, and address relevant warnings. The merged manifest also contains
`SCHEDULE_EXACT_ALARM` from local notifications although no active exact scheduling feature was
found; review whether this permission can be removed without affecting supported behavior.

Evidence: [Android lint summary](audits/2026-11-11-play-protect/android-release-lint-summary.json).

## Reassuring observations and limits

- The published APK's signature, checksum, non-debuggable state and target API were verified earlier.
- Production ledger construction supplies no cloud adapter. No Supabase URL or service-role marker
  was found in the examined published web assets; no keystore/private-key file was found by the
  filename/content indicator checks. These are targeted checks, not a comprehensive secret scan.
- No first-party accessibility control, SMS sending, silent APK installation, shell command execution
  or dynamic native code loader was found in the inspected source.
- The SMS receiver is guarded by `BROADCAST_SMS`; notification capture restricts configured packages;
  permission grants use Android's dialogs/settings. No current first-party rendering of raw
  transaction text through `dangerouslySetInnerHTML` was found.
- Capacitor is configured for packaged local assets with no remote `server.url` or broad
  `allowNavigation` override. Its inspected defaults disable mixed content and restrict bridge
  origins; release web debugging is not enabled by app configuration.
- VirusTotal reported 0/67 detections, with unsupported/failed engines including a failed Google
  scan. That does not certify the APK or guarantee review approval.
- No on-device packet capture, backup/restore behavior test, hostile-content penetration test,
  exhaustive binary reverse engineering or independent review was performed. The production npm
  audit is not a complete audit of Maven/native dependencies, Android System WebView or all SDKs.

The submitted public APK was not modified, and no further appeal was sent during this review.
Only evidence/documents were added. The findings above can be remediated in a separately versioned
build while preserving bank SMS, wallet notifications and local transaction capture. Even a clean
audit cannot guarantee a Google classification outcome.


## Remediation follow-up

The findings above describe the earlier audit and published v1.3, which remains unchanged. The
local v1.4 candidate now addresses the identified source/configuration issues. See
[PRIVACY-REMEDIATION.md](PRIVACY-REMEDIATION.md) for exact changes, validation and limits. No new
appeal or public APK replacement was submitted as part of this remediation.
