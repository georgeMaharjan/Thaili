import { IC, now } from "../../application/config";
import type { AppController } from "../../application/controller";
import { authenticationMessage } from "../../lib/authentication";
import { bsOf, monthKey, monthName, npDigits } from "../../lib/bs";
import { digits10, fmtPhone, initials, rs, validPhone } from "../../lib/format";
import { privacyPolicy } from "../../lib/privacy";
import { INSTITUTIONS, institutionForAccount } from "../../lib/institutions";
import { enabledSmsBanks, SMS_HISTORY_MS } from "../../lib/sms";
import { openAppSettings, openNotificationAccess } from "../../lib/device";
import { captureNotifications, syncDailyReviewReminder } from "../../lib/notifications";
import type { ViewContext } from "../context";
export function settingsViewModel(app: Pick<AppController, "patch" | "go" | "auth" | "flash" | "checkUpdate" | "installUpdate" | "exportData" | "resetData" | "back" | "openSmsPermission" | "catchUpSms">, context: Pick<ViewContext, "s" | "T" | "np" | "dark" | "surplus" | "freeToSpend" | "openBaseline" | "autoFiled" | "segBg" | "segFg" | "segSh">) {
  const { s, T, np, dark, surplus, freeToSpend, openBaseline, autoFiled, segBg, segFg, segSh } = context;
  const privacyTitle = np ? "गोपनीयता नीति" : "Privacy policy";
  const smsInstitutions = INSTITUTIONS.filter(bank => bank.sms && s.sources.some(account => institutionForAccount(account)?.key === bank.key));
  return {
    privacyTitle,
    privacySections: privacyPolicy(np),
    openPrivacy: () => app.go("privacy"),
    privacyBack: () => { if (!app.back()) app.go(s.setupComplete ? "settings" : "permission"); },
    permissionTitle: np ? "अनुमतिहरू" : "Permissions",
    permissionIntro: np ? "बैंक र वालेटबाट कारोबार पढ्ने अनुमति। दुवै ऐच्छिक हुन्।" : "Read incoming transactions from banks and wallets. Both permissions are optional.",
    permissionNote: np ? "ब्याकअप फिर्ता ल्याउँदा Android का अनुमति फिर्ता आउँदैनन्। बैंक SMS पहुँचमा अनुमति र बैंक छनोट जाँच्नुहोस्।" : "Restoring a backup does not restore Android permissions. Check permission and selected banks in Bank SMS access.",
    permissionRows: [
      { key: "sms", icon: "M4 4h16v12H9l-5 4ZM8 8h8M8 12h5", label: np ? "बैंक SMS पहुँच" : "Bank SMS access", on: s.perms[0],
        detail: np ? "बैंक छान्नुहोस्, SMS अनुमति र छुटेका कारोबार जाँच्नुहोस्" : "Choose banks, manage SMS permission and recover missed transactions", tap: () => app.go("bank-sms") },
      { key: "notification", icon: IC.bell, label: np ? "बैंक र वालेटका सूचना पढ्ने" : "Read bank & wallet alerts", on: s.perms[1],
        detail: np ? "अन्य बैंक र वालेट एपका सूचना पढेर कारोबार थप्छ" : "Reads other apps’ transaction notifications to add entries", tap: () => void openNotificationAccess() },
    ],
    androidPermissionsLabel: np ? "Android एपका अनुमति" : "Android app permissions",
    openAndroidPermissions: () => void openAppSettings(),
    bankSmsBack: () => app.go("settings"),
    smsPermissionTitle: np ? "SMS पढ्ने अनुमति" : "SMS permission",
    smsPermissionNote: np ? "Android ले पूरै इनबक्सको अनुमति दिन्छ। थैलीले तल छानेका बैंकका प्रेषकका मात्र सन्देश पढ्छ।" : "Android grants inbox-wide access. Thaili reads message bodies only from the bank senders you enable below.",
    smsPermissionAction: s.perms[0] ? (np ? "SMS अनुमति व्यवस्थापन गर्नुहोस्" : "Manage SMS permission") : (np ? "SMS अनुमति दिनुहोस्" : "Allow SMS permission"),
    manageSmsPermission: app.openSmsPermission,
    smsRecoverTitle: np ? "कारोबार छुटेको छ?" : "Missing a transaction?",
    smsRecoverLabel: np ? "छुटेका बैंक SMS जाँच्नुहोस्" : "Check for missed bank SMS",
    smsRecoverHint: !s.perms[0] ? (np ? "पहिले माथि SMS अनुमति दिनुहोस्।" : "Allow SMS permission above first.")
      : !enabledSmsBanks(s.sources, s.smsBanks).length ? (np ? "पहिले कम्तीमा एउटा बैंक छान्नुहोस्।" : "Enable at least one bank below first.")
        : (np ? "छानिएका बैंकका पछिल्ला ९० दिन फेरि जाँच्छ। पहिल्यै भएका कारोबार दोहोरिँदैनन्।" : "Rechecks selected banks’ last 90 days; existing transactions are not duplicated."),
    smsCanRecover: s.perms[0] && enabledSmsBanks(s.sources, s.smsBanks).length > 0,
    recoverBankSms: () => { if (s.perms[0] && enabledSmsBanks(s.sources, s.smsBanks).length) void app.catchUpSms(true); },
    smsAccessTitle: np ? "बैंक SMS पहुँच" : "Bank SMS access",
    smsBanksTitle: np ? "बैंकहरू छान्नुहोस्" : "Choose banks",
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
    })),
    setLight: () => app.patch({ theme: "light" }),
    setDark: () => app.patch({ theme: "dark" }),
    lightBg: segBg(!dark),
    lightFg: segFg(!dark),
    lightSh: segSh(!dark),
    darkBg: segBg(dark),
    darkFg: segFg(dark),
    darkSh: segSh(dark),
    settingsIsTab: s.settingsFrom === "settings",
    settingsBack: () => app.go(s.settingsFrom === "settings" ? "home" : s.settingsFrom || "home"),
    storageTitle: s.storageStatus.kind === "error" ? (np ? "फोनमा सुरक्षित गर्न सकिएन" : "Unable to save on this phone")
      : (np ? "फोनमा सुरक्षित" : "Saved on this phone"),
    storageLine: s.storageStatus.kind === "error"
      ? (np ? "पछिल्ला परिवर्तन सुरक्षित नभएको हुन सक्छ। एप खुला राखेर फोनको खाली ठाउँ जाँच्नुहोस्।" : "Recent changes may not be saved. Keep Thaili open and check available storage.")
      : (np ? "डेटा यही फोनमा राखिन्छ। थैलीको क्लाउड सिङ्क र ब्याकअप उपलब्ध छैन।" : "Data is stored on this phone. Thaili cloud sync and backup are unavailable."),
    storageProblem: s.storageStatus.kind === "error",
    prefsTitle: np ? "प्राथमिकता" : "Preferences",
    moneyTitle: np ? "आर्थिक योजना" : "Money plan",
    appTitle: np ? "एप" : "App & alerts",
    dataTitle: np ? "डेटा र गोपनीयता" : "Data & privacy",
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
      { group: "data", icon: IC.lock, label: privacyTitle, meta: np ? "थैलीले तपाईंको डेटा कसरी प्रयोग गर्छ" : "How Thaili handles your data", value: "", tap: () => app.go("privacy") },
      {
        group: "app",
        icon: IC.bell, label: np ? "थैलीका कारोबार सूचना" : "Thaili transaction alerts",
        on: s.notifMode !== "Off",
        toggle: { justify: s.notifMode === "Off" ? "flex-start" : "flex-end", track: s.notifMode === "Off" ? "var(--line)" : "var(--action)" },
        meta: s.notifMode === "Off"
          ? (np ? "सूचना र दैनिक सम्झना रोकिएका छन्।" : "Alerts and daily reminder are paused.")
          : (np ? "कारोबार सूचना र दैनिक ९ बजे समीक्षा सम्झना" : "Transaction alerts and a daily 9:00 review reminder"),
        value: "", tap: () => {
          const on = s.notifMode === "Off";
          void captureNotifications(on, true).then(() => syncDailyReviewReminder(on && s.setupComplete, false, s.lang)).catch(console.warn);
          app.patch({ notifMode: on ? "On" : "Off" });
        }
      },
      {
        group: "app",
        icon: IC.lock, label: T.appLock, meta: "Fingerprint or phone PIN on open", value: "", on: s.appLock,
        toggle: { justify: s.appLock ? "flex-end" : "flex-start", track: s.appLock ? "var(--action)" : "var(--line)" },
        tap: () => app.auth(s.appLock ? "Turn off app lock" : "Turn on app lock").then(r => {
          if (r.ok) { app.patch({ appLock: !s.appLock }); app.flash(s.appLock ? "App lock off" : "App lock on — Thaili asks every time you open it"); }
          else app.flash(authenticationMessage(r.reason));
        })
      },
      { group: "money", icon: IC.bolt, label: T.rules, meta: s.rules.length + " rules · " + autoFiled + " filed this month", value: "", tap: () => app.go("rules") },
      { group: "money", icon: IC.tag, label: T.categories, meta: s.picked.length + " in use · essential or optional", value: "", tap: () => app.go("cats", { catsMode: "edit", catsFrom: "settings" }) },
      {
        group: "money",
        icon: IC.vault, label: np ? "बचत आधार" : "Savings baseline", meta: "Protected before any goal is funded", value: rs(s.savingsGoal),
        tap: openBaseline
      },
      { icon: IC.target, label: np ? "मासिक खर्च लक्ष्य" : "Monthly expense goal",
        group: "money",
        meta: s.expenseGoalSet
          ? (s.expenseGoalMode === "percent" ? s.expenseGoalValue + "% of monthly income" : rs(s.expenseGoalValue) + " per month")
          : (np ? "रकम वा आम्दानीको प्रतिशत छान्नुहोस्" : "Not set · configure an amount or percent of income"),
        value: "", tap: () => app.patch({ expenseGoalOpen: true, expenseGoalDraftMode: s.expenseGoalSet ? s.expenseGoalMode : "amount",
          expenseGoalDraft: String(s.expenseGoalSet ? s.expenseGoalValue : freeToSpend) }) },
      { group: "money", icon: IC.target, label: T.goals, meta: s.goals.length ? s.goals.length + " claiming " + rs(surplus) + " of surplus" : "None yet", value: "", tap: () => app.go("goals", { goalsFrom: "settings" }) },
      {
        group: "data",
        icon: IC.exportI, label: np ? "सबै डेटा निर्यात" : "Export all data",
        meta: np ? "पढ्न मिल्ने JSON — आफूले रोजेको स्थानमा" : "Readable JSON; saved to the location you choose",
        value: "", tap: () => void app.exportData()
      },
      {
        group: "app",
        icon: IC.importI, label: np ? "एप अपडेट" : "App update",
        meta: s.updateBusy
          ? (np ? "अपडेट डाउनलोड हुँदैछ…" : "Downloading update…")
          : s.update ? (np ? "संस्करण " + s.update.version + " आयो — डाउनलोड र इन्स्टल गर्न थिच्नुहोस्" : "Version " + s.update.version + " is ready — tap to download and install")
          : (np ? "नयाँ संस्करण जाँच्न थिच्नुहोस्" : "Tap to check for a new version"),
        value: s.appVersion ? "v" + s.appVersion : "",
        busy: s.updateBusy,
        tap: () => { if (s.updateBusy) return; if (s.update) void app.installUpdate(); else void app.checkUpdate(true); }
      },
      { group: "data", icon: "M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3", label: np ? "सबै डेटा मेटाउनुहोस्" : "Delete or reset all data",
        meta: np ? "फोनको थैली डेटा मेटाएर फेरि सुरु गर्नुहोस्" : "Erase this phone’s Thaili data and start over", value: "", danger: true,
        tap: () => app.patch({ resetDataOpen: true }) },
    ],
    resetDataOpen: s.resetDataOpen,
    resetDataTitle: np ? "सबै डेटा मेटाउने?" : "Delete all Thaili data?",
    resetDataDescription: np
      ? "प्रोफाइल, खाता, कारोबार, लक्ष्य, नियम र सेटिङहरू यही फोनबाट मेटिन्छन्। फेरि सेटअप गर्नुपर्नेछ। निर्यात गरिएका फाइल छुट्टै मेटाउनुहोस्।"
      : "Your profile, accounts, transactions, goals, rules, and data settings will be erased from this phone. You’ll need to set Thaili up again. Exported backup files are separate and must be deleted separately.",
    resetDataCancel: np ? "रद्द गर्नुहोस्" : "Cancel",
    resetDataConfirmLabel: np ? "मेटाएर फेरि सुरु गर्नुहोस्" : "Delete and start over",
    cancelResetData: () => app.patch({ resetDataOpen: false }),
    confirmResetData: () => { void app.resetData(); },
    expenseGoalOpen: s.expenseGoalOpen,
    expenseGoalTitle: np ? "मासिक खर्च लक्ष्य" : "Monthly expense goal",
    expenseGoalDescription: np ? "मासिक खर्चको सीमा रकम वा आम्दानीको प्रतिशतमा तय गर्नुहोस्। यो सीमाभन्दा बढी खर्च भएको रकम Home मा बढी खर्चको रूपमा देखिन्छ।" : "Set a monthly spending limit as a fixed amount or a percentage of your income. Any amount spent above it appears as overspent on Home.",
    expenseGoalAmountLabel: s.expenseGoalDraftMode === "percent" ? (np ? "आम्दानीको प्रतिशत" : "Percent of monthly income") : (np ? "मासिक रकम" : "Monthly amount"),
    expenseGoalSaveLabel: np ? "सेभ गर्नुहोस्" : "Save goal",
    expenseGoalDraft: s.expenseGoalDraft,
    expenseGoalDraftType: (e: { target: { value: string } }) => {
      const value = e.target.value.replace(/,/g, "");
      if (/^\d{0,9}(\.\d{0,2})?$/.test(value)) app.patch({ expenseGoalDraft: value });
    },
    expenseGoalOptions: (["amount", "percent"] as const).map(mode => ({
      label: mode === "amount" ? (np ? "निश्चित रकम" : "Fixed amount") : "% " + (np ? "आम्दानी" : "of income"),
      bg: s.expenseGoalDraftMode === mode ? "var(--surface)" : "transparent",
      fg: s.expenseGoalDraftMode === mode ? "var(--ink)" : "var(--ink3)",
      shadow: s.expenseGoalDraftMode === mode ? "0 1px 2px rgba(0,0,0,.08)" : "none",
      tap: () => app.patch({ expenseGoalDraftMode: mode })
    })),
    cancelExpenseGoal: () => app.patch({ expenseGoalOpen: false }),
    saveExpenseGoal: () => {
      const amount = Number(s.expenseGoalDraft);
      if (!Number.isFinite(amount) || amount <= 0 || (s.expenseGoalDraftMode === "percent" && amount > 100)) {
        app.flash(s.expenseGoalDraftMode === "percent"
          ? (np ? "प्रतिशत ० भन्दा बढी र १०० सम्म राख्नुहोस्" : "Enter a percentage greater than 0 and no more than 100")
          : (np ? "शून्यभन्दा बढी मासिक रकम राख्नुहोस्" : "Enter a monthly amount greater than 0"));
        return;
      }
      app.patch({ expenseGoalSet: true, expenseGoalMode: s.expenseGoalDraftMode, expenseGoalValue: Math.round(amount * 100) / 100, expenseGoalOpen: false });
      app.flash(np ? "मासिक खर्च लक्ष्य सेभ भयो" : "Monthly expense goal saved");
    },
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
