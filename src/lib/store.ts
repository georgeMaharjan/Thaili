// Persistence: load the user's pouch from Supabase, and write back whatever
// changed between two states of the logic. The logic never calls the database
// itself — it just sets state, and componentDidUpdate hands both states here.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, ensureSession } from "./supabase";
import { dated } from "./bs";

// Small preferences kept as one JSON row. Adding a key here is all it takes.
const PREF_KEYS = ["picked", "customCats", "ess", "saveTarget", "savingsGoal", "theme", "lang",
  "splitMode", "syncCell", "syncRaw", "syncAlert", "appLock", "notifMode", "quiet", "smsSince"] as const;

const txFromRow = (r: any) => dated({
  id: r.id, m: r.merchant, amt: Number(r.amount), dir: r.dir, src: r.src, to: r.to_src,
  cat: r.cat, rem: r.remarks, auto: r.auto_rule, ch: r.channel, raw: r.raw, at: r.occurred_at,
});
// The SMS text itself leaves the phone only when the user turned on "Keep the raw message text".
const txToRow = (t: any, keepRaw: boolean) => ({
  id: t.id, src: t.src, to_src: t.dir === "transfer" ? t.to || null : null, merchant: t.m,
  amount: t.amt, dir: t.dir, cat: t.cat || null, remarks: t.rem || null, auto_rule: t.auto || null,
  channel: t.ch, raw: keepRaw || t.ch !== "SMS" ? t.raw || null : null, occurred_at: t.at || new Date().toISOString(),
  archived_at: null, // present in state = live; an undone delete comes back this way
});
const srcToRow = (x: any, i: number, roles: any) => ({
  key: x.key, name: x.name, base: x.base || x.name, short: x.short || x.name, type: x.type, dot: x.dot,
  opening: x.opening || 0, acct: x.acct ? String(x.acct).slice(-4) : null,
  role: roles[x.key] === "savings" ? "savings" : "spending", sort: i,
});

function must<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/** The saved pouch, or null when there is no backend (not configured / no session). */
export async function load() {
  const uid = await ensureSession();
  if (!supabase || !uid) return null;
  const [sources, tx, rules, goals, settings] = await Promise.all([
    supabase.from("sources").select("*").order("sort"),
    // ponytail: loads every live transaction; page by BS month once a pouch holds years of history.
    supabase.from("transactions").select("*").is("archived_at", null).order("occurred_at", { ascending: false }),
    supabase.from("rules").select("*").order("sort"),
    supabase.from("goals").select("*").order("sort"),
    supabase.from("settings").select("prefs").maybeSingle(),
  ]).then((all) => all.map((r: any) => must(r))) as any[];

  const roles: Record<string, string> = {};
  sources.forEach((x: any) => { roles[x.key] = x.role; });
  return {
    isNew: sources.length === 0,
    sources: sources.map((x: any) => ({
      key: x.key, name: x.name, base: x.base, short: x.short, type: x.type, dot: x.dot,
      opening: Number(x.opening), acct: x.acct,
    })),
    roles,
    tx: tx.map(txFromRow),
    rules: rules.map((r: any) => ({ id: r.id, kw: r.kw, cat: r.cat, own: r.own })),
    goals: goals.map((g: any) => ({ id: g.id, name: g.name, target: Number(g.target) })),
    // Only known keys: a stale key (e.g. device permissions, once saved here) must not override live state.
    prefs: Object.fromEntries(PREF_KEYS.filter((k) => settings?.prefs?.[k] !== undefined).map((k) => [k, settings.prefs[k]])),
  };
}

// Writes run one at a time, in order. A failed write marks everything dirty so
// the next save re-sends the whole pouch instead of silently dropping the change.
// ponytail: no offline queue — changes made while offline persist on the next
// successful save in the same session, but are lost if the app is closed first.
let queue: Promise<void> = Promise.resolve();
let allDirty = false;
export const markAllDirty = () => { allDirty = true; };

export function save(prev: any, next: any) {
  if (!supabase) return;
  const db = supabase;
  queue = queue.then(async () => {
    const full = allDirty;
    const was = full ? { tx: [], sources: [], rules: [], goals: [], roles: {} } : prev;
    try {
      // Accounts before transactions: a new transaction may point at a new account.
      if (full || was.sources !== next.sources || was.roles !== next.roles) {
        const rows = next.sources.map((x: any, i: number) => srcToRow(x, i, next.roles));
        if (rows.length) must(await db.from("sources").upsert(rows, { onConflict: "user_id,key" }));
        const gone = was.sources.filter((x: any) => !next.sources.some((y: any) => y.key === x.key)).map((x: any) => x.key);
        if (gone.length) must(await db.from("sources").delete().in("key", gone));
      }
      if (full || was.tx !== next.tx || prev.syncRaw !== next.syncRaw) {
        const before = new Map(was.tx.map((t: any) => [t.id, t]));
        const keepRaw = !!next.syncRaw;
        const changed = next.tx.filter((t: any) => before.get(t.id) !== t || (prev.syncRaw !== next.syncRaw && t.ch === "SMS")).map((t: any) => txToRow(t, keepRaw));
        if (changed.length) must(await db.from("transactions").upsert(changed));
        const ids = new Set(next.tx.map((t: any) => t.id));
        const gone = was.tx.filter((t: any) => !ids.has(t.id)).map((t: any) => t.id);
        // Deleting keeps the row for 30 days (spec §19).
        if (gone.length) must(await db.from("transactions").update({ archived_at: new Date().toISOString() }).in("id", gone));
      }
      for (const [table, key] of [["rules", "rules"], ["goals", "goals"]] as const) {
        if (!full && was[key] === next[key]) continue;
        const rows = next[key].map((r: any, i: number) => table === "rules"
          ? { id: r.id, kw: r.kw, cat: r.cat, own: !!r.own, sort: i }
          : { id: r.id, name: r.name, target: r.target, sort: i });
        if (rows.length) must(await db.from(table).upsert(rows));
        const ids = new Set(next[key].map((r: any) => r.id));
        const gone = was[key].filter((r: any) => !ids.has(r.id)).map((r: any) => r.id);
        if (gone.length) must(await db.from(table).delete().in("id", gone));
      }
      if (full || PREF_KEYS.some((k) => prev[k] !== next[k])) {
        const prefs = Object.fromEntries(PREF_KEYS.map((k) => [k, next[k]]));
        must(await db.from("settings").upsert({ prefs, updated_at: new Date().toISOString() }));
      }
      if (full) allDirty = false;
    } catch (e) {
      allDirty = true;
      console.warn("[thaili] save failed; will resend everything on the next change", e);
    }
  });
}

