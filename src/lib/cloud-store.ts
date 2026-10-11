/* eslint-disable @typescript-eslint/no-explicit-any */
// Supabase adapter: schema mapping, pagination and ordered deletion/replay live here.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pouch, Deletions, CloudDriver } from "./local-ledger";
import { prefsOf } from "./pouch.ts";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function must<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
const txToRow = (t: any, keepRaw: boolean, keys: Set<string>) => ({
  id: t.id, src: t.src, to_src: t.dir === "transfer" && keys.has(t.to) ? t.to : null, merchant: t.m,
  amount: t.amt, dir: t.dir, cat: t.cat || null, remarks: t.rem || null, auto_rule: t.auto || null,
  channel: t.ch, capture: t.capture || [], raw: keepRaw || (t.ch !== "SMS" && t.ch !== "App") ? t.raw || null : null,
  occurred_at: t.at, created_at: t.added || t.at, archived_at: null,
});
const srcToRow = (x: any, i: number, roles: any) => ({
  key: x.key, name: x.name, base: x.base || x.name, short: x.short || x.name, type: x.type, dot: x.dot, packages: x.packages || [],
  opening: x.opening || 0, opening_at: x.openedAt || new Date(0).toISOString(), acct: x.acct ? String(x.acct).slice(-4) : null,
  role: roles[x.key] === "savings" ? "savings" : "spending", sort: i,
});

// Page through history; the server's default row limit must not truncate a local copy.
async function rows(query: () => any) {
  const all: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = must<any[]>(await query().range(offset, offset + 499));
    all.push(...page);
    if (page.length < 500) return all;
  }
}
export function createCloudDriver(db: SupabaseClient, ensureSession: () => Promise<string | null>): CloudDriver {
  let cloudOwner: string | null = null;
  async function cloudRead(): Promise<{ pouch: Pouch; owner: string }> {
    const owner = await ensureSession();
    if (!owner) throw new Error("Cloud connection unavailable");
    const [sources, tx, rules, goals, settings, profile] = await Promise.all([
      rows(() => db.from("sources").select("*").order("sort").order("key")),
      rows(() => db.from("transactions").select("*").is("archived_at", null).order("occurred_at", { ascending: false }).order("id")),
      rows(() => db.from("rules").select("*").order("sort").order("id")),
      rows(() => db.from("goals").select("*").order("sort").order("id")),
      db.from("settings").select("prefs").maybeSingle().then(must),
      db.from("profiles").select("name,phone,created_at").maybeSingle().then(must),
    ]);
    const prefs = prefsOf(settings?.prefs || {});
    // Cloud-only versions did not save setup progress. Their accounts imply completed setup.
    if (sources.length && prefs.setupComplete === undefined) prefs.setupComplete = true;
    const result = { owner, pouch: {
      user: profile ? { name: profile.name, phone: profile.phone, createdAt: profile.created_at } : null,
      sources: sources.map(x => ({ key: x.key, name: x.name, base: x.base, short: x.short, type: x.type, dot: x.dot,
        opening: Number(x.opening), openedAt: x.opening_at, acct: x.acct, packages: x.packages || [] })),
      roles: Object.fromEntries(sources.map(x => [x.key, x.role])),
      tx: tx.map(r => ({ id: r.id, m: r.merchant, amt: Number(r.amount), dir: r.dir, src: r.src, to: r.to_src,
        cat: r.cat, rem: r.remarks, auto: r.auto_rule, ch: r.channel, capture: r.capture || [], raw: r.raw, at: r.occurred_at, added: r.created_at })),
      rules: rules.map(r => ({ id: r.id, kw: r.kw, cat: r.cat, own: r.own })),
      goals: goals.map(g => ({ id: g.id, name: g.name, target: Number(g.target) })), prefs,
    } };
    cloudOwner = owner;
    return result;
  }
  async function cloudWrite(next: Pouch, before: Pouch, deleted: Deletions, full: boolean) {
    const owner = await ensureSession();
    if (!owner) throw new Error("Cloud connection unavailable");
    if (owner !== cloudOwner) throw new Error("Cloud account changed during sync");
    const keys = new Set(next.sources.map(x => x.key));
    const gone = (key: keyof Deletions, idKey = "id") => [...new Set([
      ...Object.keys(deleted[key]), ...before[key].filter(x => !next[key].some(y => y[idKey] === x[idKey])).map(x => x[idKey]),
    ])].filter(id => !next[key].some(x => x[idKey] === id));
    const sourceRows = next.sources.map((x, i) => srcToRow(x, i, next.roles));
    const oldSources = before.sources.map((x, i) => srcToRow(x, i, before.roles));
    const changedSources = sourceRows.filter(r => full || !same(r, oldSources.find(x => x.key === r.key)));
    if (changedSources.length) must(await db.from("sources").upsert(changedSources, { onConflict: "user_id,key" }));
    const oldTx = new Map(before.tx.map(t => [t.id, txToRow(t, !!before.prefs.syncRaw, new Set(before.sources.map(x => x.key)))]));
    const changedTx = next.tx.map(t => txToRow(t, !!next.prefs.syncRaw, keys)).filter(t => full || !same(t, oldTx.get(t.id)));
    // Archive removed transactions before removing their source; source deletion has a cascade FK.
    const removedTx = gone("tx");
    if (removedTx.length) must(await db.from("transactions").update({ archived_at: new Date().toISOString() }).in("id", removedTx));
    if (changedTx.length) must(await db.from("transactions").upsert(changedTx));
    for (const table of ["rules", "goals"] as const) {
      const toRow = (r: any, i: number) => table === "rules"
        ? { id: r.id, kw: r.kw, cat: r.cat, own: !!r.own, sort: i }
        : { id: r.id, name: r.name, target: r.target, sort: i };
      const oldRows = before[table].map(toRow);
      const changed = next[table].map(toRow).filter(r => full || !same(r, oldRows.find(x => x.id === r.id)));
      if (changed.length) must(await db.from(table).upsert(changed));
      const removed = gone(table);
      if (removed.length) must(await db.from(table).delete().in("id", removed));
    }
    const removedSources = gone("sources", "key");
    if (removedSources.length) must(await db.from("sources").delete().in("key", removedSources));
    if (next.user && (full || !same(next.user, before.user))) {
      const u = next.user;
      must(await db.from("profiles").upsert({ name: u.name, phone: u.phone, created_at: u.createdAt, updated_at: new Date().toISOString() }));
    }
    if (full || !same(next.prefs, before.prefs)) must(await db.from("settings").upsert({ prefs: next.prefs, updated_at: new Date().toISOString() }));
  }

  return { read: cloudRead, write: cloudWrite };
}
