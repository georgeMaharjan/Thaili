// Presentation defaults and labels; durable values remain in the domain model.
import type { Account, Category } from "../domain/models";
import { npDigits } from "../lib/bs";
import { fmt } from "../lib/format";
import { INSTITUTIONS } from "../lib/institutions";
export const CATS: Category[] = [
  { key: "food", label: "Eating out" }, { key: "transport", label: "Transport" },
  { key: "grocery", label: "Groceries" }, { key: "bills", label: "Bills & rent" },
  { key: "shopping", label: "Shopping" }, { key: "health", label: "Health" }
];
export const EXTRA_CATS: Category[] = [
  { key: "going", label: "Going out" }, { key: "family", label: "Family" },
  { key: "study", label: "Study" }, { key: "gifts", label: "Gifts" }, { key: "pets", label: "Pets" }
];
export const ESS_DEFAULT: Record<string, boolean> = { food: false, going: false, shopping: false, gifts: false };
export const ALL_CATS = CATS.concat(EXTRA_CATS);
export const INCOME_CATS: Category[] = [
  { key: "salary", label: "Salary" }, { key: "business", label: "Business & freelance" },
  { key: "interest", label: "Interest" }, { key: "giftin", label: "Gift received" },
  { key: "refund", label: "Refund" }, { key: "otherin", label: "Other income" }
];
export const CATEGORY_COLORS = ["#C65B4B", "#3975B8", "#16866B", "#9664B5", "#C28A2C", "#526C82"];
export const ACCOUNT_COLORS = ["#C65B4B", "#3975B8", "#16866B", "#9664B5", "#C28A2C", "#526C82", "#D02A2E", "#2B3A4A"];
export const categoryColor = (c: Category) => c.color && CATEGORY_COLORS.includes(c.color)
  ? c.color : CATEGORY_COLORS[(c.key.split("").reduce((n, x) => n + x.charCodeAt(0), 0)) % CATEGORY_COLORS.length];
// Built-ins with the user's renames/deletes applied, then the user's own categories.
// every keeps deleted ones so old transactions still show their label.
export function categoryLists(custom: Category[]) {
  const builtIn = ALL_CATS.concat(INCOME_CATS);
  const edit = (c: Category): Category => ({ ...c, ...custom.find(x => x.key === c.key) });
  const own = custom.filter(c => !builtIn.some(b => b.key === c.key));
  const out = ALL_CATS.map(edit).concat(own.filter(c => !c.in));
  const income = INCOME_CATS.map((c): Category => ({ ...edit(c), in: true })).concat(own.filter(c => c.in));
  return { every: out.concat(income), out: out.filter(c => !c.gone), income: income.filter(c => !c.gone) };
}
export const OB_STEPS = 4;
export const CASH: Account = { key: "cash", base: "Cash", name: "Cash", short: "Cash", type: "Manual entry", dot: "#B4721F", opening: 0, acct: null };
export const isManualSrc = (x: Account) => /Manual|manual/.test(x.type);
// Only banks ask for a number: wallets match by institution, manual accounts by hand.
export const needsAcctNumber = (x: Account) => !isManualSrc(x) && !/Wallet/.test(x.type);
export const tailName = (base: string, acct: string | null | undefined) => acct && acct.length >= 4 ? base + " ••" + acct.slice(-4) : base;
export const WD_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const NO_SRC: Account = { key: "", name: "", base: "", short: "", type: "", dot: "var(--line)", opening: 0, acct: null };
export const NO_TX = { id: null, m: "", amt: 0, dir: "debit" as const, src: "", cat: null, rem: null, off: 0, time: "", ch: "", raw: "", bs: null };
export const SRC_KINDS = [
  {
    key: "bank", label: "Bank", type: "Bank · SMS", dot: "#D02A2E",
    names: ["Nabil Bank", ...INSTITUTIONS.filter(i => i.kind === "bank" && i.key !== "nabil").map(i => i.name)]
  },
  {
    key: "wallet", label: "Wallet", type: "Wallet · notifications", dot: "#2B3A4A",
    names: INSTITUTIONS.filter(i => i.kind === "wallet").map(i => i.name)
  },
  {
    key: "manual", label: "Cash or other", type: "Manual entry", dot: "#7A8794",
    names: ["Cash on hand", "Sahakari", "Fixed deposit", "SIP", "Lent out"]
  }
];
export const IC = {
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
export const CI: Record<string, string> = {
  food: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16.5 3c-2 1.5-3 4-3 7h3v11", transport: "M5 4h14v12H5ZM5 11h14M8 16v3M16 16v3M8 13.5h.01M16 13.5h.01",
  grocery: "M4 9h16l-1.5 11h-13ZM8 9l3-5M16 9l-3-5", bills: "M3.5 10.5 12 3.8l8.5 6.7V20h-17ZM9.5 20v-6h5v6",
  shopping: "M5 8h14l-1 12H6ZM9 8V6a3 3 0 0 1 6 0v2", health: "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z",
  going: "M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4ZM14 7v10", family: "M9 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6ZM3.5 20a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M17.5 20h3a5 5 0 0 0-3.5-4.8",
  study: "M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4ZM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6Z", gifts: "M4 10h16v10H4ZM3 7h18v3H3ZM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1",
  pets: "M12 13c-3 0-5 3-5 5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2c0-2-2-5-5-5ZM6 9a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3ZM9.5 5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3ZM14.5 5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3ZM18 9a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3Z"
};
export const SI = {
  inA: "M12 5v14M6 13l6 6 6-6", outA: "M12 19V5M6 11l6-6 6 6", xfer: "M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4",
  ask: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17ZM9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17h.01",
  up: "M7 17 17 7M9 7h8v8", down: "M7 7l10 10M17 9v8H9", flat: "M5 12h14",
  calCheck: "M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4M9 15l2 2 4-4",
};
export const CATEGORY_ICON_OPTIONS = [
  { key: "transfer", label: "Transfer", d: SI.xfer }, { key: "income", label: "Income", d: SI.inA },
  { key: "expense", label: "Expense", d: SI.outA },
  { key: "food", label: "Food", d: CI.food }, { key: "transport", label: "Transport", d: CI.transport },
  { key: "grocery", label: "Groceries", d: CI.grocery }, { key: "bills", label: "Bills", d: CI.bills },
  { key: "shopping", label: "Shopping", d: CI.shopping }, { key: "health", label: "Health", d: CI.health },
  { key: "going", label: "Going out", d: CI.going }, { key: "family", label: "Family", d: CI.family },
  { key: "study", label: "Study", d: CI.study }, { key: "gifts", label: "Gifts", d: CI.gifts },
  { key: "pets", label: "Pets", d: CI.pets }, { key: "bank", label: "Bank", d: IC.bank },
  { key: "wallet", label: "Wallet", d: IC.wallet }, { key: "cash", label: "Cash", d: IC.cash },
  { key: "loan", label: "Loan", d: "M12 3v18M17 7.5c0-1.7-2-3-5-3s-5 1.3-5 3 1.5 2.5 5 3 5 1.3 5 3-2 3-5 3-5-1.3-5-3" },
  { key: "lend", label: "Lend", d: "M7 7h13M16 3l4 4-4 4M17 17H4m4-4-4 4 4 4" },
  { key: "home", label: "Home", d: "m3 11 9-7 9 7M5 10v10h14V10M9 20v-6h6v6" },
  { key: "travel", label: "Travel", d: "m3 12 18-8-6 18-3-8-9-2Zm9 2 4-4" },
  { key: "utilities", label: "Utilities", d: IC.bolt },
  { key: "vault", label: "Savings", d: IC.vault }, { key: "tag", label: "Other", d: IC.tag },
] as const;
const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  salary: "bank", business: "wallet", interest: "vault", giftin: "gifts", refund: "shopping", otherin: "tag"
};
export const categoryIconKey = (c: Category) => c.icon || (CI[c.key] ? c.key : DEFAULT_CATEGORY_ICONS[c.key] || "tag");
export const categoryIcon = (c: Category) => CATEGORY_ICON_OPTIONS.find(option => option.key === categoryIconKey(c))?.d || IC.tag;
export const kfmt = (n: number) => { const a = Math.abs(n); return a >= 100000 ? (Math.round(a / 10000) / 10) + "L" : a >= 10000 ? Math.round(a / 1000) + "k" : fmt(a); };
export const L = {
  EN: {
    home: "Home", txns: "Transactions", insights: "Insights", accounts: "Accounts", settings: "Settings", goals: "Goals",
    quickAdd: "Quick add", newGoal: "New goal", rules: "Auto-filing rules", review: "Needs review", 
    tagline: "Every rupee that moves — bank, wallet, sahakari, cash — in one pouch, so you can understand where it goes.",
    w1: "No bank login", w2: "Reads bank SMS", w3: "Finds your apps",
    getStarted: "Get started", 
    step1: "Step 1 of " + OB_STEPS + " · messages", step2: "Step 2 of " + OB_STEPS + " · this phone", step3: "Step 3 of " + OB_STEPS + " · accounts", step4: "Step 4 of " + OB_STEPS + " · categories",
    editCats: "Categories",
    permTitle: "Choose which banks Thaili reads",
    permSub: "Read and stored on this phone. Thaili cloud sync and backup are unavailable.",
    srcTitle: "Two things per account",
    srcSub: "The last four digits — the only part a bank SMS prints, so Thaili can tell your accounts apart — and the opening balance every figure is counted from.",
    catsTitle: "Pick three to six categories", catsSub: "Choose the ones you use most. Add more later.",
    recent: "Recent", seeAll: "See all",
    inL: "In", outL: "Out", savedL: "Saved",
    appearance: "Appearance", appearanceMeta: "Cream by day, navy by night", light: "Light", dark: "Dark", langMeta: "English",
    notifications: "Notifications", appLock: "App lock", exportAll: "Export everything",
    archive: "Archive", categories: "Categories", totalAcross: "Across all accounts", addAccount: "Add an account",
    cancel: "Cancel", paste: "Paste", email: "Email",
    all: "All", daily: "Today", weeklyR: "Week", monthly: "Month", leaks: "Optional", done: "Done",
    badPhone: "Use an NTC or Ncell number — starts with 98, 97 or 96"
  },
  NP: {
    home: "गृह", txns: "कारोबार", insights: "विश्लेषण", accounts: "खाताहरू", settings: "सेटिङ", goals: "लक्ष्य",
    quickAdd: "छिटो थप्नुहोस्", newGoal: "नयाँ लक्ष्य", rules: "स्वतः वर्गीकरण नियम", review: "समीक्षा बाँकी", 
    tagline: "बैंक, वालेट, सहकारी, नगद — चल्ने हरेक रुपैयाँ एउटै थैलीमा, ताकि कहाँ चुहिन्छ देखियोस्।",
    w1: "बैंक लगइन छैन", w2: "बैंक SMS पढ्छ", w3: "एप आफैँ भेट्छ",
    getStarted: "सुरु गरौँ", 
    step1: "चरण १ / " + npDigits(OB_STEPS) + " · सन्देश", step2: "चरण २ / " + npDigits(OB_STEPS) + " · यो फोन", step3: "चरण ३ / " + npDigits(OB_STEPS) + " · खाता", step4: "चरण ४ / " + npDigits(OB_STEPS) + " · वर्ग",
    editCats: "वर्गहरू",
    permTitle: "थैलीले पढ्ने बैंकहरू छान्नुहोस्",
    permSub: "यही फोनमा पढिन्छ र राखिन्छ। थैलीको क्लाउड सिङ्क र ब्याकअप उपलब्ध छैन।",
    srcTitle: "हरेक खाताका दुई कुरा",
    srcSub: "अन्तिम चार अङ्क — बैंकको SMS मा छापिने यही मात्र हो, जसले खाता छुट्याउँछ — र सुरुको मौज्दात, जहाँबाट हरेक हिसाब गनिन्छ।",
    catsTitle: "तीनदेखि छवटा वर्ग छान्नुहोस्", catsSub: "धेरै प्रयोग हुने वर्ग छान्नुहोस्। पछि थप्न सकिन्छ।",
    recent: "हालैका", seeAll: "सबै",
    inL: "आम्दानी", outL: "खर्च", savedL: "बचत",
    appearance: "रूप", appearanceMeta: "दिनमा क्रिम, रातमा नीलो", light: "उज्यालो", dark: "अँध्यारो", langMeta: "नेपाली",
    notifications: "सूचना", appLock: "एप लक", exportAll: "सबै निर्यात",
    archive: "संग्रह", categories: "वर्गहरू", totalAcross: "सबै खाताको जम्मा", addAccount: "खाता थप्नुहोस्",
    cancel: "रद्द", paste: "टाँस्नुहोस्", email: "इमेल",
    all: "सबै", daily: "आज", weeklyR: "हप्ता", monthly: "महिना", leaks: "वैकल्पिक", done: "भयो",
    badPhone: "NTC वा Ncell नम्बर चाहिन्छ — ९८, ९७ वा ९६ बाट सुरु हुने"
  }
};
