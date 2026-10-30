import { newId } from "../../application/config";
import type { AppController } from "../../application/controller";
import { balRs, rs } from "../../lib/format";
import { savingsGoal } from "../../lib/goals";
import type { ViewContext } from "../context";

export function goalsViewModel(app: Pick<AppController, "go" | "moveGoal" | "patch" | "flash" | "back" | "creatingGoal" | "stack" | "popping">, context: Pick<ViewContext, "s" | "chip" | "savingsSources" | "savingsPot" | "monthlyIn" | "alloc" | "floorPct" | "floorShort" | "surplus" | "unallocated" | "cumulativeShort" | "goalAmtNum" | "goalError">) {
  const { s, chip, savingsSources, savingsPot, monthlyIn, alloc, floorPct, floorShort, surplus, unallocated, cumulativeShort, goalAmtNum, goalError } = context;
  return {
    goalsBack: () => app.go(s.goalsFrom || "home"),
    goalCards: alloc.map((a, i) => {
      const g = a.g, done = a.short === 0;
      const pct = Math.round(a.got / Math.max(g.target, 1) * 100);
      return {
        name: g.name, rank: "#" + (i + 1), got: rs(a.got), target: rs(g.target), width: pct + "%",
        bar: done ? "var(--pos)" : pct > 0 ? "var(--warn)" : "var(--barDim)",
        pace: done ? "Reached" : pct > 0 ? "Part-funded" : "Waiting",
        paceFg: done ? "var(--pos)" : pct > 0 ? "var(--warn)" : "var(--ink3)",
        by: done ? "Covered by the surplus" : rs(a.short) + " short",
        need: done ? "Ready to spend"
          : a.waitMonths === null ? "Not enough savings history to estimate"
            : "About " + a.waitMonths + (a.waitMonths === 1 ? " month" : " months") + " at " + rs(Math.round(a.rate)) + "/mo"
            + (floorShort > 0 && s.splitMode === "Queue" && i > 0 ? ", after the floor and the goals above it"
              : floorShort > 0 ? ", after clearing the floor"
                : s.splitMode === "Queue" && i > 0 ? ", after the goals above it" : ""),
        shareBadge: s.splitMode === "Share" ? (a.sharePct || 0) + "% share" : i === 0 ? "Funds first" : "After #" + i,
        upFg: i === 0 ? "var(--barDim)" : "var(--ink2)",
        downFg: i === alloc.length - 1 ? "var(--barDim)" : "var(--ink2)",
        up: () => app.moveGoal(i, -1),
        down: () => app.moveGoal(i, 1),
        remove: () => {
          const prev = s.goals;
          app.patch({ goals: prev.filter(x => x.id !== g.id) });
          app.flash(g.name + " deleted", { goals: prev });
        }
      };
    }),
    splitModes: (["Queue", "Share"] as const).map(m => ({
      label: m === "Queue" ? "Top of the line first" : "Split down the line",
      bg: s.splitMode === m ? "var(--navy)" : "transparent",
      fg: s.splitMode === m ? "var(--canvas)" : "var(--ink2)",
      tap: () => app.patch({ splitMode: m })
    })),
    savingsFrom: "From " + savingsSources.map(x => x.short).join(", "),
    savingsPotLabel: balRs(savingsPot),
    savingsGoalLabel: rs(s.savingsGoal),
    floorWidth: floorPct + "%",
    floorBar: surplus > 0 ? "var(--pos)" : "var(--warn)",
    floorState: surplus > 0 ? "Floor reached" : rs(floorShort) + " to go",
    floorStateFg: surplus > 0 ? "var(--pos)" : "var(--warn)",
    savingsUp: () => app.patch({ savingsGoal: s.savingsGoal + 10000 }),
    savingsDown: () => app.patch({ savingsGoal: Math.max(10000, s.savingsGoal - 10000) }),
    hasSurplus: surplus > 0,
    surplusLabel: rs(surplus),
    surplusFreeLabel: unallocated > 0 ? rs(unallocated) + " unclaimed" : "Fully claimed",
    surplusSegments: alloc.filter(a => a.got > 0).map(a => ({
      name: a.g.name, amount: rs(a.got),
      width: Math.round(a.got / Math.max(surplus, 1) * 100) + "%",
      color: a.short === 0 ? "var(--pos)" : "var(--warn)"
    })),
    goalCancel: app.back,
    goalDraftName: s.goalName,
    goalNameType: (e: { target: { value: string } }) => app.patch({ goalName: e.target.value.slice(0, 60), goalError: "" }),
    goalAmount: s.goalAmt,
    goalAmountType: (e: { target: { value: string } }) => { const value = e.target.value.replace(/,/g, ""); if (/^\d{0,9}(\.\d{0,2})?$/.test(value)) app.patch({ goalAmt: value, goalError: "" }); },
    goalReady: !goalError,
    goalError: s.goalError,
    goalNeedLine: !goalAmtNum
      ? "Type the full amount. Thaili checks it against the surplus you already have."
      : goalAmtNum <= unallocated
        ? "Covered right now — " + rs(unallocated) + " of surplus is unclaimed, so this is reached the moment you create it."
        : !monthlyIn ? "Not enough savings history to estimate when this goal will be funded."
          : (s.goalPos === "top" ? "Goes to the top — paid before every goal below it. About " + Math.ceil((floorShort + goalAmtNum - unallocated) / monthlyIn) : "Goes to the back of the line. About " + Math.ceil((cumulativeShort + goalAmtNum - unallocated) / monthlyIn)) + " months at " + rs(monthlyIn) + "/mo before the surplus reaches it.",
    goalPosChips: [["top", "Fund first"], ["bottom", "After existing goals"]].map(p => chip(p[1], s.goalPos === p[0], () => app.patch({ goalPos: p[0] }))),
    goalCreate: () => {
      if (app.creatingGoal) return;
      try {
        const goal = savingsGoal(s.goalName, s.goalAmt, newId());
        const prev = s.goals;
        app.creatingGoal = true;
        // Creation replaces the form: Back from Goals must not reopen a saved draft.
        app.stack = app.stack.filter(screen => screen !== "goal-new" && screen !== "goals");
        app.popping = true;
        app.patch({
          goals: s.goalPos === "top" ? [goal].concat(prev) : prev.concat([goal]),
          screen: "goals", goalAmt: "", goalName: "", goalError: ""
        }, () => {
          app.creatingGoal = false;
          app.flash(goal.name + (goal.target <= unallocated ? " created — already covered" : " created · " + rs(goal.target - unallocated) + " short for now"), { goals: prev });
        });
      } catch (e) { app.patch({ goalError: (e instanceof Error ? e.message : String(e)) }); }
    }
  };
}
