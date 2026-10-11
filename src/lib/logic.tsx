/* eslint-disable */
/* eslint no-undef: "error" */
/* eslint-enable no-undef */
// @ts-nocheck
/* Ported from design/Thaili v9.dc.html (<script data-dc-script>), now hand-maintained.
   Financial rules live in typed modules; this class orchestrates device and screen state. Real data replaced the design's mock: the
   pouch loads from and saves to the phone with background cloud sync (./store — componentDidMount /
   componentDidUpdate), dates run on the real BS calendar (./bs), and every
   insight is computed from the user's own transactions. The sync / devices /
   merge screens are still the design's prototype. renderVals() is the view
   model the hand-written screens in src/screens read. */
"use client";
import React from "react";
import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { TABS, gate, inReviewWindow, needsReview, nextStack, backDismissal } from "./nav";
import { DENSITY, balHero, balRs, digits10, fmt, fmtPhone, fmtTyped, initials, rs, signed, validPhone, whole } from "./format";
import { filterEntries, flowTotals, manualEntry, spendingPatterns } from "./transactions";
import { savingsGoal, allocateGoals } from "./goals";
import { accountBalances, monthlyBudget, monthlySavingsRate, essentialMonthly } from "./finance";
import { importTransactions, applyImportResult } from "./import-transactions";
import { words, hay, kwFor, findRule, checkRule, applyRule, unfileRule } from "./rules";
import { calendarAt } from "./calendar";
import { evidenceFor } from "./transaction-capture";
import Screens from "@/screens";
import { P } from "@/components/ui";
import { Splash } from "@/screens/onboarding";
import { captureNotifications } from "./notifications";
import { load, save, initializeStore, subscribeStore, retrySync, mergeIncoming } from "./store";
import { permStatus, requestSms, openNotificationAccess, openAppSettings, installedApps, isDevice, authenticate, readSms, setCapture, onOpen, readNotifications, onMoneyNotification, hapticTap } from "./device";
import { appendMoneyAccounts, allMoneyPackages, detectMoneyApps, rememberMoneyPackages, scanMoneyApps, sourceForMoneyApp } from "./money-apps";
import { notificationInbox, notificationRules } from "./notification-transactions";
import { tailsByBank, nativeRules } from "./sms";
import { BS_EN, BS_NP, adOf, bsOf, daysInBsMonth, monthKey, monthName, npDigits, dated } from "./bs";


const CATS = [
  { key: "food", label: "Eating out", limit: 12000 },
  { key: "transport", label: "Transport", limit: 5000 },
  { key: "grocery", label: "Groceries", limit: 9000 },
  { key: "bills", label: "Bills & rent", limit: 16000 },
  { key: "shopping", label: "Shopping", limit: 4000 },
  { key: "health", label: "Health", limit: 3000 }
];
const EXTRA_CATS = [
  { key: "going", label: "Going out" }, { key: "family", label: "Family" },
  { key: "study", label: "Study" }, { key: "gifts", label: "Gifts" }, { key: "pets", label: "Pets" }
];
/* A leak is spending outside the necessities. Delivery, eating out, going out and
   shopping start as leaks; rent, groceries, transport, health and family don't.
   Every one of these is the user's to flip — the default is just a starting point. */
const ESS_DEFAULT = { food: false, going: false, shopping: false, gifts: false };
const ALL_CATS = CATS.concat(EXTRA_CATS);
/* Money in has its own list — never mixed with spending categories. */
const INCOME_CATS = [
  { key: "salary", label: "Salary" }, { key: "business", label: "Business & freelance" },
  { key: "interest", label: "Interest" }, { key: "giftin", label: "Gift received" },
  { key: "refund", label: "Refund" }, { key: "otherin", label: "Other income" }
];

/* Auto-filing. Every feed line carries a remark; a rule is a word seen in that
   remark plus the category it means. Built-ins cover the obvious national ones,
   and anything the user files by hand can become a rule of their own. */
const SEED_RULES = [
  { id: 1, kw: "BHATBHATENI", cat: "grocery", own: false },
  { id: 2, kw: "PATHAO", cat: "transport", own: false },
  { id: 3, kw: "FOODMANDU", cat: "food", own: false },
  { id: 4, kw: "NEA BILL", cat: "bills", own: false }
];
const DEVICES = [
  { id: 1, name: "This phone · Galaxy A15", meta: "Signed in today · synced 2 minutes ago", cur: true },
  { id: 2, name: "Redmi Note 13", meta: "Last synced 4 minutes ago", cur: false }
];
const REMOTE = { tx: 214, src: 4, rules: 12, goals: 3, device: "Redmi Note 13", when: "4 minutes ago" };
const SYNC_INCLUDES = [
  ["Accounts, their last four digits and opening balances", true],
  ["Every transaction, note, receipt and category", true],
  ["Auto-filing rules and the categories you added", true],
  ["Goals, their order and the savings target", true],
  ["Never: bank passwords, PINs, OTPs, full account numbers, or the SMS text itself unless you keep it", false]
];
/* Sync is hidden from first-run setup for now; it stays reachable from Settings.
   Flip to true to bring back setup step 6. */
const SETUP_SYNC = false;
const OB_STEPS = SETUP_SYNC ? 6 : 5;
const CASH = { key: "cash", base: "Cash", name: "Cash", short: "Cash", type: "Manual entry", dot: "#B4721F", opening: 0, acct: null };
const isManualSrc = x => /Manual|manual/.test(x.type);
const tailName = (base, acct) => acct && acct.length >= 4 ? base + " ••" + acct.slice(-4) : base;


const WD_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const newId = () => crypto.randomUUID();
/* Native navigation rules live in ./nav; back on Home backgrounds the app. */
const now = () => new Date().toISOString();
/* Placeholders so an empty pouch (first launch) renders instead of crashing. */
const NO_SRC = { key: "", name: "", base: "", short: "", type: "", dot: "var(--line)", opening: 0, acct: null };
const NO_TX = { id: null, m: "", amt: 0, dir: "debit", src: "", cat: null, rem: null, off: 0, time: "", ch: "", raw: "", bs: null };
const SRC_KINDS = [
  { key: "bank", label: "Bank", type: "Bank · SMS", dot: "#D02A2E",
    names: ["Nabil Bank", "Global IME", "NIC Asia", "Siddhartha", "Machhapuchchhre", "Kumari Bank"] },
  { key: "wallet", label: "Wallet", type: "Wallet · notifications", dot: "#2B3A4A",
    names: ["eSewa", "Khalti", "IME Pay", "Fonepay"] },
  { key: "manual", label: "Cash or other", type: "Manual entry", dot: "#7A8794",
    names: ["Cash on hand", "Sahakari", "Fixed deposit", "SIP", "Lent out"] }
];



const IC = {
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5h4", moon: "M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z",
  lock: "M5 10.5h14v10H5ZM8 10.5V8a4 4 0 0 1 8 0v2.5", bolt: "M13 3 5 13.5h6L10 21l8-10.5h-6Z",
  tag: "M3.5 12.5V4H12l8.5 8.5-8 8ZM8 7.5h.01", target: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16ZM12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z",
  importI: "M12 4v11M7 10l5 5 5-5M5 20h14", exportI: "M12 15V4M7 9l5-5 5 5M5 20h14", archive: "M3.5 4.5h17v4h-17ZM5 8.5V19h14V8.5M10 12.5h4",
  bank: "M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18",
  wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.8h.01",
  cash: "M3 7h18v10H3ZM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5Z", vault: "M4 5h16v14H4ZM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6ZM6 19v2M18 19v2",
  cloud: "M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18Z", cloudOff: "M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18ZM4 4l16 16",
  phone: "M7 3h10v18H7ZM11 18h2"
};
const CI = {
  food: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16.5 3c-2 1.5-3 4-3 7h3v11", transport: "M5 4h14v12H5ZM5 11h14M8 16v3M16 16v3M8 13.5h.01M16 13.5h.01",
  grocery: "M4 9h16l-1.5 11h-13ZM8 9l3-5M16 9l-3-5", bills: "M3.5 10.5 12 3.8l8.5 6.7V20h-17ZM9.5 20v-6h5v6",
  shopping: "M5 8h14l-1 12H6ZM9 8V6a3 3 0 0 1 6 0v2", health: "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z",
  going: "M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4ZM14 7v10", family: "M9 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6ZM3.5 20a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M17.5 20h3a5 5 0 0 0-3.5-4.8",
  study: "M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4ZM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6Z", gifts: "M4 10h16v10H4ZM3 7h18v3H3ZM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1",
  pets: "M12 13c-3 0-5 3-5 5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2c0-2-2-5-5-5ZM6 9a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3ZM9.5 5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3ZM14.5 5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3ZM18 9a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3Z"
};
const SI = {
  inA: "M12 5v14M6 13l6 6 6-6", outA: "M12 19V5M6 11l6-6 6 6", xfer: "M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4",
  ask: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17ZM9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17h.01",
  up: "M7 17 17 7M9 7h8v8", down: "M7 7l10 10M17 9v8H9", flat: "M5 12h14",
  calCheck: "M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4M9 15l2 2 4-4",
};
const kfmt = n => { const a = Math.abs(n); return a >= 100000 ? (Math.round(a / 10000) / 10) + "L" : a >= 10000 ? Math.round(a / 1000) + "k" : fmt(a); };
const MERGE_PAIRS = [
  { id: "a", title: "FONEPAY · NIC Asia ••4821", meta: "This phone 1:12 pm · Redmi 1:14 pm · same wording", amt: 1500 },
  { id: "b", title: "eSewa QR payment", meta: "This phone 4:48 pm · Redmi 4:51 pm · different wording", amt: 450 }
];
const L = {
  EN: {
    home: "Home", txns: "Transactions", insights: "Insights", accounts: "Accounts", settings: "Settings", sync: "Sync", goals: "Goals",
    quickAdd: "Quick add", newGoal: "New goal", rules: "Auto-filing rules", review: "Needs review", combine: "Combine pouches",
    tagline: "Every rupee that moves — bank, wallet, sahakari, cash — in one pouch, so you can understand where it goes.",
    w1: "No bank login", w2: "Reads bank SMS", w3: "Finds your apps",
    getStarted: "Get started", otherPhone: "I use Thaili on another phone",
    step1: "Step 1 of " + OB_STEPS + " · messages", step2: "Step 2 of " + OB_STEPS + " · this phone", step3: "Step 3 of " + OB_STEPS + " · accounts", step4: "Step 4 of " + OB_STEPS + " · history",
    step5: "Step 5 of " + OB_STEPS + " · categories", step6: "Step 6 of 6 · sync, optional", editCats: "Categories", joinLabel: "Join sync",
    permTitle: "We read only bank transaction messages",
    permSub: "Read here, on this phone. If you turn on sync later, only the amount, date and merchant travel — never the message itself.",
    srcTitle: "Two things per account",
    srcSub: "The last four digits — the only part a bank SMS prints, so Thaili can tell your accounts apart — and the opening balance every figure is counted from.",
    catsTitle: "Pick three to six", catsSub: "Flat list, no sub-categories — one tap has to finish the job. Add more any time.",
    recent: "Recent", seeAll: "See all",
    inL: "In", outL: "Out", savedL: "Saved",
    appearance: "Appearance", appearanceMeta: "Cream by day, navy by night", light: "Light", dark: "Dark", langMeta: "English",
    notifications: "Notifications", appLock: "App lock", exportAll: "Export everything",
    archive: "Archive", categories: "Categories", totalAcross: "Across all accounts", addAccount: "Add an account",
    syncOn: "Sync on", syncOffTitle: "Sync is off", turnOnSync: "Turn on sync", joinOther: "I sync on another phone — join it",
    stopSync: "Stop syncing", thisPhone: "This phone", synced: "Synced",
    lookSame: "Look the same — you decide", sameSpend: "Same spend", keepBoth: "Keep both", balDiffers: "Opening balance differs",
    useSyncedOnly: "Use only the synced pouch — this phone's entries go to Archive",
    restoreCta: "Bring it onto this phone", restoreOther: "Use a different email",
    restoreNote: "This phone has nothing on it yet, so the synced pouch is copied straight across. From then on both phones stay in step.",
    stopTitle: "Stop syncing?", stopThis: "Stop on this phone", stopThisMeta: "Everything stays here. Your other phones keep their copy.",
    delSynced: "Delete the synced copy", delSyncedMeta: "Removed from the server for good. Each phone keeps what it already has.",
    cancel: "Cancel", paste: "Paste", email: "Email",
    all: "All", daily: "Today", weeklyR: "Week", monthly: "Month", leaks: "Optional", done: "Done",
    badPhone: "Use an NTC or Ncell number — starts with 98, 97 or 96"
  },
  NP: {
    home: "गृह", txns: "कारोबार", insights: "विश्लेषण", accounts: "खाताहरू", settings: "सेटिङ", sync: "सिङ्क", goals: "लक्ष्य",
    quickAdd: "छिटो थप्नुहोस्", newGoal: "नयाँ लक्ष्य", rules: "स्वतः वर्गीकरण नियम", review: "समीक्षा बाँकी", combine: "थैली मिलाउनुहोस्",
    tagline: "बैंक, वालेट, सहकारी, नगद — चल्ने हरेक रुपैयाँ एउटै थैलीमा, ताकि कहाँ चुहिन्छ देखियोस्।",
    w1: "बैंक लगइन छैन", w2: "बैंक SMS पढ्छ", w3: "एप आफैँ भेट्छ",
    getStarted: "सुरु गरौँ", otherPhone: "म अर्को फोनमा Thaili चलाउँछु",
    step1: "चरण १ / " + npDigits(OB_STEPS) + " · सन्देश", step2: "चरण २ / " + npDigits(OB_STEPS) + " · यो फोन", step3: "चरण ३ / " + npDigits(OB_STEPS) + " · खाता", step4: "चरण ४ / " + npDigits(OB_STEPS) + " · इतिहास",
    step5: "चरण ५ / " + npDigits(OB_STEPS) + " · वर्ग", step6: "चरण ६ / ६ · सिङ्क, ऐच्छिक", editCats: "वर्गहरू", joinLabel: "सिङ्क जोड्नुहोस्",
    permTitle: "बैंक कारोबारका सन्देश मात्र पढिन्छ",
    permSub: "यहीँ, यो फोनमै पढिन्छ। पछि सिङ्क खोल्नुभयो भने रकम, मिति र व्यापारी मात्र जान्छ — सन्देश आफैँ कहिल्यै होइन।",
    srcTitle: "हरेक खाताका दुई कुरा",
    srcSub: "अन्तिम चार अङ्क — बैंकको SMS मा छापिने यही मात्र हो, जसले खाता छुट्याउँछ — र सुरुको मौज्दात, जहाँबाट हरेक हिसाब गनिन्छ।",
    catsTitle: "तीनदेखि छवटा छान्नुहोस्", catsSub: "सिधा सूची, उप-वर्ग छैन — एक ट्यापमै काम सकियोस्। पछि जति पनि थप्न सकिन्छ।",
    recent: "हालैका", seeAll: "सबै",
    inL: "आम्दानी", outL: "खर्च", savedL: "बचत",
    appearance: "रूप", appearanceMeta: "दिनमा क्रिम, रातमा नीलो", light: "उज्यालो", dark: "अँध्यारो", langMeta: "नेपाली",
    notifications: "सूचना", appLock: "एप लक", exportAll: "सबै निर्यात",
    archive: "संग्रह", categories: "वर्गहरू", totalAcross: "सबै खाताको जम्मा", addAccount: "खाता थप्नुहोस्",
    syncOn: "सिङ्क चालु", syncOffTitle: "सिङ्क बन्द छ", turnOnSync: "सिङ्क खोल्नुहोस्", joinOther: "अर्को फोनमा सिङ्क छ — जोड्नुहोस्",
    stopSync: "सिङ्क रोक्नुहोस्", thisPhone: "यो फोन", synced: "सिङ्क भएको",
    lookSame: "उस्तै देखिन्छन् — तपाईं छुट्याउनुहोस्", sameSpend: "एउटै खर्च", keepBoth: "दुवै राख्नुहोस्", balDiffers: "सुरुको मौज्दात फरक छ",
    useSyncedOnly: "सिङ्क भएको थैली मात्र — यो फोनका कारोबार संग्रहमा जान्छन्",
    restoreCta: "यो फोनमा ल्याउनुहोस्", restoreOther: "अर्को इमेल प्रयोग गर्नुहोस्",
    restoreNote: "यो फोनमा अहिलेसम्म केही छैन, त्यसैले सिङ्क भएको थैली सिधै आउँछ। त्यसपछि दुवै फोन सँगै चल्छन्।",
    stopTitle: "सिङ्क रोक्ने?", stopThis: "यो फोनमा रोक्नुहोस्", stopThisMeta: "सबै यहीँ रहन्छ। अरू फोनमा आफ्नै प्रति रहन्छ।",
    delSynced: "सिङ्क भएको प्रति मेटाउनुहोस्", delSyncedMeta: "सर्भरबाट सधैँका लागि हट्छ। हरेक फोनमा भएको रहन्छ।",
    cancel: "रद्द", paste: "टाँस्नुहोस्", email: "इमेल",
    all: "सबै", daily: "आज", weeklyR: "हप्ता", monthly: "महिना", leaks: "वैकल्पिक", done: "भयो",
    badPhone: "NTC वा Ncell नम्बर चाहिन्छ — ९८, ९७ वा ९६ बाट सुरु हुने"
  }
};


export class ThailiLogic extends React.Component {
  state = {
    calendarDay: new Date().toDateString(), loaded: false, splash: true, screen: "welcome", tx: [], setupComplete: false, storageStatus: { kind: "local", pending: false },
    picked: ["food", "transport", "grocery", "bills", "shopping", "health"],
    saveTarget: 10000, ess: {}, stackIdx: 0, detailId: null, from: "txns", srcFrom: "insights",
    rawOpen: false, editing: false, deleting: false,
    range: "Monthly", insCatsAll: false, ruleEdit: null, addEntry: "", addCat: "food", addSrc: "cash", addDir: "debit", addNote: "", addError: "", discardAdd: false,
    srcKey: null, toast: null, undoState: null, perms: [false, false], // real device state; see refreshPerms()
    appLock: false, locked: false, notifMode: "On",
    detTails: {}, scanTx: [], scanResult: null, scanOrphans: 0, smsSince: null, notificationSince: null,
    theme: "light", lang: "EN", txFilter: "all",
    savingsGoal: 200000, splitMode: "Queue",
    customCats: [], newCatName: "", rules: SEED_RULES.map(r => Object.assign({}, r, { id: newId() })), rulePrompt: null,
    sources: [],
    newSrcKind: "bank", newSrcName: "Nabil Bank", newSrcAmt: "", newSrcRole: "spending",
    newSrcAcct: "", newSrcField: "acct",
    detState: "done", detFrom: "setup", detOn: {}, detFound: [], moneyApps: [],
    account: null, authMode: "create", authStep: "email", authEmail: "", authCode: "", authFrom: "cats",
    devices: DEVICES, syncCell: true, syncRaw: true, lastSync: "2 minutes ago",
    roles: {},
    goals: [],
    goalName: "", goalAmt: "", goalPos: "bottom", goalError: "", discardGoal: false,
    catsMode: "setup", catsFrom: "settings", goalsFrom: "home", settingsFrom: "home", syncFrom: "settings",
    mergePick: {}, mergeBal: null, stopSheet: false, syncAlert: true, resendLeft: 0, remarkDraft: null,
    txCategories: [], txSpending: "all", filtersOpen: false, filterDraft: null,
    txQuery: "", txRange: "month", txFrom: null, txTo: null, calOpen: false, calA: null, calB: null, calKey: calendarAt(new Date()).MONTH_KEY,
    flowDir: "debit", savExplain: false, baseAmt: "", baseFresh: true, baseSetup: false, baseFrom: null,
    // The registered person: { name, phone: "+977XXXXXXXXXX", createdAt }. Saved in the profiles table.
    // TODO: sync still signs in by email; move it to this phone number.
    // Spacing is per device, not synced: it's about this screen and these eyes.
    density: (() => { try { const d = localStorage.getItem("thaili-density"); return DENSITY[d] ? d : "default"; } catch { return "default"; } })(),
    user: null, hideBal: false, regName: "", regPhone: "", regThen: "permission", profName: "", profPhone: ""
  };

  smsToTx(msgs, existing) {
    return importTransactions(msgs, { sources: this.state.sources, rules: this.state.rules,
      existing, now: new Date(), newId });
  }

  // Native alerts wake capture while the app is open; buffered alerts also import on return.
  queueCapture = () => {
    clearTimeout(this.captureTimer);
    this.captureTimer = setTimeout(() => this.catchUpSms().catch(console.warn), 120);
  };

  catchUpSms = (manual) => {
    const s = this.state;
    if (!s.loaded || !s.user || !s.sources.length) return Promise.resolve();
    if (this.catching) { this.captureAgain = true; return this.catching; }
    const t0 = Date.now();
    const read = promise => promise.then(items => ({ ok: true, items })).catch(() => ({ ok: false, items: [] }));
    this.catching = Promise.all([
      read(readSms(Math.max(0, (s.smsSince ?? t0) - 180000))),
      read(readNotifications(s.notificationSince ?? s.smsSince ?? 0)),
      this.appDiscovery.catch(() => s.moneyApps),
    ]).then(async ([sms, notes, apps]) => {
      const inbox = notificationInbox(notes.items, apps, this.state.sources, allMoneyPackages(this.state.sources, apps));
      if (inbox.additions.length) {
        const merged = appendMoneyAccounts(this.state.sources, inbox.additions, this.state.roles);
        await new Promise(resolve => this.setState({ sources: merged.sources, roles: merged.roles }, resolve));
      }
      const imported = this.smsToTx(sms.items.concat(inbox.messages), this.state.tx);
      const found = imported.tx;
      this.setState({
        smsSince: sms.ok ? t0 : s.smsSince,
        notificationSince: notes.ok ? t0 : s.notificationSince,
        tx: applyImportResult(this.state.tx, imported),
      });
      if (found.length) this.flash(found.length + (found.length === 1 ? " new transaction" : " new transactions") + " from bank and wallet alerts");
      else if (manual) this.flash("Up to date — nothing new from your banks or wallets");
    }).finally(() => {
      this.catching = null;
      if (this.captureAgain) { this.captureAgain = false; this.queueCapture(); }
    });
    return this.catching;
  };

  /* Background capture (Capture.java) checks new bank SMS and app notifications with the
     same senders, wording and rules, and nudges "Review this transaction" for a spend no rule files. */
  syncCapture() {
    const s = this.state;
    const sources = rememberMoneyPackages(s.sources, s.moneyApps);
    if (sources !== s.sources) this.setState({ sources });
    setCapture(Object.assign(nativeRules(sources), {
      packages: allMoneyPackages(sources, s.moneyApps),
      notification: notificationRules(),
      rules: s.rules.map(r => words(r.kw)).filter(Boolean),
      notify: s.notifMode !== "Off",
    }));
  }

  /* A tapped notification. Review: import first, then open the spend it was about. */
  openFromNotification = o => {
    if (!this.state.loaded) { this.pendingOpen = o; return; }
    if (o.open === "weekly") { this.go("home"); return; }
    Promise.resolve(this.catchUpSms()).then(() => {
      const t = this.state.tx.filter(x => x.dir === "debit" && Math.abs(Date.parse(x.at) - o.at) <= 180000)[0];
      if (t) this.openDetail(t.id, "home"); else this.go("txns", { txFilter: "review" });
    });
  };

  stack = []; // screens to go back to, most recent last

  back = () => {
    const s = this.state;
    if (s.locked) return false;
    const dismissal = backDismissal(s);
    if (dismissal) { this.setState(dismissal); return true; }
    if (s.screen === "add" && (s.addEntry || s.addNote)) { this.setState({ discardAdd: true }); return true; }
    if (s.screen === "goal-new" && (s.goalName || s.goalAmt)) { this.setState({ discardGoal: true }); return true; }
    while (this.stack.length) {
      const to = this.stack.pop();
      if (to === "scan") continue; // back never re-enters the history import
      this.popping = true;
      this.go(to);
      return true;
    }
    if (TABS.indexOf(s.screen) > 0) { this.go("home"); return true; }
    return false; // a root: let Android background the app
  };

  onKey = e => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); this.back(); } };
  scrollPositions = new Map();
  getSnapshotBeforeUpdate(_, prev) {
    if (prev.screen !== this.state.screen) this.scrollPositions.set(prev.screen,
      Array.from(this.root?.querySelectorAll(".scr .overflow-auto, .scr .overflow-y-auto") || []).map(el => el.scrollTop));
    return null;
  }

  // Status and gesture bar icons follow the app theme, not the system one.
  paintBars = () => {
    if (isDevice) SystemBars.setStyle({ style: this.state.theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  };

  refreshPerms = () => permStatus().then(p => this.setState({ perms: [p.sms, p.notifications] }));
  /* App lock: every return to the app asks again. While a prompt is up, Android's own
     PIN screen hides the WebView too, so hides during auth don't count. */
  auth = title => { this.authing = true; return authenticate(title).finally(() => { this.authing = false; }); };
  unlock = () => {
    if (this.authing) return;
    this.auth("Unlock Thaili").then(r => { if (r.ok) this.setState({ locked: false }); });
  };
  onVisible = () => {
    if (document.visibilityState === "hidden") {
      if (this.state.appLock && !this.authing) this.setState({ locked: true });
      return;
    }
    this.refreshCalendar();
    retrySync();
    this.refreshPerms();
    this.appDiscovery = installedApps().then(detectMoneyApps).then(this.rememberApps).catch(() => this.state.moneyApps);
    if (this.state.locked) this.unlock();
    this.catchUpSms();
  };

  refreshCalendar = () => {
    const today = new Date(), calendarDay = today.toDateString();
    if (calendarDay !== this.state.calendarDay) {
      const elapsed = Math.round((new Date(calendarDay) - new Date(this.state.calendarDay)) / 86400000);
      const shift = value => value === null ? null : value + elapsed;
      this.setState(s => ({ calendarDay, tx: s.tx.map(t => dated(t, today)),
        calKey: s.calKey === calendarAt(new Date(s.calendarDay)).MONTH_KEY ? calendarAt(today).MONTH_KEY : s.calKey,
        txFrom: shift(s.txFrom), txTo: shift(s.txTo), calA: shift(s.calA), calB: shift(s.calB) }));
    }
    clearTimeout(this.dayTimer);
    const midnight = new Date(today); midnight.setHours(24, 0, 0, 0);
    this.dayTimer = setTimeout(this.refreshCalendar, midnight - today + 50);
  };

  appDiscovery = Promise.resolve([]);
  scanId = 0;

  rememberApps = apps => {
    this.setState(s => ({ moneyApps: apps, sources: rememberMoneyPackages(s.sources, apps) }));
    return apps;
  };

  startDetection = (from = "setup") => {
    const scanId = ++this.scanId;
    this.go("detect", { detFrom: from, detState: isDevice ? "scanning" : "unsupported", detFound: [], detOn: {}, detTails: {} });
    if (!isDevice) return;
    scanMoneyApps(installedApps, () => readSms(Date.now() - 90 * 86400000)).then(({ apps, messages }) => {
      if (scanId !== this.scanId) return;
      const detOn = Object.fromEntries(apps.map(d => [d.key, from !== "accounts" || !sourceForMoneyApp(d, this.state.sources)]));
      this.setState(s => ({ detState: "done", detFound: apps, moneyApps: apps, detOn, detTails: tailsByBank(messages), sources: rememberMoneyPackages(s.sources, apps) }));
      this.appDiscovery = Promise.resolve(apps);
    }).catch(() => {
      if (scanId === this.scanId) this.setState({ detState: "error" });
    });
  };

  componentDidMount() {
    this.refreshCalendar();
    onOpen(this.openFromNotification);
    this.moneySub = onMoneyNotification(this.queueCapture);
    captureNotifications(false).catch(console.warn); // cancel reminders from previous versions
    this.paintBars();
    this._s = setTimeout(() => this.setState({ splash: false }), 2200); // let the mark finish drawing
    if (isDevice) this.backSub = CapApp.addListener("backButton", () => { if (!this.back()) CapApp.minimizeApp(); });
    this.refreshPerms();
    this.appDiscovery = installedApps().then(detectMoneyApps).then(this.rememberApps);
    this.appDiscovery.catch(() => {}); // Setup offers a retry if discovery fails.
    document.addEventListener("visibilitychange", this.onVisible);
    document.addEventListener("keydown", this.onKey);
    this.storeSub = subscribeStore((storageStatus, pouch) => {
      this.setState({ storageStatus });
      if (pouch) this.applySavedPouch(pouch, false);
    });
    load().then(d => {
      const ready = async () => {
        const initial = this.state;
        try {
          await initializeStore(initial);
          this.saving = true;
          save(initial, this.state);
        } catch (e) {
          console.error("[thaili] local initialization failed", e);
          this.flash("Unable to save on this phone. Check available storage and reopen Thaili.");
          return;
        }
        if (this.state.locked) this.unlock();
        captureNotifications(this.state.notifMode !== "Off");
        if (this.pendingOpen) { this.openFromNotification(this.pendingOpen); this.pendingOpen = null; }
        else this.catchUpSms();
      };
      if (d) this.applySavedPouch(d, true, ready);
      else this.setState({ loaded: true }, ready);
    }).catch(e => {
      // A disk read failure must never replace an existing pouch with an empty one.
      console.error("[thaili] local load failed", e);
      this.setState({ loaded: true });
      this.flash("Unable to open saved data on this phone. Reopen Thaili to try again.");
    });
  }

  applySavedPouch(d, opening, done) {
    if (!opening) d = mergeIncoming(d, this.state);
    const complete = d.prefs.setupComplete ?? !!d.sources.length;
    const screen = complete ? "home" : d.user ? (d.sources.length ? "source" : "permission") : "welcome";
    const patch = Object.assign({}, d.prefs, {
      setupComplete: complete, user: d.user, sources: rememberMoneyPackages(d.sources, this.state.moneyApps), roles: d.roles,
      tx: d.tx, rules: d.rules, goals: d.goals,
    });
    if (opening) Object.assign(patch, { loaded: true, locked: !!d.prefs.appLock, screen });
    // Returning cloud-only installs are restored in the background after local startup.
    else if (complete && !this.state.setupComplete && !this.state.user) {
      Object.assign(patch, { screen, locked: !!d.prefs.appLock });
      this.stack = [];
    }
    if (!d.sources.some(x => x.key === this.state.srcKey)) patch.srcKey = d.sources[0]?.key || null;
    if (!d.sources.some(x => x.key === this.state.addSrc)) patch.addSrc = d.sources[0]?.key || "cash";
    this.setState(patch, () => {
      done?.();
      if (!opening) {
        if (this.state.locked) this.unlock();
        this.catchUpSms();
      }
    });
  }

  componentDidUpdate(_, prev) {
    if (this.saving && prev.loaded) save(prev, this.state);
    const n = this.state;
    if (n.loaded && (prev.sources !== n.sources || prev.rules !== n.rules || prev.notifMode !== n.notifMode || prev.moneyApps !== n.moneyApps || !prev.loaded)) this.syncCapture();
    if (prev.theme !== this.state.theme) this.paintBars();
    const to = this.state.screen;
    if (prev.screen === to) return;
    const positions = this.scrollPositions.get(to) || [];
    Array.from(this.root?.querySelectorAll(".scr .overflow-auto, .scr .overflow-y-auto") || []).forEach((el, i) => { el.scrollTop = positions[i] || 0; });
    // Every road to Home — load, restore, merge, finishing setup — passes the register gate.
    if (gate(to, !!n.user) !== to) {
      this.stack = []; this.popping = true; // nothing to go back to: back leaves the app
      this.setState({ screen: "register", regThen: to, regName: "", regPhone: "" });
      return;
    }
    if (this.popping) { this.popping = false; return; }
    this.stack = nextStack(this.stack, prev.screen, to);
  }

  componentWillUnmount() { clearTimeout(this.dayTimer); this.scanId++; this.storeSub?.(); this.moneySub?.then(h => h.remove()); clearTimeout(this.captureTimer); this.backSub?.then(h => h.remove()); document.removeEventListener("visibilitychange", this.onVisible); document.removeEventListener("keydown", this.onKey); clearTimeout(this._t); clearTimeout(this._s); clearInterval(this._r); }

  startResend() {
    clearInterval(this._r);
    this.setState({ resendLeft: 30 });
    this._r = setInterval(() => this.setState(p => {
      const n = Math.max(0, (p.resendLeft || 0) - 1);
      if (!n) clearInterval(this._r);
      return { resendLeft: n };
    }), 1000);
  }

  // "Get started": register first unless someone already has; then SMS permission.
  startSetup() {
    if (this.state.user) this.go("permission");
    else this.go("register", { regThen: "permission", regName: "", regPhone: "" });
  }

  startAuth(mode, from) {
    this.go("signup", { authMode: mode, authStep: "email", authEmail: "", authCode: "", authFrom: from });
  }

  flash(msg, undoState) {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.setState({ toast: null, undoState: null }), 3800);
    this.setState({ toast: msg, undoState: undoState || null });
  }

  // Every navigation drops the toast and its undo.
  go(screen, extra) { clearTimeout(this._t); this.setState(Object.assign({ screen: screen, toast: null, undoState: null, calOpen: false, filtersOpen: false, ruleEdit: null }, extra)); }

  openDetail(id, from, raw, edit) {
    this.go("detail", { detailId: id, from: from, rawOpen: !!raw, editing: !!edit, remarkDraft: null });
  }

  // Remarks are the user's own note; the bank's original message is never touched.
  saveRemark(id) {
    const s = this.state, v = (s.remarkDraft || "").trim(), prev = s.tx;
    const cur = (prev.filter(t => t.id === id)[0] || {}).rem || null;
    if ((v || null) === cur) { this.setState({ remarkDraft: null }); return; }
    this.setState({ tx: prev.map(t => t.id === id ? Object.assign({}, t, { rem: v || null }) : t), remarkDraft: null });
    this.flash(v ? (cur ? "Remark updated" : "Remark added") : "Remark removed", { tx: prev });
  }

  moveGoal(i, dir) {
    const j = i + dir;
    const prev = this.state.goals;
    if (j < 0 || j >= prev.length) return;
    const next = prev.slice();
    next[i] = prev[j]; next[j] = prev[i];
    this.setState({ goals: next });
    this.flash(next[j].name + " moved to #" + (j + 1), { goals: prev });
  }


  setCat(id, cat, label) {
    const prev = this.state.tx;
    const t = prev.filter(x => x.id === id)[0];
    const known = findRule(t, this.state.rules);
    this.setState({
      tx: prev.map(x => x.id === id ? Object.assign({}, x, { cat: cat, rem: x.rem || label, auto: null }) : x),
      /* Only offer to learn when there is a word to learn and no rule yet. */
      rulePrompt: (!known && t && t.dir === "debit" && kwFor(t)) ? { kw: kwFor(t), cat: cat, label: label } : null
    });
    this.flash(label + " saved", { tx: prev });
  }

  addRule(kw, cat, label) {
    const prevT = this.state.tx, prevR = this.state.rules;
    kw = words(kw);
    if (!kw) return;
    const rule = { id: newId(), kw: kw, cat: cat, own: true };
    const rules = prevR.concat([rule]);
    const { tx, filed } = applyRule(prevT, rule);
    this.setState({ rules: rules, tx: tx, rulePrompt: null });
    this.flash("“" + kw + "” now files as " + label + (filed ? " · " + filed + " older " + (filed === 1 ? "line" : "lines") + " filed too" : ""), { rules: prevR, tx: prevT });
  }

  // Save the rule sheet: a new rule goes through addRule; an edited one re-files what the old keyword held.
  saveRule(label) {
    const s = this.state, e = s.ruleEdit;
    const kw = e ? words(e.kw) : "";
    if (!e || !e.cat || checkRule(kw, e.id, s.rules, ALL_CATS.concat(s.customCats)).block) return;
    if (!e.id) { this.addRule(kw, e.cat, label); this.setState({ ruleEdit: null }); return; }
    const prevR = s.rules, prevT = s.tx, old = prevR.filter(r => r.id === e.id)[0];
    const rules = prevR.map(r => r.id === e.id ? Object.assign({}, r, { kw: kw, cat: e.cat, own: true }) : r);
    const { tx, filed } = applyRule(prevT, { id: e.id, kw, cat: e.cat }, old);
    this.setState({ rules: rules, tx: tx, ruleEdit: null });
    this.flash("Rule updated · “" + kw + "” → " + label + (filed ? " · " + filed + " filed" : ""), { rules: prevR, tx: prevT });
  }

  dropRule(id) {
    const prevR = this.state.rules, prevT = this.state.tx;
    const r = prevR.filter(x => x.id === id)[0];
    if (!r) return;
    /* Dropping a rule un-files what only that rule was holding up, so the
       review queue tells the truth again. */
    this.setState({
      rules: prevR.filter(x => x.id !== id),
      tx: unfileRule(prevT, r)
    });
    this.flash("Rule for “" + r.kw + "” removed", { rules: prevR, tx: prevT });
  }

  editSource(key) {
    const x = this.state.sources.filter(y => y.key === key)[0];
    if (!x) return;
    const kind = SRC_KINDS.filter(k => k.type === x.type)[0] || SRC_KINDS[2];
    this.go("src-new", {
      editSrcKey: key, srcNewFrom: this.state.screen,
      newSrcKind: kind.key, newSrcName: x.base || x.name, newSrcAmt: x.opening ? String(x.opening) : "",
      newSrcAcct: x.acct ? x.acct.slice(-4) : "", newSrcField: kind.key === "manual" ? "amt" : (x.acct ? "amt" : "acct"),
      newSrcRole: this.state.roles[key] || "savings"
    });
  }


  renderVals() {
    const s = this.state;
    const today = new Date();
    const { TODAY_BS, MONTH_KEY, DAY_OF_MONTH, DAYS_IN_MONTH, MONTH_EN, MONTH_NP, PREV_MONTH_EN,
      dayOf, bsLabel, bsDay, dayLabel, adLabel, wdShort } = calendarAt(today);
    const balances = accountBalances(s.sources, s.tx);
    const balance = key => balances[key] || 0;
    const { income, spent, freeToSpend, remaining, daysLeft, lastDay, allowance } = monthlyBudget(s.tx, TODAY_BS, DAYS_IN_MONTH, s.saveTarget);
    const T = L[s.lang] || L.EN;
    const np = s.lang === "NP";
    const dark = s.theme === "dark";
    const allCats = ALL_CATS.concat(s.customCats);
    const clabel = k => { const c = allCats.concat(INCOME_CATS).filter(x => x.key === k)[0]; return c ? c.label : "Uncategorised"; };
    /* Extras and the user's own categories have no hand-set limit, so they get an
       even slice of the monthly target rather than a silent zero. */
    const inMonth = t => monthKey(t.bs) === MONTH_KEY;
    const evenLimit = Math.round(Math.max(0, income - s.saveTarget) / Math.max(s.picked.length, 1));
    const cats = allCats.filter(c => s.picked.indexOf(c.key) > -1).map(c => Object.assign({ limit: evenLimit }, c));
    const fresh = t => inReviewWindow(t.added, Date.now());
    const review = s.tx.filter(t => needsReview(t, Date.now()));
    const scanAccts = new Set(s.scanTx.map(t => t.src)).size;
    const scanGroups = Object.values(s.scanTx.reduce((g, t) => {
      const k = t.dir + "|" + t.m;
      const x = g[k] || (g[k] = { m: t.m, dir: t.dir, n: 0, amt: 0, cat: t.cat });
      x.n++; x.amt += t.amt; if (!t.cat) x.cat = null;
      return g;
    }, {})).sort((a, b) => b.n - a.n);
    const card = review[Math.min(s.stackIdx, Math.max(0, review.length - 1))];
    const detail = s.tx.filter(t => t.id === s.detailId)[0] || s.tx[0] || { ...NO_TX, bs: TODAY_BS };
    const srcOf = k => s.sources.filter(x => x.key === k)[0] || s.sources[0] || NO_SRC;
    const shownSrc = srcOf(s.srcKey);
    const amtStr = t => (t.dir === "credit" ? "+" : t.dir === "transfer" ? "→" : "−") + fmt(t.amt);
    const txLook = t => { const l = t.dir === "credit" ? [SI.inA, "var(--tintG)", "var(--pos)"] : t.dir === "transfer" ? [SI.xfer, "var(--surface2)", "var(--ink2)"] : !t.cat ? [SI.ask, "var(--tintW)", "var(--warnInk)"] : [CI[t.cat] || IC.tag, "var(--surface2)", "var(--ink2)"]; return { icon: l[0], tint: l[1], ifg: l[2] }; };
    const acctLook = (x, bank) => {
      const k = /Wallet/.test(x.type) ? "wallet" : /Savings|Sahakari|deposit|SIP/i.test(x.type + " " + x.name) ? "save" : isManualSrc(x) ? "cash" : "bank";
      const l = { bank: bank, wallet: [IC.wallet, "var(--tintN)", "var(--navy)"], cash: [IC.cash, "var(--tintW)", "var(--warnInk)"], save: [IC.vault, "var(--tintG)", "var(--pos)"] }[k];
      return { icon: l[0], tint: l[1], ifg: l[2] };
    };
    const amtFg = t => t.dir === "credit" ? "var(--pos)" : t.dir === "transfer" ? "var(--navy)" : "var(--ink)";
    // Accounts by role, as the store saves it: savings, or else spending.
    const acctGrand = Math.max(1, s.sources.reduce((a, x) => a + Math.max(0, balance(x.key)), 0));
    const acctGroups = [
      { key: "spending", label: np ? "खर्च" : "Spending", hint: np ? "दैनिक खर्च यहीँबाट" : "Day-to-day money", color: "var(--navy)", tint: "var(--tintN)", fg: "var(--navy)", icon: IC.wallet },
      { key: "savings", label: np ? "बचत" : "Savings", hint: np ? "बचत आधार र लक्ष्य" : "Counts toward floor & goals", color: "var(--pos)", tint: "var(--tintG)", fg: "var(--pos)", icon: IC.vault }
    ].map(g => {
      const list = s.sources.filter(x => (s.roles[x.key] === "savings" ? "savings" : "spending") === g.key);
      const sum = list.reduce((a, x) => a + balance(x.key), 0);
      return Object.assign(g, {
        sum: sum, total: balRs(sum, s.hideBal),
        rows: list.map(x => ({
          name: x.name, icon: acctLook(x, [IC.bank]).icon, meta: !isManualSrc(x) && (!x.acct || !x.opening) ? (np ? "खाताको विवरण थप्नुहोस्" : "Add account details") : x.type.split(" · ")[0], balance: balRs(balance(x.key), s.hideBal),
          tap: () => this.go("source-detail", { srcKey: x.key, srcFrom: "accounts" })
        }))
      });
    }).filter(g => g.rows.length);

    const chip = (label, on, tap) => ({
      label: label, tap: tap,
      bg: on ? "var(--ink)" : "var(--surface2)", fg: on ? "var(--canvas)" : "var(--ink2)",
      border: on ? "var(--ink)" : "var(--line)", weight: on ? "600" : "500", check: on ? "✓ " : ""
    });

    /* Keypad. An amount gets a "00" key and never starts with 0; a code or account tail can. */
    const keypad = (target, cur, max, amount) => {
      // An amount: no leading zero, one dot, two paisa digits, max whole digits.
      const ok = v => amount ? /^(0|[1-9]\d*)(\.\d{0,2})?$/.test(v) && v.split(".")[0].length <= max : v.length <= max;
      const put = d => { const v = !cur && d === "." ? "0." : cur + d; if (ok(v)) this.setState({ [target]: v, toast: null }); };
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => ({ label: d, fg: "var(--ink)", tap: () => put(d) })).concat([
        amount ? { label: ".", fg: "var(--ink3)", tap: () => put(".") } : { label: "", fg: "var(--ink3)", tap: () => {} },
        { label: "0", fg: "var(--ink)", tap: () => put("0") },
        { label: "", isBack: true, fg: "var(--ink3)", tap: () => this.setState({ [target]: cur.slice(0, -1), toast: null }) }
      ]);
    };

    /* Essential or leak. Unknown and user-made categories start essential — calling
       someone's spending wasteful without being asked is not Thaili's job. */
    const isEss = k => s.ess[k] !== undefined ? s.ess[k] : ESS_DEFAULT[k] !== false;
    /* One colour per kind, everywhere: income green, essential navy, leak amber,
       needs-category violet, transfer grey. The card carries the kind; the chip names the category. */
    const kindOf = t => t.dir === "transfer" ? "xfer" : t.dir === "credit" ? "in" : !t.cat ? (fresh(t) ? "uncat" : "unfiled") : isEss(t.cat) ? "ess" : "leak";
    const KIND = {
      in: ["var(--pos)", "var(--tintG)", "Income"], ess: ["var(--navy)", "var(--tintN)", "Essential"], leak: ["var(--warnInk)", "var(--tintW)", "Optional"],
      uncat: ["var(--uncat)", "var(--tintU)", "Needs category"], xfer: ["var(--ink3)", "var(--surface2)", "Transfer"],
      unfiled: ["var(--ink3)", "var(--surface2)", "Uncategorised"] // past its review week: no longer asks
    };
    const catDot = k => isEss(k) ? "var(--navy)" : "var(--warn)";
    // A transaction as a TxCard; `from` is the screen its detail returns to.
    const txCard = (from, meta) => t => {
      const k = kindOf(t), [ifg, tint, word] = KIND[k];
      return { title: t.m, icon: txLook(t).icon, amount: amtStr(t), fg: amtFg(t), isUncat: k === "uncat", ifg: ifg, rowBg: tint, kindWord: word,
        chip: t.cat ? clabel(t.cat) : word, meta: meta ? meta(t) : srcOf(t.src).short,
        tap: () => this.openDetail(t.id, from, false, k === "uncat") };
    };
    const dayMeta = t => dayLabel(t.off).split(" · ")[0] + " · " + srcOf(t.src).short;

    /* Transactions: Today, Week (last 7 days), this BS Month, or a Custom run of days (stored as day offsets). */
    const inTxWin = t => s.txRange === "today" ? t.off === 0 : s.txRange === "week" ? t.off < 7
      : s.txRange === "custom" ? t.off <= s.txFrom && t.off >= s.txTo : monthKey(t.bs) === MONTH_KEY;
    const q = s.txQuery.trim().toLowerCase();
    const filterContext = { inRange: inTxWin, needsReview: t => needsReview(t, Date.now()), essential: isEss, category: clabel, account: k => srcOf(k).name };
    const appliedFilters = { query: s.txQuery, categories: s.txCategories, spending: s.txSpending, review: s.txFilter === "review" };
    const filtered = filterEntries(s.tx, appliedFilters, filterContext);
    const draftFilters = s.filterDraft || appliedFilters;
    const previewFilters = { ...draftFilters, query: s.txQuery };
    const previewRows = filterEntries(s.tx, previewFilters, filterContext);
    const filteredTotals = flowTotals(filtered);
    const rows = [];
    let lastHeader = null;
    filtered.forEach(t => {
      const dl = dayLabel(t.off);
      if (dl !== lastHeader) { rows.push({ isHeader: true, label: dl }); lastHeader = dl; }
      rows.push(txCard("txns")(t));
    });
    // Custom range picker: one BS month at a time; days count back from today.
    const calY = Math.floor(s.calKey / 12), calM = s.calKey % 12, calDays = daysInBsMonth(calY, calM);
    const offOf = d => Math.round((new Date().setHours(0, 0, 0, 0) - adOf(calY, calM, d).setHours(0, 0, 0, 0)) / 86400000);
    const calLo = s.calA, calHi = s.calB === null ? s.calA : s.calB; // offsets: lo is the earlier day, so the larger number

    /* Period windows: today, the last 7 days, or this BS month — and the one before each. */
    const inWin = t => s.range === "Daily" ? t.off === 0 : s.range === "Weekly" ? t.off < 7 : inMonth(t);
    const inPrev = t => s.range === "Daily" ? t.off === 1 : s.range === "Weekly" ? t.off >= 7 && t.off < 14 : monthKey(t.bs) === MONTH_KEY - 1 && t.bs.d <= DAY_OF_MONTH;
    const debitSum = pred => s.tx.filter(t => t.dir === "debit" && pred(t)).reduce((a, t) => a + t.amt, 0);
    const catIn = k => debitSum(t => t.cat === k && inWin(t));
    const catPrev = k => debitSum(t => t.cat === k && inPrev(t));
    const leakCats = allCats.filter(c => !isEss(c.key)).map(c => ({ c: c, amt: catIn(c.key) })).sort((a, b) => b.amt - a.amt);
    const essOut = allCats.filter(c => isEss(c.key)).reduce((a, c) => a + catIn(c.key), 0);
    const leakOut = leakCats.reduce((a, x) => a + x.amt, 0);
    const periodOut = debitSum(inWin);
    const leakTx = s.tx.filter(t => t.dir === "debit" && t.cat && !isEss(t.cat) && inWin(t));
    const leakCut = Math.round(leakOut / 3 * 100) / 100; // one-third of optional spending, to the paisa
    const periodIn = s.tx.filter(t => t.dir === "credit" && inWin(t)).reduce((a, t) => a + t.amt, 0);
    const prevTotal = debitSum(inPrev);
    /* A period can be negative, and it should say so. */
    const net = periodIn - periodOut;
    const prevName = { Daily: "Yest.", Weekly: "Last wk", Monthly: PREV_MONTH_EN }[s.range];

    const prevLeak = allCats.filter(c => !isEss(c.key)).reduce((a, c) => a + catPrev(c.key), 0);
    const pctDelta = (now, was) => was ? Math.round((now - was) / was * 100) : 0;
    const leakShare = Math.round(leakOut / Math.max(periodOut, 1) * 100);
    /* Whatever is uncategorised, or sits in a switched-off category, belongs to
       neither side — the split has to show it rather than quietly rebase on itself. */
    const unfiled = Math.max(0, periodOut - essOut - leakOut);

    /* FIX 8 — weekday labels come off the real date, not a hardcoded list. */
    const trendDaily = [6, 5, 4, 3, 2, 1, 0].map(o => [wdShort(o), debitSum(t => t.off === o)]);

    const optionalPatterns = spendingPatterns(leakTx);
    const deltaChip = (now, was) => {
      const d = pctDelta(now, was);
      return { icon: d > 0 ? SI.up : d < 0 ? SI.down : SI.flat, text: Math.abs(d) + "%", fg: d === 0 ? "var(--ink3)" : d < 0 ? "var(--pos)" : "var(--warnInk)", bg: d === 0 ? "var(--surface2)" : d < 0 ? "var(--tintG)" : "var(--surface)" };
    };
    const catAmts = allCats.map(c => ({ k: c.key, label: c.label, amt: catIn(c.key), prev: catPrev(c.key), limit: c.limit }));
    const catRows = catAmts.filter(c => c.amt || c.prev).sort((a, b) => b.amt - a.amt).map(c => {
      const pct = c.amt / Math.max(periodOut, 1) * 100;
      const d = deltaChip(c.amt, c.prev);
      return {
        label: c.label, amount: rs(c.amt), width: pct + "%", share: Math.round(pct) + "%",
        tap: () => this.go("txns", { txCategories: [c.k], txSpending: "all", txFilter: "all", txQuery: "", txRange: { Daily: "today", Weekly: "week", Monthly: "month" }[s.range] }),
        color: isEss(c.k) ? "var(--navy)" : "var(--warn)",
        dWord: c.prev && d.text !== "0%" ? (c.amt > c.prev ? "↑ " : "↓ ") + d.text : "", dFg: c.prev ? d.fg : "var(--ink3)"
      };
    });
    // "12% more than last week" — the comparison as a sentence.
    const prevWord = { Daily: np ? "हिजो" : "yesterday", Weekly: np ? "गत हप्ता" : "last week", Monthly: "the same days in " + PREV_MONTH_EN }[s.range];
    const vsSentence = (now, was) => {
      const d = pctDelta(now, was);
      return !was ? "" : d === 0 ? (np ? prevWord + " जत्तिकै" : "Same as " + prevWord)
        : np ? prevWord + " भन्दा " + Math.abs(d) + "% " + (d > 0 ? "बढी" : "कम") : Math.abs(d) + "% " + (d > 0 ? "more" : "less") + " than " + prevWord;
    };
    const perDiv = s.range === "Daily" ? 1 : s.range === "Weekly" ? 7 : DAY_OF_MONTH;
    const perName = s.range === "Monthly" ? (np ? MONTH_NP : MONTH_EN) : s.range === "Weekly" ? (np ? "यो हप्ता" : "this week") : (np ? "आज" : "today");
    /* Hero numbers shrink to fit rather than wrap: full size up to `n` characters. */
    const fit = (len, full, n, min) => (len <= n ? full : Math.max(min, Math.floor(full * n / len))) + "px";

    const addCategories = s.addDir === "credit" ? INCOME_CATS : cats;
    let entryError = "";
    try { manualEntry({ amount: s.addEntry, direction: s.addDir, category: s.addCat, account: s.addSrc, note: s.addNote }, s.sources, addCategories, now(), "validation"); }
    catch (e) { entryError = e.message; }

    /* Savings is the floor. Only what sits above it — the surplus — funds goals,
       waterfalling down the priority list. A goal is reached when surplus covers it. */
    /* Only accounts explicitly marked Savings contribute, matching Accounts and persisted roles. */
    const isSavings = k => s.roles[k] === "savings";
    const savingsSources = s.sources.filter(x => isSavings(x.key));
    const savingsPot = savingsSources.reduce((a, x) => a + balance(x.key), 0);
    const monthlyIn = monthlySavingsRate(s.tx, s.roles, TODAY_BS);
    const { allocations: alloc, floorPct, floorShort, surplus, unallocated, claimed, fundedCount } =
      allocateGoals(s.goals, savingsPot, s.savingsGoal, monthlyIn, s.splitMode);
    const cumulativeShort = floorShort + alloc.reduce((sum, a) => sum + a.short, 0);
    const goalAmtNum = parseFloat(s.goalAmt || "0");
    let goalError = "";
    try { savingsGoal(s.goalName, s.goalAmt, "validation"); } catch (e) { goalError = e.message; }
    /* The baseline: a cushion of 3 or 6 months of essential spending (last three BS months), or the user's own figure. */
    const essCats = cats.filter(c => isEss(c.key));
    const essMonthly = essentialMonthly(s.tx, essCats.map(c => c.key), TODAY_BS);
    const baseFor = m => Math.ceil(essMonthly * m / 5000) * 5000;
    const baseDraft = parseFloat(s.baseAmt || "0");
    const kept = income - spent;
    const openBaseline = () => this.go("baseline", { baseFrom: s.screen, baseSetup: false, baseAmt: String(s.savingsGoal), baseFresh: true });

    const newKind = SRC_KINDS.filter(k => k.key === s.newSrcKind)[0] || SRC_KINDS[0];
    const newSrcAmtNum = parseFloat(s.newSrcAmt || "0");
    const needAcct = newKind.key !== "manual";
    const acctOk = !needAcct || s.newSrcAcct.length === 4;
    const srcMissing = s.sources.filter(x => !isManualSrc(x) && (!x.acct || !x.opening));
    const detectAccounts = s.detFrom === "accounts";
    const detAvailable = s.detFound.filter(d => !detectAccounts || !sourceForMoneyApp(d, s.sources));
    const detOnKeys = detAvailable.filter(d => s.detOn[d.key]).map(d => d.key);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.authEmail.trim());
    const emailMask = e => { const p = (e || "").trim().split("@"); return p.length === 2 ? p[0].slice(0, 1) + "••••@" + p[1] : e; };
    const authReady = s.authStep === "email" ? emailOk : s.authCode.length === 6;
    const dupCount = Math.max(0, s.tx.length - 4);
    const sameCount = MERGE_PAIRS.filter(p => s.mergePick[p.id] === "same").length;
    const mergeLeft = MERGE_PAIRS.filter(p => !s.mergePick[p.id]).length + (s.mergeBal ? 0 : 1);
    const localNic = s.sources.filter(x => x.key === "nic")[0];
    const localOpen = localNic && localNic.opening ? localNic.opening : 62400;
    const OB = ["permission", "detect", "source", "scan", "cats"];
    const obStep = s.screen === "signup" ? (s.authFrom === "cats" ? 6 : 0) : (s.screen === "cats" && s.catsMode === "edit") || (s.screen === "detect" && detectAccounts) ? 0 : OB.indexOf(s.screen) + 1;
    const toAuthEmail = () => this.setState({ screen: "signup", authStep: "email", authCode: "" });
    const joinAcct = () => ({ phone: (s.authEmail || "you@gmail.com").trim().toLowerCase(), since: "Joined today" });
    const debitCount = s.tx.filter(t => t.dir === "debit").length;
    const autoFiled = s.tx.filter(t => t.dir === "debit" && t.auto).length;

    /* No income recorded yet means no budget to measure against: any spend reads as 100%, not 35000%. */
    const targetPctNum = freeToSpend ? Math.round(spent / freeToSpend * 100) : (spent ? 100 : 0);
    const pacePctNum = Math.round(DAY_OF_MONTH / DAYS_IN_MONTH * 100);

    const segBg = on => on ? "var(--surface)" : "transparent";
    const segFg = on => on ? "var(--ink)" : "var(--ink2)";
    const segSh = on => on ? "0 1px 2px rgba(0,0,0,.08)" : "none";

    return {
      screen: s.screen,
      setLight: () => this.setState({ theme: "light" }),
      setDark: () => this.setState({ theme: "dark" }),
      lightBg: segBg(!dark), lightFg: segFg(!dark), lightSh: segSh(!dark),
      darkBg: segBg(dark), darkFg: segFg(dark), darkSh: segSh(dark),
      setEn: () => this.setState({ lang: "EN" }),
      setNp: () => this.setState({ lang: "NP" }),
      enBg: segBg(s.lang === "EN"), enFg: segFg(s.lang === "EN"), enSh: segSh(s.lang === "EN"),
      npBg: segBg(s.lang === "NP"), npFg: segFg(s.lang === "NP"), npSh: segSh(s.lang === "NP"),
      t: T,
      obDots: obStep ? Array.from({ length: OB_STEPS }, (_, i) => i + 1).map(i => ({ bg: i <= obStep ? "var(--action)" : "var(--barTrack)" })) : [],
      obBack: () => {
        if (s.screen === "cats") { this.go(s.catsMode === "edit" ? (s.catsFrom || "settings") : "scan"); return; }
        const m = { permission: "welcome", detect: "permission", source: "detect", scan: "source" };
        this.go(m[s.screen] || "welcome");
      },
      catsEdit: s.catsMode === "edit",
      catsStepLabel: s.catsMode === "edit" ? T.editCats : T.step5,
      scanSkipTap: () => { this.setState({ scanTx: [], scanResult: null }); this.go(s.perms[0] ? "cats" : "permission"); },
      authBack: () => {
        if (s.authStep === "code") { this.setState({ authStep: "email", authCode: "" }); return; }
        this.go(s.authFrom === "cats" ? "baseline" : s.authFrom === "welcome" ? "welcome" : "sync");
      },
      authShowJoin: s.authMode === "create" && s.authStep === "email",
      authJoin: () => this.setState({ authMode: "restore", authStep: "email", authCode: "" }),
      authCode: s.authCode,
      authCodeType: e => this.setState({ authCode: (e.target.value || "").replace(/\D/g, "").slice(0, 6) }),
      authPaste: () => {
        const put = v => {
          const d = (v || "").replace(/\D/g, "").slice(0, 6);
          if (d.length === 6) this.setState({ authCode: d });
          else { this.setState({ authCode: "482913" }); this.flash("No code on the clipboard — filled a demo one"); }
        };
        try { navigator.clipboard.readText().then(put, () => put("")); } catch { put(""); }
      },
      authResendLabel: s.resendLeft > 0 ? "0:" + String(s.resendLeft).padStart(2, "0") : (np ? "फेरि पठाउनुहोस्" : "Resend"),
      authResendFg: s.resendLeft > 0 ? "var(--ink3)" : "var(--action)",
      restoreBack: toAuthEmail,
      syncIconD: s.account ? IC.cloud : IC.cloudOff,
      toAccounts: () => this.go("accounts"),
      // Settings is pushed from the Home avatar and goes back where it came from.
      toSettings: () => this.go("settings", { settingsFrom: s.screen === "settings" ? s.settingsFrom : s.screen }),
      settingsBack: () => this.go(s.settingsFrom || "home"),
      syncOff: !s.account,
      goalsBack: () => this.go(s.goalsFrom || "home"),
      totalBal: balHero(s.sources.reduce((a, x) => a + balance(x.key), 0), s.hideBal),
      totalMeta: s.sources.length + (np ? " खाता · " : " accounts · ") + balRs(savingsPot, s.hideBal) + (np ? " बचतमा गनिएको" : " of it counted as savings"),
      acctGroups: acctGroups,
      acctSplit: acctGroups.map(g => {
        const pct = Math.round(Math.max(0, g.sum) / acctGrand * 100) + "%";
        return { label: g.label, color: g.color, width: pct, pct: pct };
      }),
      mergeBack: toAuthEmail,
      mergeTitle: np ? "दुवैतिर कारोबार छन्" : "Both sides have entries",
      mergeSub: np ? "केही फालिँदैन। हुबहु उस्तै सन्देश आफैँ मिल्छन्; उस्तै मात्र देखिने र हरेक हिसाब बदल्ने कुरा तपाईंलाई सोधिन्छ।"
        : "Nothing is thrown away. Identical messages merge on their own. The few that only look alike — and anything that would change every figure — come to you.",
      mergeSides: [
        { label: T.thisPhone, count: String(s.tx.length), meta: s.sources.length + " accounts · set up today", icon: IC.phone },
        { label: T.synced, count: String(REMOTE.tx), meta: REMOTE.src + " accounts · " + REMOTE.device, icon: IC.cloud }
      ],
      mergeSameLine: dupCount + " of this phone's entries were also read on " + REMOTE.device + " — word-for-word the same message, so each is stored once.",
      mergePairs: MERGE_PAIRS.map(p => {
        const v = s.mergePick[p.id];
        return {
          title: p.title, meta: p.meta, amount: rs(p.amt),
          sameBg: v === "same" ? "var(--navy)" : "transparent", sameFg: v === "same" ? "var(--canvas)" : "var(--ink2)",
          bothBg: v === "both" ? "var(--navy)" : "transparent", bothFg: v === "both" ? "var(--canvas)" : "var(--ink2)",
          setSame: () => this.setState({ mergePick: Object.assign({}, s.mergePick, { [p.id]: "same" }) }),
          setBoth: () => this.setState({ mergePick: Object.assign({}, s.mergePick, { [p.id]: "both" }) })
        };
      }),
      mergeBalLine: "NIC Asia ••4821 was given a different opening balance on each phone. Every figure for that account is counted from it, so pick one.",
      mergeBalOpts: [["here", T.thisPhone, "Typed during setup today", localOpen], ["synced", T.synced, "Set on " + REMOTE.device + " · 3 Shrawan", 61900]].map(o => ({
        label: o[1], meta: o[2], amount: rs(o[3]),
        border: s.mergeBal === o[0] ? "var(--action)" : "var(--line)",
        bg: s.mergeBal === o[0] ? "var(--tintR)" : "var(--surface)",
        tap: () => this.setState({ mergeBal: o[0] })
      })),
      mergeCta: mergeLeft ? mergeLeft + (np ? " निर्णय बाँकी" : mergeLeft === 1 ? " decision left" : " decisions left") : (np ? "एउटै थैलीमा मिलाउनुहोस्" : "Combine into one pouch"),
      mergeCtaBg: mergeLeft ? "var(--surface2)" : "var(--action)",
      mergeCtaFg: mergeLeft ? "var(--ink3)" : "var(--onAction)",
      mergeNow: () => {
        if (mergeLeft) return;
        const total = REMOTE.tx + s.tx.length - dupCount - sameCount;
        this.setState({
          account: joinAcct(),
          devices: DEVICES, lastSync: "just now",
          screen: s.authFrom === "cats" ? "home" : "sync", mergePick: {}, mergeBal: null
        });
        this.flash("Combined · " + total + " entries, " + (dupCount + sameCount) + " stored once");
      },
      mergeReplace: () => {
        this.setState({
          account: joinAcct(),
          devices: DEVICES, lastSync: "just now", setupComplete: true, screen: "home", mergePick: {}, mergeBal: null
        });
        this.flash(s.tx.length + " entries from this phone moved to Archive for 30 days");
      },
      hasStopSheet: !!s.stopSheet,
      askStopSync: () => this.setState({ stopSheet: true }),
      cancelStop: () => this.setState({ stopSheet: false }),
      stopThis: () => {
        const prev = { account: s.account, devices: s.devices };
        this.setState({ account: null, devices: DEVICES, stopSheet: false });
        this.flash("Sync stopped on this phone · everything stays here", prev);
      },
      deleteSynced: () => {
        this.setState({ account: null, devices: DEVICES, stopSheet: false });
        this.flash("Synced copy deleted · each phone keeps what it had");
      },

      toSrcNew: () => this.go("src-new", { srcNewFrom: s.screen, editSrcKey: null, newSrcAmt: "" }),
      srcNewCancel: () => { this.setState({ editSrcKey: null }); this.go(s.srcNewFrom || "accounts"); },

      detectScanning: s.detState === "scanning",
      detectDone: s.detState === "done",
      toDetect: () => this.startDetection("setup"),
      scanAccountApps: () => this.startDetection("accounts"),
      enableTransactionNotifications: () => openNotificationAccess(),
      transactionNotificationsLabel: np ? "कारोबारका सूचनाहरू" : "Transaction notifications",
      transactionNotificationsNote: np ? "बैंक र वालेटका सूचनाबाट आम्दानी र खर्च टिपिन्छ" : "Logs money in and out from all detected banks and wallets",
      transactionNotificationsStatus: s.perms[1] ? (np ? "चालु" : "On") : (np ? "खोल्नुहोस्" : "Enable"),
      scanAccountAppsLabel: np ? "बैंक र वालेट एप खोज्नुहोस्" : "Scan for banking & wallet apps",
      detectRetry: () => this.startDetection(s.detFrom),
      detectAccounts,
      detectStep: detectAccounts ? (np ? "खाता खोज्नुहोस्" : "Find accounts") : T.step2,
      detectAddedLabel: np ? "पहिल्यै थपिएको" : "Already added",
      detectCanAdd: detAvailable.length > 0,
      detectSkipLabel: detectAccounts ? (np ? "खाताहरूमा फर्कनुहोस्" : "Back to accounts") : "Skip — I'll add accounts by hand",
      detectBack: () => { this.scanId++; this.go(detectAccounts ? "accounts" : "permission"); },
      detectManual: () => {
        if (detectAccounts) {
          this.scanId++;
          this.go("src-new", { srcNewFrom: "accounts", editSrcKey: null, newSrcAmt: "", newSrcAcct: "" });
        } else {
          this.go("source", { sources: [CASH], roles: { cash: "spending" } });
        }
      },
      detectError: s.detState === "error",
      detectUnavailable: s.detState === "unsupported",
      detectTitle: s.detState === "scanning" ? "Looking for your money apps"
        : s.detState === "error" ? "Couldn't scan your apps"
        : s.detState === "unsupported" ? "App scanning needs Android"
        : detectAccounts && s.detFound.length && !detAvailable.length ? "No new money apps found"
        : !s.detFound.length ? "No bank or wallet apps found"
        : s.detFound.length + (s.detFound.length === 1 ? " money app" : " money apps") + " on this phone",
      detectSub: s.detState === "scanning"
        ? "Thaili checks which apps are installed. It never opens them and never asks for a login."
        : s.detState === "error" ? "We couldn't read the installed-app list. Try again or add your accounts by hand."
        : s.detState === "unsupported" ? "Open Thaili on your Android phone to find installed banking and wallet apps. You can add accounts by hand here."
        : detectAccounts && s.detFound.length && !detAvailable.length ? "All the banking and wallet apps found are already in your accounts. Scan again after installing a new app."
        : detectAccounts && s.detFound.length ? "Select the apps to add. Existing accounts are marked below. Add each new account’s balance and last four digits afterward."
        : detectAccounts ? "No installed banking or wallet apps were recognized. Scan again after installing an app, or add an account by hand."
        : s.detFound.length ? "Untick anything you don't actually use. Anything the scan can't see — a sahakari, an FD, cash — you add on the next screen."
        : "No installed banking or wallet apps were recognized. Scan again or add your accounts by hand on the next screen.",
      detectRows: s.detFound.map(d => {
        const added = detectAccounts && !!sourceForMoneyApp(d, s.sources);
        return {
          key: d.key, app: d.app, added,
          detail: (d.kind === "bank" ? "Bank app" : "Wallet") + " · " + (s.detTails[d.key] ? "ending " + s.detTails[d.key] + ", seen in your messages" : "installed"),
          border: !added && s.detOn[d.key] ? "var(--action)" : "var(--line)",
          justify: s.detOn[d.key] ? "flex-end" : "flex-start",
          track: s.detOn[d.key] ? "var(--pos)" : "var(--barDim)",
          tap: () => { if (!added) this.setState({ detOn: Object.assign({}, s.detOn, { [d.key]: !s.detOn[d.key] }) }); }
        };
      }),
      detectCta: detOnKeys.length ? "Add " + detOnKeys.length + (detOnKeys.length === 1 ? " account" : " accounts") : "Pick at least one",
      detectCtaBg: detOnKeys.length ? "var(--action)" : "var(--surface2)",
      detectCtaFg: detOnKeys.length ? "var(--onAction)" : "var(--ink3)",
      detectConfirm: () => {
        if (!detOnKeys.length) return;
        const made = detAvailable.filter(d => s.detOn[d.key]).map(d => {
          const kind = SRC_KINDS.filter(k => k.key === d.kind)[0];
          return {
            key: d.key, base: d.base, name: tailName(d.base, s.detTails[d.key] || null), short: d.base, packages: d.packages,
            type: kind.type, dot: kind.dot, opening: 0, acct: s.detTails[d.key] || null
          };
        });
        if (detectAccounts) {
          const merged = appendMoneyAccounts(this.state.sources, made, this.state.roles);
          this.go("accounts", { sources: merged.sources, roles: merged.roles });
          this.flash("Added " + merged.added.length + (merged.added.length === 1 ? " account" : " accounts") + " — tap each new account to set its balance and details");
          return;
        }
        made.push(CASH);
        const roles = {};
        made.forEach(x => { roles[x.key] = "spending"; });
        this.go("source", { sources: made, roles: roles });
      },
      detectSkip: () => {
        this.scanId++;
        if (detectAccounts) { this.go("accounts"); return; }
        this.setState({
          sources: [CASH],
          roles: { cash: "spending" }, screen: "source"
        });
        this.flash("Nothing added from the scan — add accounts by hand");
      },

      toRestoreAuth: () => this.startAuth("restore", "welcome"),
      startCreate: () => this.startAuth("create", "settings"),
      startRestore: () => this.startAuth("restore", "settings"),
      catsNext: () => {
        if (s.picked.length < 3) return;
        if (s.catsMode === "edit") { this.go(s.catsFrom || "settings"); this.flash("Categories saved"); return; }
        // Setup's last step before sync: pick the savings baseline, 3 months of essentials suggested.
        this.go("baseline", { baseSetup: true, baseFrom: "cats", baseAmt: String(essMonthly ? baseFor(3) : s.savingsGoal), baseFresh: true });
      },
      authPhoneStep: s.authStep === "email",
      authCodeStep: s.authStep === "code",
      authStepLabel: s.authFrom === "cats" ? T.step6 : s.authMode === "restore" ? T.joinLabel : T.sync,
      authTitle: s.authStep === "code" ? (np ? "इमेलमा आएको कोड हाल्नुहोस्" : "Enter the code we emailed")
        : s.authMode === "restore" ? (np ? "अर्को फोन कुन इमेलमा सिङ्क हुन्छ?" : "Which email does your other phone sync with?")
        : (np ? "अर्को फोनमा पनि उही थैली" : "The same pouch on your other phone"),
      authSub: s.authStep === "code"
        ? (np ? "यो प्रोटोटाइपमा जुनसुकै छ अङ्क चल्छ। टाँस्न पनि मिल्छ।" : "Any six digits work in this prototype. Paste works too — a real code lands within a minute.")
        : s.authMode === "restore"
        ? (np ? "त्यो थैली यो फोनमा आउँछ" : "Its pouch comes onto this phone") + (s.tx.length && s.authFrom !== "welcome" ? (np ? " — यहाँ भएकोसँग कसरी मिल्छ, देखाइन्छ।" : " — and you'll see how it combines with what's already here.") : ".")
        : (np ? "इमेल सिङ्कको साँचो मात्र हो — पासवर्ड छैन, प्रोफाइल छैन। यसले हरेक फोनमा थैली मिलाइराख्छ, र फोन हरायो भने फिर्ता ल्याउँछ।"
          : "The email is only the key for sync — no password, no profile, no mail from us. It keeps this pouch in step on every phone you use, and brings it back if one is lost."),
      authEmail: s.authEmail,
      authEmailType: e => this.setState({ authEmail: e.target.value }),
      authEmailBorder: s.authEmail && !emailOk ? "var(--line)" : emailOk ? "var(--pos)" : "var(--line)",
      authEmailHint: emailOk ? "We'll send a six-digit code here." : "Only used to send codes. Never shown to anyone.",
      authEmailHintFg: emailOk ? "var(--pos)" : "var(--ink3)",
      authCodeNote: "Sent to " + emailMask(s.authEmail),
      authCodeBoxes: [0, 1, 2, 3, 4, 5].map(i => ({
        ch: s.authCode[i] || "",
        border: i === s.authCode.length ? "var(--action)" : "var(--line)"
      })),
      syncIncludes: SYNC_INCLUDES.map(i => ({ text: i[0], fg: i[1] ? "var(--pos)" : "var(--ink3)" })),
      authCta: s.authStep === "email"
        ? (emailOk ? (np ? "कोड पठाउनुहोस्" : "Email me a code") : (np ? "इमेल लेख्नुहोस्" : "Type your email"))
        : (s.authCode.length === 6 ? (s.authMode === "restore" ? (np ? "अगाडि बढ्नुहोस्" : "Continue") : T.turnOnSync) : (np ? "छ अङ्क" : "Six digits")),
      authCtaBg: authReady ? "var(--action)" : "var(--surface2)",
      authCtaFg: authReady ? "var(--onAction)" : "var(--ink3)",
      authSubmit: () => {
        if (!authReady) return;
        if (s.authStep === "email") {
          this.setState({ authStep: "code", authCode: "" });
          this.startResend();
          this.flash("Code sent to " + emailMask(s.authEmail));
          return;
        }
        if (s.authMode === "restore") { this.go(s.tx.length && s.authFrom !== "welcome" ? "merge" : "restore"); return; }
        if (s.authFrom === "cats") captureNotifications(true, true); // onboarding done: now ask for notifications
        this.setState({
          account: { phone: s.authEmail.trim().toLowerCase(), since: "Syncing since today" },
          devices: [DEVICES[0]], lastSync: "just now",
          screen: s.authFrom === "cats" ? "home" : "sync"
        });
        this.flash("Sync on · this phone is the first one");
      },
      authSkipLabel: s.authMode === "restore"
        ? (s.authFrom === "welcome" ? (np ? "यो फोन नयाँ सिरेबाट सुरु गर्नुहोस्" : "Set this phone up from scratch") : T.cancel)
        : (np ? "अहिले होइन — यही फोनमा राख्नुहोस्" : "Not now — keep it on this phone"),
      authSkip: () => {
        if (s.authMode === "restore") {
          if (s.authFrom === "welcome") { this.startSetup(); return; }
          if (s.authFrom === "cats") { this.setState({ authMode: "create", authStep: "email", authCode: "" }); return; }
          this.go("sync"); return;
        }
        if (s.authFrom === "cats") captureNotifications(true, true); // onboarding done: now ask for notifications
        this.setState({ screen: s.authFrom === "cats" ? "home" : "sync" });
        this.flash("Sync off · this pouch stays on this phone");
      },
      authResend: () => { if (s.resendLeft > 0) return; this.startResend(); this.flash("Code sent again"); },
      authEditPhone: () => this.setState({ authStep: "email", authCode: "" }),

      restoreLine: "Last backup " + REMOTE.when + " from " + REMOTE.device + ", under " + (s.authEmail ? emailMask(s.authEmail) : "your email") + ".",
      restoreStats: [
        { value: String(REMOTE.tx), label: "transactions" },
        { value: String(REMOTE.src), label: "accounts, with numbers" },
        { value: String(REMOTE.rules), label: "auto-filing rules" },
        { value: String(REMOTE.goals), label: "goals, in order" }
      ],
      restoreNow: () => {
        this.setState({
          account: joinAcct(),
          devices: DEVICES, lastSync: "just now", setupComplete: true, screen: "home"
        });
        this.flash("Pouch restored · " + REMOTE.tx + " entries, " + REMOTE.src + " accounts, " + REMOTE.rules + " rules");
      },
      restoreFresh: toAuthEmail,

      signedIn: !!s.account,
      acctPhone: s.account ? s.account.phone : "",
      acctSince: s.account ? s.account.since + " · " + s.devices.length + (s.devices.length === 1 ? " device" : " devices") : "",
      syncStatus: "Synced " + s.lastSync + " · " + s.tx.length + " entries, " + s.sources.length + " accounts",
      backupNow: () => { this.setState({ lastSync: "just now" }); this.flash("Backed up · just now"); },
      deviceRows: s.devices.map(d => ({
        name: d.name, meta: d.meta, cur: !!d.cur,
        action: d.cur ? "This device" : "Sign out",
        actionFg: d.cur ? "var(--pos)" : "var(--action)",
        tap: () => {
          if (d.cur) { this.flash("You're on this one"); return; }
          const prev = s.devices;
          this.setState({ devices: prev.filter(x => x.id !== d.id) });
          this.flash(d.name + " removed · it stops syncing", { devices: prev });
        }
      })),
      syncToggles: [
        { label: "Sync on mobile data", meta: "Off means it waits for wifi. A day of entries is a few kilobytes.", on: s.syncCell, k: "syncCell" },
        { label: "Keep the raw message text", meta: "Useful when a bank changes its SMS format. Off syncs only the amount, date and merchant.", on: s.syncRaw, k: "syncRaw" },
        { label: "Tell me when a phone joins", meta: "Every synced phone gets a notification, with a way to remove the new one.", on: s.syncAlert, k: "syncAlert" }
      ].map(t => ({
        label: t.label, meta: t.meta,
        justify: t.on ? "flex-end" : "flex-start",
        track: t.on ? "var(--pos)" : "var(--barDim)",
        tap: () => this.setState({ [t.k]: !t.on })
      })),
      syncBack: () => this.go(s.syncFrom || "settings"),
      toSync: () => this.go("sync", { syncFrom: s.screen === "sync" ? s.syncFrom : s.screen, stopSheet: false }),
      acctCardBg: s.account ? "var(--tintG)" : "var(--surface2)",
      acctCardFg: s.account ? "var(--pos)" : "var(--ink2)",
      storageTitle: s.storageStatus.kind === "error" ? (np ? "फोनमा सुरक्षित गर्न सकिएन" : "Unable to save on this phone")
        : (np ? "फोनमा सुरक्षित" : "Saved on this phone"),
      storageLine: s.storageStatus.kind === "error" ? (np ? "खाली ठाउँ जाँचेर एप फेरि खोल्नुहोस्।" : "Check available storage and reopen Thaili.")
        : s.storageStatus.kind === "offline" ? (np ? "अफलाइन · इन्टरनेट आएपछि सिङ्क हुन्छ।" : "Offline · sync resumes when you’re connected.")
        : s.storageStatus.kind === "syncing" ? (np ? "पृष्ठभूमिमा सिङ्क हुँदैछ।" : "Syncing in the background.")
        : s.storageStatus.kind === "pending" ? (np ? "सिङ्क पर्खिरहेको छ · एप चलाइरहन सक्नुहुन्छ।" : "Waiting to sync · you can keep using the app.")
        : s.storageStatus.kind === "synced" ? (np ? "सिङ्क भएको · अफलाइन पनि चल्छ।" : "Synced · available offline.")
        : (np ? "खाताहरू र कारोबार यहीँ सुरक्षित छन्।" : "Accounts and transactions are stored here."),
      storageProblem: s.storageStatus.kind === "error",
      storageRetry: s.storageStatus.kind === "pending",
      retryStorage: () => retrySync(),
      retryStorageLabel: np ? "फेरि प्रयास" : "Retry sync",
      acctCardTitle: np ? "सिङ्क सेटिङ" : "Sync settings",
      acctCardLine: np ? "ब्याकअप र अन्य फोनका विकल्प। अफलाइन पनि डेटा उपलब्ध छ।"
        : "Backup and device options. Your data stays available offline.",
      /* Only root screens show the tab bar. */
      showTabs: TABS.indexOf(s.screen) > -1,



      toPermission: () => this.startSetup(),
      toCats: () => {
        if (s.screen === "scan" && s.scanResult) { // "Import them"
          this.setState({ tx: applyImportResult(s.tx, s.scanResult), scanTx: [], scanResult: null });
          this.flash(s.scanTx.length + " transactions imported");
        }
        this.go("cats");
      },
      toTxns: () => this.go("txns", { txFilter: "all" }),
      toAdd: () => this.go("add", { addEntry: "", addNote: "", addError: "", addDir: "debit", addCat: cats[0]?.key || "", addSrc: s.sources.find(x => x.key === "cash")?.key || s.sources[0]?.key || "", discardAdd: false }),
      toGoal: () => this.go("goals", { goalsFrom: s.screen }),
      toReviewStack: () => this.go("stack", { stackIdx: 0 }),

      setupContinue: srcMissing.length
        ? srcMissing.length + (srcMissing.length === 1 ? " account still needs its details" : " accounts still need their details")
        : "Continue with " + s.sources.length + (s.sources.length === 1 ? " account" : " accounts"),
      setupCtaBg: srcMissing.length ? "var(--surface2)" : "var(--action)",
      setupCtaFg: srcMissing.length ? "var(--ink3)" : "var(--onAction)",
      setupNext: () => {
        if (!srcMissing.length) {
          if (!s.perms[0]) { this.go("cats"); return; }
          const t0 = Date.now();
          readSms(t0 - 90 * 86400000).then(msgs => {
            const r = this.smsToTx(msgs, this.state.tx);
            this.go("scan", { scanTx: r.tx, scanResult: r, scanOrphans: r.orphans, smsSince: t0 });
          });
          return;
        }
        this.flash("Tap " + srcMissing[0].name + " to add its account number and balance");
      },
      setupSources: s.sources.map(x => ({
        name: x.name, detail: x.type, dot: x.dot,
        acct: isManualSrc(x) ? "No number needed" : /Wallet/.test(x.type) ? (x.acct ? "Mobile ending " + x.acct.slice(-4) : "Last 4 of the wallet mobile needed") : x.acct ? "A/C ending " + x.acct.slice(-4) : "Last 4 digits needed",
        acctFg: isManualSrc(x) || x.acct ? "var(--ink3)" : "var(--warnInk)",
        opening: x.opening ? rs(x.opening) : "Rs —",
        openFg: x.opening ? "var(--ink2)" : "var(--action)",
        openLabel: x.opening ? "opening" : "set balance",
        tap: () => this.editSource(x.key)
      })),

      perms: [
        { name: "Read bank SMS", detail: "NIC Asia, Nabil, Standard Chartered, Everest. 90 days of history, then ongoing." },
        { name: "Notification access", detail: "Reads transaction alerts from detected bank and wallet apps. Logs amounts and money in or out." }
      ].map((p, i) => ({
        name: p.name, detail: p.detail,
        justify: s.perms[i] ? "flex-end" : "flex-start",
        track: s.perms[i] ? "var(--pos)" : "var(--barDim)",
        tap: () => {
          if (!isDevice) { this.setState({ perms: s.perms.map((v, j) => j === i ? !v : v) }); return; } // browser preview
          if (i === 1) { openNotificationAccess(); return; } // system page; refreshed on return
          if (s.perms[0]) { openAppSettings(); this.flash("Turn SMS off under Permissions"); return; } // only Android can revoke
          requestSms().then(p => {
            this.setState({ perms: [p.sms, p.notifications] });
            if (!p.sms) this.flash("SMS stays off — Thaili works on quick add and notifications");
          });
        }
      })),
      permNote: s.perms[0]
        ? "The system dialog next looks alarming. It's the standard Android one."
        : "Without SMS, Thaili runs on quick add and wallet notifications. You can turn SMS on any time.",
      permCta: s.perms[0] ? (np ? "अनुमति दिनुहोस्, फोन स्क्यान गर्नुहोस्" : "Allow, then scan this phone") : (np ? "SMS बिना अगाडि बढ्नुहोस्" : "Continue without SMS"),

      /* FIX 7 — declining SMS must not claim a scan result. */
      scanTitle: !s.perms[0] ? "Nothing to scan — and that's fine"
        : s.scanTx.length ? "Found " + s.scanTx.length + " transactions across " + scanAccts + (scanAccts === 1 ? " account" : " accounts")
        : "No bank messages in the last 90 days",
      scanSub: !s.perms[0]
        ? "With SMS off there's no history to read. Thaili starts empty and fills up as you add spends by hand."
        : s.scanTx.length ? "Ninety days, already sorted where the merchant was recognisable. The rest is grouped so it's a handful of decisions."
          + (s.scanOrphans ? " " + s.scanOrphans + " more came from accounts you haven't added." : "")
        : "Nothing matched your accounts" + (s.scanOrphans ? " — " + s.scanOrphans + " messages came from banks you haven't added." : ". New messages are picked up from now on."),
      scanGroups: !s.perms[0] ? [
        { label: "Quick add", meta: "The + button, three taps per spend", tag: "Ready", tagBg: "var(--tintG)", tagFg: "var(--pos)" },
        { label: "Notification access", meta: "Bank and wallet transaction alerts still work without SMS", tag: s.perms[1] ? "On" : "Off", tagBg: "var(--tintN)", tagFg: "var(--navy)" }
      ] : scanGroups.slice(0, 4).map(g => {
        const tag = g.dir === "credit" ? "Income" : g.cat ? clabel(g.cat) : "Needs you";
        const ok = g.dir === "credit" || g.cat;
        return { label: g.m + " × " + g.n, meta: rs(g.amt) + (ok ? " · recognised" : " · needs a category"),
          tag: tag, tagBg: ok ? "var(--tintG)" : "var(--tintW)", tagFg: ok ? "var(--pos)" : "var(--warnInk)" };
      }),
      scanCta: s.perms[0] && s.scanTx.length ? "Import them" : s.perms[0] ? "Continue" : "Start empty",
      scanSkip: s.perms[0] ? (s.scanTx.length ? "Skip — start from today" : "") : "Go back and allow SMS",

      catPicks: allCats.map(c => chip(c.label, s.picked.indexOf(c.key) > -1, () => this.setState({
        picked: s.picked.indexOf(c.key) > -1 ? s.picked.filter(k => k !== c.key) : s.picked.concat([c.key])
      }))),
      saveTargetLabel: fmt(s.saveTarget),
      saveUp: () => this.setState({ saveTarget: s.saveTarget + 1000 }),
      saveDown: () => this.setState({ saveTarget: Math.max(1000, s.saveTarget - 1000) }),
      saveTargetNote: "On " + rs(income) + " coming in, that leaves " + rs(freeToSpend) + " free to spend — about " + rs(Math.round(freeToSpend / DAYS_IN_MONTH / 10) * 10) + " a day.",
      essRows: cats.map(c => ({
        label: c.label,
        essBg: isEss(c.key) ? "var(--navy)" : "transparent",
        essFg: isEss(c.key) ? "var(--canvas)" : "var(--ink2)",
        leakBg: isEss(c.key) ? "transparent" : "var(--action)",
        leakFg: isEss(c.key) ? "var(--ink2)" : "var(--onAction)",
        setEss: () => this.setState({ ess: Object.assign({}, s.ess, { [c.key]: true }) }),
        setLeak: () => this.setState({ ess: Object.assign({}, s.ess, { [c.key]: false }) })
      })),
      newCatName: s.newCatName,
      newCatType: e => this.setState({ newCatName: e.target.value }),
      newCatFg: s.newCatName.trim() ? "var(--action)" : "var(--ink3)",
      addCatNote: s.customCats.length
        ? s.customCats.length + (s.customCats.length === 1 ? " category" : " categories") + " you added. They behave like the rest — rules can file into them."
        : "Anything the list misses — school fees, a loan EMI, puja. It joins the same flat list.",
      addCustomCat: () => {
        const name = s.newCatName.trim();
        if (!name) return;
        const key = "c" + Date.now();
        this.setState({
          customCats: s.customCats.concat([{ key: key, label: name }]),
          picked: s.picked.concat([key]), newCatName: ""
        });
        this.flash(name + " added and switched on");
      },

      catCta: s.picked.length >= 3 ? (s.catsMode === "edit" ? T.done : (SETUP_SYNC ? (np ? "अगाडि — सिङ्क" : "Next — sync, optional") : (np ? "अगाडि" : "Next"))) : (np ? "कम्तीमा तीन छान्नुहोस्" : "Pick at least three"),
      catCtaBg: s.picked.length >= 3 ? "var(--action)" : "var(--surface2)",
      catCtaFg: s.picked.length >= 3 ? "var(--onAction)" : "var(--ink3)",

      bsMonth: np ? MONTH_NP + " " + npDigits(TODAY_BS.y) : MONTH_EN + " " + TODAY_BS.y,
      adRange: (np ? "दिन " + DAY_OF_MONTH + " / " : "Day " + DAY_OF_MONTH + " of ") + DAYS_IN_MONTH + " · " + adLabel(0),
      allowAmount: fmt(allowance),
      allowFg: remaining <= 0 ? "var(--warnInk)" : "var(--ink)",
      daysLeftShort: lastDay ? "last day" : daysLeft + " days",
      haveLabel: np ? "कुल मौज्दात" : "Total balance",
      homeBalances: acctGroups.map(g => ({ label: g.label, total: balHero(g.sum, s.hideBal) })),
      monthlyTarget: rs(s.saveTarget),
      editPlan: () => this.go("cats", { catsMode: "edit", catsFrom: "home" }),
      balFs: fit(whole(s.sources.reduce((a, x) => a + balance(x.key), 0)).length, 44, 8, 22),
      budgetFs: fit(Math.max(whole(spent).length, fmt(remaining).length) + 3, 28, 9, 18),
      haveMeta: np ? s.sources.length + " खाताको जम्मा" : "Across " + s.sources.length + (s.sources.length === 1 ? " account" : " accounts"),
      budgetTitle: np ? MONTH_NP + "मा खर्च गर्न मिल्ने" : "Spendable in " + MONTH_EN,
      dayOfLine: np ? "दिन " + DAY_OF_MONTH + " / " + DAYS_IN_MONTH : "Day " + DAY_OF_MONTH + " of " + DAYS_IN_MONTH,
      spentWord: np ? "खर्च भयो" : "Spent",
      homeSpent: "Rs " + whole(spent),
      leftWord: remaining >= 0 ? (np ? "खर्च गर्न बाँकी" : "Left to spend") : (np ? "बढी खर्च" : "Over by"),
      homeLeft: rs(Math.abs(remaining)),
      leftFg: remaining > 0 ? "var(--pos)" : "var(--warnInk)",
      targetWidth: Math.min(100, targetPctNum) + "%",
      budgetBar: targetPctNum >= 100 ? "var(--warnInk)" : targetPctNum > pacePctNum + 8 ? "var(--warn)" : "var(--navy)",
      budgetLine: np ? rs(freeToSpend) + " को " + targetPctNum + "% खर्च भयो" : targetPctNum + "% of " + rs(freeToSpend) + " used",
      suggestLead: remaining <= 0 ? (np ? "खर्च गर्न मिल्ने भन्दा " : "You're ") : lastDay ? (np ? "आज " : "Keep today under ") : (np ? "दिनको " : "Try to keep each day under "),
      suggestAmt: remaining <= 0 ? rs(-remaining) : rs(allowance),
      suggestTail: remaining <= 0 ? (np ? " बढी खर्च भयो" : " past what was free to spend") : np ? " भित्र राख्नुहोस्" : lastDay ? "" : " to stay on track",
      // Free to spend = what came in this month − the monthly savings target.
      suggestHow: (np ? MONTH_NP + "मा आएको " : "Came in this " + MONTH_EN + " ") + rs(income) + " − " + (np ? "बचत लक्ष्य " : "savings target ") + rs(s.saveTarget)
        + " = " + rs(freeToSpend) + (np ? " खर्च गर्न मिल्ने" : " free to spend"),
      goalsManage: np ? "व्यवस्थापन" : "Manage",
      floorPending: floorShort > 0,
      floorLine: np ? "बचत आधार " + rs(s.savingsGoal) + " पुगेपछि लक्ष्य भरिन थाल्छन् · " + rs(floorShort) + " बाँकी"
        : "Goals start filling once savings clear the " + rs(s.savingsGoal) + " baseline · " + rs(floorShort) + " to go",
      homeGoals: alloc.map(a => {
        const pct = Math.min(100, Math.round(a.got / Math.max(a.g.target, 1) * 100));
        return {
          name: a.g.name, got: rs(a.got), target: fmt(a.g.target), pct: pct + "%", width: pct + "%",
          ring: "conic-gradient(var(--pos) " + pct + "%, var(--barTrack) 0)",
          pctFg: a.short === 0 ? "var(--pos)" : "var(--ink)",
          tap: () => this.go("goals", { goalsFrom: "home" })
        };
      }),

      goalName: surplus > 0 ? "Surplus above your baseline" : "Savings baseline",
      goalLabel: surplus > 0 ? balRs(surplus, s.hideBal) + " free" : floorPct + "%",
      goalWidth: surplus > 0 ? Math.round(claimed / Math.max(surplus, 1) * 100) + "%" : floorPct + "%",
      goalNote: surplus <= 0
        ? balRs(savingsPot, s.hideBal) + " of " + rs(s.savingsGoal) + " saved" + (s.hideBal ? "" : " · " + rs(floorShort) + " to go before goals start funding")
        : s.goals.length === 0
        ? balRs(surplus, s.hideBal) + " sitting free above your " + rs(s.savingsGoal) + " baseline, unclaimed"
        : fundedCount + " of " + s.goals.length + " goals covered" + (unallocated > 0 ? " · " + rs(unallocated) + " still free" : " · fully claimed"),

      noGoals: s.goals.length === 0,
      goalCards: alloc.map((a, i) => {
        const g = a.g, done = a.short === 0;
        const pct = Math.round(a.got / Math.max(g.target, 1) * 100);
        return {
          name: g.name, rank: "#" + (i + 1), got: rs(a.got), target: rs(g.target), width: pct + "%",
          bar: done ? "var(--pos)" : pct > 0 ? "var(--warn)" : "var(--barDim)",
          pace: done ? "Reached" : pct > 0 ? "Part-funded" : "Waiting",
          paceFg: done ? "var(--pos)" : pct > 0 ? "var(--warn)" : "var(--ink3)",
          by: done ? "Covered by the surplus" : rs(a.short) + " short",
          need: done ? "Ready to spend"
            : a.waitMonths === null ? "Not enough savings history to estimate"
            : "About " + a.waitMonths + (a.waitMonths === 1 ? " month" : " months") + " at " + rs(Math.round(a.rate)) + "/mo"
              + (floorShort > 0 && s.splitMode === "Queue" && i > 0 ? ", after the floor and the goals above it"
                : floorShort > 0 ? ", after clearing the floor"
                : s.splitMode === "Queue" && i > 0 ? ", after the goals above it" : ""),
          shareBadge: s.splitMode === "Share" ? (a.sharePct || 0) + "% share" : i === 0 ? "Funds first" : "After #" + i,
          upFg: i === 0 ? "var(--barDim)" : "var(--ink2)",
          downFg: i === alloc.length - 1 ? "var(--barDim)" : "var(--ink2)",
          up: () => this.moveGoal(i, -1),
          down: () => this.moveGoal(i, 1),
          remove: () => {
            const prev = s.goals;
            this.setState({ goals: prev.filter(x => x.id !== g.id) });
            this.flash(g.name + " deleted", { goals: prev });
          }
        };
      }),
      splitModes: ["Queue", "Share"].map(m => ({
        label: m === "Queue" ? "Top of the line first" : "Split down the line",
        bg: s.splitMode === m ? "var(--navy)" : "transparent",
        fg: s.splitMode === m ? "var(--canvas)" : "var(--ink2)",
        tap: () => this.setState({ splitMode: m })
      })),
      savingsFrom: "From " + savingsSources.map(x => x.short).join(", "),
      savingsPotLabel: balRs(savingsPot),
      savingsGoalLabel: rs(s.savingsGoal),
      floorWidth: floorPct + "%",
      floorBar: surplus > 0 ? "var(--pos)" : "var(--warn)",
      floorState: surplus > 0 ? "Floor reached" : rs(floorShort) + " to go",
      floorStateFg: surplus > 0 ? "var(--pos)" : "var(--warn)",
      savingsUp: () => this.setState({ savingsGoal: s.savingsGoal + 10000 }),
      savingsDown: () => this.setState({ savingsGoal: Math.max(10000, s.savingsGoal - 10000) }),
      hasSurplus: surplus > 0,
      surplusLabel: rs(surplus),
      surplusFreeLabel: unallocated > 0 ? rs(unallocated) + " unclaimed" : "Fully claimed",
      surplusSegments: alloc.filter(a => a.got > 0).map(a => ({
        name: a.g.name, amount: rs(a.got),
        width: Math.round(a.got / Math.max(surplus, 1) * 100) + "%",
        color: a.short === 0 ? "var(--pos)" : "var(--warn)"
      })),
      toGoalNew: () => this.go("goal-new", { goalAmt: "", goalName: "", goalPos: "bottom", goalError: "" }),
      goalCancel: this.back,
      goalDraftName: s.goalName,
      goalNameType: e => this.setState({ goalName: e.target.value.slice(0, 60), goalError: "" }),
      goalAmount: s.goalAmt,
      goalAmountType: e => { const value = e.target.value.replace(/,/g, ""); if (/^\d{0,9}(\.\d{0,2})?$/.test(value)) this.setState({ goalAmt: value, goalError: "" }); },
      goalReady: !goalError, goalError: s.goalError,
      discardGoal: s.discardGoal,
      keepGoal: () => this.setState({ discardGoal: false }),
      discardGoalEntry: () => this.setState({ discardGoal: false, goalName: "", goalAmt: "" }, () => this.back()),
      goalNeedLine: !goalAmtNum
        ? "Type the full amount. Thaili checks it against the surplus you already have."
        : goalAmtNum <= unallocated
        ? "Covered right now — " + rs(unallocated) + " of surplus is unclaimed, so this is reached the moment you create it."
        : !monthlyIn ? "Not enough savings history to estimate when this goal will be funded."
        : (s.goalPos === "top" ? "Goes to the top — paid before every goal below it. About " + Math.ceil((floorShort + goalAmtNum - unallocated) / monthlyIn) : "Goes to the back of the line. About " + Math.ceil((cumulativeShort + goalAmtNum - unallocated) / monthlyIn)) + " months at " + rs(monthlyIn) + "/mo before the surplus reaches it.",
      goalPosChips: [["top", "Fund first"], ["bottom", "After existing goals"]].map(p => chip(p[1], s.goalPos === p[0], () => this.setState({ goalPos: p[0] }))),
      goalCreate: () => {
        if (this.creatingGoal) return;
        try {
          const goal = savingsGoal(s.goalName, s.goalAmt, newId());
          const prev = s.goals;
          this.creatingGoal = true;
          // Creation replaces the form: Back from Goals must not reopen a saved draft.
          this.stack = this.stack.filter(screen => screen !== "goal-new" && screen !== "goals");
          this.popping = true;
          this.setState({
            goals: s.goalPos === "top" ? [goal].concat(prev) : prev.concat([goal]),
            screen: "goals", goalAmt: "", goalName: "", goalError: ""
          }, () => {
            this.creatingGoal = false;
            this.flash(goal.name + (goal.target <= unallocated ? " created — already covered" : " created · " + rs(goal.target - unallocated) + " short for now"), { goals: prev });
          });
        } catch (e) { this.setState({ goalError: e.message }); }
      },


      hasReview: review.length > 0,
      reviewCount: review.length,
      reviewCountBig: review.length + (review.length === 1 ? " item" : " items"),


      recent: s.tx.slice(0, 4).map(txCard("home")),

      // The one place besides the tab badge that shows the review count.
      reviewChip: {
        label: T.review + " · " + review.length,
        bg: s.txFilter === "review" ? "var(--uncat)" : "var(--tintU)",
        fg: s.txFilter === "review" ? "var(--surface)" : "var(--uncat)",
        tap: () => this.setState({ txFilter: s.txFilter === "review" ? "all" : "review", toast: null })
      },
      txRows: rows,
      txCount: filtered.length,
      txTotals: { income: rs(filteredTotals.income), expenses: rs(filteredTotals.expenses) },
      txRange: s.txRange,
      txRangeSet: e => e.target.value === "custom" ? this.setState({ calOpen: true, calA: s.txFrom, calB: s.txTo }) : this.setState({ txRange: e.target.value }),
      txFilterCount: s.txCategories.length + (s.txSpending !== "all" ? 1 : 0) + (s.txFilter === "review" ? 1 : 0),
      txFilterSummary: [s.txSpending !== "all" ? (s.txSpending === "essential" ? "Essential" : "Optional") : "", s.txCategories.length ? s.txCategories.length + (s.txCategories.length === 1 ? " category" : " categories") : "", s.txFilter === "review" ? "Needs review" : ""].filter(Boolean).join(" · "),
      txReset: () => this.setState({ txQuery: "", txCategories: [], txSpending: "all", txFilter: "all", txRange: "month" }),
      filtersOpen: s.filtersOpen,
      filtersShow: () => this.setState({ filtersOpen: true, filterDraft: { ...appliedFilters, categories: [...s.txCategories] } }),
      filtersClose: () => this.setState({ filtersOpen: false, filterDraft: null }),
      filterSpending: draftFilters.spending,
      filterSpendingSet: value => this.setState({ filterDraft: { ...draftFilters, spending: value } }),
      filterReview: draftFilters.review,
      filterReviewSet: () => this.setState({ filterDraft: { ...draftFilters, review: !draftFilters.review } }),
      filterCategories: allCats.concat(INCOME_CATS).filter(c => s.picked.includes(c.key) || s.tx.some(t => t.cat === c.key) || draftFilters.categories.includes(c.key)).concat( [{ key: "uncategorised", label: "Uncategorised" }, { key: "transfer", label: "Transfers" }]).map(c => ({
        key: c.key, label: c.label, selected: draftFilters.categories.includes(c.key),
        count: filterEntries(s.tx, { ...previewFilters, categories: [c.key] }, filterContext).length,
        tap: () => this.setState({ filterDraft: { ...draftFilters, categories: draftFilters.categories.includes(c.key) ? draftFilters.categories.filter(k => k !== c.key) : [...draftFilters.categories, c.key] } }),
      })),
      filterResultCount: previewRows.length,
      filtersReset: () => this.setState({ filterDraft: { ...draftFilters, categories: [], spending: "all", review: false } }),
      filtersApply: () => this.setState({ txCategories: draftFilters.categories, txSpending: draftFilters.spending, txFilter: draftFilters.review ? "review" : "all", filtersOpen: false, filterDraft: null }),
      dateChips: [["today", "Today"], ["week", "Week"], ["month", "Month"],
        ["custom", s.txRange !== "custom" ? "Custom" : s.txFrom === s.txTo ? bsDay(s.txFrom) : bsDay(s.txFrom) + " – " + bsDay(s.txTo)]
      ].map(([k, label]) => {
        const on = s.txRange === k;
        return { label: label, isCustom: k === "custom", bg: on ? "var(--ink)" : "transparent", fg: on ? "var(--canvas)" : "var(--ink2)", border: on ? "var(--ink)" : "var(--line)",
          tap: () => k === "custom" ? this.setState({ calOpen: true, calA: s.txFrom, calB: s.txTo, toast: null }) : this.setState({ txRange: k, toast: null }) };
      }),
      txEmpty: !rows.length,
      txEmptyTitle: "No matching transactions",
      txEmptyLine: "Try fewer filters, another search or a wider date range.",
      txQuery: s.txQuery,
      txQueryType: e => this.setState({ txQuery: e.target.value.slice(0, 40) }),
      txQueryClear: () => this.setState({ txQuery: "" }),
      calOpen: s.calOpen,
      calShow: () => this.setState({ calOpen: true, calA: s.txFrom, calB: s.txTo }),
      calClose: () => this.setState({ calOpen: false }),
      calPickFrom: () => this.setState({ calA: null, calB: null }),
      calPickTo: () => this.setState({ calB: null }),
      calFromLabel: s.calA !== null ? bsDay(s.calA) : "Pick a day",
      calToLabel: s.calB !== null ? bsDay(s.calB) : s.calA !== null ? "Same day" : "—",
      calFromFg: s.calA !== null ? "var(--ink)" : "var(--ink3)",
      calToFg: s.calB !== null ? "var(--ink)" : "var(--ink3)",
      calFromBorder: s.calA === null || s.calB !== null ? "var(--action)" : "var(--line)",
      calToBorder: s.calA !== null && s.calB === null ? "var(--action)" : "var(--line)",
      calTitle: monthName(s.calKey, np) + " " + (np ? npDigits(calY) : calY),
      calPrev: () => this.setState({ calKey: s.calKey - 1 }),
      calNext: () => { if (s.calKey < MONTH_KEY) this.setState({ calKey: s.calKey + 1 }); },
      calHasNext: s.calKey < MONTH_KEY,
      calCells: (() => {
        const blank = { label: "", band: "transparent", bandR: "0", bg: "transparent", fg: "var(--ink)", ring: "none", weight: 500 };
        const out = Array.from({ length: adOf(calY, calM, 1).getDay() }, () => blank);
        for (let d = 1; d <= calDays; d++) {
          const off = offOf(d), future = off < 0, end = calLo !== null && (off === calLo || off === calHi);
          const inR = calLo !== null && off <= calLo && off >= calHi, span = calLo !== null && calHi !== calLo;
          out.push({
            label: String(d), future: future,
            band: inR && span ? "var(--tintN)" : "transparent",
            bandR: span && off === calLo ? "21px 0 0 21px" : span && off === calHi ? "0 21px 21px 0" : "0",
            bg: end ? "var(--ink)" : "transparent",
            fg: end ? "var(--canvas)" : future ? "var(--barDim)" : "var(--ink)",
            ring: off === 0 && !end ? "inset 0 0 0 1.5px var(--action)" : "none",
            weight: end || off === 0 ? 700 : 500,
            tap: () => {
              if (future) return;
              if (s.calA === null || s.calB !== null) this.setState({ calA: off, calB: null });
              else if (off > s.calA) this.setState({ calA: off });
              else this.setState({ calB: off });
            }
          });
        }
        while (out.length % 7) out.push(blank);
        return out;
      })(),
      calCta: s.calA !== null ? "Show " + (calLo - calHi + 1) + (calLo === calHi ? " day" : " days") : "Pick a start date",
      calCtaBg: s.calA !== null ? "var(--action)" : "var(--surface2)",
      calCtaFg: s.calA !== null ? "var(--onAction)" : "var(--ink3)",
      calApply: () => { if (s.calA === null) return; this.setState({ txRange: "custom", txFrom: calLo, txTo: calHi, calOpen: false }); },

      stackProgress: review.length ? (Math.min(s.stackIdx + 1, review.length) + " of " + review.length) : "All clear",
      stackHasCard: !!card && review.length > 0,
      stackDone: review.length === 0,
      stackExit: this.back,
      cardAmount: card ? "−" + rs(card.amt) : "",
      cardMerchant: card ? card.m : "",
      cardMeta: card ? (dayLabel(card.off) + " · " + card.time + " · " + srcOf(card.src).name) : "",
      cardCats: cats.map(c => Object.assign(chip(c.label, !!(card && card.cat === c.key), () => card && this.setCat(card.id, c.key, c.label)), { dot: card && card.cat === c.key ? "var(--canvas)" : catDot(c.key) })),
      cardNoteLabel: card && card.rem ? "Note: " + card.rem : "Add note",
      cardNote: () => {
        if (!card) return;
        const prev = s.tx;
        this.setState({ tx: prev.map(t => t.id === card.id ? Object.assign({}, t, { rem: t.rem || "Typed in the notification" }) : t) });
        this.flash("Note saved", { tx: prev });
      },
      cardReceipt: () => this.flash("Camera opens straight to capture"),
      cardSkip: () => this.setState({ stackIdx: s.stackIdx + 1, toast: null }),
      cardOpen: () => card && this.openDetail(card.id, "stack", true),

      detailAmount: (detail.dir === "credit" ? "+" : detail.dir === "transfer" ? "→ " : "−") + rs(detail.amt),
      detailKindLabel: detail.dir === "credit" ? "Income · money in" : detail.dir === "transfer" ? "Transfer" : "Expense · money out",
      detailKindIcon: detail.dir === "credit" ? SI.inA : detail.dir === "transfer" ? SI.xfer : SI.outA,
      detailKindBg: detail.dir === "credit" ? "var(--tintG)" : detail.dir === "transfer" ? "var(--tintN)" : "var(--tintO)",
      detailKindFg: detail.dir === "credit" ? "var(--pos)" : detail.dir === "transfer" ? "var(--navy)" : "var(--out)",
      detailFg: detail.dir === "credit" ? "var(--pos)" : detail.dir === "transfer" ? "var(--navy)" : "var(--ink)",
      detailMerchant: detail.m,
      detailFs: fit(rs(detail.amt).length + 1, 44, 10, 24),
      /* FIX 2 — remember where we came from. */
      detailBack: this.back,
      editing: s.editing,
      toggleEdit: () => this.setState({ editing: !s.editing, toast: null }),
      /* FIX 6 — Edit actually edits. */
      detailCats: (detail.dir === "credit" ? INCOME_CATS : cats).map(c => Object.assign(chip(c.label, detail.cat === c.key, () => { this.setCat(detail.id, c.key, c.label); this.setState({ editing: false }); }),
        { dot: detail.cat === c.key ? "var(--canvas)" : detail.dir === "credit" ? "var(--pos)" : catDot(c.key) })),
      detailShowCats: detail.dir !== "transfer" && s.editing,
      detailEditClose: () => this.setState({ editing: false }),
      detailCategoryLabel: detail.cat ? clabel(detail.cat) : "Choose category",
      detailDate: bsLabel(detail.off),
      detailAccount: srcOf(detail.src).name,
      detailCatsTitle: detail.dir === "credit" ? "Income category" : "Expense category",
      detailCatsHint: !detail.cat ? "Needed for Insights" : "Tap to change",
      detailCatsHintFg: !detail.cat ? "var(--uncat)" : "var(--ink3)",
      detailIsDebit: detail.dir === "debit",
      detailAuto: !!detail.auto,
      detailAutoLine: detail.auto ? "“" + detail.auto + "” in the message means " + clabel(detail.cat) + ". Filed without asking." : "",
      detailAutoDrop: () => {
        const r = s.rules.filter(x => x.kw === detail.auto)[0];
        if (r) this.dropRule(r.id);
      },
      promptOpen: !!s.rulePrompt,
      promptLine: s.rulePrompt ? "Every time “" + s.rulePrompt.kw + "” shows up, file it as " + s.rulePrompt.label + "?" : "",
      promptYes: () => { const p = s.rulePrompt; if (p) this.addRule(p.kw, p.cat, p.label); },
      promptNo: () => this.setState({ rulePrompt: null }),

      rulesBack: () => this.go("settings"),
      rulesStat: autoFiled + " of " + debitCount + " spends this month were filed by a rule. The rest asked you.",
      rulesCount: s.rules.length + (s.rules.length === 1 ? " rule" : " rules"),
      ruleNew: () => this.setState({ ruleEdit: { id: null, kw: "", cat: cats[0] ? cats[0].key : null }, toast: null }),
      ruleSheet: !!s.ruleEdit,
      ruleClose: () => this.setState({ ruleEdit: null }),
      ruleSheetTitle: s.ruleEdit && s.ruleEdit.id ? "Edit rule" : "New rule",
      ruleIsEdit: !!(s.ruleEdit && s.ruleEdit.id),
      ruleKw: s.ruleEdit ? s.ruleEdit.kw : "",
      ruleKwType: e => this.setState({ ruleEdit: Object.assign({}, s.ruleEdit, { kw: e.target.value.toUpperCase().replace(/\s+/g, " ").slice(0, 32) }) }),
      ruleKwClear: () => this.setState({ ruleEdit: Object.assign({}, s.ruleEdit, { kw: "" }) }),
      ...(() => {
        const e = s.ruleEdit, kw = e ? words(e.kw) : "", v = e ? checkRule(kw, e.id, s.rules, ALL_CATS.concat(s.customCats)) : { block: true, msg: "" };
        const hits = kw ? s.tx.filter(t => t.dir === "debit" && hay(t).indexOf(kw) > -1).length : 0;
        const c = e && cats.filter(x => x.key === e.cat)[0];
        const ok = !!e && !v.block && !!c;
        return {
          ruleMsg: v.msg || "", ruleMsgFg: v.block ? "var(--action)" : "var(--warnInk)",
          ruleMsgLink: !!v.dupId,
          ruleOpenDup: () => { const d = s.rules.filter(r => r.id === v.dupId)[0]; if (d) this.setState({ ruleEdit: { id: d.id, kw: d.kw, cat: d.cat } }); },
          ruleKwBorder: v.msg && v.block ? "var(--action)" : v.warn ? "var(--warn)" : "var(--line)",
          ruleHint: !kw ? "Copy a word that always appears in this shop's SMS or notification."
            : hits ? "Matches " + hits + (hits === 1 ? " past spend" : " past spends") + " — uncategorised ones get filed on save."
            : "No past spends match yet. It will apply to new ones.",
          ruleCats: cats.map(x => Object.assign(chip(x.label, !!e && e.cat === x.key, () => this.setState({ ruleEdit: Object.assign({}, s.ruleEdit, { cat: x.key }) })),
            { dot: e && e.cat === x.key ? "var(--canvas)" : catDot(x.key) })),
          ruleSaveLabel: e && e.id ? "Save changes" : "Add rule",
          ruleSaveBg: ok ? "var(--action)" : "var(--surface2)", ruleSaveFg: ok ? "var(--onAction)" : "var(--ink3)",
          ruleSave: () => { if (ok) this.saveRule(c.label); },
          ruleDelete: () => { if (e && e.id) { this.setState({ ruleEdit: null }); this.dropRule(e.id); } }
        };
      })(),
      ruleRows: s.rules.map(r => ({
        kw: r.kw, cat: clabel(r.cat), catFg: isEss(r.cat) ? "var(--navy)" : "var(--warnInk)",
        edit: () => this.setState({ ruleEdit: { id: r.id, kw: r.kw, cat: r.cat }, toast: null }),
        origin: r.own ? "You taught this" : "Built in",
        matches: s.tx.filter(t => hay(t).indexOf(r.kw) > -1).length + " matched",
        drop: () => this.dropRule(r.id)
      })),
      rulesEmpty: s.rules.length === 0,
      detailFields: [
        ...(detail.dir === "transfer" ? [] : [{ label: "Category", value: detail.cat ? clabel(detail.cat) : "Not set", fg: detail.cat ? "var(--ink)" : "var(--uncat)", action: s.editing ? "" : "Change", tap: () => this.setState({ editing: true, toast: null }) }]),
        { label: "Account", value: srcOf(detail.src).name, fg: "var(--ink)" },
        ...(detail.to ? [{ label: "To account", value: srcOf(detail.to).name, fg: "var(--ink)" }] : []),
        { label: "Date", value: bsLabel(detail.off) + " · " + detail.time, fg: "var(--ink)" },
        { label: "Gregorian", value: adLabel(detail.off) + " · " + WD_FULL[dayOf(detail.off).getDay()], fg: "var(--ink3)" },
        { label: "Remarks", value: detail.rem || "None", fg: detail.rem ? "var(--ink)" : "var(--ink3)",
          action: s.remarkDraft != null ? "" : detail.rem ? "Edit" : "Add",
          tap: () => { if (s.remarkDraft == null) this.setState({ remarkDraft: detail.rem || "", toast: null }); } },
        { label: "Captured by", value: [...new Set(evidenceFor(detail).map(e => e.ch))].join(" + ") || detail.ch, fg: "var(--ink3)" },
        { label: "Receipt", value: "None attached", fg: "var(--ink3)" }
      ],
      remarkOpen: s.remarkDraft != null,
      remarkDraft: s.remarkDraft || "",
      remarkTitle: detail.rem ? "Edit the remark" : "Add a remark",
      remarkCount: (s.remarkDraft || "").length + " / 80",
      remarkType: e => this.setState({ remarkDraft: e.target.value.slice(0, 80) }),
      remarkKey: e => { if (e.key === "Enter") this.saveRemark(detail.id); if (e.key === "Escape") this.setState({ remarkDraft: null }); },
      remarkSave: () => this.saveRemark(detail.id),
      remarkCancel: () => this.setState({ remarkDraft: null }),
      remarkClear: () => this.setState({ remarkDraft: "" }),
      rawOpen: s.rawOpen,
      toggleRaw: () => this.setState({ rawOpen: !s.rawOpen }),
      detailRaw: detail.raw,
      askDelete: () => this.setState({ deleting: true }),
      deleting: s.deleting,
      cancelDelete: () => this.setState({ deleting: false }),
      confirmDelete: async () => {
        if (!(await this.auth("Delete transaction")).ok) return;
        const prev = this.state.tx;
        this.setState({ deleting: false, screen: s.from || "txns", tx: prev.filter(t => t.id !== detail.id) });
        this.flash("Transaction deleted", { tx: prev });
      },

      ranges: ["Daily", "Weekly", "Monthly"].map(r => ({
        label: { Daily: T.daily, Weekly: T.weeklyR, Monthly: T.monthly }[r], bg: s.range === r ? "var(--surface)" : "transparent", fg: s.range === r ? "var(--ink)" : "var(--ink3)", shadow: s.range === r ? "0 1px 2px rgba(0,0,0,.08)" : "none",
        tap: () => this.setState({ range: r })
      })),
      ...(() => {
        const buckets = s.range === "Daily" ? Array.from({length:6},(_,i) => ({label: String(i*4).padStart(2,"0")+"h", amount: debitSum(t => t.off === 0 && Math.floor(new Date(t.at).getHours()/4) === i)}))
          : s.range === "Weekly" ? [6,5,4,3,2,1,0].map(off => ({label:wdShort(off),amount:debitSum(t => t.off === off)}))
          : Array.from({length:Math.ceil(DAY_OF_MONTH/7)},(_,i) => ({label:(i*7+1)+"–"+Math.min((i+1)*7,DAY_OF_MONTH),amount:debitSum(t => inMonth(t) && Math.floor((t.bs.d-1)/7) === i)}));
        const max = Math.max(1,...buckets.map(b => b.amount));
        return { spendingTrend:buckets.map(b => ({label:b.label,value:kfmt(b.amount),height:(b.amount/max*100)+"%"})),
          trendCaption:s.range === "Monthly" ? MONTH_EN+" · day ranges, month to date" : s.range === "Weekly" ? "Daily spending · last seven days" : "Today · four-hour intervals",
          trendSummary:buckets.map(b => b.label+": "+rs(b.amount)).join(", ") };
      })(),
      keptHeadLabel: (net >= 0 ? (np ? "बचेको · " : "Kept · ") : (np ? "बढी खर्च · " : "Overspent · ")) + perName,
      keptBig: whole(net),
      keptFg: net >= 0 ? "var(--ink)" : "var(--warnInk)",
      keptFs: fit(whole(net).length, 52, 8, 34),
      keptSentence: periodIn > 0
        ? (net >= 0 ? "Income minus expenses · " + Math.round(net / periodIn * 100) + "% of what came in stayed with you" : "Expenses ran " + rs(-net) + " past income")
        : "No income landed in this period, so spending came from what you already had",
      inBig: "+" + whole(periodIn),
      outBig: "−" + whole(periodOut),
      flowFs: fit(Math.max(whole(periodIn).length, whole(periodOut).length) + 1, 30, 8, 18),
      inMeta: (n => n ? n + (n === 1 ? " deposit" : " deposits") : "Nothing yet")(s.tx.filter(t => t.dir === "credit" && inWin(t)).length),
      spentChip: deltaChip(periodOut, prevTotal),
      spentSentence: vsSentence(periodOut, prevTotal),
      toFlow: () => this.go("flow", { flowDir: "debit" }),
      toFlowIn: () => this.go("flow", { flowDir: "credit" }),
      toLeaks: () => this.go("leaks"),
      leaksBack: this.back,
      leakHeadLabel: T.leaks + " · " + perName,
      leakAmtLabel: rs(leakOut),
      leakCutLabel: rs(leakCut),

      // Savings against the baseline on one bar, with room past the larger of the two.
      ...(() => {
        const sc = Math.max(savingsPot, s.savingsGoal, 1) * 1.12;
        return {
          savPotBig: balHero(savingsPot),
          savAcctLine: (np ? "बचतमा · " : "In savings · ") + savingsSources.length + (savingsSources.length === 1 ? " account" : " accounts")
            + " · " + Math.round(Math.max(0, savingsPot) / Math.max(s.savingsGoal, 1) * 100) + (np ? "% आधार" : "% of baseline"),
          // Saved up to the baseline (navy), the gap still to reach it (striped amber), anything above it (green).
          savSavedW: Math.max(0, Math.min(savingsPot, s.savingsGoal)) / sc * 100 + "%",
          savGapW: floorShort / sc * 100 + "%",
          savSurW: surplus / sc * 100 + "%",
          baseLeft: s.savingsGoal / sc * 100 + "%"
        };
      })(),
      savBaseLabel: rs(s.savingsGoal),
      savSurWord: surplus > 0 ? (np ? "माथि · लक्ष्यका लागि" : "Above · for goals") : (np ? "पुग्न बाँकी" : "Still to reach"),
      savSurLabel: rs(surplus > 0 ? surplus : floorShort),
      savSurFg: surplus > 0 ? "var(--pos)" : "var(--warnInk)",
      savSurDot: surplus > 0 ? "var(--pos)" : "var(--warn)",
      savLine: surplus > 0 ? "Your cushion is covered. Only the " + rs(surplus) + " above it goes to goals." : "Goals wait until savings reach the baseline — " + rs(floorShort) + " to go.",
      savExplain: s.savExplain,
      toggleSavExplain: () => this.setState({ savExplain: !s.savExplain }),
      savExplainLine: "You set it during setup — 3 or 6 months of essential spending, or your own amount — and can change it any time. It's a cushion you leave untouched. Thaili adds up every account marked Savings and compares it with the baseline. Below it, goals wait. Above it, the extra fills your goals in priority order.",
      savSteps: [
        { n: "1", label: "Income this month", value: "+" + fmt(income), fg: "var(--pos)" },
        { n: "2", label: "Expenses this month", value: "−" + fmt(spent), fg: "var(--ink)" },
        { n: "3", label: "Kept — move it into savings", value: signed(kept) + fmt(kept), fg: kept < 0 ? "var(--warnInk)" : "var(--navy)" },
        { n: "4", label: surplus > 0 ? "Savings above baseline → goals" : "Savings still below baseline", value: rs(surplus > 0 ? surplus : floorShort), fg: surplus > 0 ? "var(--pos)" : "var(--warnInk)" }
      ],
      toBaseline: openBaseline,

      whereTitle: np ? "पैसा कहाँ गयो" : "Where it went",
      splitRows: [
        { label: np ? "आवश्यक" : "Essential", amt: essOut, color: "var(--navy)" },
        { label: T.leaks, amt: leakOut, color: "var(--warn)" },
        { label: np ? "वर्ग छैन" : "Not filed", amt: unfiled, color: "var(--barDim)" }
      ].filter((g, i) => i < 2 || g.amt > 0).map(g => Object.assign(g, {
        pct: Math.round(g.amt / Math.max(periodOut, 1) * 100) + "%",
        width: Math.round(g.amt / Math.max(periodOut, 1) * 100) + "%"
      })),
      catRowsShown: s.insCatsAll ? catRows : catRows.slice(0, 5),
      catMore: catRows.length > 5,
      catMoreLabel: s.insCatsAll ? (np ? "कम देखाउनुहोस्" : "Show fewer") : (np ? "सबै " + catRows.length + " वर्ग" : "Show all " + catRows.length + " categories"),
      toggleCatsAll: () => this.setState({ insCatsAll: !s.insCatsAll }),

      // Income or Expenses for the period, every entry behind the Insights figure.
      ...(() => {
        const isIn = s.flowDir === "credit";
        const list = s.tx.filter(t => t.dir === (isIn ? "credit" : "debit") && inWin(t));
        return {
          flowName: isIn ? (np ? "आम्दानी" : "Income") : (np ? "खर्च" : "Expenses"),
          flowHeadLabel: (isIn ? (np ? "आम्दानी · " : "Came in · ") : (np ? "खर्च · " : "Spent · ")) + perName,
          flowBig: whole(isIn ? periodIn : periodOut),
          flowBigFg: isIn ? "var(--pos)" : "var(--ink)",
          flowSub: isIn ? "" : vsSentence(periodOut, prevTotal),
          flowSubFg: isIn ? "var(--ink3)" : deltaChip(periodOut, prevTotal).fg,
          flowListTitle: isIn ? (np ? "जम्मा भएका" : "Deposits") : (np ? "खर्चहरू" : "Spends"),
          flowCount: list.length + (isIn ? (list.length === 1 ? " deposit" : " deposits") : (list.length === 1 ? " spend" : " spends")),
          flowRows: list.map(txCard("flow", dayMeta)),
          flowEmptyLine: list.length ? "" : isIn ? "No income in this period" : "No spending in this period"
        };
      })(),

      leakBig: whole(leakOut),
      leakFs: fit(whole(leakOut).length, 52, 8, 34),
      leakSentence: (np ? "कुल खर्चको " + leakShare + "%" : leakShare + "% of what you spent") + (vsSentence(leakOut, prevLeak) && pctDelta(leakOut, prevLeak) !== 0 ? " · " + vsSentence(leakOut, prevLeak) : ""),
      leakPerDay: rs(Math.round(leakOut / perDiv)),
      leakPerDayMeta: s.range === "Daily" ? "today so far" : "average over " + perDiv + " days",
      leaksNoneLabel: np ? "वैकल्पिक खर्च छैन" : "No optional spending this period",
      leaksNone: leakCats.filter(x => x.amt > 0).length === 0,
      leakRows: leakCats.filter(x => x.amt > 0).map(x => ({
        label: x.c.label, amount: rs(x.amt), per: kfmt(Math.round(x.amt / perDiv)) + (np ? "/दिन" : "/day"),
        width: Math.round(x.amt / Math.max(leakCats[0].amt, 1) * 100) + "%"
      })),
      leakTxRows: leakTx.map(txCard("leaks", dayMeta)),
      leakTxCount: leakTx.length + (leakTx.length === 1 ? " spend" : " spends"),
      leakStats: [
        { value: optionalPatterns.heaviest ? bsDay(optionalPatterns.heaviest[0]) + " · " + kfmt(optionalPatterns.heaviest[1]) : "—", label: np ? "सबैभन्दा महँगो दिन" : "Heaviest day" },
        { value: rs(optionalPatterns.median), label: np ? "सामान्य खर्च" : "Typical spend" }
      ],
      leakWhatLine: cats.filter(c => !isEss(c.key)).map(c => c.label).join(", ") || "No categories marked optional",
      toEssEdit: () => this.go("cats", { catsMode: "edit", catsFrom: s.screen }),

      baseSetupMode: s.baseSetup, baseSetupNote: SETUP_SYNC ? "Last step before sync" : "Last step",
      baseBack: () => this.go(s.baseSetup ? "cats" : (s.baseFrom || "settings")),
      baseDraftBig: fmt(baseDraft),
      baseStatus: savingsPot >= baseDraft
        ? "Covered — " + balRs(savingsPot) + " in savings, " + rs(savingsPot - baseDraft) + " above it for goals"
        : rs(baseDraft - savingsPot) + " to go — " + balRs(savingsPot) + " in savings today. Goals wait until it's reached.",
      baseStatusFg: savingsPot >= baseDraft ? "var(--pos)" : "var(--warnInk)",
      baseAmtLabel: s.baseAmt ? fmtTyped(s.baseAmt) : "0",
      baseAmtFg: s.baseAmt ? "var(--ink)" : "var(--barDim)",
      // The prefilled amount is replaced by the first key, not appended to.
      baseKeys: keypad("baseAmt", s.baseFresh ? "" : s.baseAmt, 9, true).map(k => Object.assign({}, k, { tap: () => { k.tap(); this.setState({ baseFresh: false }); } })),
      // One tap fills the amount; it stays editable on the keypad.
      baseChips: essMonthly ? [[3, np ? "३ महिना" : "3 months"], [6, np ? "६ महिना" : "6 months"]].map(([m, label]) =>
        chip(label + " · " + rs(baseFor(m)), baseDraft === baseFor(m), () => this.setState({ baseAmt: String(baseFor(m)), baseFresh: true }))) : [],
      baseBasisLine: essMonthly
        ? "Suggestions use " + rs(essMonthly) + " a month of essential spending (" + essCats.map(c => c.label).join(", ") + ") over the last three months. Optional spending is excluded."
        : "No essential spending in the last three months yet, so type your own amount.",
      baseCta: !baseDraft ? (np ? "रकम लेख्नुहोस्" : "Type an amount") : s.baseSetup ? (SETUP_SYNC ? "Save and continue" : "Save and finish") : "Save baseline",
      baseCtaBg: baseDraft ? "var(--action)" : "var(--surface2)", baseCtaFg: baseDraft ? "var(--onAction)" : "var(--ink3)",
      baseSave: () => {
        if (!baseDraft) return;
        if (s.baseSetup && !SETUP_SYNC) { captureNotifications(true, true); this.setState({ savingsGoal: baseDraft, baseSetup: false, setupComplete: true, screen: "home" }); return; } // setup done: now ask for notifications
        if (s.baseSetup) { this.setState({ savingsGoal: baseDraft }); this.startAuth("create", "cats"); return; }
        const prev = s.savingsGoal;
        this.go(s.baseFrom || "settings", { savingsGoal: baseDraft });
        this.flash("Baseline set to " + rs(baseDraft), { savingsGoal: prev });
      },

      srcNewTitle: s.editSrcKey ? "Edit source" : "Add a source",
      isEditSrc: !!s.editSrcKey,
      newSrcAmtLabel: s.newSrcAmt ? fmtTyped(s.newSrcAmt) : "0",
      newSrcAmtFg: s.newSrcAmt ? "var(--ink)" : "var(--barDim)",
      newSrcKeys: needAcct && s.newSrcField === "acct" ? keypad("newSrcAcct", s.newSrcAcct, 4) : keypad("newSrcAmt", s.newSrcAmt, 9, true),
      newSrcOpeningNote: s.editSrcKey
        ? "Balance — what is in " + s.newSrcName + " right now. Change it and the account is counted from this moment."
        : "Opening balance — what is in " + s.newSrcName + " right now. Every later figure is counted from here, and it locks once the first transaction lands.",
      srcNeedsAcct: needAcct,
      acctFieldLabel: newKind.key === "wallet" ? "Wallet mobile · last 4 digits" : "Account number · last 4 digits",
      acctFieldBorder: s.newSrcField === "acct" ? "var(--action)" : "var(--line)",
      amtFieldBorder: s.newSrcField === "amt" || !needAcct ? "var(--action)" : "var(--line)",
      acctFieldHint: s.newSrcAcct.length === 4 ? "matches ••" + s.newSrcAcct : "as printed in the SMS",
      acctFieldHintFg: s.newSrcAcct.length === 4 ? "var(--pos)" : "var(--ink3)",
      amtFieldHint: newSrcAmtNum ? "" : "required",
      amtFieldHintFg: "var(--ink3)",
      newSrcAcctLabel: s.newSrcAcct ? "•• " + s.newSrcAcct : "•• _ _ _ _",
      newSrcAcctFg: s.newSrcAcct ? "var(--ink)" : "var(--barDim)",
      pickAcctField: () => this.setState({ newSrcField: "acct" }),
      pickAmtField: () => this.setState({ newSrcField: "amt" }),
      newSrcKinds: SRC_KINDS.map(k => ({
        label: k.label,
        bg: s.newSrcKind === k.key ? "var(--navy)" : "transparent",
        fg: s.newSrcKind === k.key ? "var(--canvas)" : "var(--ink2)",
        tap: () => this.setState({ newSrcKind: k.key, newSrcName: k.names[0], newSrcField: k.key === "manual" ? "amt" : s.newSrcField })
      })),
      newSrcPickLabel: newKind.key === "manual" ? "Which one" : "Which " + newKind.label.toLowerCase(),
      newSrcNameChips: (newKind.names.indexOf(s.newSrcName) > -1 ? newKind.names : newKind.names.concat([s.newSrcName])).map(n => chip(n, s.newSrcName === n, () => this.setState({ newSrcName: n }))),
      newSrcRoles: [["savings", "Saving"], ["spending", "Spending"]].map(r => ({
        label: r[1],
        bg: s.newSrcRole === r[0] ? "var(--navy)" : "transparent",
        fg: s.newSrcRole === r[0] ? "var(--canvas)" : "var(--ink2)",
        tap: () => this.setState({ newSrcRole: r[0] })
      })),
      newSrcFeedNote: newKind.key === "manual"
        ? "Nothing to read here — no SMS, no notifications. You add entries by hand, so this balance only moves when you move it."
        : newKind.key === "wallet"
        ? "Thaili watches " + s.newSrcName + " notifications. The first one it reads tells it the account tail, so there is nothing to type."
        : "Thaili reads " + s.newSrcName + " SMS from the sender name and picks up the account tail from the first message — then offers a 90-day backscan of what is already in your inbox.",
      newSrcCta: !newSrcAmtNum ? "Type the opening balance" : !acctOk ? "Add the last 4 digits" : s.editSrcKey ? "Save " + s.newSrcName : "Add " + s.newSrcName,
      newSrcCtaBg: newSrcAmtNum && acctOk ? "var(--action)" : "var(--surface2)",
      newSrcCtaFg: newSrcAmtNum && acctOk ? "var(--onAction)" : "var(--ink3)",
      newSrcCreate: () => {
        if (!newSrcAmtNum || !acctOk) return;
        const prevS = s.sources, prevR = s.roles;
        const acct = needAcct ? s.newSrcAcct : null;
        const shown = tailName(s.newSrcName, acct);
        const back = s.srcNewFrom || "accounts";
        if (s.editSrcKey) {
          this.setState({
            sources: prevS.map(x => x.key === s.editSrcKey
              ? Object.assign({}, x, { name: shown, base: s.newSrcName, short: s.newSrcName, acct: acct, type: newKind.type, dot: newKind.dot, opening: newSrcAmtNum,
                openedAt: newSrcAmtNum !== x.opening ? new Date().toISOString() : x.openedAt }) : x),
            roles: Object.assign({}, prevR, { [s.editSrcKey]: s.newSrcRole }),
            screen: back, editSrcKey: null, newSrcAmt: "", newSrcAcct: ""
          });
          this.flash(shown + " updated", { sources: prevS, roles: prevR });
          return;
        }
        const key = "src" + Date.now();
        this.setState({
          sources: prevS.concat([{ key: key, name: shown, base: s.newSrcName, short: s.newSrcName, acct: acct, type: newKind.type, dot: newKind.dot, opening: newSrcAmtNum, openedAt: new Date().toISOString() }]),
          roles: Object.assign({}, prevR, { [key]: s.newSrcRole }),
          screen: back, newSrcAmt: "", newSrcAcct: ""
        });
        this.flash(shown + " added · " + rs(newSrcAmtNum) + (s.newSrcRole === "savings" ? " counted toward your floor" : " as a spending account"), { sources: prevS, roles: prevR });
      },
      srcDelete: () => {
        if (!s.editSrcKey) return;
        const prevS = s.sources, prevT = s.tx;
        this.setState({
          sources: prevS.filter(x => x.key !== s.editSrcKey),
          tx: prevT.filter(t => t.src !== s.editSrcKey),
          screen: s.srcNewFrom === "source" ? "source" : "accounts", editSrcKey: null, newSrcAmt: ""
        });
        this.flash(s.newSrcName + " removed with its " + prevT.filter(t => t.src === s.editSrcKey).length + " entries", { sources: prevS, tx: prevT });
      },
      srcDeleteLabel: "Remove " + s.newSrcName + " and everything read from it",


      srcName: shownSrc.name,
      srcBalance: balRs(balance(s.srcKey), s.hideBal, true),
      srcMeta: shownSrc.type,
      srcAcctLine: isManualSrc(shownSrc) ? "Manual account · no number to match" : shownSrc.acct ? (/Wallet/.test(shownSrc.type) ? "Mobile ending " : "A/C ending ") + shownSrc.acct.slice(-4) : "Last 4 digits not set",
      srcAcctFg: isManualSrc(shownSrc) || shownSrc.acct ? "var(--ink3)" : "var(--warnInk)",
      srcEdit: () => this.editSource(s.srcKey),
      srcIn: fmt(s.tx.filter(t => t.src === s.srcKey && t.dir === "credit").reduce((a, t) => a + t.amt, 0)),
      srcOut: fmt(s.tx.filter(t => t.src === s.srcKey && t.dir !== "credit").reduce((a, t) => a + t.amt, 0)),
      roleChips: [["savings", "Saving"], ["spending", "Spending"], ["", "Not set"]].map(r => ({
        label: r[1],
        bg: (s.roles[s.srcKey] || "") === r[0] ? "var(--navy)" : "var(--surface2)",
        fg: (s.roles[s.srcKey] || "") === r[0] ? "var(--canvas)" : "var(--ink2)",
        tap: () => {
          const prev = s.roles;
          this.setState({ roles: Object.assign({}, prev, { [s.srcKey]: r[0] }) });
          this.flash(shownSrc.short + " is now " + (r[0] === "spending" ? "a spending account" : r[0] === "savings" ? "a savings account" : "unassigned — counted as savings"), { roles: prev });
        }
      })),
      sourceBack: () => this.go(s.srcFrom || "insights"),
      srcTxns: s.tx.filter(t => t.src === s.srcKey).map(t => Object.assign(txLook(t), {
        title: t.m, meta: dayLabel(t.off) + " · " + t.time, amount: amtStr(t), fg: amtFg(t),
        tap: () => this.openDetail(t.id, "source-detail")
      })),

      addDirection: s.addDir,
      addDirectionSet: dir => this.setState({ addDir: dir, addCat: (dir === "credit" ? INCOME_CATS : cats)[0]?.key || "", addError: "" }),
      addAmount: s.addEntry,
      addAmountType: e => { const value = e.target.value.replace(/,/g, ""); if (/^\d{0,9}(\.\d{0,2})?$/.test(value)) this.setState({ addEntry: value, addError: "" }); },
      addCategory: s.addCat, addCategoryOptions: addCategories,
      addCategorySet: e => this.setState({ addCat: e.target.value, addError: "" }),
      addAccount: s.addSrc, addAccounts: s.sources,
      addAccountSet: e => this.setState({ addSrc: e.target.value, addError: "" }),
      addNote: s.addNote, addNoteType: e => this.setState({ addNote: e.target.value.slice(0,80) }),
      addDateLabel: bsLabel(0), addError: s.addError, addReady: !entryError,
      addCta: s.addDir === "credit" ? "Save income" : "Save expense",
      addCancel: this.back,
      discardAdd: s.discardAdd,
      keepAdd: () => this.setState({ discardAdd: false }),
      discardEntry: () => { this.setState({ discardAdd: false, addEntry: "", addNote: "" }, () => this.back()); },
      commitAdd: () => {
        if (this.adding) return;
        try {
          const entry = dated(manualEntry({ amount: s.addEntry, direction: s.addDir, category: s.addCat, account: s.addSrc, note: s.addNote }, s.sources, addCategories, now(), newId()));
          entry.added = entry.at;
          this.adding = true;
          const prev = s.tx;
          this.setState({ tx: [entry].concat(prev), addEntry: "", addNote: "", addError: "" }, () => {
            this.back(); this.adding = false;
            this.flash((entry.dir === "credit" ? "Income" : "Expense") + " saved · " + rs(entry.amt), { tx: prev });
          });
        } catch (e) { this.setState({ addError: e.message }); }
      },

      prefsTitle: np ? "प्राथमिकता" : "Preferences", manageTitle: np ? "व्यवस्थापन" : "Manage",
      spacingLabel: np ? "ठाउँ · Spacing" : "Spacing",
      spacingMeta: (np ? { compact: "कम ठाउँ — धेरै देखिन्छ", default: "सामान्य", airy: "बढी ठाउँ — खुला" }
        : { compact: "Tighter — more on screen", default: "Balanced", airy: "Roomier — easier to scan" })[s.density],
      densityOpts: [["compact", "Compact", "कम"], ["default", "Default", "सामान्य"], ["airy", "Airy", "खुला"]].map(([k, en, ne]) => ({
        label: np ? ne : en, bg: segBg(s.density === k), fg: segFg(s.density === k), shadow: segSh(s.density === k),
        tap: () => { try { localStorage.setItem("thaili-density", k); } catch { /* private mode: lasts this session */ } this.setState({ density: k }); }
      })),

      // Register: name and an NTC/Ncell number, required before setup or Home. No code check yet.
      ...(() => {
        const ph = digits10(s.regPhone), phoneOk = validPhone(ph), nameOk = s.regName.trim().length >= 2, ready = phoneOk && nameOk;
        return {
          regLabels: np ? { name: "नाम", phone: "मोबाइल नम्बर" } : { name: "Name", phone: "Mobile number" },
          regNamePh: np ? "जस्तै: सीता श्रेष्ठ" : "e.g. Sita Shrestha",
          regCanBack: s.regThen === "permission",
          regBack: () => this.go("welcome"),
          regStepLabel: np ? "तपाईंको खाता" : "Your account",
          regTitle: np ? "नाम र फोन नम्बर" : "Your name and number",
          regSub: np ? "थैली यही नामले तपाईंलाई चिन्छ।" : "So Thaili knows whose pouch this is.",
          regName: s.regName, regNameType: e => this.setState({ regName: e.target.value.slice(0, 40) }),
          regNameBorder: nameOk ? "var(--pos)" : "var(--line)",
          regPhone: ph, regPhoneType: e => this.setState({ regPhone: digits10(e.target.value) }),
          regPhoneBorder: phoneOk ? "var(--pos)" : ph.length === 10 ? "var(--action)" : "var(--line)",
          regPhoneHint: phoneOk ? (np ? "ठीक छ।" : "Looks right.") : ph.length === 10 ? T.badPhone : (np ? "कसैलाई देखाइँदैन।" : "Never shown to anyone."),
          regPhoneHintFg: phoneOk ? "var(--pos)" : ph.length === 10 ? "var(--action)" : "var(--ink3)",
          regCta: ready ? (np ? "अगाडि बढ्नुहोस्" : "Continue") : (np ? "नाम र नम्बर लेख्नुहोस्" : "Add your name and number"),
          regCtaBg: ready ? "var(--action)" : "var(--surface2)", regCtaFg: ready ? "var(--onAction)" : "var(--ink3)",
          regFine: np ? "थैलीले तपाईंको नम्बर कसैलाई दिँदैन।" : "Thaili never shares your number.",
          regSubmit: () => {
            if (!ready) return;
            const user = { name: s.regName.trim(), phone: "+977" + ph, createdAt: now() };
            this.go(s.regThen || "permission", { user: user, regName: "", regPhone: "" });
            this.flash((np ? "स्वागत छ, " : "Welcome, ") + user.name.split(/\s+/)[0]);
          }
        };
      })(),

      // Profile: the same two fields, prefilled from the saved user on every visit.
      userName: s.user ? s.user.name : "",
      userPhone: s.user ? fmtPhone(s.user.phone) : "",
      userInitials: s.user ? initials(s.user.name) : "",
      editLabel: np ? "सम्पादन" : "Edit",
      settingsLabel: np ? "प्रोफाइल र सेटिङ" : "Profile and settings",
      toProfile: () => s.user && this.go("profile", { profName: s.user.name, profPhone: s.user.phone.slice(-10) }),
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
          profName: s.profName, profNameType: e => this.setState({ profName: e.target.value.slice(0, 40) }),
          profNameBorder: nameOk ? "var(--line)" : "var(--action)",
          profPhone: ph, profPhoneType: e => this.setState({ profPhone: digits10(e.target.value) }),
          profPhoneBorder: !phoneChanged ? "var(--line)" : phoneOk ? "var(--pos)" : "var(--action)",
          profPhoneHint: !phoneChanged ? (np ? "कसैलाई देखाइँदैन।" : "Never shown to anyone.") : phoneOk ? (np ? "ठीक छ।" : "Looks right.") : T.badPhone,
          profPhoneHintFg: !phoneChanged ? "var(--ink3)" : phoneOk ? "var(--pos)" : "var(--action)",
          profBack: () => this.go("settings"),
          profCta: !(phoneChanged || nameChanged) ? (np ? "केही बदलिएको छैन" : "No changes") : !ready ? (np ? "नाम र नम्बर मिलाउनुहोस्" : "Check name and number") : (np ? "सेभ गर्नुहोस्" : "Save"),
          profCtaBg: ready ? "var(--action)" : "var(--surface2)", profCtaFg: ready ? "var(--onAction)" : "var(--ink3)",
          profSave: () => {
            if (!ready) return;
            const prev = s.user;
            this.go("settings", { user: Object.assign({}, u, { name: s.profName.trim(), phone: "+977" + ph }) });
            this.flash(phoneChanged ? (np ? "नम्बर बदलियो" : "Number changed") : (np ? "प्रोफाइल सेभ भयो" : "Profile saved"), { user: prev });
          }
        };
      })(),

      // The eye beside the balance: one preference, read by every balance formatter call.
      toggleBal: e => { e.stopPropagation(); this.setState({ hideBal: !s.hideBal }); },
      balEyeD: s.hideBal ? P.eyeOff : P.eye,
      balEyeLabel: s.hideBal ? (np ? "मौज्दात देखाउनुहोस्" : "Show balance") : (np ? "मौज्दात लुकाउनुहोस्" : "Hide balance"),
      settingRows: [
        { icon: IC.bell, label: T.notifications,
          meta: s.notifMode === "Off" ? "No alerts — review from the app" : "New transactions that need a category",
          value: s.notifMode === "Off" ? "Off" : "On", tap: () => {
            const on = s.notifMode === "Off";
            captureNotifications(on, true);
            this.setState({ notifMode: on ? "On" : "Off" });
          } },
        { icon: IC.lock, label: T.appLock, meta: "Fingerprint or phone PIN on open", value: s.appLock ? "On" : "Off",
          tap: () => this.auth(s.appLock ? "Turn off app lock" : "Turn on app lock").then(r => {
            if (r.ok) { this.setState({ appLock: !s.appLock }); this.flash(s.appLock ? "App lock off" : "App lock on — Thaili asks every time you open it"); }
            else if (r.reason === "no-lock") this.flash("Set a screen lock in Android settings first");
          }) },
        { icon: IC.bolt, label: T.rules, meta: s.rules.length + " rules · " + autoFiled + " filed this month", value: "", tap: () => this.go("rules") },
        { icon: IC.tag, label: T.categories, meta: s.picked.length + " in use · essential or optional", value: "", tap: () => this.go("cats", { catsMode: "edit", catsFrom: "settings" }) },
        { icon: IC.vault, label: np ? "बचत आधार" : "Savings baseline", meta: "Protected before any goal is funded", value: rs(s.savingsGoal),
          tap: openBaseline },
        { icon: IC.target, label: T.goals, meta: s.goals.length ? s.goals.length + " claiming " + rs(surplus) + " of surplus" : "None yet", value: "", tap: () => this.go("goals", { goalsFrom: "settings" }) }
        // Export everything and Archive are hidden until they work — see "To do" in README.md.
      ],

      goTab: k => this.go(k),
      syncPull: () => { retrySync(); return this.catchUpSms(true); },
      hasToast: !!s.toast,
      toast: s.toast,
      /* FIX 5 — Undo only where there is something to undo. */
      canUndo: !!s.undoState,
      toastBottom: TABS.indexOf(s.screen) > -1 ? "88px" : "24px",
      undo: () => {
        clearTimeout(this._t);
        this.setState(Object.assign({ toast: null, undoState: null }, s.undoState || {}));
      }
    };
  }

  render() {
    // Splash while the pouch loads, so a returning user never flashes the welcome screen.
    const v = this.state.loaded && !this.state.splash ? this.renderVals() : null;
    // Transition for this screen change: back slides from the left, tab to tab fades, else push.
    const scr = this.state.screen;
    if (scr !== this.shownScreen) {
      this.anim = !this.shownScreen ? "" : this.popping ? "scr-back"
        : TABS.indexOf(scr) > -1 && TABS.indexOf(this.shownScreen) > -1 ? "scr-fade" : "scr-fwd";
      this.shownScreen = scr;
    }
    return (
      <div ref={el => this.root = el} data-theme={this.state.theme} style={{ "--sp": DENSITY[this.state.density] }} onClickCapture={e => { if (e.target.closest(".press, .press-bg, button")) hapticTap(); }}
        className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-canvas text-ink pt-[var(--safe-area-inset-top,env(safe-area-inset-top))] pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom))]">
        {v && this.state.storageStatus.kind === "error" && !this.state.locked && <div role="alert" className="flex-none bg-tint-r px-5 py-2 text-[13px] text-action">Unable to save on this phone. Check available storage and reopen Thaili.</div>}
        {!v ? <Splash /> : this.state.locked ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex size-[72px] items-center justify-center rounded-[20px] bg-brand">
              <img src="./thaili-mark-line.png" alt="Thaili" className="h-[50px] w-[36px] object-contain" />
            </div>
            <div className="text-[15px] text-ink-2">Thaili is locked</div>
            <button onClick={this.unlock} className="rounded-[16px] bg-action px-10 py-4 text-[15px] font-semibold text-on-action">Unlock</button>
          </div>
        ) : <div key={scr} className={"scr " + this.anim}><Screens v={v} /></div>}
      </div>
    );
  }
}
