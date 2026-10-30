import assert from "node:assert/strict";
import { initialState } from "../application/state.ts";
import type { LedgerRecord } from "./local-ledger.ts";
import { dated } from "./bs.ts";

// Exercise the production boundary with backend configuration present: initialization,
// edits, retries, network events and reopening must all stay local and preserve data.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-key";
const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async () => { requests++; throw new Error("Unexpected cloud request"); };
const { createDeviceStore } = await import("./store.ts");
let durable: LedgerRecord | null = null;
const listeners = new Map<string, () => void>();
const storage = {
  read: async () => durable ? structuredClone(durable) : null,
  write: async (record: LedgerRecord) => { durable = structuredClone(record); },
};
const network = { online: () => true, listen(event: "online" | "offline", listener: () => void) {
  listeners.set(event, listener); return () => { listeners.delete(event); };
} };
const store = createDeviceStore(storage, network);
let status = "";
const unsubscribe = store.subscribeStore(s => { status = s.kind; });
try {
  const before = initialState();
  before.user = { name: "Fixture", phone: "+9779800000000", createdAt: "2026-10-20T00:00:00Z" };
  before.sources = [{ key: "cash", name: "Cash", type: "Manual entry", dot: "red", opening: 1000 }];
  await store.initializeStore(before);
  const after = { ...before, tx: [dated({ id: "local", src: "cash", m: "Tea", amt: 100,
    dir: "debit" as const, ch: "Manual" as const, at: "2026-10-20T00:00:00Z" })] };
  await store.save(before, after);
  await store.retrySync();
  listeners.get("offline")?.(); listeners.get("online")?.();
  await store.retrySync();
  assert.equal(status, "local"); assert.equal(requests, 0);
  store.dispose();
  // Existing ownership metadata must not block the on-device copy after this upgrade.
  const saved = durable as LedgerRecord | null;
  assert.ok(saved); saved.owner = "previous-cloud-owner"; saved.uncertain = true;
  const reopened = createDeviceStore(storage, network);
  try {
    const loaded = await reopened.load();
    assert.equal(loaded!.tx[0].id, "local"); assert.equal(loaded!.sources[0].opening, 1000);
    assert.equal(loaded!.user!.name, "Fixture");
    await reopened.initializeStore(after); await reopened.retrySync();
    assert.equal(requests, 0); assert.equal((await reopened.load())!.tx.length, 1);
  } finally { reopened.dispose(); }
} finally { unsubscribe(); store.dispose(); globalThis.fetch = originalFetch; }
console.log("device store: configured backend cannot upload; local edits and legacy-owned data survive reopening");
