# Play Protect appeal — submission record

Submitted on 11 November 2026 for the currently published v1.3 APK. Google displayed
**Your email has been sent**. The first submission was made while signed out and requested email
verification; no verification email was found in a focused mailbox search. After the developer
signed in and explicitly approved a second submission, the same appeal was submitted under the
developer's Google account. The signed-in confirmation displayed no email-verification prompt.

Google has not communicated a classification decision. No case ID or review deadline was displayed.
Do not submit further duplicates. If a later APK needs review, use that APK's actual hash.

Form: [Play Protect Appeals Submission Form](https://support.google.com/googleplay/android-developer/contact/protectappeals).

## Form values

- Email: developer’s signed-in Google account (omitted from the public record).
- Developer name: George Maharjan.
- Application package: `com.george.thaili`.
- APK SHA-256: `01bfaf8eb2c4352ea02871711b13e0f67de2910d4e9852a87703d843e624347e`.
- Exact APK: `https://github.com/georgeMaharjan/Thaili/releases/download/v1.3/thaili.apk`.
- Signing certificate SHA-256: `c581a727f0c4b6e6ca8b93e6dc07bb8daaf3d15e7a3e7cf504c97e399655e9bb`.
- Source: `https://github.com/georgeMaharjan/Thaili`.
- Website: `https://thaili-chi.vercel.app`.

The public v1.3 APK was uploaded to VirusTotal on 11 November 2026 after explicit developer approval
of VirusTotal's terms and sample sharing. The report displayed **0/67 malicious detections**. Some
engines could not process the file and Google's engine returned a scan failure. These results do
not establish Google approval or an assurance that every scanner completed successfully.

[VirusTotal report](https://www.virustotal.com/gui/file/01bfaf8eb2c4352ea02871711b13e0f67de2910d4e9852a87703d843e624347e).

## Exact additional information submitted (971 characters)

```text
Please review the sensitive-permission block for Thaili v1.3 (code 4), an MIT-licensed finance tracker for Nepal. The dialog says “App blocked to protect your device” and offers only OK.
READ_SMS imports bank transaction history; RECEIVE_SMS captures new alerts; notification access captures alerts from configured bank/wallet apps. These are core budgeting features. Access is optional, granted through Android, and revocable. The app filters recognized transaction/OTP/promo patterns, stores records locally and does not send message bodies to a backend. No accessibility, SMS sending, banking credentials or payments.
The release is non-debuggable, signed, and targets API 36. VirusTotal: 0/67 detections; Google engine failed to scan, so no Google approval is claimed.
APK: https://github.com/georgeMaharjan/Thaili/releases/download/v1.3/thaili.apk
Source: https://github.com/georgeMaharjan/Thaili
Please review this APK's disclosed, consensual financial capture use.
```

The form limits additional information to 1,000 characters. It has no screenshot attachment field;
the supplied warning was described in the text rather than uploaded. Phone model, Android version
and country were not invented.

## Evidence and related publication

- Signed-in submission confirmation retained locally; account screenshots are excluded from the public repository.
- [VirusTotal result screenshot](audits/2026-11-11-play-protect/virustotal-result.png).
- [Website installation guidance](https://thaili.georgemaharjan.com.np/#install) corrected and verified live;
  the Vercel URL redirects to this custom domain. Website commit: `aa048ef` in `thaili_website`.
- [Existing v1.3 release notes](https://github.com/georgeMaharjan/Thaili/releases/tag/v1.3) corrected.
  Asset IDs, sizes and digests were compared before/after and remained identical. The APK was not
  replaced, and no new version was released.

The unused Firebase cleanup is committed for the unpublished v1.4 candidate. Published v1.3 still contains that
legacy SDK; no claim was made that it contains no Firebase SDK or cannot send device metadata.
See the [investigation](PLAY-PROTECT.md) for privacy follow-ups and validation.

Google's confirmation says decisions are final and a response is not guaranteed. Submission is
complete; the classification outcome is outside the developer's control.
