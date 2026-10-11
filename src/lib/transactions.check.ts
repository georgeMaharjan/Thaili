import assert from "node:assert/strict";
import { filterEntries, flowTotals, manualEntry, spendingPatterns } from "./transactions.ts";

const accounts = [{ key: "cash", name: "Cash" }], cats = [{ key: "salary", label: "Salary" }];
const draft = { amount: "1234.50", direction: "credit", category: "salary", account: "cash", note: "Pay" };
const income = manualEntry(draft, accounts, cats, "2026-10-06T12:00:00Z", "in");
assert.equal(income.dir, "credit"); assert.equal(income.amt, 1234.5); assert.equal(income.src, "cash");
for (const amount of ["0", "-1", "NaN", "Infinity", "1.234", "1e3", "1234567890", ""]) {
  assert.throws(() => manualEntry({ ...draft, amount }, accounts, cats, income.at, "bad"));
}
assert.throws(() => manualEntry({ ...draft, account: "missing" }, accounts, cats, income.at, "bad"));
assert.throws(() => manualEntry({ ...draft, category: "food" }, accounts, cats, income.at, "bad"));
const entry = (id: string, dir: string, cat: string | null, amt: number, off = 0) => ({ id, dir, cat, amt, off, src: "cash", m: id, at: `2026-10-${6-off}T12:00:00Z` });
const entries = [entry("Coffee", "debit", "food", 100), entry("Rent", "debit", "bills", 1000), entry("Unknown", "debit", null, 20), entry("Salary", "credit", "salary", 2000), entry("Move", "transfer", null, 500), entry("Old coffee", "debit", "food", 50, 1)];
const context = { inRange: (t: typeof entries[number]) => t.off === 0, needsReview: (t: typeof entries[number]) => !t.cat && t.dir === "debit", essential: (k: string) => k === "bills", category: (k: string) => k, account: () => "Cash" };
const filters = { query: "", categories: [] as string[], spending: "all", review: false };
assert.equal(filterEntries(entries, filters, context).length, 5);
assert.deepEqual(filterEntries(entries, { ...filters, spending: "optional" }, context).map(t => t.id), ["Coffee"]);
assert.deepEqual(filterEntries(entries, { ...filters, categories: ["food", "bills"], spending: "essential", query: "1,000" }, context).map(t => t.id), ["Rent"]);
assert.equal(filterEntries(entries, { ...filters, categories: ["food"], review: true }, context).length, 0);
assert.deepEqual(filterEntries(entries, { ...filters, categories: ["uncategorised"] }, context).map(t => t.id), ["Unknown"]);
assert.deepEqual(filterEntries(entries, { ...filters, categories: ["transfer"] }, context).map(t => t.id), ["Move"]);
assert.deepEqual(flowTotals(entries), { income: 2000, expenses: 1170 });
assert.deepEqual(spendingPatterns([{ amt: 100, off: 0 }, { amt: 200, off: 0 }, { amt: 500, off: 1 }, { amt: 400, off: 2 }]), { median: 300, heaviest: [1, 500] });
assert.deepEqual(spendingPatterns([]), { median: 0, heaviest: undefined });
console.log("transactions: income/expense validation, combined filters, totals and patterns pass");
