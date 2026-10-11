import assert from "node:assert/strict";
import { accountBalances, monthlyBudget, monthlySavingsRate, essentialMonthly, type PeriodEntry } from "./finance.ts";

const month = { y: 2083, m: 5, d: 31 };
const entry = (dir: string, src: string, amt: number, to: string | null = null, age = 0): PeriodEntry => ({
  dir, src, amt, to, at: "2026-10-07T12:00:00Z", bs: { ...month, m: month.m - age }, cat: "bills",
});
const accounts = [{ key: "spend", opening: 100, openedAt: "2026-10-06T12:00:00Z" },
  { key: "save", opening: 200, openedAt: "2026-10-07T13:00:00Z" }];
const tx = [entry("transfer", "spend", 20, "save"), entry("credit", "spend", 0.1), entry("credit", "spend", 0.2),
  { ...entry("debit", "spend", 50), at: accounts[0].openedAt },
  { ...entry("debit", "spend", 70), at: "2026-10-05T12:00:00Z" }];
assert.deepEqual(accountBalances(accounts, tx), { spend: 80.3, save: 200 });
assert.deepEqual(accountBalances([], tx), {});
assert.deepEqual(accountBalances([{ key: "spend", opening: 0 }], [entry("debit", "spend", 12.34)]), { spend: -12.34 });
// A transfer changes total ownership by zero when both accounts share an opening cutoff.
const moved = accountBalances(accounts.map(a => ({ ...a, openedAt: null })), [tx[0]]);
assert.equal(moved.spend + moved.save, 300);

const budget = monthlyBudget([entry("credit", "spend", 1000), entry("debit", "spend", 100.1),
  entry("debit", "spend", 0.2), entry("transfer", "spend", 900, "save"), entry("credit", "spend", 5000, null, 1)], month, 31, 200);
assert.deepEqual(budget, { income: 1000, spent: 100.3, freeToSpend: 800, remaining: 699.7,
  daysLeft: 1, lastDay: true, allowance: 700 });
assert.equal(monthlyBudget([], month, 31, 200).allowance, 0);
assert.equal(monthlyBudget([entry("debit", "spend", 10)], month, 31, 200).remaining, -10);

const roles = { spend: "spending", other: "spending", save: "savings", save2: "savings" };
const movements = [entry("transfer", "spend", 900, "save"), entry("transfer", "save", 300, "spend", 1),
  entry("transfer", "save", 5000, "save2"), entry("transfer", "spend", 5000, "other"),
  entry("credit", "save", 150, null, 2), entry("debit", "save", 150), entry("credit", "spend", 10000),
  entry("transfer", "spend", 6000, "save", 3), entry("transfer", "spend", 6000, "save", -1)];
assert.equal(monthlySavingsRate(movements, roles, month), 200);
assert.equal(monthlySavingsRate([entry("transfer", "save", 300, "spend")], roles, month), 0);
assert.equal(monthlySavingsRate([], roles, month), 0);
assert.equal(essentialMonthly([entry("debit", "spend", 300, null, 1), entry("debit", "spend", 600, null, 3),
  entry("debit", "spend", 900), entry("credit", "spend", 900, null, 1)], ["bills"], month), 300);
console.log("finance: opening cutoffs, transfer conservation, paisa, budgets and net savings pass");
