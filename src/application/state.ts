import type { Screen } from "./routes";
import type { Account, Category, DatedTransaction, Profile } from "../domain/models";
import type { Density } from "../lib/format";
import type { Goal, SplitMode } from "../lib/goals";
import type { importTransactions } from "../lib/import-transactions";
import type { MoneyApp } from "../lib/money-apps";
import type { FilingRule } from "../lib/rules";
import type { StoreStatus } from "./ledger-store";
import type { Filters } from "../lib/transactions";

export type RuleDraft = { id: string | null; kw: string; cat: string | null };
export type AppState = {
  calendarDay: string; loaded: boolean; splash: boolean; screen: Screen;
  tx: DatedTransaction[]; sources: Account[]; roles: Record<string, string>;
  user: Profile | null; rules: FilingRule[]; goals: Goal[];
  setupComplete: boolean; storageStatus: StoreStatus; picked: string[];
  saveTarget: number; ess: Record<string, boolean>; stackIdx: number;
  detailId: string | null; from: Screen; srcFrom: Screen;
  rawOpen: boolean; editing: boolean; deleting: boolean; range: "Daily" | "Weekly" | "Monthly";
  insCatsAll: boolean; ruleEdit: RuleDraft | null;
  addEntry: string; addCat: string; addSrc: string; addDir: "debit" | "credit";
  addNote: string; addError: string; discardAdd: boolean;
  srcKey: string | null; toast: string | null; undoState: Partial<AppState> | null;
  perms: boolean[]; appLock: boolean; locked: boolean; unlockBusy: boolean; unlockError: string | null;
  notifMode: "On" | "Off"; detTails: Record<string, string>; scanTx: DatedTransaction[];
  scanResult: ReturnType<typeof importTransactions> | null; scanOrphans: number;
  smsSince: number | null; notificationSince: number | null; captureStartAt: number | null; theme: "light" | "dark"; lang: "EN" | "NP";
  txFilter: string; savingsGoal: number; splitMode: SplitMode; customCats: Category[]; newCatName: string; newCatIn: boolean;
  rulePrompt: { kw: string | null; cat: string; label: string } | null;
  newSrcKind: string; newSrcName: string; newSrcAmt: string; newSrcRole: string;
  newSrcAcct: string; newSrcField: string;
  detState: "done" | "scanning" | "unsupported" | "error"; detFrom: string;
  detOn: Record<string, boolean>; detFound: MoneyApp[]; moneyApps: MoneyApp[];
  syncRaw: boolean; // Legacy local raw-text retention preference; no sync controls.
  goalName: string; goalAmt: string; goalPos: string; goalError: string; discardGoal: boolean;
  catsMode: string; catsFrom: Screen; goalsFrom: Screen; settingsFrom: Screen;
  remarkDraft: string | null; txCategories: string[]; txSpending: string;
  filtersOpen: boolean; filterDraft: Filters | null; txQuery: string;
  txRange: string; txFrom: number | null; txTo: number | null; calOpen: boolean;
  calA: number | null; calB: number | null; calKey: number;
  flowDir: "debit" | "credit"; savExplain: boolean; baseAmt: string; baseFresh: boolean;
  baseSetup: boolean; baseFrom: Screen | null; density: Density; hideBal: boolean;
  regName: string; regPhone: string; regThen: Screen; profName: string; profPhone: string;
  editSrcKey?: string | null; srcNewFrom?: Screen;
};
export type StatePatch = Partial<AppState>;
export type StateWriter = (patch: StatePatch | ((state: AppState) => StatePatch), done?: () => void) => void;

import { calendarAt } from "../lib/calendar";
import { DENSITY } from "../lib/format";
import { newId, SEED_RULES } from "./config";

export function initialState(): AppState {
  return {
    calendarDay: new Date().toDateString(), loaded: false, splash: true, screen: "welcome", tx: [], setupComplete: false, storageStatus: { kind: "local", pending: false },
    picked: ["food", "transport", "grocery", "bills", "shopping", "health"],
    saveTarget: 10000, ess: {}, stackIdx: 0, detailId: null, from: "txns", srcFrom: "insights",
    rawOpen: false, editing: false, deleting: false,
    range: "Monthly", insCatsAll: false, ruleEdit: null, addEntry: "", addCat: "food", addSrc: "cash", addDir: "debit", addNote: "", addError: "", discardAdd: false,
    srcKey: null, toast: null, undoState: null, perms: [false, false], // real device state; see refreshPerms()
    appLock: false, locked: false, unlockBusy: false, unlockError: null, notifMode: "On",
    detTails: {}, scanTx: [], scanResult: null, scanOrphans: 0, smsSince: null, notificationSince: null, captureStartAt: null,
    theme: "light", lang: "EN", txFilter: "all",
    savingsGoal: 200000, splitMode: "Queue",
    customCats: [], newCatName: "", newCatIn: false, rules: SEED_RULES.map(r => Object.assign({}, r, { id: newId() })), rulePrompt: null,
    sources: [],
    newSrcKind: "bank", newSrcName: "Nabil Bank", newSrcAmt: "", newSrcRole: "spending",
    newSrcAcct: "", newSrcField: "acct",
    detState: "done", detFrom: "setup", detOn: {}, detFound: [], moneyApps: [],
    syncRaw: true,
    roles: {},
    goals: [],
    goalName: "", goalAmt: "", goalPos: "bottom", goalError: "", discardGoal: false,
    catsMode: "setup", catsFrom: "settings", goalsFrom: "home", settingsFrom: "home",
    remarkDraft: null,
    txCategories: [], txSpending: "all", filtersOpen: false, filterDraft: null,
    txQuery: "", txRange: "month", txFrom: null, txTo: null, calOpen: false, calA: null, calB: null, calKey: calendarAt(new Date()).MONTH_KEY,
    flowDir: "debit", savExplain: false, baseAmt: "", baseFresh: true, baseSetup: false, baseFrom: null,
    // The local profile: { name, phone: "+977XXXXXXXXXX", createdAt }.
    // Spacing is per device, not synced: it's about this screen and these eyes.
    density: (() => { try { const d = localStorage.getItem("thaili-density"); return d && d in DENSITY ? d as keyof typeof DENSITY : "default"; } catch { return "default"; } })(),
    user: null, hideBal: false, regName: "", regPhone: "", regThen: "permission", profName: "", profPhone: ""
  };
}
