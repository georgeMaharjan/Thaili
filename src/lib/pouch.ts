// Only durable data crosses the storage interface; date labels and UI drafts do not.
import type { Preferences } from "../domain/models";
import { dated } from "./bs.ts";
import type { Pouch } from "./local-ledger";
import { evidenceFor } from "./transaction-capture.ts";

export const PREF_KEYS = ["picked", "customCats", "ess", "saveTarget", "savingsGoal", "theme", "lang",
  "splitMode", "syncCell", "syncRaw", "syncAlert", "appLock", "notifMode", "smsSince", "notificationSince", "captureStartAt", "hideBal", "setupComplete"] as const;
export type PouchState = Pick<Pouch, "user" | "sources" | "roles" | "tx" | "rules" | "goals"> & Preferences;
export const prefsOf = (state: Preferences): Preferences => Object.fromEntries(PREF_KEYS.filter(k => state[k] !== undefined).map(k => [k, state[k]]));
export const snapshot = (state: PouchState): Pouch => JSON.parse(JSON.stringify({
  user: state.user, sources: state.sources, roles: state.roles, rules: state.rules, goals: state.goals,
  tx: state.tx.map(t => {
    const stored = { ...t } as typeof t & Partial<{ off: number; time: string; bs: unknown }>;
    if (t.ch === "SMS" || t.ch === "App") stored.capture = evidenceFor(t);
    delete stored.off; delete stored.time; delete stored.bs;
    if (!state.syncRaw && (t.ch === "SMS" || t.ch === "App")) stored.raw = null;
    return stored;
  }), prefs: prefsOf(state),
}));
export const hydrated = (p: Pouch) => ({ ...p, tx: p.tx.map(t => dated(t)), isNew: !p.sources.length });
