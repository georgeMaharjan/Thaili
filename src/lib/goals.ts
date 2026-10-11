import { paisa, rupees } from "./finance.ts";

export type Goal = { id: string; name: string; target: number };
export type SplitMode = "Queue" | "Share";
export type GoalAllocation = { g: Goal; w: number; got: number; short: number; rate: number; waitMonths: number | null; sharePct: number };
type AllocationStrategy = (targets: number[], pool: number) => number[];

const queue: AllocationStrategy = (targets, pool) => targets.map(target => {
  const got = Math.min(target, pool);
  pool -= got;
  return got;
});

// Work in integer paisa. Remainders and capped shares spill in priority order.
const share: AllocationStrategy = (targets, pool) => {
  const weight = targets.reduce((sum, _, i) => sum + targets.length - i, 0) || 1;
  const allocated = targets.map((target, i) => Math.min(target, Math.floor(pool * (targets.length - i) / weight)));
  let spill = pool - allocated.reduce((sum, got) => sum + got, 0);
  return allocated.map((got, i) => {
    const take = Math.min(targets[i] - got, spill);
    spill -= take;
    return got + take;
  });
};

const strategies: Record<SplitMode, AllocationStrategy> = { Queue: queue, Share: share };

/** The baseline is reserved before either strategy can fund a goal.
 * A null waitMonths means there is no positive observed savings rate. */
export function allocateGoals(goals: Goal[], savings: number, baseline: number, monthlyRate: number, mode: SplitMode) {
  const floorShort = Math.max(0, paisa(baseline) - paisa(savings));
  const surplus = Math.max(0, paisa(savings) - paisa(baseline));
  const targets = goals.map(g => paisa(g.target));
  const got = strategies[mode](targets, surplus);
  const weight = goals.reduce((sum, _, i) => sum + goals.length - i, 0) || 1;
  const liveWeight = goals.reduce((sum, _, i) => sum + (got[i] < targets[i] ? goals.length - i : 0), 0) || 1;
  let cumulative = floorShort;
  const rate = Math.max(0, monthlyRate);
  const floorMonths = rate > 0 ? Math.ceil(rupees(floorShort) / rate) : null;
  const allocations: GoalAllocation[] = goals.map((g, i) => {
    const short = targets[i] - got[i], w = goals.length - i;
    cumulative += short;
    const goalRate = mode === "Share" ? rate * w / liveWeight : rate;
    const waitMonths = !short ? 0 : !goalRate ? null : mode === "Share"
      ? floorMonths! + Math.ceil(rupees(short) / goalRate)
      : Math.ceil(rupees(cumulative) / goalRate);
    return { g, w, got: rupees(got[i]), short: rupees(short), rate: goalRate, waitMonths,
      sharePct: Math.round(w / weight * 100) };
  });
  const claimed = got.reduce((sum, amount) => sum + amount, 0);
  return { allocations, floorShort: rupees(floorShort), surplus: rupees(surplus),
    floorPct: Math.max(0, Math.min(100, Math.round(savings / Math.max(baseline, 1) * 100))),
    unallocated: rupees(surplus - claimed), claimed: rupees(claimed),
    fundedCount: allocations.filter(a => a.short === 0).length };
}

/** A goal is user-named; no preset is required to save it. */
export function savingsGoal(name: string, amount: string, id: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) throw new Error("Enter a goal name of up to 60 characters.");
  const value = amount.trim().replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
    throw new Error("Enter a target greater than zero, with up to two decimal places.");
  }
  return { id, name: trimmed, target: Number(value) };
}
