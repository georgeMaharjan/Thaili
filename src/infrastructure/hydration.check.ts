import assert from "node:assert/strict";
import { decodeLedgerRecord, decodePreferences } from "./hydration.ts";
import { LocalLedger, emptyPouch } from "../lib/local-ledger.ts";
import { accountBalances } from "../lib/finance.ts";
const legacy = {
  ...emptyPouch(), sources: [{ key: "cash", name: "Cash", opening: 1000 }],
  tx: [{ id: "expense", m: "Shop", src: "cash", amt: 100, dir: "debit", ch: "Manual", at: "2026-10-11T12:00:00Z" }],
  prefs: { lang: "NP", syncRaw: false, screen: "detail" }
};
const record = { version: 1, snapshot: legacy, baseline: legacy, deleted: { sources: {}, tx: { removed: 2 }, rules: {}, goals: {} }, revision: 3, owner: "fixture", uncertain: true };
const migrated = decodeLedgerRecord(record)!;
assert.equal(migrated.snapshot.sources[0].type, "Manual entry"); assert.deepEqual(migrated.snapshot.sources[0].packages, []);
assert.deepEqual(migrated.snapshot.tx[0].capture, []); assert.equal(accountBalances(migrated.snapshot.sources, migrated.snapshot.tx).cash, 900);
assert.equal(migrated.deleted.tx.removed, 2); assert.equal(migrated.uncertain, true); assert.equal(migrated.owner, "fixture");
assert.equal("screen" in migrated.snapshot.prefs, false); assert.equal(decodeLedgerRecord(null), null);
assert.throws(() => decodeLedgerRecord({ ...record, version: 2 }), /Unsupported/);
assert.throws(() => decodePreferences({ picked: "food" }), /Invalid/);
assert.throws(() => decodeLedgerRecord({ ...record, snapshot: { ...legacy, tx: [{ ...legacy.tx[0], amt: "100" }] } }), /amount/);
let writes = 0;
const failed = new LocalLedger({ async read() { return decodeLedgerRecord({ ...record, version: 2 }); }, async write() { writes++; } }, null);
await assert.rejects(failed.load(), /Unsupported/); await assert.rejects(failed.initialize(emptyPouch()), /Unsupported/);
assert.equal(writes, 0); // A rejected read must never replace the existing record.
console.log("hydration: legacy defaults, balances, replay metadata and rejected-read protection pass");
