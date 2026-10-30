import assert from "node:assert/strict";
import { categoryLists } from "./config.ts";

const lists = categoryLists([
  { key: "food", label: "Momo runs" }, { key: "health", label: "Health", gone: true },
  { key: "salary", label: "Salary", gone: true }, { key: "c1", label: "Rent received", in: true }, { key: "c2", label: "Puja" },
]);
assert.equal(lists.out.find(c => c.key === "food")?.label, "Momo runs");
assert.equal(lists.out.find(c => c.key === "food")?.limit, 12000);
assert.ok(!lists.out.some(c => c.key === "health"));
assert.ok(lists.out.some(c => c.key === "c2") && !lists.out.some(c => c.key === "c1"));
assert.ok(lists.income.some(c => c.key === "c1") && !lists.income.some(c => c.key === "salary"));
assert.ok(lists.income.every(c => c.in));
// Deleted categories keep their label for past transactions.
assert.equal(lists.every.find(c => c.key === "health")?.label, "Health");
