/* eslint-disable */
// @ts-nocheck
/* Ported from design/Thaili v9.dc.html (<script data-dc-script>), now hand-maintained.
   Business rules track the design. Real data replaced the design's mock: the
   pouch loads from and saves to Supabase (./store — componentDidMount /
   componentDidUpdate), dates run on the real BS calendar (./bs), and every
   insight is computed from the user's own transactions. The sync / devices /
   merge screens are still the design's prototype. renderVals() is the view
   model the hand-written screens in src/screens read. */
"use client";
import React from "react";
import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { TABS, nextStack } from "./nav";
import Screens from "@/screens";
import { registerPush } from "./notifications";
import { load, save, markAllDirty } from "./store";
import { permStatus, requestSms, openNotificationAccess, openAppSettings, installedApps, isDevice, authenticate, readSms, hapticTap } from "./device";
import { parseSms, sourceFor, isDuplicate, tailsByBank } from "./sms";
import { BS_EN, BS_NP, bsOf, daysInBsMonth, monthKey, monthName, npDigits, dated } from "./bs";

const fmt = n => Math.round(Math.abs(n)).toLocaleString("en-IN");
const rs = n => "Rs " + fmt(n);
// fmt/rs drop the sign (callers word it: "over", "more than expected"). A balance can
// really be below zero — an overdrawn account, cash spent past its opening — so keep it.
const signed = n => (Math.round(n) < 0 ? "−" : "");
const balFmt = n => signed(n) + fmt(n);
const balRs = n => signed(n) + rs(n);

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

/* Auto-filing. Every feed line carries a remark; a rule is a word seen in that
   remark plus the category it means. Built-ins cover the obvious national ones,
   and anything the user files by hand can become a rule of their own. */
const SEED_RULES = [
  { id: 1, kw: "BHATBHATENI", cat: "grocery", own: false },
  { id: 2, kw: "PATHAO", cat: "transport", own: false },
  { id: 3, kw: "FOODMANDU", cat: "food", own: false },
  { id: 4, kw: "NEA BILL", cat: "bills", own: false }
];
const hay = t => (t.m + " " + (t.rem || "") + " " + (t.raw || "")).toUpperCase();
/* FONEPAY, POS, QR — the merchant field is a payment rail, not a shop. In those
   cases the remark is the only thing worth learning from. */
const kwFor = t => /FONEPAY|POS |QR|MPAY/i.test(t.m) && t.rem ? t.rem.toUpperCase() : t.m.toUpperCase();


/* The scan asks Android which of these apps are installed — nothing inside them is
   read. Package names are verified against the Play Store; every one must also be
   listed under <queries> in AndroidManifest.xml or Android 11+ reports it missing.
   A tail shows only once the SMS reader has seen that account's messages. */
const DETECTED = [
  { key: "nic", pkg: "com.f1soft.nicasiamobilebanking", app: "NIC Asia Mobile Banking", base: "NIC Asia", kind: "bank" },
  { key: "nabil", pkg: "com.f1soft.nabilmbank", app: "Nabil mBank", base: "Nabil Bank", kind: "bank" },
  { key: "scb", pkg: "com.sc.mobilebanking.np", app: "SC Mobile Nepal", base: "Standard Chartered", kind: "bank" },
  { key: "everest", pkg: "com.everestbankltd.mbanking", app: "Everest Bank mBanking", base: "Everest Bank", kind: "bank" },
  { key: "gibl", pkg: "com.swifttechnology.globalsmart", app: "Global Smart Plus", base: "Global IME", kind: "bank" },
  { key: "esewa", pkg: "com.f1soft.esewa", app: "eSewa", base: "eSewa", kind: "wallet" },
  { key: "khalti", pkg: "com.khalti", app: "Khalti", base: "Khalti", kind: "wallet" },
  { key: "ime", pkg: "com.swifttechnology.imepay", app: "IME Pay", base: "IME Pay", kind: "wallet" }
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
const CASH = { key: "cash", base: "Cash", name: "Cash", short: "Cash", type: "Manual entry", dot: "#B4721F", opening: 0, acct: null };
const isManualSrc = x => /Manual|manual/.test(x.type);
const tailName = (base, acct) => acct && acct.length >= 4 ? base + " ••" + acct.slice(-4) : base;


// ponytail: "today" is fixed when the app starts; recompute on resume if it
// stays open across midnight.
const AD_TODAY = new Date();
const TODAY_BS = bsOf(AD_TODAY);
const DAYS_IN_MONTH = daysInBsMonth(TODAY_BS.y, TODAY_BS.m);
const DAY_OF_MONTH = TODAY_BS.d;
const MONTH_KEY = monthKey(TODAY_BS);
const MONTH_EN = BS_EN[TODAY_BS.m];
const MONTH_NP = BS_NP[TODAY_BS.m];
const PREV_MONTH_EN = monthName(MONTH_KEY - 1);
const AD_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WD_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const dayOf = off => new Date(AD_TODAY.getTime() - off * 86400000);
const bsLabel = off => { const b = bsOf(dayOf(off)); return b.d + " " + BS_EN[b.m] + " " + b.y; };
const dayLabel = off => { const b = bsOf(dayOf(off));
  return off === 0 ? "Today · " + b.d + " " + BS_EN[b.m] : off === 1 ? "Yesterday · " + b.d + " " + BS_EN[b.m] : bsLabel(off); };
const newId = () => crypto.randomUUID();
const NOTIF_MODES = ["All", "Needs review", "Off"];
/* Native navigation rules live in ./nav; back on Home backgrounds the app. */
const QUIET_HOURS = ["10pm–7am", "11pm–6am", "Off"];
const now = () => new Date().toISOString();
/* Placeholders so an empty pouch (first launch) renders instead of crashing. */
const NO_SRC = { key: "", name: "", base: "", short: "", type: "", dot: "var(--line)", opening: 0, acct: null };
const NO_TX = { id: null, m: "", amt: 0, dir: "debit", src: "", cat: null, rem: null, off: 0, time: "", ch: "", raw: "", bs: TODAY_BS };
const adLabel = off => { const d = dayOf(off); return d.getDate() + " " + AD_MONTHS[d.getMonth()] + " " + d.getFullYear(); };
const wdShort = off => WD[dayOf(off).getDay()];


const SRC_KINDS = [
  { key: "bank", label: "Bank", type: "Bank · SMS", dot: "#D02A2E",
    names: ["Nabil Bank", "Global IME", "NIC Asia", "Siddhartha", "Machhapuchchhre", "Kumari Bank"] },
  { key: "wallet", label: "Wallet", type: "Wallet · notifications", dot: "#2B3A4A",
    names: ["eSewa", "Khalti", "IME Pay", "Fonepay"] },
  { key: "manual", label: "Cash or other", type: "Manual entry", dot: "#7A8794",
    names: ["Cash on hand", "Sahakari", "Fixed deposit", "SIP", "Lent out"] }
];


const GOAL_PRESETS = ["Bike fund", "Emergency fund", "Trip", "New phone", "Wedding", "Study"];

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
  shield: "M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6Z", drop: "M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10Z",
  up: "M7 17 17 7M9 7h8v8", down: "M7 7l10 10M17 9v8H9", flat: "M5 12h14",
  cal: "M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4", calCheck: "M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4M9 15l2 2 4-4",
  receipt: "M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6-2.4-1.6L5 20.5ZM8.5 8h7M8.5 12h7",
  grid: "M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z", pie: "M11 4a8 8 0 1 0 9 9h-9ZM14 3.5a7 7 0 0 1 6.5 6.5H14Z"
};
const kfmt = n => { const a = Math.abs(n); return a >= 100000 ? (Math.round(a / 10000) / 10) + "L" : a >= 10000 ? Math.round(a / 1000) + "k" : a.toLocaleString("en-IN"); };
const MERGE_PAIRS = [
  { id: "a", title: "FONEPAY · NIC Asia ••4821", meta: "This phone 1:12 pm · Redmi 1:14 pm · same wording", amt: 1500 },
  { id: "b", title: "eSewa QR payment", meta: "This phone 4:48 pm · Redmi 4:51 pm · different wording", amt: 450 }
];
const L = {
  EN: {
    home: "Home", txns: "Transactions", insights: "Insights", accounts: "Accounts", settings: "Settings", sync: "Sync", goals: "Goals",
    quickAdd: "Quick add", newGoal: "New goal", rules: "Auto-filing rules", review: "Needs review", combine: "Combine pouches",
    tagline: "Every rupee that moves — bank, wallet, sahakari, cash — in one pouch, so you can see where it leaks.",
    welcomeSub: "No bank login. Thaili reads your bank messages and spots the money apps already on this phone, so there is almost nothing to type.",
    getStarted: "Get started", otherPhone: "I use Thaili on another phone",
    step1: "Step 1 of 6 · messages", step2: "Step 2 of 6 · this phone", step3: "Step 3 of 6 · accounts", step4: "Step 4 of 6 · history",
    step5: "Step 5 of 6 · categories", step6: "Step 6 of 6 · sync, optional", editCats: "Categories", joinLabel: "Join sync",
    permTitle: "We read only bank transaction messages",
    permSub: "Read here, on this phone. If you turn on sync later, only the amount, date and merchant travel — never the message itself.",
    srcTitle: "Two things per account",
    srcSub: "The last four digits — the only part a bank SMS prints, so Thaili can tell your accounts apart — and the opening balance every figure is counted from.",
    catsTitle: "Pick three to six", catsSub: "Flat list, no sub-categories — one tap has to finish the job. Add more any time.",
    perDay: "Per day left", lastDay: "Left for the last day", roomToSpend: "Room to spend", recent: "Recent", seeAll: "See all",
    inL: "In", outL: "Out", savedL: "Saved", weekly: "Weekly review",
    appearance: "Appearance", appearanceMeta: "Cream by day, navy by night", light: "Light", dark: "Dark", langMeta: "English",
    notifications: "Notifications", quiet: "Quiet hours", appLock: "App lock", exportAll: "Export everything",
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
    all: "All", daily: "Daily", weeklyR: "Weekly", monthly: "Monthly", brief: "Overview", where: "Categories", leaks: "Leaks", done: "Done"
  },
  NP: {
    home: "गृह", txns: "कारोबार", insights: "विश्लेषण", accounts: "खाताहरू", settings: "सेटिङ", sync: "सिङ्क", goals: "लक्ष्य",
    quickAdd: "छिटो थप्नुहोस्", newGoal: "नयाँ लक्ष्य", rules: "स्वतः वर्गीकरण नियम", review: "समीक्षा बाँकी", combine: "थैली मिलाउनुहोस्",
    tagline: "बैंक, वालेट, सहकारी, नगद — चल्ने हरेक रुपैयाँ एउटै थैलीमा, ताकि कहाँ चुहिन्छ देखियोस्।",
    welcomeSub: "बैंक लगइन चाहिँदैन। Thaili ले बैंकका सन्देश पढ्छ र यो फोनमा भएका पैसाका एप आफैँ चिन्छ — टाइप गर्नुपर्ने लगभग केही छैन।",
    getStarted: "सुरु गरौँ", otherPhone: "म अर्को फोनमा Thaili चलाउँछु",
    step1: "चरण १ / ६ · सन्देश", step2: "चरण २ / ६ · यो फोन", step3: "चरण ३ / ६ · खाता", step4: "चरण ४ / ६ · इतिहास",
    step5: "चरण ५ / ६ · वर्ग", step6: "चरण ६ / ६ · सिङ्क, ऐच्छिक", editCats: "वर्गहरू", joinLabel: "सिङ्क जोड्नुहोस्",
    permTitle: "बैंक कारोबारका सन्देश मात्र पढिन्छ",
    permSub: "यहीँ, यो फोनमै पढिन्छ। पछि सिङ्क खोल्नुभयो भने रकम, मिति र व्यापारी मात्र जान्छ — सन्देश आफैँ कहिल्यै होइन।",
    srcTitle: "हरेक खाताका दुई कुरा",
    srcSub: "अन्तिम चार अङ्क — बैंकको SMS मा छापिने यही मात्र हो, जसले खाता छुट्याउँछ — र सुरुको मौज्दात, जहाँबाट हरेक हिसाब गनिन्छ।",
    catsTitle: "तीनदेखि छवटा छान्नुहोस्", catsSub: "सिधा सूची, उप-वर्ग छैन — एक ट्यापमै काम सकियोस्। पछि जति पनि थप्न सकिन्छ।",
    perDay: "दैनिक बाँकी", lastDay: "अन्तिम दिनका लागि बाँकी", roomToSpend: "खर्च गर्न मिल्ने", recent: "हालैका", seeAll: "सबै",
    inL: "आम्दानी", outL: "खर्च", savedL: "बचत", weekly: "साप्ताहिक समीक्षा",
    appearance: "रूप", appearanceMeta: "दिनमा क्रिम, रातमा नीलो", light: "उज्यालो", dark: "अँध्यारो", langMeta: "नेपाली",
    notifications: "सूचना", quiet: "शान्त समय", appLock: "एप लक", exportAll: "सबै निर्यात",
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
    all: "सबै", daily: "दैनिक", weeklyR: "साप्ताहिक", monthly: "मासिक", brief: "सारांश", where: "वर्ग", leaks: "चुहावट", done: "भयो"
  }
};


export class ThailiLogic extends React.Component {
  state = {
    loaded: false, screen: "welcome", tx: [],
    picked: ["food", "transport", "grocery", "bills", "shopping", "health"],
    saveTarget: 10000, ess: {}, stackIdx: 0, detailId: null, from: "txns", srcFrom: "insights",
    rawOpen: false, editing: false, deleting: false, weekStep: 1, balNudge: 0, gapState: null,
    range: "Monthly", insTab: "Brief", addEntry: "", addCat: "food", addSrc: "cash", addMore: false,
    srcKey: null, toast: null, undoState: null, perms: [false, false], // real device state; see refreshPerms()
    appLock: false, locked: false, notifMode: "All", quiet: "10pm–7am",
    detTails: {}, scanTx: [], scanOrphans: 0, smsSince: null,
    theme: "light", lang: "EN", txFilter: "all",
    savingsGoal: 200000, splitMode: "Queue",
    customCats: [], newCatName: "", rules: SEED_RULES.map(r => Object.assign({}, r, { id: newId() })), rulePrompt: null,
    sources: [],
    newSrcKind: "bank", newSrcName: "Nabil Bank", newSrcAmt: "", newSrcRole: "spending",
    newSrcAcct: "", newSrcField: "acct",
    detState: "done", detOn: {}, detFound: [],
    account: null, authMode: "create", authStep: "email", authEmail: "", authCode: "", authFrom: "cats",
    devices: DEVICES, syncCell: true, syncRaw: false, lastSync: "2 minutes ago",
    roles: {},
    goals: [],
    goalName: "Emergency fund", goalAmt: "", goalPos: "bottom",
    catsMode: "setup", catsFrom: "settings", goalsFrom: "home", settingsFrom: "home", syncFrom: "settings",
    mergePick: {}, mergeBal: null, stopSheet: false, syncAlert: true, resendLeft: 0
  };

  /* Spec §11 pipeline for bank SMS: parse → match an account → drop duplicates → auto-file.
     Messages from banks with no matching account are counted, not guessed at. */
  smsToTx(msgs, existing) {
    const out = [];
    let orphans = 0;
    msgs.forEach(msg => {
      const p = parseSms(msg);
      if (!p) return; // spec §12.2: an unparseable message shows the user nothing
      const src = sourceFor(p, this.state.sources);
      if (!src) { orphans++; return; }
      const t = this.autoFile(dated({ id: newId(), m: p.m, amt: p.amt, dir: p.dir, src: src.key, cat: null,
        rem: p.rem, ch: "SMS", raw: p.raw, at: new Date(p.at).toISOString() }));
      if (!isDuplicate(t, existing) && !isDuplicate(t, out)) out.push(t);
    });
    return { tx: out, orphans: orphans };
  }

  /* Ongoing capture: on open and on every return to the app, pick up bank SMS since the last look.
     ponytail: runs only while the app is open; a background SMS receiver comes with the capture phase. */
  catchUpSms = () => {
    const s = this.state;
    if (!s.loaded || !s.sources.length || this.catching) return;
    if (!s.smsSince) { this.setState({ smsSince: Date.now() }); return; } // start capturing from now
    this.catching = true;
    const t0 = Date.now();
    readSms(s.smsSince).then(msgs => {
      const found = this.smsToTx(msgs, this.state.tx).tx;
      this.setState({ smsSince: t0, tx: found.length ? found.concat(this.state.tx) : this.state.tx });
      if (found.length) this.flash(found.length + (found.length === 1 ? " new spend" : " new entries") + " from your bank messages");
    }).finally(() => { this.catching = false; });
  };

  stack = []; // screens to go back to, most recent last

  back = () => {
    const s = this.state;
    if (s.locked) return false;
    // Sheets and edit modes close before the screen does.
    for (const [k, off] of [["deleting", false], ["stopSheet", false], ["rulePrompt", null], ["editing", false]]) {
      if (s[k]) { this.setState({ [k]: off }); return true; }
    }
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
    this.refreshPerms();
    if (this.state.locked) this.unlock();
    this.catchUpSms();
  };

  componentDidMount() {
    registerPush();
    this.paintBars();
    if (isDevice) this.backSub = CapApp.addListener("backButton", () => { if (!this.back()) CapApp.minimizeApp(); });
    this.refreshPerms();
    document.addEventListener("visibilitychange", this.onVisible);
    load().then(d => {
      if (!d) { this.setState({ loaded: true }); return; } // no backend configured: local only
      this.saving = true;
      if (d.isNew) { markAllDirty(); this.setState({ loaded: true }); return; } // first save writes seed rules + prefs
      this.setState(Object.assign({}, d.prefs, {
        loaded: true, locked: !!d.prefs.appLock, sources: d.sources, roles: d.roles, tx: d.tx, rules: d.rules, goals: d.goals,
        srcKey: d.sources[0].key, addSrc: d.sources[0].key,
        screen: "home"
      }), () => { if (this.state.locked) this.unlock(); this.catchUpSms(); });
    }).catch(e => {
      // Never let an empty screen overwrite a pouch we failed to read: saving stays off.
      console.warn("[thaili] load failed", e?.message || JSON.stringify(e));
      this.setState({ loaded: true });
      this.flash("Can't reach Thaili's server — nothing will be saved until you reopen the app");
    });
  }

  componentDidUpdate(_, prev) {
    if (this.saving && prev.loaded) save(prev, this.state);
    if (prev.theme !== this.state.theme) this.paintBars();
    const to = this.state.screen;
    if (prev.screen === to) return;
    if (this.popping) { this.popping = false; return; }
    this.stack = nextStack(this.stack, prev.screen, to);
  }

  componentWillUnmount() { this.backSub?.then(h => h.remove()); document.removeEventListener("visibilitychange", this.onVisible); clearTimeout(this._t); clearInterval(this._r); }

  startResend() {
    clearInterval(this._r);
    this.setState({ resendLeft: 30 });
    this._r = setInterval(() => this.setState(p => {
      const n = Math.max(0, (p.resendLeft || 0) - 1);
      if (!n) clearInterval(this._r);
      return { resendLeft: n };
    }), 1000);
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
  go(screen, extra) { clearTimeout(this._t); this.setState(Object.assign({ screen: screen, toast: null, undoState: null }, extra)); }

  openDetail(id, from, raw) {
    this.go("detail", { detailId: id, from: from, rawOpen: !!raw, editing: false });
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


  balance(key) {
    const src = this.state.sources.filter(s => s.key === key)[0];
    if (!src) return 0;
    let b = src.opening;
    this.state.tx.forEach(t => {
      if (t.src === key) b += (t.dir === "credit" ? t.amt : -t.amt);
      if (t.dir === "transfer" && t.to === key) b += t.amt;
    });
    return b;
  }

  ruleFor(t) {
    if (!t || t.dir !== "debit") return null;
    const h = hay(t);
    return this.state.rules.filter(r => h.indexOf(r.kw) > -1)[0] || null;
  }

  /* A rule files the line the moment it lands — that is the whole point of
     reading remarks, so nothing sits in Needs review that a rule already knows. */
  autoFile(t) {
    const r = this.ruleFor(t);
    return r ? Object.assign({}, t, { cat: r.cat, auto: r.kw }) : t;
  }

  setCat(id, cat, label) {
    const prev = this.state.tx;
    const t = prev.filter(x => x.id === id)[0];
    const known = this.ruleFor(t);
    this.setState({
      tx: prev.map(x => x.id === id ? Object.assign({}, x, { cat: cat, rem: x.rem || label, auto: null }) : x),
      /* Only offer to learn when there is a word to learn and no rule yet. */
      rulePrompt: (!known && t && t.dir === "debit" && kwFor(t)) ? { kw: kwFor(t), cat: cat, label: label } : null
    });
    this.flash(label + " saved", { tx: prev });
  }

  addRule(kw, cat, label) {
    const prevT = this.state.tx, prevR = this.state.rules;
    const rule = { id: newId(), kw: kw, cat: cat, own: true };
    const rules = prevR.concat([rule]);
    let filed = 0;
    const tx = prevT.map(t => {
      if (t.cat || t.dir !== "debit" || hay(t).indexOf(kw) < 0) return t;
      filed++;
      return Object.assign({}, t, { cat: cat, auto: kw });
    });
    this.setState({ rules: rules, tx: tx, rulePrompt: null });
    this.flash("“" + kw + "” now files as " + label + (filed ? " · " + filed + " older " + (filed === 1 ? "line" : "lines") + " filed too" : ""), { rules: prevR, tx: prevT });
  }

  dropRule(id) {
    const prevR = this.state.rules, prevT = this.state.tx;
    const r = prevR.filter(x => x.id === id)[0];
    if (!r) return;
    /* Dropping a rule un-files what only that rule was holding up, so the
       review queue tells the truth again. */
    this.setState({
      rules: prevR.filter(x => x.id !== id),
      tx: prevT.map(t => t.auto === r.kw ? Object.assign({}, t, { cat: null, auto: null }) : t)
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
    const T = L[s.lang] || L.EN;
    const np = s.lang === "NP";
    const dark = s.theme === "dark";
    const allCats = ALL_CATS.concat(s.customCats);
    const clabel = k => { const c = allCats.filter(x => x.key === k)[0]; return c ? c.label : "Uncategorised"; };
    /* Extras and the user's own categories have no hand-set limit, so they get an
       even slice of the monthly target rather than a silent zero. */
    const inMonth = t => monthKey(t.bs) === MONTH_KEY;
    const income = s.tx.filter(t => t.dir === "credit" && inMonth(t)).reduce((a, t) => a + t.amt, 0);
    const evenLimit = Math.round(Math.max(0, income - s.saveTarget) / Math.max(s.picked.length, 1));
    const cats = allCats.filter(c => s.picked.indexOf(c.key) > -1).map(c => Object.assign({ limit: evenLimit }, c));
    const review = s.tx.filter(t => t.dir === "debit" && (!t.cat || !t.rem));
    const scanAccts = new Set(s.scanTx.map(t => t.src)).size;
    const scanGroups = Object.values(s.scanTx.reduce((g, t) => {
      const k = t.dir + "|" + t.m;
      const x = g[k] || (g[k] = { m: t.m, dir: t.dir, n: 0, amt: 0, cat: t.cat });
      x.n++; x.amt += t.amt; if (!t.cat) x.cat = null;
      return g;
    }, {})).sort((a, b) => b.n - a.n);
    const spent = s.tx.filter(t => t.dir === "debit" && inMonth(t)).reduce((a, t) => a + t.amt, 0);
    /* The user sets what to KEEP. What's free to spend is only ever the leftover —
       spending is never the thing being aimed at. */
    const freeToSpend = Math.max(0, income - s.saveTarget);

    /* FIX 1 — never divide by zero on the last day of the month. */
    const daysLeftRaw = DAYS_IN_MONTH - DAY_OF_MONTH;
    const lastDay = daysLeftRaw <= 0;
    const daysLeft = Math.max(1, daysLeftRaw);
    const remaining = freeToSpend - spent;
    const allowance = Math.max(0, Math.round(remaining / daysLeft / 10) * 10);

    const card = review[Math.min(s.stackIdx, Math.max(0, review.length - 1))];
    const detail = s.tx.filter(t => t.id === s.detailId)[0] || s.tx[0] || NO_TX;
    /* Weekly balance check runs on the first account that has a statement to check against. */
    const wk = s.sources.filter(x => !isManualSrc(x))[0] || s.sources[0] || NO_SRC;
    const typedBal = this.balance(wk.key) + s.balNudge;
    const gap = this.balance(wk.key) - typedBal;

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

    const chip = (label, on, tap) => ({
      label: label, tap: tap,
      bg: on ? "var(--action)" : "var(--surface2)", fg: on ? "var(--onAction)" : "var(--ink2)",
      border: on ? "var(--action)" : "var(--line)", weight: on ? "600" : "500", check: on ? "✓ " : ""
    });

    /* Keypad. An amount gets a "00" key and never starts with 0; a code or account tail can. */
    const keypad = (target, cur, max, amount) => {
      const put = d => { if (cur.length + d.length <= max && (cur || !amount || d[0] !== "0")) this.setState({ [target]: cur + d, toast: null }); };
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => ({ label: d, fg: "var(--ink)", tap: () => put(d) })).concat([
        amount ? { label: "00", fg: "var(--ink3)", tap: () => put("00") } : { label: "", fg: "var(--ink3)", tap: () => {} },
        { label: "0", fg: "var(--ink)", tap: () => put("0") },
        { label: "", isBack: true, fg: "var(--ink3)", tap: () => this.setState({ [target]: cur.slice(0, -1), toast: null }) }
      ]);
    };

    const rows = [];
    let lastHeader = null;
    (s.txFilter === "review" ? review : s.tx).forEach(t => {
      const dl = dayLabel(t.off);
      if (dl !== lastHeader) { rows.push({ isHeader: true, label: dl }); lastHeader = dl; }
      rows.push(Object.assign(txLook(t), {
        isHeader: false, title: t.m,
        cat: t.cat ? clabel(t.cat) + " · " + srcOf(t.src).short
          : t.dir === "transfer" ? "Transfer · " + srcOf(t.src).short
          : t.dir === "credit" ? "Income · " + srcOf(t.src).short : "Needs a category",
        catFg: (!t.cat && t.dir === "debit") ? "var(--warnInk)" : "var(--ink3)",
        amount: amtStr(t), fg: amtFg(t),
        tap: () => this.openDetail(t.id, "txns")
      }));
    });

    /* Period windows: today, the last 7 days, or this BS month — and the one before each. */
    const inWin = t => s.range === "Daily" ? t.off === 0 : s.range === "Weekly" ? t.off < 7 : inMonth(t);
    const inPrev = t => s.range === "Daily" ? t.off === 1 : s.range === "Weekly" ? t.off >= 7 && t.off < 14 : monthKey(t.bs) === MONTH_KEY - 1;
    const debitSum = pred => s.tx.filter(t => t.dir === "debit" && pred(t)).reduce((a, t) => a + t.amt, 0);
    const catIn = k => debitSum(t => t.cat === k && inWin(t));
    const catPrev = k => debitSum(t => t.cat === k && inPrev(t));
    /* Essential or leak. Unknown and user-made categories start essential — calling
       someone's spending wasteful without being asked is not Thaili's job. */
    const isEss = k => s.ess[k] !== undefined ? s.ess[k] : ESS_DEFAULT[k] !== false;
    const leakCats = cats.filter(c => !isEss(c.key)).map(c => ({ c: c, amt: catIn(c.key) })).sort((a, b) => b.amt - a.amt);
    const essOut = cats.filter(c => isEss(c.key)).reduce((a, c) => a + catIn(c.key), 0);
    const leakOut = leakCats.reduce((a, x) => a + x.amt, 0);
    const periodOut = debitSum(inWin);
    const periodIn = s.tx.filter(t => t.dir === "credit" && inWin(t)).reduce((a, t) => a + t.amt, 0);
    const prevTotal = cats.reduce((a, c) => a + catPrev(c.key), 0);
    /* A period can be negative, and it should say so. */
    const net = periodIn - periodOut;
    const prevName = { Daily: "Yest.", Weekly: "Last wk", Monthly: PREV_MONTH_EN }[s.range];

    const prevLeak = cats.filter(c => !isEss(c.key)).reduce((a, c) => a + catPrev(c.key), 0);
    const pctDelta = (now, was) => was ? Math.round((now - was) / was * 100) : 0;
    const leakShare = Math.round(leakOut / Math.max(periodOut, 1) * 100);
    /* Whatever is uncategorised, or sits in a switched-off category, belongs to
       neither side — the split has to show it rather than quietly rebase on itself. */
    const unfiled = Math.max(0, periodOut - essOut - leakOut);

    /* FIX 8 — weekday labels come off the real date, not a hardcoded list. */
    const trendDaily = [6, 5, 4, 3, 2, 1, 0].map(o => [wdShort(o), debitSum(t => t.off === o)]);
    const TRENDS = {
      Daily: trendDaily,
      Weekly: [5, 4, 3, 2, 1, 0].map(w => [w ? w + "w ago" : "Now", debitSum(t => t.off >= w * 7 && t.off < w * 7 + 7)]),
      Monthly: [5, 4, 3, 2, 1, 0].map(i => [monthName(MONTH_KEY - i).slice(0, 3), debitSum(t => monthKey(t.bs) === MONTH_KEY - i)])
    };
    const trend = TRENDS[s.range];
    const trendMax = Math.max.apply(null, trend.map(t => t[1]).concat([1]));
    const trendAvg = Math.round(trend.reduce((a, t) => a + t[1], 0) / trend.length);

    /* Habits, derived rather than asserted. */
    const heaviest = trendDaily.slice().sort((a, b) => b[1] - a[1])[0];
    const debitAmts = s.tx.filter(t => t.dir === "debit").map(t => t.amt).sort((a, b) => a - b);
    const median = debitAmts.length ? debitAmts[Math.floor(debitAmts.length / 2)] : 0;
    const deltaChip = (now, was) => {
      const d = pctDelta(now, was);
      return { icon: d > 0 ? SI.up : d < 0 ? SI.down : SI.flat, text: Math.abs(d) + "%", fg: d === 0 ? "var(--ink3)" : d < 0 ? "var(--pos)" : "var(--warnInk)", bg: d === 0 ? "var(--surface2)" : d < 0 ? "var(--tintG)" : "var(--surface)" };
    };
    const catLook = k => ({ icon: CI[k] || IC.tag, tint: isEss(k) ? "var(--tintN)" : "var(--tintW)", ifg: isEss(k) ? "var(--navy)" : "var(--warnInk)" });
    const catAmts = cats.map(c => ({ k: c.key, label: c.label, amt: catIn(c.key), prev: catPrev(c.key), limit: c.limit }));
    const catTop = catAmts.filter(x => x.amt > 0).sort((a, b) => b.amt - a.amt);
    const perDiv = s.range === "Daily" ? 1 : s.range === "Weekly" ? 7 : DAY_OF_MONTH;

    const amt = parseInt(s.addEntry || "0", 10);

    /* Savings is the floor. Only what sits above it — the surplus — funds goals,
       waterfalling down the priority list. A goal is reached when surplus covers it. */
    /* A source with no purpose set is treated as savings: whatever wasn't spent stayed put. */
    const isSavings = k => (s.roles[k] || "") !== "spending";
    const savingsSources = s.sources.filter(x => isSavings(x.key));
    const savingsPot = savingsSources.reduce((a, x) => a + this.balance(x.key), 0);
    const floorPct = Math.min(100, Math.round(savingsPot / Math.max(s.savingsGoal, 1) * 100));
    const floorShort = Math.max(0, s.savingsGoal - savingsPot);
    const surplus = Math.max(0, savingsPot - s.savingsGoal);
    /* What actually reaches savings a month: the average of the last three BS months. */
    const monthlyIn = Math.max(1, Math.round([0, 1, 2].reduce((a, i) =>
      a + s.tx.filter(t => t.dir === "transfer" && monthKey(t.bs) === MONTH_KEY - i).reduce((b, t) => b + t.amt, 0), 0) / 3));

    /* The list order IS the priority — no tiers, so no ties to break.
       Position 1 is funded first; weights in Share mode count down from the top. */
    const ranked = s.goals.slice();
    const wOf = i => ranked.length - i;
    const floorMonths = Math.ceil(floorShort / monthlyIn);
    const sumP = ranked.reduce((a, g, i) => a + wOf(i), 0) || 1;
    let pool = surplus;
    /* No goal sees a rupee until savings clear the floor, so the climb back
       to the floor is the first thing every ETA has to pay for. */
    let cumulativeShort = floorShort;
    let alloc;
    if (s.splitMode === "Share") {
      alloc = ranked.map((g, i) => ({
        g: g, w: wOf(i), got: Math.min(g.target, Math.round(surplus * wOf(i) / sumP)),
        rate: monthlyIn * wOf(i) / sumP
      }));
      /* Weighted share, but a goal that caps out spills its excess down the
         priority order rather than leaving money idle. */
      let spill = surplus - alloc.reduce((a, x) => a + x.got, 0);
      alloc.forEach(a => {
        if (spill <= 0) return;
        const room = a.g.target - a.got;
        const take = Math.min(room, spill);
        a.got += take; spill -= take;
      });
      /* A finished goal stops claiming future months too — the live weight
         denominator counts only goals that still have room. */
      const liveP = alloc.filter(a => a.g.target - a.got > 0).reduce((t, a) => t + a.w, 0) || 1;
      alloc.forEach(a => {
        a.short = a.g.target - a.got;
        a.sharePct = Math.round(a.w / sumP * 100);
        a.rate = Math.round(monthlyIn * a.w / liveP);
        a.waitMonths = a.short ? floorMonths + Math.ceil(a.short / Math.max(a.rate, 1)) : 0;
      });
      pool = spill;
    } else {
      alloc = ranked.map((g, i) => {
        const got = Math.min(g.target, pool);
        pool -= got;
        const short = g.target - got;
        cumulativeShort += short;
        return { g: g, w: wOf(i), got: got, short: short, rate: monthlyIn, waitMonths: short ? Math.ceil(cumulativeShort / monthlyIn) : 0 };
      });
    }
    const unallocated = Math.max(0, pool);
    const claimed = surplus - unallocated;
    const fundedCount = alloc.filter(a => a.short === 0).length;
    const goalAmtNum = parseInt(s.goalAmt || "0", 10);

    const newKind = SRC_KINDS.filter(k => k.key === s.newSrcKind)[0] || SRC_KINDS[0];
    const newSrcAmtNum = parseInt(s.newSrcAmt || "0", 10);
    const needAcct = newKind.key !== "manual";
    const acctOk = !needAcct || s.newSrcAcct.length === 4;
    const srcMissing = s.sources.filter(x => !isManualSrc(x) && (!x.acct || !x.opening));
    const detOnKeys = DETECTED.filter(d => s.detOn[d.key]).map(d => d.key);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.authEmail.trim());
    const emailMask = e => { const p = (e || "").trim().split("@"); return p.length === 2 ? p[0].slice(0, 1) + "••••@" + p[1] : e; };
    const authReady = s.authStep === "email" ? emailOk : s.authCode.length === 6;
    const dupCount = Math.max(0, s.tx.length - 4);
    const sameCount = MERGE_PAIRS.filter(p => s.mergePick[p.id] === "same").length;
    const mergeLeft = MERGE_PAIRS.filter(p => !s.mergePick[p.id]).length + (s.mergeBal ? 0 : 1);
    const localNic = s.sources.filter(x => x.key === "nic")[0];
    const localOpen = localNic && localNic.opening ? localNic.opening : 62400;
    const OB = ["permission", "detect", "source", "scan", "cats"];
    const obStep = s.screen === "signup" ? (s.authFrom === "cats" ? 6 : 0) : (s.screen === "cats" && s.catsMode === "edit") ? 0 : OB.indexOf(s.screen) + 1;
    const toAuthEmail = () => this.setState({ screen: "signup", authStep: "email", authCode: "" });
    const joinAcct = () => ({ phone: (s.authEmail || "you@gmail.com").trim().toLowerCase(), since: "Joined today" });
    const debitCount = s.tx.filter(t => t.dir === "debit").length;
    const autoFiled = s.tx.filter(t => t.dir === "debit" && t.auto).length;

    /* No income recorded yet means no budget to measure against: any spend reads as 100%, not 35000%. */
    const targetPctNum = freeToSpend ? Math.round(spent / freeToSpend * 100) : (spent ? 100 : 0);
    const pacePctNum = Math.round(DAY_OF_MONTH / DAYS_IN_MONTH * 100);

    const segBg = on => on ? "var(--action)" : "transparent";
    const segFg = on => on ? "var(--onAction)" : "var(--ink2)";

    return {
      screen: s.screen,
      setLight: () => this.setState({ theme: "light" }),
      setDark: () => this.setState({ theme: "dark" }),
      lightBg: segBg(!dark), lightFg: segFg(!dark),
      darkBg: segBg(dark), darkFg: segFg(dark),
      setEn: () => this.setState({ lang: "EN" }),
      setNp: () => this.setState({ lang: "NP" }),
      enBg: segBg(s.lang === "EN"), enFg: segFg(s.lang === "EN"),
      npBg: segBg(s.lang === "NP"), npFg: segFg(s.lang === "NP"),
      t: T,
      obDots: obStep ? [1, 2, 3, 4, 5, 6].map(i => ({ bg: i <= obStep ? "var(--action)" : "var(--barTrack)" })) : [],
      obBack: () => {
        if (s.screen === "cats") { this.go(s.catsMode === "edit" ? (s.catsFrom || "settings") : "scan"); return; }
        const m = { permission: "welcome", detect: "permission", source: "detect", scan: "source" };
        this.go(m[s.screen] || "welcome");
      },
      catsEdit: s.catsMode === "edit",
      catsStepLabel: s.catsMode === "edit" ? T.editCats : T.step5,
      scanSkipTap: () => { this.setState({ scanTx: [] }); this.go(s.perms[0] ? "cats" : "permission"); },
      authBack: () => {
        if (s.authStep === "code") { this.setState({ authStep: "email", authCode: "" }); return; }
        this.go(s.authFrom === "cats" ? "cats" : s.authFrom === "welcome" ? "welcome" : "sync");
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
      syncIconFg: s.account ? "var(--pos)" : "var(--warnInk)",
      syncStripBg: s.account ? "var(--tintG)" : "var(--tintW)",
      syncStripLine: s.account
        ? (np ? "सिङ्क भयो " : "Synced ") + s.lastSync + " · " + s.devices.length + (np ? " फोन" : s.devices.length === 1 ? " phone" : " phones")
        : (np ? "सिङ्क बन्द — यो थैली यही फोनमा मात्र छ" : "Sync is off — this pouch lives only on this phone"),
      settingsBack: () => this.go(s.settingsFrom || "home"),
      goalsBack: () => this.go(s.goalsFrom || "home"),
      totalBal: balFmt(s.sources.reduce((a, x) => a + this.balance(x.key), 0)),
      totalMeta: s.sources.length + (np ? " खाता · " : " accounts · ") + balRs(savingsPot) + (np ? " बचतमा गनिएको" : " of it counted as savings"),
      acctRows: s.sources.map(x => Object.assign(acctLook(x, [IC.bank, "var(--tintR)", "var(--action)"]), {
        name: x.name,
        meta: x.type.split(" · ")[0] + ((s.roles[x.key] || "") !== "spending" ? " · savings" : ""),
        balance: balRs(this.balance(x.key)),
        tap: () => this.go("source-detail", { srcKey: x.key, srcFrom: "accounts" })
      })),
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
          devices: DEVICES, lastSync: "just now", screen: "home", mergePick: {}, mergeBal: null
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
      toDetect: () => {
        this.go("detect", { detState: "scanning" });
        Promise.all([installedApps(DETECTED.map(d => d.pkg)), readSms(Date.now() - 90 * 86400000)]).then(([pkgs, msgs]) => {
          const found = DETECTED.filter(d => pkgs.indexOf(d.pkg) > -1).map(d => d.key);
          const on = {};
          found.forEach(k => { on[k] = true; });
          this.setState({ detState: "done", detFound: found, detOn: on, detTails: tailsByBank(msgs) });
        });
      },
      detectTitle: s.detState === "scanning" ? "Looking for your money apps" : !s.detFound.length ? "No bank or wallet apps found" : s.detFound.length + (s.detFound.length === 1 ? " money app" : " money apps") + " on this phone",
      detectSub: s.detState === "scanning"
        ? "Thaili checks which apps are installed. It never opens them and never asks for a login."
        : s.detFound.length ? "Untick anything you don't actually use. Anything the scan can't see — a sahakari, an FD, cash — you add on the next screen."
        : "None of the banks or wallets Thaili knows are installed. Add your accounts by hand on the next screen.",
      detectRows: DETECTED.filter(d => s.detFound.indexOf(d.key) > -1).map(d => ({
        app: d.app,
        detail: (d.kind === "bank" ? "Bank app" : "Wallet") + " · " + (s.detTails[d.key] ? "ending " + s.detTails[d.key] + ", seen in your messages" : "installed"),
        border: s.detOn[d.key] ? "var(--action)" : "var(--line)",
        justify: s.detOn[d.key] ? "flex-end" : "flex-start",
        track: s.detOn[d.key] ? "var(--pos)" : "var(--barDim)",
        tap: () => this.setState({ detOn: Object.assign({}, s.detOn, { [d.key]: !s.detOn[d.key] }) })
      })),
      detectCta: detOnKeys.length ? "Add " + detOnKeys.length + (detOnKeys.length === 1 ? " account" : " accounts") : "Pick at least one",
      detectCtaBg: detOnKeys.length ? "var(--action)" : "var(--surface2)",
      detectCtaFg: detOnKeys.length ? "var(--onAction)" : "var(--ink3)",
      detectConfirm: () => {
        if (!detOnKeys.length) return;
        const made = DETECTED.filter(d => s.detOn[d.key]).map(d => {
            const kind = SRC_KINDS.filter(k => k.key === d.kind)[0];
          return {
            key: d.key, base: d.base, name: tailName(d.base, s.detTails[d.key] || null), short: d.base,
            type: kind.type, dot: kind.dot, opening: 0, acct: s.detTails[d.key] || null
          };
        });
        made.push(CASH);
        const roles = {};
        made.forEach(x => { roles[x.key] = "spending"; });
        this.go("source", { sources: made, roles: roles });
      },
      detectSkip: () => {
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
        this.startAuth("create", "cats");
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
        if (s.authFrom === "cats") registerPush(true); // onboarding done: now ask for notifications
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
          if (s.authFrom === "welcome") { this.go("permission"); return; }
          if (s.authFrom === "cats") { this.setState({ authMode: "create", authStep: "email", authCode: "" }); return; }
          this.go("sync"); return;
        }
        if (s.authFrom === "cats") registerPush(true); // onboarding done: now ask for notifications
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
          devices: DEVICES, lastSync: "just now", screen: "home"
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
      acctCardBg: s.account ? "var(--tintG)" : "var(--tintW)",
      acctCardBorder: s.account ? "transparent" : "var(--warn)",
      acctCardFg: s.account ? "var(--pos)" : "var(--warnInk)",
      acctCardTitle: s.account ? T.syncOn + " · " + s.account.phone : T.syncOffTitle,
      acctCardLine: s.account
        ? (np ? "पछिल्लो सिङ्क " + s.lastSync + " · " + s.devices.length + " फोन" : "Last synced " + s.lastSync + " across " + s.devices.length + (s.devices.length === 1 ? " phone" : " phones") + ".")
        : (np ? "यो थैली यही फोनमा मात्र छ। सिङ्क खोले अर्को फोनमा पनि रहन्छ, र फोन हराए फिर्ता आउँछ।"
          : "This pouch lives only on this phone. Turn on sync to keep it on your other phone too, and get it back if this one is lost."),
      /* FIX 3 — the weekly review is a modal flow, not a tab destination. */
      showTabs: TABS.indexOf(s.screen) > -1,



      toPermission: () => this.go("permission"),
      toCats: () => {
        if (s.screen === "scan" && s.scanTx.length) { // "Import them"
          this.setState({ tx: s.scanTx.concat(s.tx).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), scanTx: [] });
          this.flash(s.scanTx.length + " transactions imported");
        }
        this.go("cats");
      },
      toTxns: () => this.go("txns", { txFilter: "all" }),
      toSettings: () => this.go("settings", { settingsFrom: s.screen === "settings" ? s.settingsFrom : s.screen }),
      toAdd: () => this.go("add", { addEntry: "", addMore: false }),
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
            this.go("scan", { scanTx: r.tx, scanOrphans: r.orphans, smsSince: t0 });
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
        { name: "Notification access", detail: "eSewa, Khalti, IME Pay send no SMS — only a push. No history, only what arrives next." }
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
        { label: "Notification access", meta: "eSewa and Khalti still work without SMS", tag: s.perms[1] ? "On" : "Off", tagBg: "var(--tintN)", tagFg: "var(--navy)" }
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

      catCta: s.picked.length >= 3 ? (s.catsMode === "edit" ? T.done : (np ? "अगाडि — सिङ्क" : "Next — sync, optional")) : (np ? "कम्तीमा तीन छान्नुहोस्" : "Pick at least three"),
      catCtaBg: s.picked.length >= 3 ? "var(--action)" : "var(--surface2)",
      catCtaFg: s.picked.length >= 3 ? "var(--onAction)" : "var(--ink3)",

      bsMonth: np ? MONTH_NP + " " + npDigits(TODAY_BS.y) : MONTH_EN + " " + TODAY_BS.y,
      adRange: (np ? "दिन " + DAY_OF_MONTH + " / " : "Day " + DAY_OF_MONTH + " of ") + DAYS_IN_MONTH + " · " + adLabel(0),
      allowLabel: lastDay ? T.lastDay : T.perDay,
      allowAmount: fmt(allowance),
      allowFg: remaining <= 0 ? "var(--warnInk)" : "var(--ink)",
      daysLeftShort: lastDay ? "last day" : daysLeft + " days",
      daysChip: lastDay ? (np ? "अन्तिम दिन" : "Last day") : np ? daysLeft + " दिन बाँकी" : daysLeft + " days left",
      remainShort: remaining > 0 ? rs(remaining) + (np ? " बाँकी" : " free") : rs(Math.abs(remaining)) + (np ? " बढी" : " over"),
      remainBg: remaining > 0 ? "var(--surface2)" : "var(--tintW)",
      remainFg: remaining > 0 ? "var(--ink2)" : "var(--warnInk)",
      paceShort: (targetPctNum > pacePctNum ? "+" : "−") + Math.abs(targetPctNum - pacePctNum) + (np ? "% गति" : "% vs pace"),

      targetPct: targetPctNum + "% used",
      targetWidth: Math.min(100, targetPctNum) + "%",
      targetBar: targetPctNum >= 100 ? "var(--warnInk)" : targetPctNum > pacePctNum + 8 ? "var(--warn)" : "var(--pos)",
      targetFg: targetPctNum >= 100 ? "var(--warnInk)" : targetPctNum > pacePctNum + 8 ? "var(--warn)" : "var(--pos)",
      spentOfTarget: rs(spent) + " / " + fmt(freeToSpend),

      goalName: surplus > 0 ? "Surplus above your floor" : "Savings floor",
      goalLabel: surplus > 0 ? rs(surplus) + " free" : floorPct + "%",
      goalWidth: surplus > 0 ? Math.round(claimed / Math.max(surplus, 1) * 100) + "%" : floorPct + "%",
      goalNote: surplus <= 0
        ? balRs(savingsPot) + " of " + rs(s.savingsGoal) + " saved · " + rs(floorShort) + " to go before goals start funding"
        : s.goals.length === 0
        ? rs(surplus) + " sitting free above your " + rs(s.savingsGoal) + " floor, unclaimed"
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
      toGoalNew: () => this.go("goal-new", { goalAmt: "", goalName: GOAL_PRESETS[0] }),
      goalCancel: () => this.go("goals"),
      goalAmtLabel: s.goalAmt ? fmt(parseInt(s.goalAmt, 10)) : "0",
      goalAmtFg: s.goalAmt ? "var(--ink)" : "var(--barDim)",
      goalNeedLine: !goalAmtNum
        ? "Type the full amount. Thaili checks it against the surplus you already have."
        : goalAmtNum <= unallocated
        ? "Covered right now — " + rs(unallocated) + " of surplus is unclaimed, so this is reached the moment you create it."
        : (s.goalPos === "top" ? "Goes to the top — paid before every goal below it. About " + Math.ceil((floorShort + goalAmtNum - unallocated) / monthlyIn) : "Goes to the back of the line. About " + Math.ceil((cumulativeShort + goalAmtNum - unallocated) / monthlyIn)) + " months at " + rs(monthlyIn) + "/mo before the surplus reaches it.",
      goalNameChips: GOAL_PRESETS.map(n => chip(n, s.goalName === n, () => this.setState({ goalName: n }))),
      goalPosChips: [["top", "Top of the line"], ["bottom", "Back of the line"]].map(p => chip(p[1], s.goalPos === p[0], () => this.setState({ goalPos: p[0] }))),
      goalKeys: keypad("goalAmt", s.goalAmt, 7, true),
      goalCta: goalAmtNum ? "Create goal" : "Type a target amount",
      goalCtaBg: goalAmtNum ? "var(--action)" : "var(--surface2)",
      goalCtaFg: goalAmtNum ? "var(--onAction)" : "var(--ink3)",
      goalCreate: () => {
        if (!goalAmtNum) return;
        const prev = s.goals;
        this.setState({
          goals: s.goalPos === "top"
            ? [{ id: newId(), name: s.goalName, target: goalAmtNum }].concat(prev)
            : prev.concat([{ id: newId(), name: s.goalName, target: goalAmtNum }]),
          screen: "goals", goalAmt: ""
        });
        this.flash(s.goalName + (goalAmtNum <= unallocated ? " created — already covered" : " created · " + rs(goalAmtNum - unallocated) + " short for now"), { goals: prev });
      },


      hasReview: review.length > 0,
      reviewCount: review.length,
      reviewLine: np ? review.length + " कारोबार समीक्षा बाँकी" : review.length + " to review",
      reviewCountBig: review.length + (review.length === 1 ? " item" : " items"),

      toWeekly: () => this.go("weekly", { weekStep: 1 }),

      recent: s.tx.slice(0, 4).map(t => Object.assign(txLook(t), {
        title: t.m,
        cat: (t.cat ? clabel(t.cat) : t.dir === "credit" ? "Income" : t.dir === "transfer" ? "Transfer" : "Needs a category") + " · " + srcOf(t.src).short,
        catFg: (!t.cat && t.dir === "debit") ? "var(--warnInk)" : "var(--ink3)",
        amount: amtStr(t), fg: amtFg(t),
        tap: () => this.openDetail(t.id, "home")
      })),

      txTabs: [
        { key: "all", label: T.all + " " + s.tx.length },
        { key: "review", label: T.review + " " + review.length }
      ].map(t => ({
        label: t.label,
        bg: s.txFilter === t.key ? "var(--action)" : "transparent",
        fg: s.txFilter === t.key ? "var(--onAction)" : "var(--ink2)",
        tap: () => this.setState({ txFilter: t.key, toast: null })
      })),
      txRows: rows,

      stackProgress: review.length ? (Math.min(s.stackIdx + 1, review.length) + " of " + review.length) : "All clear",
      stackHasCard: !!card && review.length > 0,
      stackDone: review.length === 0,
      stackExit: () => this.go("home"),
      cardAmount: card ? "− " + rs(card.amt) : "",
      cardMerchant: card ? card.m : "",
      cardMeta: card ? (dayLabel(card.off) + " · " + card.time + " · " + srcOf(card.src).name) : "",
      cardCats: cats.map(c => chip(c.label, !!(card && card.cat === c.key), () => card && this.setCat(card.id, c.key, c.label))),
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

      detailAmount: (detail.dir === "credit" ? "+ " : detail.dir === "transfer" ? "→ " : "− ") + rs(detail.amt),
      detailFg: detail.dir === "credit" ? "var(--pos)" : detail.dir === "transfer" ? "var(--navy)" : "var(--ink)",
      detailMerchant: detail.m,
      /* FIX 2 — remember where we came from. */
      detailBack: () => this.go(s.from || "txns"),
      editing: s.editing,
      toggleEdit: () => this.setState({ editing: !s.editing, toast: null }),
      /* FIX 6 — Edit actually edits. */
      detailCats: cats.map(c => chip(c.label, detail.cat === c.key, () => this.setCat(detail.id, c.key, c.label))),
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
      ruleRows: s.rules.map(r => ({
        kw: r.kw, cat: clabel(r.cat),
        origin: r.own ? "You taught this" : "Built in",
        matches: s.tx.filter(t => hay(t).indexOf(r.kw) > -1).length + " matched",
        drop: () => this.dropRule(r.id)
      })),
      rulesEmpty: s.rules.length === 0,
      detailFields: [
        { label: "Category", value: detail.cat ? clabel(detail.cat) : "Not set", fg: detail.cat ? "var(--ink)" : "var(--warnInk)", action: s.editing ? "" : "Change", tap: () => this.setState({ editing: true, toast: null }) },
        { label: "Direction", value: detail.dir, fg: "var(--ink)" },
        { label: "Source", value: srcOf(detail.src).name, fg: "var(--ink)" },
        { label: "Date", value: bsLabel(detail.off) + " · " + detail.time, fg: "var(--ink)" },
        { label: "Gregorian", value: adLabel(detail.off) + " · " + WD_FULL[dayOf(detail.off).getDay()], fg: "var(--ink3)" },
        { label: "Remarks", value: detail.rem || "None", fg: detail.rem ? "var(--ink)" : "var(--ink3)" },
        { label: "Captured by", value: detail.ch, fg: "var(--ink3)" },
        { label: "Receipt", value: "None attached", fg: "var(--ink3)" }
      ],
      rawOpen: s.rawOpen,
      toggleRaw: () => this.setState({ rawOpen: !s.rawOpen }),
      detailRaw: detail.raw,
      askDelete: () => this.setState({ deleting: true }),
      deleting: s.deleting,
      cancelDelete: () => this.setState({ deleting: false }),
      confirmDelete: () => {
        const prev = s.tx;
        this.setState({ deleting: false, screen: s.from || "txns", tx: prev.filter(t => t.id !== detail.id) });
        this.flash("Archived for 30 days", { tx: prev });
      },

      weekDots: [1, 2, 3].map(i => ({ bg: i <= s.weekStep ? "var(--action)" : "var(--barTrack)" })),
      weekStepLabel: "Weekly review · step " + s.weekStep + " of 3",
      weekTitle: s.weekStep === 1 ? "Give these a purpose" : s.weekStep === 2 ? "Does the balance match?" : "What the week showed",
      week1: s.weekStep === 1, week2: s.weekStep === 2, week3: s.weekStep === 3,
      week1Line: review.length ? "Waiting on a category or a note" : "Nothing waiting",
      week1Cta: review.length ? "Work through them" : "Skip ahead",
      weekClose: () => this.go("home"),
      computedFor: wk.name,
      computedBal: balRs(this.balance(wk.key)),
      typedBal: fmt(typedBal),
      balType: e => { const n = parseInt(String(e.target.value).replace(/[^0-9]/g, ""), 10) || 0; this.setState({ balNudge: n - this.balance(wk.key), gapState: null }); },
      hasGap: gap !== 0 && !s.gapState,
      gapLine: gap > 0 ? rs(gap) + " unaccounted" : rs(gap) + " more than expected",
      gapBody: gap > 0
        ? "Untracked cash out of " + wk.short + ", most likely — a taxi, a tea, an ATM withdrawal with no SMS behind it. Record it against that account and the balance is honest again."
        : "More in the account than Thaili knows about — a deposit or refund that never sent a message. Recording it puts " + wk.short + " back in step.",
      gapCta: gap > 0 ? "Record as a cash spend" : "Record as money in",
      /* FIX 4 — post the adjustment against the account that drifted. */
      gapCash: () => {
        this.setState({
          gapState: "cash",
          tx: [dated({ id: newId(), m: gap > 0 ? "Untracked cash" : "Untracked deposit", amt: Math.abs(gap),
            dir: gap > 0 ? "debit" : "credit", src: wk.key, cat: null,
            rem: "Balance adjustment", ch: "Adjustment", at: now(),
            raw: "Dated adjustment from the weekly balance check on " + adLabel(0) + "." })].concat(s.tx),
          balNudge: 0, weekStep: 3
        });
        this.flash("Recorded against " + wk.short + " — balances match");
      },
      gapLater: () => { clearTimeout(this._t); this.setState({ gapState: "later", weekStep: 3, toast: null, undoState: null }); },
      gapClosed: !!s.gapState || gap === 0,
      gapClosedLine: s.gapState === "later"
        ? "Left open. The gap stays visible on the source screen until it's explained."
        : "Matched. Nothing drifted this week.",
      insightLine: leakOut > 0 ? "Rs " + fmt(leakOut) + " went outside the necessities" : "Everything went on necessities",
      weekBackLabel: s.weekStep === 1 ? "Not now" : "Back",
      weekBack: () => s.weekStep === 1 ? this.go("home") : this.setState({ weekStep: s.weekStep - 1, toast: null }),
      weekNextLabel: s.weekStep === 3 ? "Finish" : "Next",
      weekNext: () => {
        if (s.weekStep === 3) { this.setState({ screen: "home", weekStep: 1 }); this.flash("Weekly review done"); }
        else this.setState({ weekStep: s.weekStep + 1, toast: null });
      },

      ranges: ["Daily", "Weekly", "Monthly"].map(r => ({
        label: { Daily: T.daily, Weekly: T.weeklyR, Monthly: T.monthly }[r], bg: s.range === r ? "var(--action)" : "transparent", fg: s.range === r ? "var(--onAction)" : "var(--ink2)",
        tap: () => this.setState({ range: r })
      })),
      spentHeadLabel: (np ? "खर्च · " : "Spent · ") + (s.range === "Monthly" ? (np ? MONTH_NP : MONTH_EN) : s.range === "Weekly" ? (np ? "यो हप्ता" : "this week") : (np ? "आज" : "today")),
      spentBig: fmt(periodOut),
      spentChip: deltaChip(periodOut, prevTotal),
      vsLabel: "vs " + prevName,
      insTrio: [
        { label: T.inL, value: kfmt(periodIn), icon: SI.inA, tint: "var(--tintG)", ifg: "var(--pos)" },
        { label: net >= 0 ? T.savedL : (np ? "बढी" : "Over"), value: kfmt(net), icon: SI.shield, tint: net >= 0 ? "var(--tintN)" : "var(--tintW)", ifg: net >= 0 ? "var(--navy)" : "var(--warnInk)" },
        { label: T.leaks, value: kfmt(leakOut), icon: SI.drop, tint: "var(--tintW)", ifg: "var(--warnInk)" }
      ],
      trendAvgShort: (np ? "औसत " : "Avg ") + kfmt(trendAvg),
      topCatsTitle: np ? "मुख्य वर्ग" : "Top categories",
      catsTitle: np ? "वर्ग अनुसार" : "By category",
      splitTitle: np ? "आवश्यक र चुहावट" : "Essential vs leaks",
      biggestTitle: np ? "ठूला खर्च" : "Biggest spends",
      toWhere: () => this.setState({ insTab: "Where" }),
      topCats4: catTop.slice(0, 4).map(c => Object.assign(catLook(c.k), {
        label: c.label, amount: rs(c.amt),
        width: Math.round(c.amt / Math.max(catTop[0].amt, 1) * 100) + "%",
        color: isEss(c.k) ? "var(--navy)" : "var(--warn)"
      })),
      splitRows: [
        { label: np ? "आवश्यक" : "Essential", amt: essOut, icon: SI.shield, ifg: "var(--navy)", color: "var(--navy)" },
        { label: T.leaks, amt: leakOut, icon: SI.drop, ifg: "var(--warnInk)", color: "var(--warn)" },
        { label: np ? "वर्ग छैन" : "Not filed", amt: unfiled, icon: SI.ask, ifg: "var(--ink3)", color: "var(--barDim)" }
      ].filter((g, i) => i < 2 || g.amt > 0).map(g => Object.assign(g, {
        amount: rs(g.amt), pct: Math.round(g.amt / Math.max(periodOut, 1) * 100) + "%",
        width: Math.round(g.amt / Math.max(periodOut, 1) * 100) + "%"
      })),
      catRows: catAmts.filter(c => c.amt || c.prev).map(c => {
        const ceiling = s.range === "Monthly" ? c.limit : Math.max.apply(null, catAmts.map(x => x.amt).concat([1]));
        const pct = Math.min(100, c.amt / Math.max(ceiling || 1, 1) * 100);
        const d = deltaChip(c.amt, c.prev);
        return Object.assign(catLook(c.k), {
          label: c.label, amount: rs(c.amt), width: pct + "%",
          color: s.range !== "Monthly" ? "var(--navy)" : pct >= 100 ? "var(--warnInk)" : pct >= 70 ? "var(--warn)" : "var(--pos)",
          dIcon: c.prev ? d.icon : SI.flat, dText: c.prev ? d.text : "", dFg: c.prev ? d.fg : "var(--ink3)"
        });
      }),
      leakIcon: SI.drop, pieIcon: SI.pie,
      leakHeadLabel: T.leaks + " · " + (s.range === "Monthly" ? (np ? MONTH_NP : MONTH_EN) : s.range === "Weekly" ? (np ? "यो हप्ता" : "this week") : (np ? "आज" : "today")),
      leakBig: fmt(leakOut),
      leakChip: deltaChip(leakOut, prevLeak),
      leakShareLabel: leakShare + "%",
      leaksNoneLabel: np ? "कुनै चुहावट छैन" : "No leaks this period",
      leakRows2: leakCats.filter(x => x.amt > 0).map(x => Object.assign(catLook(x.c.key), {
        label: x.c.label, amount: rs(x.amt), per: kfmt(Math.round(x.amt / perDiv)) + (np ? "/दिन" : "/day"),
        width: Math.round(x.amt / Math.max(leakCats[0].amt, 1) * 100) + "%", color: "var(--warn)"
      })),
      leakStats: [
        { icon: SI.cal, tint: "var(--tintN)", ifg: "var(--navy)", value: heaviest[0] + " · " + kfmt(heaviest[1]), label: np ? "सबैभन्दा महँगो दिन" : "Heaviest day" },
        { icon: SI.receipt, tint: "var(--tintN)", ifg: "var(--navy)", value: rs(median), label: np ? "सामान्य खर्च" : "Typical spend" }
      ],
      insTabs: ["Brief", "Where", "Leaks"].map(t => ({
        label: { Brief: T.brief, Where: T.where, Leaks: T.leaks }[t],
        icon: { Brief: SI.grid, Where: SI.pie, Leaks: SI.drop }[t],
        bg: s.insTab === t ? "var(--surface)" : "transparent",
        fg: s.insTab === t ? "var(--ink)" : "var(--ink2)",
        shadow: s.insTab === t ? "0 1px 3px rgba(43,58,74,.14)" : "none",
        tap: () => this.setState({ insTab: t })
      })),
      insBrief: s.insTab === "Brief", insSpend: s.insTab === "Where", insLeaks: s.insTab === "Leaks",


      leaksNone: leakCats.filter(x => x.amt > 0).length === 0,
      toEssEdit: () => this.go("cats", { catsMode: "edit", catsFrom: "insights" }),



      topSpends: s.tx.filter(t => t.dir === "debit").sort((a, b) => b.amt - a.amt).slice(0, 4).map(t => Object.assign(txLook(t), {
        title: t.m, meta: dayLabel(t.off) + " · " + (t.cat ? clabel(t.cat) : "Uncategorised"),
        amount: "−" + fmt(t.amt), tap: () => this.openDetail(t.id, "insights")
      })),


      trendTitle: s.range === "Daily" ? "Last seven days" : s.range === "Weekly" ? "Last six weeks" : "Last six BS months",
      trendBars: trend.map((t, i) => ({
        label: t[0].length > 4 ? t[0].slice(0, 3) : t[0], value: i !== trend.length - 1 ? "" : t[1] >= 1000 ? Math.round(t[1] / 100) / 10 + "k" : fmt(t[1]),
        h: Math.max(6, Math.round(t[1] / trendMax * 100)) + "px",
        color: i === trend.length - 1 ? "var(--navy)" : t[1] > trendAvg ? "var(--barDim)" : "var(--barTrack)",
        valFg: i === trend.length - 1 ? "var(--ink)" : "var(--ink3)",
        labelFg: i === trend.length - 1 ? "var(--ink)" : "var(--ink3)"
      })),
      trendAvgPos: Math.round(trendAvg / trendMax * 100) + 22 + "px",

      srcNewTitle: s.editSrcKey ? "Edit source" : "Add a source",
      isEditSrc: !!s.editSrcKey,
      newSrcAmtLabel: s.newSrcAmt ? fmt(parseInt(s.newSrcAmt, 10)) : "0",
      newSrcAmtFg: s.newSrcAmt ? "var(--ink)" : "var(--barDim)",
      newSrcKeys: needAcct && s.newSrcField === "acct" ? keypad("newSrcAcct", s.newSrcAcct, 4) : keypad("newSrcAmt", s.newSrcAmt, 9, true),
      newSrcOpeningNote: s.editSrcKey
        ? "Opening balance — the baseline this account is counted from. Change it and every figure derived from it moves with it."
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
              ? Object.assign({}, x, { name: shown, base: s.newSrcName, short: s.newSrcName, acct: acct, type: newKind.type, dot: newKind.dot, opening: newSrcAmtNum }) : x),
            roles: Object.assign({}, prevR, { [s.editSrcKey]: s.newSrcRole }),
            screen: back, editSrcKey: null, newSrcAmt: "", newSrcAcct: ""
          });
          this.flash(shown + " updated", { sources: prevS, roles: prevR });
          return;
        }
        const key = "src" + Date.now();
        this.setState({
          sources: prevS.concat([{ key: key, name: shown, base: s.newSrcName, short: s.newSrcName, acct: acct, type: newKind.type, dot: newKind.dot, opening: newSrcAmtNum }]),
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

      sourceRows: s.sources.map(x => Object.assign(acctLook(x, [IC.bank, "var(--tintN)", "var(--navy)"]), {
        name: x.name, meta: x.type.split(" · ")[0], dot: x.dot, balance: balRs(this.balance(x.key)),
        tap: () => this.go("source-detail", { srcKey: x.key, srcFrom: "insights" })
      })),

      srcName: shownSrc.name,
      srcBalance: balRs(this.balance(s.srcKey)),
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

      addEntry: s.addEntry ? fmt(parseInt(s.addEntry, 10)) : "0",
      addFg: s.addEntry ? "var(--ink)" : "var(--barDim)",
      addKeys: keypad("addEntry", s.addEntry, 6, true),
      addCats: cats.map(c => chip(c.label, s.addCat === c.key, () => this.setState({ addCat: c.key }))),
      addMoreOpen: s.addMore,
      addMoreLine: srcOf(s.addSrc).short + " · today, now",
      toggleMore: () => this.setState({ addMore: !s.addMore }),
      addSources: s.sources.map(x => chip(x.short, s.addSrc === x.key, () => this.setState({ addSrc: x.key }))),
      addCta: s.addEntry ? "Save" : "Type an amount",
      addCtaBg: s.addEntry ? "var(--action)" : "var(--surface2)",
      addCtaFg: s.addEntry ? "var(--onAction)" : "var(--ink3)",
      addCancel: () => this.go("home"),
      commitAdd: () => {
        if (!amt) return;
        const c = cats.filter(x => x.key === s.addCat)[0] || cats[0];
        const src = srcOf(s.addSrc);
        if (!c || !src.key) return;
        const prev = s.tx;
        this.setState({
          tx: [dated({ id: newId(), m: c.label + " (" + src.short + ")", amt: amt, dir: "debit", src: src.key,
            cat: c.key, rem: "Quick add", ch: "Manual", raw: "Entered by hand.", at: now() })].concat(prev),
          screen: "home", addEntry: ""
        });
        this.flash(rs(amt) + " into " + c.label, { tx: prev });
      },

      settingRows: [
        /* Notifications and quiet hours are saved now and apply once capture sends spend prompts. */
        { icon: IC.bell, label: T.notifications,
          meta: s.notifMode === "All" ? "Ask for a purpose after each spend" : s.notifMode === "Off" ? "No prompts — review from the app" : "Only spends that need a category",
          value: s.notifMode, tap: () => {
            const next = NOTIF_MODES[(NOTIF_MODES.indexOf(s.notifMode) + 1) % NOTIF_MODES.length];
            if (next !== "Off") registerPush(true); // no-op if already allowed
            this.setState({ notifMode: next });
          } },
        { icon: IC.moon, label: T.quiet, meta: s.quiet === "Off" ? "Prompts arrive any time" : "Held for a morning digest",
          value: s.quiet, tap: () => this.setState({ quiet: QUIET_HOURS[(QUIET_HOURS.indexOf(s.quiet) + 1) % QUIET_HOURS.length] }) },
        { icon: IC.lock, label: T.appLock, meta: "Fingerprint or phone PIN on open", value: s.appLock ? "On" : "Off",
          tap: () => this.auth(s.appLock ? "Turn off app lock" : "Turn on app lock").then(r => {
            if (r.ok) { this.setState({ appLock: !s.appLock }); this.flash(s.appLock ? "App lock off" : "App lock on — Thaili asks every time you open it"); }
            else if (r.reason === "no-lock") this.flash("Set a screen lock in Android settings first");
          }) },
        { icon: IC.bolt, label: T.rules, meta: s.rules.length + " rules · " + autoFiled + " filed this month", value: "", tap: () => this.go("rules") },
        { icon: IC.tag, label: T.categories, meta: s.picked.length + " in use · what counts as a leak", value: "", tap: () => this.go("cats", { catsMode: "edit", catsFrom: "settings" }) },
        { icon: IC.target, label: T.goals, meta: s.goals.length ? s.goals.length + " claiming " + rs(surplus) + " of surplus" : "None yet", value: "", tap: () => this.go("goals", { goalsFrom: "settings" }) },
        { icon: IC.exportI, label: T.exportAll, meta: "CSV of every entry, account, rule and goal", value: "", tap: () => this.flash("thaili-export.csv saved to Downloads") },
        { icon: IC.archive, label: T.archive, meta: "Deleted items, kept 30 days", value: "2", tap: () => this.flash("Restorable until purge") }
      ],

      goTab: k => this.go(k),
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
    // Blank canvas while the pouch loads, so a returning user never flashes the welcome screen.
    const v = this.state.loaded ? this.renderVals() : null;
    // Transition for this screen change: back slides from the left, tab to tab fades, else push.
    const scr = this.state.screen;
    if (scr !== this.shownScreen) {
      this.anim = !this.shownScreen ? "" : this.popping ? "scr-back"
        : TABS.indexOf(scr) > -1 && TABS.indexOf(this.shownScreen) > -1 ? "scr-fade" : "scr-fwd";
      this.shownScreen = scr;
    }
    return (
      <div data-theme={this.state.theme} onClickCapture={e => { if (e.target.closest(".press, .press-bg, button")) hapticTap(); }}
        className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-canvas text-ink pt-[var(--safe-area-inset-top,env(safe-area-inset-top))] pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom))]">
        {this.state.locked ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex size-18 items-center justify-center rounded-[22px] bg-brand">
              <img src="./thaili-mark-cream.png" alt="Thaili" className="h-10.75 w-10 object-contain" />
            </div>
            <div className="text-[15px] text-ink-2">Thaili is locked</div>
            <button onClick={this.unlock} className="rounded-[14px] bg-action px-9 py-3.5 text-[15px] font-semibold text-on-action">Unlock</button>
          </div>
        ) : v && <div key={scr} className={"scr " + this.anim}><Screens v={v} /></div>}
      </div>
    );
  }
}
