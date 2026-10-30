import assert from "node:assert/strict";
import { INSTITUTIONS } from "./institutions.ts";
import { allMoneyPackages, detectMoneyApps } from "./money-apps.ts";
import { notificationInbox } from "./notification-transactions.ts";
import { nativeRules, parseSms, sourceFor } from "./sms.ts";
import { importTransactions, applyImportResult, type CapturedMessage } from "./import-transactions.ts";
import { snapshot, hydrated } from "./pouch.ts";
import { emptyPouch, LocalLedger, type LedgerRecord } from "./local-ledger.ts";
import { accountBalances } from "./finance.ts";
import type { Account, DatedTransaction } from "../domain/models";

const now = new Date("2026-10-11T12:00:00Z"), at = now.getTime();
const sources: Account[] = [{ key: "manual-bank", name: "Nabil Bank", base: "Nabil Bank", acct: "4821", opening: 1000, dot: "red", type: "Bank · SMS" },
  { key: "other-bank", name: "Nabil Bank", base: "Nabil Bank", acct: "1234", opening: 0, dot: "red", type: "Bank · SMS" },
  { key: "esewa", name: "eSewa", acct: null, opening: 0, dot: "blue", type: "Wallet · notifications" }];
let sequence = 0;
const run = (messages: CapturedMessage[], existing: DatedTransaction[] = []) => importTransactions(messages, {
  sources, existing, rules: [], now, newId: () => `generated-${++sequence}`,
});
const sms = (id: string, ref = "TXN10001", time = at): CapturedMessage => ({ id, sender: "NABIL", at: time,
  body: `NPR 100 has been debited from A/C XXXX4821. Remarks: SHOP.${ref ? " Ref: " + ref : ""}` });
const app = (id: string, ref = "TXN10001", time = at): CapturedMessage => ({ id, ch: "App", bank: "nabil", at: time,
  body: `Account XXXX4821 was debited NPR 100. Merchant: SHOP.${ref ? " Ref: " + ref : ""}` });
const commit = (messages: CapturedMessage[], existing: DatedTransaction[] = []) => applyImportResult(existing, run(messages, existing));

// Every explicit label has a fixture; only truly installed apps are returned.
const detected = detectMoneyApps(INSTITUTIONS.map(i => ({ pkg: `np.fixture.${i.key}`, label: i.name })));
assert.equal(detected.length, INSTITUTIONS.length);
for (const i of INSTITUTIONS) assert.equal(detected.find(a => a.key === i.key)?.kind, i.kind, i.name);
assert.equal(detectMoneyApps([{ pkg: "np.fixture.prabhupay", label: "Prabhu Pay" }])[0].kind, "wallet");
assert.equal(Object.keys(nativeRules(sources).senders).includes("nabil"), true);
assert.equal(Object.keys(nativeRules([{ ...sources[0], type: "Manual entry" }]).senders).length, 0);
assert.equal(parseSms({ sender: "NABIL", body: "रु १०० भुक्तानी भयो", at })?.amt, 100);
for (const body of ["NPR 100 has been debited. Payment failed", "NPR 100 has been credited. OTP is 123456"]) {
  assert.equal(parseSms({ sender: "NABIL", body, at }), null);
}

const knownApps = detectMoneyApps([{ pkg: "com.f1soft.nabilmbank", label: "Nabil" }]);
const inbox = notificationInbox([{ id: "bank-note", pkg: knownApps[0].packages[0], body: app("note").body, at }],
  knownApps, sources, allMoneyPackages(sources, knownApps));
assert.equal(inbox.messages[0].bank, "nabil");
assert.equal(run(inbox.messages).tx[0].src, "manual-bank");
const secondAccount = run([{ ...app("second"), body: app("second").body.replace("4821", "1234") }]);
assert.equal(secondAccount.tx[0].src, "other-bank");
assert.equal(run([{ ...app("ambiguous"), body: "NPR 100 was debited" }]).orphans, 1);
assert.equal(sourceFor(parseSms({ sender: "NABIL", body: sms("s").body, at })!, [sources[0], { ...sources[0], key: "duplicate-tail" }]), null);

// Either order and separate reads produce one debit, with both capture channels.
for (const messages of [[sms("s"), app("a")], [app("a"), sms("s")]]) {
  const together = commit(messages);
  assert.equal(together.length, 1);
  assert.deepEqual(new Set(together[0].capture?.map(e => e.ch)), new Set(["SMS", "App"]));
  let separate = commit([messages[0]]);
  separate = commit([messages[1]], separate);
  assert.equal(separate.length, 1);
  assert.equal(accountBalances(sources, separate)["manual-bank"], 900);
  assert.equal(commit(messages, separate).length, 1); // Both identities survive replay.
}
const delayed = commit([app("late", "TXN10001", at + 30 * 60000)], commit([sms("first")]));
assert.equal(delayed.length, 1);
assert.equal(commit([app("different", "TXN10002")], delayed).length, 2);
assert.equal(commit([sms("debit"), { ...app("refund"), body: "Account XXXX4821 credited NPR 100. Ref: TXN10001" }]).length, 2);
assert.equal(commit([app("a", ""), app("b", "")]).length, 2);
assert.equal(commit([sms("a", ""), sms("b", "")]).length, 2);
assert.equal(commit([sms("a", ""), sms("b", ""), app("c", ""), app("d", "")]).length, 2);
assert.equal(commit([sms("s", ""), { ...app("a", ""), body: "Account XXXX4821 debited NPR 100. Merchant: DIFFERENT SHOP" }]).length, 2);
assert.equal(commit([{ ...sms("rails", ""), body: "NPR 100 has been debited from A/C XXXX4821. Remarks: MPAY FPQR,123456" }, app("merchant", "")]).length, 1);
const manual: DatedTransaction = { off: 0, time: "12 pm", bs: { y: 2083, m: 5, d: 25 }, m: "Manual", id: "hand", src: "manual-bank", amt: 100, at: now.toISOString(), dir: "debit", ch: "Manual" };
assert.equal(commit([sms("real")], [manual]).length, 2);

// Minimal matching evidence survives raw retention off, disk restart and a later alert.
const first = commit([sms("offline")]);
let record: LedgerRecord | null = null;
const disk = { async read() { return structuredClone(record); }, async write(r: LedgerRecord) { record = structuredClone(r); } };
const ledger = new LocalLedger(disk, null), pouch = emptyPouch();
pouch.sources = sources; pouch.tx = first; pouch.prefs.syncRaw = false;
const saved = snapshot({ ...pouch, syncRaw: false });
assert.equal(saved.tx[0].raw, null); assert.equal(saved.tx[0].capture![0].ref, "TXN10001");
await ledger.save(saved);
const reopened = hydrated((await new LocalLedger(disk, null).load())!);
assert.equal(commit([app("after-restart", "TXN10001", at + 30 * 60000)], reopened.tx).length, 1);

// Identified bank → wallet loads are stored once even across separate capture reads.
const load: CapturedMessage = { ...sms("load", "LOAD1001"), body: "NPR 500 has been debited from A/C XXXX4821. Remarks: eSewa Load. Ref: LOAD1001" };
const wallet: CapturedMessage = { id: "wallet-credit", ch: "App", bank: "esewa", body: "You received Rs 500. Ref: WALLET1001", at };
for (const messages of [[load, wallet], [wallet, load]]) {
  const initial = commit([messages[0]]), combined = commit([messages[1]], initial);
  assert.equal(combined.length, 1); assert.equal(combined[0].dir, "transfer");
  assert.equal(combined[0].capture?.length, 2);
  assert.equal(accountBalances(sources, combined).esewa, 500);
  assert.equal(commit(messages, combined).length, 1);
}
assert.equal(commit([load], [{ ...manual, src: "esewa", dir: "credit", amt: 500 }]).length, 2);
console.log("capture integration: institution catalog, accounts, SMS/push orders, delays, replay, raw-off restart and wallet transfers pass");
