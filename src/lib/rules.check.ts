import assert from "node:assert/strict";
import { words, kwFor, findRule, autoFile, checkRule, applyRule, unfileRule } from "./rules.ts";

const rules = [{ id: "first", kw: "PARA SHOPPING", cat: "shopping" }, { id: "second", kw: "SHOPPING", cat: "food" }];
const debit = { id: "tx", dir: "debit", m: "FONEPAY", rem: "QR PAYMENT-4547, PARA SHOPPING", cat: null as string | null, auto: null as string | null };
assert.equal(words(debit.rem), "QR PAYMENT 4547 PARA SHOPPING");
assert.equal(kwFor(debit), "PARA SHOPPING");
assert.equal(kwFor({ ...debit, rem: "MPAY FPQR,123456" }), null);
assert.equal(findRule(debit, rules)?.id, "first");
assert.equal(findRule({ ...debit, dir: "credit" }, rules), null);
assert.equal(autoFile(debit, rules).cat, "shopping");
assert.equal(debit.cat, null);
assert.equal(checkRule("QR PAYMENT", null, [], []).block, true);
assert.equal(checkRule("para-shopping", null, rules, []).dupId, "first");
assert.equal(checkRule("SHOPPING", "second", rules, []).warn, true);

const held = autoFile(debit, rules), manual = { ...debit, id: "manual", cat: "bills" };
const changed = { id: "first", kw: "GROCERY", cat: "grocery" };
const result = applyRule([held, manual, { ...debit, id: "new", rem: "GROCERY" }], changed, rules[0]);
assert.deepEqual(result.tx.map(t => [t.cat, t.auto]), [[null, null], ["bills", null], ["grocery", "GROCERY"]]);
assert.equal(result.filed, 1);
assert.equal(unfileRule([held, manual], rules[0])[1].cat, "bills");
assert.equal(held.cat, "shopping");
console.log("rules: priority, keyword validation, refiling and manual categories pass");
