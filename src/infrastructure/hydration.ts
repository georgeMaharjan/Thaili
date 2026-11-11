import type { Account, Category, Channel, Direction, Pouch, Preferences, Transaction } from "../domain/models.ts";
import type { Deletions, LedgerRecord } from "../lib/local-ledger.ts";
import type { CaptureEvidence } from "../lib/transaction-capture.ts";

const fail = (field: string): never => { throw new Error("Invalid saved data: " + field); };
function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(field);
  return value as Record<string, unknown>;
}
const array = (value: unknown, field: string): unknown[] => Array.isArray(value) ? value : fail(field);
const string = (value: unknown, field: string): string => typeof value === "string" ? value : fail(field);
const number = (value: unknown, field: string): number => typeof value === "number" && Number.isFinite(value) ? value : fail(field);
const nullableString = (value: unknown, field: string) => value == null ? null : string(value, field);
function timestamp(value: unknown, field: string): string {
  const result = string(value, field);
  return Number.isFinite(Date.parse(result)) ? result : fail(field);
}
function strings(value: unknown, field: string) { return array(value, field).map(v => string(v, field)); }
function categories(value: unknown): Category[] {
  return array(value, "categories").map(value => {
    const c = object(value, "category");
    return {
      key: string(c.key, "category key"), label: string(c.label, "category label"),
      ...(c.limit === undefined ? {} : { limit: number(c.limit, "category limit") }),
      ...(c.in === true ? { in: true } : {}), ...(c.gone === true ? { gone: true } : {})
    };
  });
}
/** Whitelist preferences so view drafts or unknown cloud fields never override application state. */
export function decodePreferences(value: unknown): Preferences {
  const input = object(value ?? {}, "preferences"), out: Preferences = {};
  for (const key of ["syncCell", "syncRaw", "syncAlert", "appLock", "hideBal", "setupComplete"] as const) {
    if (input[key] !== undefined) out[key] = typeof input[key] === "boolean" ? input[key] : fail(key);
  }
  for (const key of ["saveTarget", "savingsGoal"] as const) if (input[key] !== undefined) out[key] = number(input[key], key);
  for (const key of ["smsSince", "notificationSince", "captureStartAt"] as const) if (input[key] !== undefined) out[key] = input[key] === null ? null : number(input[key], key);
  if (input.smsBanks !== undefined) out.smsBanks = [...new Set(strings(input.smsBanks, "SMS banks"))];
  if (input.picked !== undefined) out.picked = strings(input.picked, "picked");
  if (input.customCats !== undefined) out.customCats = categories(input.customCats);
  if (input.ess !== undefined) {
    out.ess = Object.fromEntries(Object.entries(object(input.ess, "essential categories"))
      .map(([key, value]) => [key, typeof value === "boolean" ? value : fail(key)]));
  }
  if (input.theme !== undefined) out.theme = input.theme === "light" || input.theme === "dark" ? input.theme : fail("theme");
  if (input.lang !== undefined) out.lang = input.lang === "EN" || input.lang === "NP" ? input.lang : fail("language");
  if (input.splitMode !== undefined) out.splitMode = input.splitMode === "Queue" || input.splitMode === "Share" ? input.splitMode : fail("goal strategy");
  if (input.notifMode !== undefined) out.notifMode = input.notifMode === "On" || input.notifMode === "Off" ? input.notifMode : fail("notifications");
  return out;
}
export function decodeCapture(value: unknown): CaptureEvidence[] {
  return array(value ?? [], "capture").map(value => {
    const e = object(value, "capture evidence");
    return {
      ch: e.ch === "SMS" || e.ch === "App" ? e.ch : fail("capture channel"),
      id: nullableString(e.id, "capture id"), src: string(e.src, "capture source"), dir: string(e.dir, "capture direction"),
      at: timestamp(e.at, "capture time"), ref: nullableString(e.ref, "capture reference"), fingerprint: nullableString(e.fingerprint, "capture fingerprint")
    };
  });
}
export function decodePouch(value: unknown): Pouch {
  const p = object(value, "pouch");
  const user = p.user == null ? null : object(p.user, "profile");
  return {
    user: user ? { name: string(user.name, "name"), phone: string(user.phone, "phone"), createdAt: timestamp(user.createdAt, "profile date") } : null,
    sources: array(p.sources, "accounts").map((value): Account => {
      const a = object(value, "account"), name = string(a.name, "account name");
      return {
        ...a, key: string(a.key, "account key"), name, base: a.base === undefined ? name : string(a.base, "account base"),
        short: a.short === undefined ? name : string(a.short, "account short name"), type: a.type === undefined ? "Manual entry" : string(a.type, "account type"),
        dot: a.dot === undefined ? "#7A8794" : string(a.dot, "account colour"), opening: number(a.opening, "opening balance"),
        acct: nullableString(a.acct, "account tail"), openedAt: a.openedAt == null ? null : timestamp(a.openedAt, "opening time"),
        packages: strings(a.packages ?? [], "account packages")
      };
    }),
    tx: array(p.tx, "transactions").map((value): Transaction => {
      const t = object(value, "transaction");
      const dir: Direction = t.dir === "debit" || t.dir === "credit" || t.dir === "transfer" ? t.dir : fail("direction");
      const ch: Channel = t.ch === "SMS" || t.ch === "App" || t.ch === "Manual" ? t.ch : fail("channel");
      return {
        ...t, id: string(t.id, "transaction id"), src: string(t.src, "transaction source"), m: string(t.m, "merchant"),
        amt: number(t.amt, "amount"), dir, ch, at: timestamp(t.at, "transaction time"),
        ...(t.added === undefined ? {} : { added: timestamp(t.added, "received time") }),
        to: nullableString(t.to, "destination"), cat: nullableString(t.cat, "category"), rem: nullableString(t.rem, "remarks"),
        auto: nullableString(t.auto, "filing rule"), raw: nullableString(t.raw, "raw text"), capture: decodeCapture(t.capture)
      };
    }),
    rules: array(p.rules, "rules").map(value => {
      const r = object(value, "rule"); return {
        id: string(r.id, "rule id"), kw: string(r.kw, "keyword"), cat: string(r.cat, "rule category"),
        ...(r.own === undefined ? {} : { own: typeof r.own === "boolean" ? r.own : fail("rule owner") })
      };
    }),
    goals: array(p.goals, "goals").map(value => {
      const g = object(value, "goal"); return {
        id: string(g.id, "goal id"), name: string(g.name, "goal name"), target: number(g.target, "goal target")
      };
    }),
    roles: Object.fromEntries(Object.entries(object(p.roles ?? {}, "roles")).map(([key, value]) => [key, string(value, "role")])),
    prefs: decodePreferences(p.prefs),
  };
}

/** Version 1 predates package/capture metadata. Upgrade missing optional fields in memory.
 * Unknown versions and corrupt rows reject the read; the application never initializes over them. */
export function decodeLedgerRecord(value: unknown): LedgerRecord | null {
  if (value == null) return null;
  const r = object(value, "ledger");
  if (r.version !== 1) throw new Error("Unsupported local data version");
  const deletionInput = object(r.deleted, "deletions");
  const deleted: Deletions = { sources: {}, tx: {}, rules: {}, goals: {} };
  for (const key of ["sources", "tx", "rules", "goals"] as const) deleted[key] = Object.fromEntries(
    Object.entries(object(deletionInput[key], "deleted " + key)).map(([id, revision]) => [id, number(revision, "deletion revision")]));
  return {
    version: 1, snapshot: decodePouch(r.snapshot), baseline: decodePouch(r.baseline), deleted,
    revision: number(r.revision, "revision"), owner: nullableString(r.owner, "owner"),
    uncertain: typeof r.uncertain === "boolean" ? r.uncertain : fail("pending replay")
  };
}
