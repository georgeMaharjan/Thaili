import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCloudDriver } from "./cloud-store.ts";
import { snapshot, hydrated } from "./pouch.ts";
import { emptyPouch, type Deletions } from "./local-ledger.ts";

type Row = Record<string, unknown>;
type Operation = { table: string; action: string; rows?: Row[]; ids?: string[] };
const operations: Operation[] = [], pages: number[] = [];
const tables: Record<string, Row[]> = {
  sources: [{ key: "bank", name: "Bank", base: "Bank", short: "Bank", type: "Bank · SMS", dot: "red", opening: "10.50", role: "spending", acct: "4821", packages: ["np.fixture.bank"] }],
  transactions: Array.from({ length: 1201 }, (_, i) => ({ id: `t${i}`, src: "bank", merchant: "Shop", amount: "1.25", dir: "debit", channel: "App", raw: "Private alert", occurred_at: "2026-10-07T12:00:00Z" })),
  rules: [{ id: "r", kw: "SHOP", cat: "grocery", own: true }],
  goals: [{ id: "g", name: "Trip", target: "1000.50" }], settings: [{ prefs: { syncRaw: false, lang: "NP", screen: "detail" } }],
  profiles: [{ name: "User", phone: "+9779800000000", created_at: "2026-10-07T12:00:00Z" }],
};
let writeFailure = false;
const db = { from(table: string) {
  let action = "";
  return {
    select() { return this; }, order() { return this; }, is() { return this; },
    async range(from: number, to: number) {
      if (table === "transactions") pages.push(from);
      return { data: tables[table].slice(from, to + 1), error: null };
    },
    async maybeSingle() { return { data: tables[table][0] || null, error: null }; },
    async upsert(rows: Row | Row[]) {
      operations.push({ table, action: "upsert", rows: structuredClone(Array.isArray(rows) ? rows : [rows]) });
      return { data: null, error: writeFailure ? new Error("upload failed") : null };
    },
    update() { action = "archive"; return this; }, delete() { action = "delete"; return this; },
    async in(_column: string, ids: string[]) {
      operations.push({ table, action, ids });
      return { data: null, error: writeFailure ? new Error("upload failed") : null };
    },
  };
} } as unknown as SupabaseClient;
let owner: string | null = "owner";
const driver = createCloudDriver(db, async () => owner);
const remote = await driver.read();
assert.equal(remote.pouch.tx.length, 1201);
assert.deepEqual(pages, [0, 500, 1000]);
assert.equal(remote.pouch.sources[0].opening, 10.5); assert.equal(remote.pouch.goals[0].target, 1000.5);
assert.deepEqual(remote.pouch.sources[0].packages, ["np.fixture.bank"]);
assert.equal(remote.pouch.prefs.setupComplete, true); assert.equal(remote.pouch.prefs.screen, undefined);
const deletions: Deletions = { sources: {}, tx: {}, rules: {}, goals: {} };
await driver.write(remote.pouch, remote.pouch, deletions, false);
assert.equal(operations.length, 0); // Acknowledged unchanged rows need no upload.

const next = structuredClone(remote.pouch);
next.sources.push({ key: "wallet", name: "Wallet", opening: 0, acct: "9876543210" });
next.tx = [{ ...next.tx[0], dir: "transfer", to: "gone" }, { ...next.tx[1], ch: "SMS" }];
next.prefs.syncRaw = false;
next.tx[0].capture = [{ ch: "App", id: "alert", src: "bank", dir: "debit", at: next.tx[0].at, ref: "REF10001", fingerprint: "digest" }];
await driver.write(next, remote.pouch, { ...deletions, tx: { "failed-delete": 1 } }, true);
assert.equal(operations[0].table, "sources");
assert.equal(operations[0].rows?.[1].acct, "3210");
assert.deepEqual(operations[0].rows?.[0].packages, ["np.fixture.bank"]);
const archiveIndex = operations.findIndex(o => o.action === "archive");
const uploadIndex = operations.findIndex(o => o.table === "transactions" && o.action === "upsert");
assert.ok(archiveIndex >= 0 && archiveIndex < uploadIndex);
assert.ok(operations[archiveIndex].ids?.includes("failed-delete"));
assert.deepEqual(operations[uploadIndex].rows?.map(r => [r.to_src, r.raw]), [[null, null], [null, null]]);
assert.deepEqual(operations[uploadIndex].rows?.[0].capture, next.tx[0].capture);

// Privacy changes rewrite SMS and app rows even when the transactions themselves are unchanged.
operations.length = 0;
const before = structuredClone(next); before.prefs.syncRaw = true;
await driver.write(next, before, deletions, false);
assert.equal(operations.find(o => o.table === "transactions")?.rows?.length, 2);
writeFailure = true;
await assert.rejects(driver.write(next, emptyPouch(), deletions, true), /upload failed/);
writeFailure = false;
owner = "different";
await assert.rejects(driver.write(next, before, deletions, false), /account changed/);
owner = null;
await assert.rejects(driver.read(), /unavailable/);

const ui = { ...next, ...next.prefs, tx: next.tx.map(t => ({ ...t, off: 1, bs: { y: 2083, m: 5, d: 1 }, time: "12 pm" })), screen: "txns", addEntry: "draft" };
const stored = snapshot(ui);
assert.equal(stored.tx[0].raw, null); assert.equal(stored.tx[0].off, undefined);
assert.equal(stored.prefs.screen, undefined); assert.equal(stored.prefs.addEntry, undefined);
assert.equal(hydrated(stored).tx[0].bs.y > 2000, true);
console.log("cloud adapter: pagination, mappings, privacy, deletion replay, errors and owner checks pass");
