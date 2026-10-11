import assert from "node:assert/strict";
import { savingsGoal, allocateGoals, type SplitMode } from "./goals.ts";

assert.deepEqual(savingsGoal("  My studio renovation  ", "1,25,000.50", "g1"), {
  id: "g1", name: "My studio renovation", target: 125000.5,
});
assert.equal(savingsGoal("घरको लागि", "50000", "g2").name, "घरको लागि");
for (const name of ["", "   ", "a".repeat(61)]) assert.throws(() => savingsGoal(name, "100", "g"));
for (const amount of ["", "0", "-10", "NaN", "Infinity", "1.234", "1000000000", "12x"]) {
  assert.throws(() => savingsGoal("Custom goal", amount, "g"));
}
const goals = [{ id: "one", name: "One", target: 10 }, { id: "two", name: "Two", target: 20 }];
const queue = allocateGoals(goals, 120, 100, 5, "Queue");
assert.deepEqual(queue.allocations.map(a => [a.got, a.short, a.waitMonths]), [[10, 0, 0], [10, 10, 2]]);
assert.equal(queue.claimed, 20); assert.equal(queue.unallocated, 0);
const below = allocateGoals(goals, 90, 100, 5, "Queue");
assert.deepEqual(below.allocations.map(a => [a.got, a.waitMonths]), [[0, 4], [0, 8]]);
assert.equal(below.floorShort, 10);
const capped = allocateGoals(goals, 120, 100, 5, "Share");
assert.deepEqual(capped.allocations.map(a => a.got), [10, 10]);
assert.equal(capped.allocations[1].rate, 5); // Finished goals relinquish their future share.
assert.equal(allocateGoals(goals, 110, 100, 0, "Queue").allocations[1].waitMonths, null);
assert.equal(allocateGoals(goals, -10, 100, 0, "Share").floorPct, 0);
assert.equal(allocateGoals([], 120, 100, 5, "Share").unallocated, 20);
assert.deepEqual(goals, [{ id: "one", name: "One", target: 10 }, { id: "two", name: "Two", target: 20 }]);
// Both strategies preserve every paisa, cap each goal, and never overdraw surplus.
for (const mode of ["Queue", "Share"] as SplitMode[]) for (let cents = 0; cents <= 500; cents++) {
  const tiny = [{ id: "a", name: "A", target: 0.31 }, { id: "b", name: "B", target: 1.12 }, { id: "c", name: "C", target: 0.07 }];
  const result = allocateGoals(tiny, cents / 100, 0, 10, mode);
  const funded = result.allocations.reduce((sum, a) => sum + Math.round(a.got * 100), 0);
  assert.equal(funded + Math.round(result.unallocated * 100), cents);
  for (const a of result.allocations) assert.ok(a.got >= 0 && a.got <= a.g.target);
}
console.log("goals: validation, allocation strategies, conservation, floor and unknown estimates pass");
