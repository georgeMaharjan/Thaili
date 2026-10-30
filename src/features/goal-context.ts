import { now } from "../application/config";
import type { AppController } from "../application/controller";
import { essentialMonthly, monthlySavingsRate } from "../lib/finance";
import { allocateGoals, savingsGoal } from "../lib/goals";
import { manualEntry } from "../lib/transactions";
import type { SharedContext } from "./shared-context";

export function goalContext(app: Pick<AppController, "go">, context: Pick<SharedContext, "s" | "TODAY_BS" | "balance" | "income" | "spent" | "cats" | "incomeCats" | "isEss">) {
  const { s, TODAY_BS, balance, income, spent, cats, incomeCats, isEss } = context;
  const addCategories = s.addDir === "credit" ? incomeCats : cats;
  let entryError = "";
  try { manualEntry({ amount: s.addEntry, direction: s.addDir, category: s.addCat, account: s.addSrc, note: s.addNote }, s.sources, addCategories, now(), "validation"); }
  catch (e) { entryError = (e instanceof Error ? e.message : String(e)); }
  const isSavings = (k: string) => s.roles[k] === "savings";
  const savingsSources = s.sources.filter(x => isSavings(x.key));
  const savingsPot = savingsSources.reduce((a, x) => a + balance(x.key), 0);
  const monthlyIn = monthlySavingsRate(s.tx, s.roles, TODAY_BS);
  const { allocations: alloc, floorPct, floorShort, surplus, unallocated, claimed, fundedCount } =
    allocateGoals(s.goals, savingsPot, s.savingsGoal, monthlyIn, s.splitMode);
  const cumulativeShort = floorShort + alloc.reduce((sum, a) => sum + a.short, 0);
  const goalAmtNum = parseFloat(s.goalAmt || "0");
  let goalError = "";
  try { savingsGoal(s.goalName, s.goalAmt, "validation"); } catch (e) { goalError = (e instanceof Error ? e.message : String(e)); }
  const essCats = cats.filter(c => isEss(c.key));
  const essMonthly = essentialMonthly(s.tx, essCats.map(c => c.key), TODAY_BS);
  const baseFor = (m: number) => Math.ceil(essMonthly * m / 5000) * 5000;
  const baseDraft = parseFloat(s.baseAmt || "0");
  const kept = income - spent;
  const openBaseline = () => app.go("baseline", { baseFrom: s.screen, baseSetup: false, baseAmt: String(s.savingsGoal), baseFresh: true });
  return { addCategories, entryError, isSavings, savingsSources, savingsPot, monthlyIn, alloc, floorPct, floorShort, surplus, unallocated, claimed, fundedCount, cumulativeShort, goalAmtNum, goalError, essCats, essMonthly, baseFor, baseDraft, kept, openBaseline };
}
export type GoalContext = ReturnType<typeof goalContext>;
