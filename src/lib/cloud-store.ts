// Supabase adapter: schema mapping, pagination and ordered deletion/replay live here.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, Transaction } from "../domain/models";
import type { Database } from "../infrastructure/database";
import { decodePouch, decodePreferences } from "../infrastructure/hydration.ts";
import type { CloudDriver, Deletions, Pouch } from "./local-ledger";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}
const txToRow = (t: Transaction, keepRaw: boolean, keys: Set<string>) => ({
  id: t.id, src: t.src, to_src: t.dir === "transfer" && !!t.to && keys.has(t.to) ? t.to : null, merchant: t.m,
  amount: t.amt, dir: t.dir, cat: t.cat || null, remarks: t.rem || null, auto_rule: t.auto || null,
  channel: t.ch, capture: t.capture || [], raw: keepRaw || (t.ch !== "SMS" && t.ch !== "App") ? t.raw || null : null,
  occurred_at: t.at, created_at: t.added || t.at, archived_at: null,
});
const srcToRow = (x: Account, i: number, roles: Record<string, string>) => ({
  key: x.key, name: x.name, base: x.base || x.name, short: x.short || x.name, type: x.type, dot: x.dot, packages: x.packages || [],
  opening: x.opening || 0, opening_at: x.openedAt ?? null, acct: x.acct ? String(x.acct).slice(-4) : null,
  role: roles[x.key] === "savings" ? "savings" : "spending", sort: i,
});

// Page through history; the server's default row limit must not truncate a local copy.
async function rows<T>(query: () => { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }> }) {
  const all: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = must(await query().range(offset, offset + 499));
    if (!page) throw new Error("Cloud read returned no data");
    all.push(...page);
    if (page.length < 500) return all;
  }
}
export function createCloudDriver(db: SupabaseClient<Database>, ensureSession: () => Promise<string | null>): CloudDriver {
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
    const prefs = decodePreferences(settings?.prefs || {});
    // Cloud-only versions did not save setup progress. Their accounts imply completed setup.
    if (sources.length && prefs.setupComplete === undefined) prefs.setupComplete = true;
    const result = { owner, pouch: decodePouch({
      user: profile ? { name: profile.name, phone: profile.phone, createdAt: profile.created_at } : null,
      sources: sources.map(x => ({ key: x.key, name: x.name, base: x.base, short: x.short, type: x.type, dot: x.dot,
        opening: Number(x.opening), openedAt: x.opening_at, acct: x.acct, packages: x.packages || [] })),
      roles: Object.fromEntries(sources.map(x => [x.key, x.role])),
      tx: tx.map(r => ({ id: r.id, m: r.merchant, amt: Number(r.amount), dir: r.dir, src: r.src, to: r.to_src,
        cat: r.cat, rem: r.remarks, auto: r.auto_rule, ch: r.channel, capture: r.capture || [], raw: r.raw, at: r.occurred_at, added: r.created_at })),
      rules: rules.map(r => ({ id: r.id, kw: r.kw, cat: r.cat, own: r.own })),
      goals: goals.map(g => ({ id: g.id, name: g.name, target: Number(g.target) })), prefs,
    }) };
    cloudOwner = owner;
    return result;
  }
  async function cloudWrite(next: Pouch, before: Pouch, deleted: Deletions, full: boolean) {
    const owner = await ensureSession();
    if (!owner) throw new Error("Cloud connection unavailable");
    if (owner !== cloudOwner) throw new Error("Cloud account changed during sync");
    const keys = new Set(next.sources.map(x => x.key));
    const rowId = (row: { key: string } | { id: string }) => "key" in row ? row.key : row.id;
    const gone = (key: keyof Deletions) => {
      const retained = new Set(next[key].map(rowId));
      return [...new Set([...Object.keys(deleted[key]), ...before[key].map(rowId)])]
        .filter(id => !retained.has(id));
    };
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
    const ruleToRow = (r: Pouch["rules"][number], i: number) => ({ id: r.id, kw: r.kw, cat: r.cat, own: !!r.own, sort: i });
    const goalToRow = (g: Pouch["goals"][number], i: number) => ({ id: g.id, name: g.name, target: g.target, sort: i });
    const oldRules = before.rules.map(ruleToRow), oldGoals = before.goals.map(goalToRow);
    const changedRules = next.rules.map(ruleToRow).filter(r => full || !same(r, oldRules.find(x => x.id === r.id)));
    const changedGoals = next.goals.map(goalToRow).filter(g => full || !same(g, oldGoals.find(x => x.id === g.id)));
    if (changedRules.length) must(await db.from("rules").upsert(changedRules));
    const removedRules = gone("rules");
    if (removedRules.length) must(await db.from("rules").delete().in("id", removedRules));
    if (changedGoals.length) must(await db.from("goals").upsert(changedGoals));
    const removedGoals = gone("goals");
    if (removedGoals.length) must(await db.from("goals").delete().in("id", removedGoals));
    const removedSources = gone("sources");
    if (removedSources.length) must(await db.from("sources").delete().in("key", removedSources));
    if (next.user && (full || !same(next.user, before.user))) {
      const u = next.user;
      must(await db.from("profiles").upsert({ name: u.name, phone: u.phone, created_at: u.createdAt, updated_at: new Date().toISOString() }));
    }
    if (full || !same(next.prefs, before.prefs)) must(await db.from("settings").upsert({ prefs: next.prefs, updated_at: new Date().toISOString() }));
  }

  return { read: cloudRead, write: cloudWrite };
}
