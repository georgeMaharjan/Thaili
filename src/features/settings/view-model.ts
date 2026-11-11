import { IC, now } from "../../application/config";
import type { AppController } from "../../application/controller";
import { authenticationMessage } from "../../lib/authentication";
import { bsOf, monthKey, monthName, npDigits } from "../../lib/bs";
import { digits10, fmtPhone, initials, rs, validPhone } from "../../lib/format";
import { privacyPolicy } from "../../lib/privacy";
import { INSTITUTIONS, institutionForAccount } from "../../lib/institutions";
import { enabledSmsBanks, SMS_HISTORY_MS } from "../../lib/sms";
import { openAppSettings, openNotificationAccess } from "../../lib/device";
import { captureNotifications } from "../../lib/notifications";
import type { ViewContext } from "../context";
export function settingsViewModel(app: Pick<AppController, "patch" | "go" | "auth" | "flash" | "checkUpdate" | "exportData" | "back" | "openSmsPermission" | "catchUpSms">, context: Pick<ViewContext, "s" | "T" | "np" | "dark" | "surplus" | "openBaseline" | "autoFiled" | "segBg" | "segFg" | "segSh">) {
  const { s, T, np, dark, surplus, openBaseline, autoFiled, segBg, segFg, segSh } = context;
  const privacyTitle = np ? "गोपनीयता नीति" : "Privacy policy";
  const smsInstitutions = INSTITUTIONS.filter(bank => bank.sms && s.sources.some(account => institutionForAccount(account)?.key === bank.key));
  return {
    privacyTitle,
    privacySections: privacyPolicy(np),
    openPrivacy: () => app.go("privacy"),
    privacyBack: () => { if (!app.back()) app.go(s.setupComplete ? "settings" : "permission"); },
    permissionTitle: np ? "अनुमतिहरू" : "Permissions",
    permissionIntro: np ? "कारोबार स्वतः थप्ने तरिका रोज्नुहोस्। दुवै अनुमति ऐच्छिक हुन्।" : "Choose how transactions are added. Both permissions are optional.",
    permissionNote: np ? "ब्याकअप फिर्ता ल्याउँदा Android का अनुमति फिर्ता आउँदैनन्। SMS अनुमति दिएर पढ्न दिने बैंकहरू तल छान्नुहोस्।" : "Restoring a backup does not restore Android permissions. Allow SMS here, then choose the banks below.",
    permissionRows: [
      { key: "sms", icon: "M4 4h16v12H9l-5 4ZM8 8h8M8 12h5", label: np ? "बैंक SMS पढ्ने अनुमति" : "Read bank SMS", on: s.perms[0],
        state: s.perms[0] ? (np ? "चालु" : "On") : (np ? "बन्द" : "Off"),
        detail: np ? "तल छानेका बैंकका SMS बाट कारोबार थप्छ" : "Adds transactions from the banks you choose below", tap: app.openSmsPermission },
      { key: "notification", icon: IC.bell, label: np ? "बैंक र वालेट सूचना पहुँच" : "Bank and wallet notification access", on: s.perms[1],
        state: s.perms[1] ? (np ? "चालु" : "On") : (np ? "बन्द" : "Off"),
        detail: np ? "बैंक र वालेट एपका कारोबार सूचना समेट्छ" : "Captures transaction alerts from bank and wallet apps", tap: () => void openNotificationAccess() },
    ],
    androidPermissionsLabel: np ? "Android एपका अनुमति" : "Android app permissions",
    openAndroidPermissions: () => void openAppSettings(),
    smsRecoverTitle: np ? "कारोबार छुटेको छ?" : "Missing a transaction?",
    smsRecoverLabel: np ? "छुटेका बैंक SMS जाँच्नुहोस्" : "Check for missed bank SMS",
    smsRecoverHint: !s.perms[0] ? (np ? "पहिले माथि SMS अनुमति दिनुहोस्।" : "Allow SMS permission above first.")
      : !enabledSmsBanks(s.sources, s.smsBanks).length ? (np ? "पहिले कम्तीमा एउटा बैंक छान्नुहोस्।" : "Enable at least one bank below first.")
        : (np ? "छानिएका बैंकका पछिल्ला ९० दिन फेरि जाँच्छ। पहिल्यै भएका कारोबार दोहोरिँदैनन्।" : "Rechecks selected banks’ last 90 days; existing transactions are not duplicated."),
    smsCanRecover: s.perms[0] && enabledSmsBanks(s.sources, s.smsBanks).length > 0,
    recoverBankSms: () => { if (s.perms[0] && enabledSmsBanks(s.sources, s.smsBanks).length) void app.catchUpSms(true); },
    smsAccessTitle: np ? "बैंक SMS पहुँच" : "Bank SMS access",
    smsAccessIntro: np ? "पढ्न दिने बैंकहरू रोज्नुहोस्। बन्द गर्दा पुराना कारोबार मेटिँदैनन्।" : "Choose which banks Thaili may read. Turning one off keeps your saved transactions.",
    smsAccessDetailsLabel: np ? "SMS पहुँचबारे बुझ्नुहोस्" : "How SMS access works",
    smsBankCount: np ? npDigits(enabledSmsBanks(s.sources, s.smsBanks).length) + "/" + npDigits(smsInstitutions.length) + " छानिएको"
      : enabledSmsBanks(s.sources, s.smsBanks).length + " of " + smsInstitutions.length + " enabled",
    smsEmptyTitle: np ? "पहिले बैंक खाता थप्नुहोस्" : "Add a bank account first",
    smsEmptyNote: np ? "तपाईंका खातासँग मिल्ने बैंकहरू यहाँ देखिन्छन्।" : "Banks linked to your accounts will appear here.",
    smsAccountsLabel: np ? "खाताहरू हेर्नुहोस्" : "View accounts",
    openSmsAccounts: () => app.go("accounts"),
    smsAccessNote: np ? "अनुमति दिए पनि छानेका बैंकका मात्र सन्देश पढिन्छन्। बैंक खोजमा प्रेषकका नाम मात्र जाँचिन्छन्। एउटै बैंकको प्रेषक सबै खाताको साझा हुन सक्छ। तल बैंक नदेखिए पहिले खाता थप्नुहोस्।" : "Only enabled banks’ message bodies are read, even when Android grants full SMS permission. Discovery checks sender names only. Accounts at the same bank can share a sender. Add an account to see its bank here. After upgrading from v1.3, choose your banks here to resume SMS capture.",
    smsBankRows: smsInstitutions.map(bank => ({
      key: bank.key, label: bank.name, on: s.smsBanks.includes(bank.key),
      toggle: { justify: s.smsBanks.includes(bank.key) ? "flex-end" : "flex-start", track: s.smsBanks.includes(bank.key) ? "var(--action)" : "var(--line)" },
      detail: s.smsBanks.includes(bank.key)
        ? (!s.perms[0] ? (np ? "छानिएको · SMS अनुमति चाहिन्छ" : "Selected · SMS permission needed") : (np ? "SMS बाट कारोबार थपिन्छ" : "SMS capture enabled"))
        : (np ? "यस बैंकका SMS पढिँदैनन्" : "SMS from this bank won’t be read"),
      tap: () => app.patch(state => state.smsBanks.includes(bank.key)
        ? { smsBanks: state.smsBanks.filter(key => key !== bank.key) }
        : { smsBanks: [...state.smsBanks, bank.key], smsSince: Math.min(state.smsSince ?? Date.now(), Date.now() - SMS_HISTORY_MS) }),
      stateLabel: s.smsBanks.includes(bank.key) ? (np ? "चालु" : "On") : (np ? "बन्द" : "Off"),
    })),
    setLight: () => app.patch({ theme: "light" }),
    setDark: () => app.patch({ theme: "dark" }),
    lightBg: segBg(!dark),
    lightFg: segFg(!dark),
    lightSh: segSh(!dark),
    darkBg: segBg(dark),
    darkFg: segFg(dark),
    darkSh: segSh(dark),
    settingsBack: () => app.go(s.settingsFrom || "home"),
    storageTitle: s.storageStatus.kind === "error" ? (np ? "फोनमा सुरक्षित गर्न सकिएन" : "Unable to save on this phone")
      : (np ? "फोनमा सुरक्षित" : "Saved on this phone"),
    storageLine: s.storageStatus.kind === "error"
      ? (np ? "पछिल्ला परिवर्तन सुरक्षित नभएको हुन सक्छ। एप खुला राखेर फोनको खाली ठाउँ जाँच्नुहोस्।" : "Recent changes may not be saved. Keep Thaili open and check available storage.")
      : (np ? "डेटा यही फोनमा राखिन्छ। थैलीको क्लाउड सिङ्क र ब्याकअप उपलब्ध छैन।" : "Data is stored on this phone. Thaili cloud sync and backup are unavailable."),
    storageProblem: s.storageStatus.kind === "error",
    prefsTitle: np ? "प्राथमिकता" : "Preferences",
    manageTitle: np ? "व्यवस्थापन" : "Manage",
    spacingLabel: np ? "ठाउँ · Spacing" : "Spacing",
    spacingMeta: (np ? { compact: "कम ठाउँ — धेरै देखिन्छ", default: "सामान्य", airy: "बढी ठाउँ — खुला" }
      : { compact: "Tighter — more on screen", default: "Balanced", airy: "Roomier — easier to scan" })[s.density],
    densityOpts: ([["compact", "Compact", "कम"], ["default", "Default", "सामान्य"], ["airy", "Airy", "खुला"]] as const).map(([k, en, ne]) => ({
      label: np ? ne : en, bg: segBg(s.density === k), fg: segFg(s.density === k), shadow: segSh(s.density === k),
      tap: () => { try { localStorage.setItem("thaili-density", k); } catch { /* private mode: lasts this session */ } app.patch({ density: k }); }
    })),
    userName: s.user ? s.user.name : "",
    userPhone: s.user ? fmtPhone(s.user.phone) : "",
    toProfile: () => s.user && app.go("profile", { profName: s.user.name, profPhone: s.user.phone.slice(-10) }),
    settingRows: [
      { icon: IC.lock, label: privacyTitle, meta: np ? "अनुमति, भण्डारण, ब्याकअप र डेटा मेटाउने" : "Permissions, storage, backups and deletion", value: "", tap: () => app.go("privacy") },
      {
        icon: IC.bell, label: T.notifications,
        meta: s.notifMode === "Off" ? "No alerts — review from the app" : "New transactions that need a category",
        value: s.notifMode === "Off" ? "Off" : "On", tap: () => {
          const on = s.notifMode === "Off";
          captureNotifications(on, true);
          app.patch({ notifMode: on ? "On" : "Off" });
        }
      },
      {
        icon: IC.lock, label: T.appLock, meta: "Fingerprint or phone PIN on open", value: s.appLock ? "On" : "Off",
        tap: () => app.auth(s.appLock ? "Turn off app lock" : "Turn on app lock").then(r => {
          if (r.ok) { app.patch({ appLock: !s.appLock }); app.flash(s.appLock ? "App lock off" : "App lock on — Thaili asks every time you open it"); }
          else app.flash(authenticationMessage(r.reason));
        })
      },
      { icon: IC.bolt, label: T.rules, meta: s.rules.length + " rules · " + autoFiled + " filed this month", value: "", tap: () => app.go("rules") },
      { icon: IC.tag, label: T.categories, meta: s.picked.length + " in use · essential or optional", value: "", tap: () => app.go("cats", { catsMode: "edit", catsFrom: "settings" }) },
      {
        icon: IC.vault, label: np ? "बचत आधार" : "Savings baseline", meta: "Protected before any goal is funded", value: rs(s.savingsGoal),
        tap: openBaseline
      },
      { icon: IC.target, label: T.goals, meta: s.goals.length ? s.goals.length + " claiming " + rs(surplus) + " of surplus" : "None yet", value: "", tap: () => app.go("goals", { goalsFrom: "settings" }) },
      {
        icon: IC.exportI, label: np ? "सबै डेटा निर्यात" : "Export all data",
        meta: np ? "पढ्न मिल्ने JSON — आफूले रोजेको स्थानमा" : "Readable JSON; saved to the location you choose",
        value: "", tap: () => void app.exportData()
      },
      {
        icon: IC.importI, label: np ? "एप अपडेट" : "App update",
        meta: s.update ? (np ? "संस्करण " + s.update.version + " आयो — डाउनलोड गर्न थिच्नुहोस्" : "Version " + s.update.version + " is ready — tap to download")
          : (np ? "नयाँ संस्करण जाँच्न थिच्नुहोस्" : "Tap to check for a new version"),
        value: s.appVersion ? "v" + s.appVersion : "",
        // Opens in the phone's browser; Android installs the APK over this one.
        tap: () => { if (s.update) window.location.href = s.update.url; else void app.checkUpdate(true); }
      }
      // CSV export and Archive are hidden until built — see "Limitations" in README.md.
    ],
    ...(() => {
      const u = s.user || { name: "", phone: "", createdAt: now() };
      const ph = digits10(s.profPhone), phoneOk = validPhone(ph), nameOk = s.profName.trim().length >= 2;
      const phoneChanged = "+977" + ph !== u.phone, nameChanged = s.profName.trim() !== u.name;
      const ready = nameOk && phoneOk && (phoneChanged || nameChanged);
      const since = bsOf(new Date(u.createdAt));
      return {
        profTitle: np ? "प्रोफाइल" : "Profile",
        profInitials: initials(s.profName) || initials(u.name),
        profSince: np ? monthName(monthKey(since), true) + " " + npDigits(since.y) + " देखि थैलीमा" : "On Thaili since " + monthName(monthKey(since)) + " " + since.y,
        profName: s.profName, profNameType: (e: { target: { value: string } }) => app.patch({ profName: e.target.value.slice(0, 40) }),
        profNameBorder: nameOk ? "var(--line)" : "var(--action)",
        profPhone: ph, profPhoneType: (e: { target: { value: string } }) => app.patch({ profPhone: digits10(e.target.value) }),
        profPhoneBorder: !phoneChanged ? "var(--line)" : phoneOk ? "var(--pos)" : "var(--action)",
        profPhoneHint: !phoneChanged ? (np ? "कसैलाई देखाइँदैन।" : "Never shown to anyone.") : phoneOk ? (np ? "ठीक छ।" : "Looks right.") : T.badPhone,
        profPhoneHintFg: !phoneChanged ? "var(--ink3)" : phoneOk ? "var(--pos)" : "var(--action)",
        profBack: () => app.go("settings"),
        profCta: !(phoneChanged || nameChanged) ? (np ? "केही बदलिएको छैन" : "No changes") : !ready ? (np ? "नाम र नम्बर मिलाउनुहोस्" : "Check name and number") : (np ? "सेभ गर्नुहोस्" : "Save"),
        profCtaBg: ready ? "var(--action)" : "var(--surface2)", profCtaFg: ready ? "var(--onAction)" : "var(--ink3)",
        profSave: () => {
          if (!ready) return;
          const prev = s.user;
          app.go("settings", { user: Object.assign({}, u, { name: s.profName.trim(), phone: "+977" + ph }) });
          app.flash(phoneChanged ? (np ? "नम्बर बदलियो" : "Number changed") : (np ? "प्रोफाइल सेभ भयो" : "Profile saved"), { user: prev });
        }
      };
    })()
  };
}
