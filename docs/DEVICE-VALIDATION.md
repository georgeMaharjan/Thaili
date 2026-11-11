# Connected-device validation — 12 November 2026

Device: Samsung Galaxy S24 Ultra, Android 17 / API 37. Candidate: v1.4 (versionCode 5),
same release signing certificate as public v1.3. At the time of testing, the public download and existing appeal were unchanged. The exact tested APK was subsequently published as [v1.4](https://github.com/georgeMaharjan/Thaili/releases/tag/v1.4); the existing v1.3 appeal remains unchanged.

## Restore-gap fix

The owner restored a JSON backup after reinstalling, then reported missing transactions and no SMS
permission control in Settings. Android permissions are not restored by a JSON backup. Previously,
the native SMS bridge resolved an empty read when permission was denied, allowing the application
to advance its SMS checkpoint. A subsequent ordinary refresh could miss the interval.

- Denied SMS reads now reject; disabled banks and failed reads do not advance the SMS checkpoint.
- Settings shows SMS and notification-reading access, links to Android permissions, and explains
  that restoring a backup does not restore permissions.
- Enabling a bank or granting SMS access triggers catch-up. Manual transaction refresh and
  **Check for missed bank SMS** rescan retained selected-bank SMS from up to 90 days ago, subject
  to the saved history cutoff. Existing transactions are deduplicated.
- No bank selection means no SMS body query. Recovery requires Android SMS permission and an
  explicit bank selection. It cannot recreate deleted SMS or notifications missed while uninstalled.

## Scope and isolation

The owner authorized synthetic fixtures only. Neither SMS nor notification-reading access was
granted during testing. No real messages or notifications were used. UI and native capture checks
ran in `com.george.thaili.devicetest` (label: **Thaili Test**), with separate app data and build outputs.
Fixture writes require this package and reject any ledger without the synthetic profile marker.

The real app received an in-place release update after the owner restored their backup. An attempted
v1.3-to-v1.4 financial hash comparison failed because the test baseline was not persisted by the
harness; that comparison is inconclusive. The isolated legacy-schema fixture verifies loading an
older snapshot, not installation of the published v1.3 APK in the isolated package.

## Checks

| Check | Result |
| --- | --- |
| Typecheck and 55 application checks | Passed; includes missing-history recovery, dedupe, denied/disabled SMS and queued manual refresh |
| ESLint | No errors; two existing image-element warnings |
| Nine Android JVM tests | Passed |
| Android release lint, static export, Capacitor sync, signed release build | Passed |
| Legacy synthetic ledger | Loads accounts, a transaction and a goal; precise account balance verified |
| SMS consent and offline privacy | Bank selection persists and synchronizes to native capture; EN/NP policy displays |
| Denied SMS native bridge | Rejects with `SMS_PERMISSION_REQUIRED`; no inbox read |
| Android SQLite sender filtering | Only selected synthetic sender bodies queried; personal/unselected/injection fixtures excluded |
| Notification listener logic | Direct synthetic callbacks filter unrelated packages, OTPs and duplicates; replay expires at 90 days and caps at 500 |
| Manual transaction | Saves and survives a cold WebView reload with exact amount |
| JSON export and restore | Native document result writes a checksummed backup; fresh synthetic ledger restores matching accounts/transactions and goal |

The document flows use Android instrumentation activity results with an app-owned synthetic
Downloads file. They exercise the native export and WebView file-import callbacks; they do not
validate every document provider's picker UI. Notification checks directly invoke the listener;
they do not prove delivery of real system notifications or background SMS on this Samsung device.

Real bank-format coverage, system-delivered background capture, a browser-download Play Protect
installation, cloud/transfer backup behavior and network packet capture remain outside this run.
ADB installation success is not evidence that Play Protect will allow a browser installation.

## Reproduce the isolated checks

Use a connected, unlocked test phone and leave **Thaili Test** in the foreground. Fixture setup
replaces only the marked synthetic ledger. No permission grant command is needed.

```bash
npm run sync
cd android
./gradlew :app:assembleRelease :app:assembleReleaseAndroidTest \
  -PdeviceTestBuildType=release -PsyntheticDeviceApp=true
adb install -r app/build/synthetic-device/outputs/apk/release/app-release.apk
adb install -t -r app/build/synthetic-device/outputs/apk/androidTest/release/app-release-androidTest.apk
adb shell am instrument -w -r -e thailiSyntheticDeviceTest true \
  -e class com.george.thaili.UpgradeFixtureTest \
  com.george.thaili.devicetest.test/androidx.test.runner.AndroidJUnitRunner
adb shell am instrument -w -r -e thailiSyntheticDeviceTest true \
  -e class com.george.thaili.PrivacyDeviceTest,com.george.thaili.ReleaseFlowDeviceTest \
  com.george.thaili.devicetest.test/androidx.test.runner.AndroidJUnitRunner
```

Check the instrumentation output for `OK`, not just the shell exit code. Run fixture setup before
the ordered UI suite. Remove the isolated app and its generated Downloads fixtures after testing;
never clear or uninstall `com.george.thaili` as test cleanup.
