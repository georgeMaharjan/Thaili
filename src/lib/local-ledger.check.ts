import assert from "node:assert/strict";
import { LocalLedger, emptyPouch, COLLECTIONS, mergePouches, type LedgerRecord, type Pouch, type CloudDriver } from "./local-ledger.ts";
const copy = <T>(v: T): T => structuredClone(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fixture = (): Pouch => ({
  user: { name: "Offline User", phone: "+9779800000000", createdAt: "2026-10-07T00:00:00Z" },
  sources: [{ key: "bank", name: "Bank", opening: 5000 }], roles: { bank: "spending" },
  tx: [{ id: "debit", src: "bank", amt: 100, dir: "debit", at: "2026-10-07T01:00:00Z", ch: "App" },
    { id: "credit", src: "bank", amt: 200, dir: "credit", at: "2026-10-07T02:00:00Z", ch: "SMS" }],
  rules: [{ id: "rule", kw: "SHOP", cat: "grocery" }], goals: [{ id: "goal", name: "Laptop", target: 50000 }],
  prefs: { lang: "EN", setupComplete: true, smsSince: 1, notificationSince: 2 },
});
function disk() {
  let stored: LedgerRecord | null = null;
  let fail = false;
  return {
    async read() { return copy(stored); },
    async write(record: LedgerRecord) { if (fail) throw new Error("disk full"); stored = copy(record); },
    get record() { return copy(stored); },
    set failed(v: boolean) { fail = v; },
  };
}
function cloud(seed = emptyPouch()) {
  let pouch = copy(seed);
  let failure = false;
  let reads = 0, writes = 0;
  let owner = "owner";
  const driver: CloudDriver = {
    async read() { reads++; return { pouch: copy(pouch), owner }; },
    async write(next, baseline, deleted, full) {
      writes++;
      // Model independent database operations, including a failure after partial commit.
      for (const key of COLLECTIONS) {
        const id = (row: { key?: string; id?: string }) => key === "sources" ? row.key : row.id;
        for (const row of next[key]) {
          if (!full && same(row, baseline[key].find(old => id(old) === id(row)))) continue;
          const index = pouch[key].findIndex(old => id(old) === id(row));
          if (index < 0) pouch[key].push(copy(row)); else pouch[key][index] = copy(row);
        }
        const removed = new Set([...Object.keys(deleted[key]), ...baseline[key].filter(row => !next[key].some(x => id(x) === id(row))).map(id)]);
        pouch[key] = pouch[key].filter(row => !removed.has(id(row)) || next[key].some(x => id(x) === id(row)));
      }
      if (failure) { failure = false; throw new Error("connection lost after partial commit"); }
      pouch.prefs = copy(next.prefs); pouch.roles = copy(next.roles); pouch.user = copy(next.user);
    },
  };
  return { driver, get pouch() { return copy(pouch); }, get reads() { return reads; }, get writes() { return writes; },
    set failNext(v: boolean) { failure = v; }, set owner(v: string) { owner = v; }, set remote(v: Pouch) { pouch = copy(v); } };
}
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};

// First launch, registration, edits and capture work without ever calling the server.
{
  const storage = disk(), remote = cloud();
  const ledger = new LocalLedger(storage, remote.driver);
  assert.equal(await ledger.load(), null);
  await ledger.initialize(emptyPouch());
  const data = fixture();
  await ledger.save(data);
  const restarted = new LocalLedger(storage, remote.driver);
  assert.deepEqual(await restarted.load(), data);
  assert.equal(remote.reads, 0); assert.equal(remote.writes, 0);
  assert.equal(restarted.pending, true);
  await restarted.sync();
  assert.deepEqual(remote.pouch, data); assert.equal(restarted.pending, false);
}
// Offline removals, profile, goals, rules and preferences survive reopening and sync.
{
  const storage = disk(), remote = cloud(fixture()), ledger = new LocalLedger(storage, remote.driver);
  await ledger.initialize(emptyPouch()); await ledger.sync();
  const edit = fixture(); edit.tx = edit.tx.slice(1); edit.rules = []; edit.goals = [];
  edit.user.name = "Edited offline"; edit.prefs.lang = "NP"; edit.prefs.notificationSince = 99;
  await ledger.save(edit);
  const restarted = new LocalLedger(storage, remote.driver);
  assert.deepEqual(await restarted.load(), edit);
  assert.ok(storage.record!.deleted.tx.debit);
  await restarted.sync();
  assert.deepEqual(remote.pouch, edit); assert.equal(restarted.pending, false);
  assert.deepEqual(storage.record!.deleted, { sources: {}, tx: {}, rules: {}, goals: {} });
}
// A partially uploaded new account can be removed offline even though it wasn't acknowledged.
{
  const storage = disk(), remote = cloud(fixture()), ledger = new LocalLedger(storage, remote.driver);
  await ledger.initialize(emptyPouch()); await ledger.sync();
  const withNew = fixture(); withNew.sources.push({ key: "wallet", name: "Wallet", opening: 0 }); withNew.roles.wallet = "spending";
  withNew.tx.push({ id: "wallet-debit", src: "wallet", amt: 50, dir: "debit" });
  await ledger.save(withNew); remote.failNext = true;
  await assert.rejects(ledger.sync(), /partial commit/);
  await ledger.save(fixture());
  const restarted = new LocalLedger(storage, remote.driver);
  await restarted.sync();
  assert.deepEqual(remote.pouch, fixture()); assert.equal(restarted.pending, false);
}
// Undo after a failed delete must restore live rows, including after a process restart.
{
  const storage = disk(), remote = cloud(fixture()), ledger = new LocalLedger(storage, remote.driver);
  await ledger.initialize(emptyPouch()); await ledger.sync();
  const deleted = fixture(); deleted.tx = [];
  await ledger.save(deleted); remote.failNext = true;
  await assert.rejects(ledger.sync()); assert.equal(remote.pouch.tx.length, 0);
  await ledger.save(fixture());
  const restarted = new LocalLedger(storage, remote.driver);
  await restarted.sync();
  assert.deepEqual(remote.pouch, fixture()); assert.equal(restarted.pending, false);
}
// Slow cloud loading merges edits made meanwhile and keeps untouched remote changes.
{
  const storage = disk(), remote = cloud(fixture()), initial = new LocalLedger(storage, remote.driver);
  await initial.initialize(emptyPouch()); await initial.sync();
  const newer = fixture(); newer.tx[1].amt = 800; newer.goals.push({ id: "new-goal", name: "Trip", target: 9000 }); remote.remote = newer;
  const gate = deferred(), entered = deferred();
  const ledger = new LocalLedger(storage, { ...remote.driver, async read() { entered.resolve(); await gate.promise; return remote.driver.read(); } });
  const syncing = ledger.sync(); await entered.promise;
  const edit = fixture(); edit.sources[0].opening = 6000; edit.prefs.lang = "NP";
  await ledger.save(edit); gate.resolve(); await syncing;
  const expected = copy(newer); expected.sources[0].opening = 6000; expected.prefs.lang = "NP";
  assert.deepEqual(await ledger.load(), expected); assert.deepEqual(remote.pouch, expected);
}
// A save during an upload does not wait for that upload or get acknowledged accidentally.
{
  const storage = disk(), remote = cloud(fixture()), initial = new LocalLedger(storage, remote.driver);
  await initial.initialize(emptyPouch()); await initial.sync();
  const gate = deferred(), entered = deferred(); let blocked = false;
  const ledger = new LocalLedger(storage, { ...remote.driver, async write(...args) {
    if (!blocked) { blocked = true; entered.resolve(); await gate.promise; }
    return remote.driver.write(...args);
  } });
  const first = fixture(); first.tx[0].amt = 400; await ledger.save(first);
  const syncing = ledger.sync(); await entered.promise;
  const second = copy(first); second.tx = second.tx.slice(1); second.user.name = "While syncing";
  await ledger.save(second);
  assert.deepEqual(await new LocalLedger(storage, null).load(), second);
  gate.resolve(); await syncing;
  assert.deepEqual(remote.pouch, second); assert.equal(ledger.pending, false);
}
// Existing cloud accounts replace untouched first-run defaults, rather than duplicating seeds.
{
  const storage = disk(), remote = cloud(fixture()), ledger = new LocalLedger(storage, remote.driver);
  const defaults = emptyPouch(); defaults.rules = [{ id: "fresh-seed", kw: "SHOP" }]; defaults.prefs.lang = "EN";
  await ledger.initialize(defaults); await ledger.sync();
  assert.deepEqual(await ledger.load(), fixture());
  assert.equal(remote.writes, 0);
  remote.owner = "another-owner";
  await assert.rejects(ledger.sync(), /differs/);
  assert.deepEqual(await ledger.load(), fixture());
}
// Remote account deletion cannot discard a transaction created offline meanwhile.
{
  const storage = disk(), remote = cloud(fixture()), ledger = new LocalLedger(storage, remote.driver);
  await ledger.initialize(emptyPouch()); await ledger.sync();
  const edit = fixture(); edit.tx.push({ id: "offline-new", src: "bank", amt: 75, dir: "debit" });
  await ledger.save(edit);
  const elsewhere = fixture(); elsewhere.sources = []; elsewhere.roles = {}; elsewhere.tx = []; remote.remote = elsewhere;
  await ledger.sync();
  assert.equal(remote.pouch.sources[0].key, "bank");
  assert.deepEqual(remote.pouch.tx.map(t => t.id), ["offline-new"]);
}
// A UI update accepted before disk commit must survive an incoming background refresh.
{
  const before = fixture(), incoming = fixture(), typing = fixture();
  incoming.goals.push({ id: "remote-goal", name: "Remote", target: 1000 });
  typing.tx = typing.tx.slice(1); typing.user.name = "Latest edit";
  const combined = mergePouches(incoming, before, typing, { sources: {}, tx: {}, rules: {}, goals: {} });
  assert.deepEqual(combined.tx, typing.tx); assert.equal(combined.user.name, "Latest edit");
  assert.equal(combined.goals.length, 2);
}
// Failed disk writes never replace the last durable snapshot or pretend the edit is saved.
{
  const storage = disk(), ledger = new LocalLedger(storage, null);
  await ledger.initialize(fixture()); storage.failed = true;
  const edit = fixture(); edit.user.name = "Not saved";
  await assert.rejects(ledger.save(edit), /disk full/);
  assert.deepEqual(await ledger.load(), fixture());
  storage.failed = false; await ledger.save(edit);
  assert.deepEqual(await new LocalLedger(storage, null).load(), edit);
}
console.log("local ledger: offline restarts, capture data, deletions, partial failures, undo, concurrent edits, cloud merging and disk errors pass");
