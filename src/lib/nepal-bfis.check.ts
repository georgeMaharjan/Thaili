import assert from "node:assert/strict";
import { NEPAL_BFIS } from "./nepal-bfis.ts";
import { INSTITUTIONS, institutionForAccount, institutionForName } from "./institutions.ts";
import { allMoneyPackages, detectMoneyApps, rememberMoneyPackages } from "./money-apps.ts";
import { bankOf, nativeRules, parseSms } from "./sms.ts";
import { notificationInbox } from "./notification-transactions.ts";
import { importTransactions, applyImportResult } from "./import-transactions.ts";
import { SRC_KINDS } from "../application/config.ts";
import type { Account } from "../domain/models.ts";

assert.equal(new Set(NEPAL_BFIS.map(i => i.key)).size, 106);
assert.deepEqual(Object.fromEntries(["commercial", "development", "finance", "microfinance", "infrastructure", "cooperative"]
  .map(category => [category, NEPAL_BFIS.filter(i => i.category === category).length])), {
  commercial: 20, development: 17, finance: 16, microfinance: 51, infrastructure: 1, cooperative: 1,
});
// NRB Class A coverage is checked independently of the discovery catalog.
assert.deepEqual(NEPAL_BFIS.filter(i => i.category === "commercial").map(i => i.key).sort(),
  "adbl citizens everest gibl himalayan kumari laxmisunrise machhapuchchhre nabil nbl nic nimb nmb prabhu prime rbb sanima sbi scb siddhartha".split(" ").sort());
const at = Date.parse("2026-10-12T12:00:00Z"), now = new Date(at);
let sequence = 0;
for (const bfi of NEPAL_BFIS) {
  assert.equal(institutionForName(bfi.name)?.key, bfi.key, bfi.name);
  assert.ok(SRC_KINDS[0].names.includes(bfi.name), bfi.name + " must be selectable manually");
  const pkg = "np.fixture." + bfi.key; // Synthetic labels/packages, not claims about real app versions.
  const apps = detectMoneyApps([{ pkg, label: bfi.name }]);
  assert.equal(apps.length, 1, bfi.name); assert.equal(apps[0].key, bfi.key);
  const account: Account = { key: "saved-" + bfi.key, name: bfi.name, base: bfi.name, type: "Bank · SMS", acct: "4821", opening: 1000, dot: "red" };
  assert.equal(institutionForAccount(account)?.key, bfi.key);
  const remembered = rememberMoneyPackages([account], apps);
  assert.deepEqual(remembered[0].packages, [pkg]);
  const body = "Your A/C XXXX4821 has been debited by NPR 100. Remarks: SHOP. Ref: TXN10001";
  const sender = bfi.name.replace(/[\s-]/g, "");
  assert.equal(bankOf(sender), bfi.key, bfi.name + " named sender");
  assert.equal(parseSms({ sender, body, at })?.bank, bfi.key);
  const pattern = nativeRules(remembered).senders[bfi.key];
  assert.ok(new RegExp(pattern, "i").test(sender), bfi.name + " native sender");
  const inbox = notificationInbox([{ id: "push-" + bfi.key, pkg, at, body }], apps, remembered, allMoneyPackages(remembered, apps));
  assert.equal(inbox.additions.length, 0, bfi.name + " preserves manually added account");
  assert.equal(inbox.messages.length, 1);
  const context = { sources: remembered, rules: [], existing: [], now, newId: () => "fixture-" + ++sequence };
  const first = importTransactions([{ id: "sms-" + bfi.key, sender, body, at }], context);
  const combined = applyImportResult(first.tx, importTransactions(inbox.messages, { ...context, existing: first.tx }));
  assert.equal(combined.length, 1, bfi.name + " SMS + push must reconcile across reads");
  assert.deepEqual(combined[0].capture?.map(e => e.ch).sort(), ["App", "SMS"]);
  assert.equal(parseSms({ sender, body: "OTP is 123456. NPR 100 has been debited", at }), null);
}
for (const [label, key] of [["NIC Asia Laghubitta", "niclaghubitta"], ["NMB Laghubitta", "nmblaghubitta"],
  ["Global IME Laghubitta", "globallaghubitta"], ["Laxmi Laghubitta", "laxmilaghubitta"], ["Himalayan Laghubitta", "himalayanlaghubitta"],
  ["Prabhu Pay", "prabhupay"], ["Citizens Smart", "citizens"], ["Prime Smart", "prime"], ["NCBL", "rastriyasahakari"],
  ["LBBL Smart", "lumbini"], ["KBL Mobile Banking", "kumari"]]) {
  assert.equal(institutionForName(label)?.key, key, label);
}
for (const [sender, key] of [["KBL_ALERT", "kumari"], ["SBL", "siddhartha"], ["CTZNS", "citizens"], ["NIMB", "nimb"], ["RBB", "rbb"]]) {
  assert.equal(bankOf(sender), key);
}
assert.equal(bankOf("+9779800000000"), null); assert.equal(bankOf("UnknownBank"), null);
assert.equal(bankOf("PrimeOfferClub"), null); assert.equal(bankOf("Ncell"), null);
assert.deepEqual(detectMoneyApps([{ pkg: "com.example.support", label: "Support Center" },
  { pkg: "com.example.video", label: "Prime Video" }, { pkg: "com.example.calculator", label: "Finance Calculator" }]), []);
assert.equal(INSTITUTIONS.filter(i => i.kind === "wallet").length, 15);
console.log("NRB catalog: all 106 institutions, manual choices, identity separation and SMS/push capture fixtures pass");
