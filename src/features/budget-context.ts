import type { AppController } from "../application/controller";
import type { SharedContext } from "./shared-context";

export function budgetContext(app: Pick<AppController, never>, context: Pick<SharedContext, "DAY_OF_MONTH" | "DAYS_IN_MONTH" | "spent" | "freeToSpend">) {
  const { DAY_OF_MONTH, DAYS_IN_MONTH, spent, freeToSpend } = context;
  const targetPctNum = freeToSpend ? Math.round(spent / freeToSpend * 100) : (spent ? 100 : 0);
  const pacePctNum = Math.round(DAY_OF_MONTH / DAYS_IN_MONTH * 100);
  const segBg = (on: boolean) => on ? "var(--surface)" : "transparent";
  const segFg = (on: boolean) => on ? "var(--ink)" : "var(--ink2)";
  const segSh = (on: boolean) => on ? "0 1px 2px rgba(0,0,0,.08)" : "none";
  return { targetPctNum, pacePctNum, segBg, segFg, segSh };
}
export type BudgetContext = ReturnType<typeof budgetContext>;
