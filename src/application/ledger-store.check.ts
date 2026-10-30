import assert from "node:assert/strict";
import { createLedgerStore, type StoreStatus } from "./ledger-store.ts";
import { initialState } from "./state.ts";
import { LocalLedger, emptyPouch, type LedgerRecord } from "../lib/local-ledger.ts";
let record: LedgerRecord | null = null, online = false, writes = 0;
const handlers = new Map<string, () => void>();
const ledger = new LocalLedger({ async read() { return structuredClone(record); }, async write(value) { record = structuredClone(value); } }, {
  async read() { return { owner: "fixture", pouch: emptyPouch() }; }, async write() { writes++; },
});
const store = createLedgerStore(ledger, true, { online: () => online, listen(event, fn) { handlers.set(event, fn); return () => { handlers.delete(event); }; } });
let status: StoreStatus = { kind: "local", pending: false };
store.subscribeStore(next => { status = next; });
const before = initialState(); await store.initializeStore(before); await store.retrySync();
assert.equal(status.kind, "offline"); assert.equal(writes, 0);
const next = { ...before, user: { name: "Fixture", phone: "+9779800000000", createdAt: new Date().toISOString() } };
await store.save(before, next); assert.equal((await store.load())!.user!.name, "Fixture");
online = true; await store.retrySync(); assert.equal(status.kind, "synced"); assert.equal(writes, 1);
assert.equal(handlers.size, 2); store.dispose(); assert.equal(handlers.size, 0);
await assert.rejects(store.save(next, before), /disposed/);
// A second store has independent subscribers and lifecycle.
const second = createLedgerStore(new LocalLedger({ async read() { return null; }, async write() { } }, null), false,
  { online: () => false, listen() { return () => { }; } });
await second.initializeStore(before); assert.equal(await second.load() !== null, true); second.dispose();
console.log("ledger store: offline save, online retry, isolated stores and listener cleanup pass");
