import type { AppController } from "../../application/controller";
import { rs } from "../../lib/format";
import type { ViewContext } from "../context";

export function budgetViewModel(app: Pick<AppController, "back" | "go">, context: Pick<ViewContext,
  "s" | "MONTH_EN" | "MONTH_NP" | "TODAY_BS" | "income" | "spent" | "freeToSpend" | "remaining" | "overspent" | "targetPctNum" | "inMonth" | "clabel" | "txCard" | "dayMeta">) {
  const { s, MONTH_EN, MONTH_NP, TODAY_BS, income, spent, freeToSpend, remaining, overspent, targetPctNum, inMonth, clabel, txCard, dayMeta } = context;
  const expenses = s.tx.filter(t => t.dir === "debit" && inMonth(t)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const categoryTotals = new Map<string, { amount: number; count: number }>();
  expenses.forEach(t => {
    const key = t.cat || "uncategorised";
    const row = categoryTotals.get(key) || { amount: 0, count: 0 };
    row.amount += t.amt;
    row.count++;
    categoryTotals.set(key, row);
  });
  const budgetCategories = [...categoryTotals].map(([key, values]) => ({
    key, label: key === "uncategorised" ? "Uncategorised" : clabel(key),
    amount: rs(values.amount), count: values.count + (values.count === 1 ? " transaction" : " transactions")
  })).sort((a, b) => {
    const amountA = categoryTotals.get(a.key)?.amount || 0;
    const amountB = categoryTotals.get(b.key)?.amount || 0;
    return amountB - amountA;
  });
  const ruleSet = s.expenseGoalSet;
  const ruleMode = ruleSet ? s.expenseGoalMode : "amount";
  const ruleValue = ruleSet ? s.expenseGoalValue : freeToSpend;
  const ruleTitle = ruleSet
    ? ruleMode === "percent" ? ruleValue + "% of monthly income" : "Fixed monthly budget"
    : "Income after monthly savings target";
  const ruleDetail = ruleSet
    ? ruleMode === "percent"
      ? ruleValue + "% × " + rs(income) + " income = " + rs(freeToSpend) + " budget"
      : "Set amount: " + rs(ruleValue) + " per month"
    : rs(income) + " income − " + rs(s.saveTarget) + " savings target = " + rs(freeToSpend) + " budget";

  return {
    budgetBack: app.back,
    budgetMonth: (s.lang === "NP" ? MONTH_NP : MONTH_EN) + " " + TODAY_BS.y,
    budgetSpent: rs(spent),
    budgetAvailable: rs(Math.max(0, remaining)),
    budgetOver: overspent > 0,
    budgetOverspent: rs(overspent),
    budgetWidth: Math.min(100, targetPctNum) + "%",
    budgetRuleTitle: ruleTitle,
    budgetRuleDetail: ruleDetail,
    budgetEditRule: () => app.go("settings", {
      settingsFrom: "budget", expenseGoalOpen: true, expenseGoalDraftMode: ruleMode,
      expenseGoalDraft: String(ruleValue)
    }),
    budgetCategories,
    budgetTxRows: expenses.map(txCard("budget", dayMeta)),
    budgetTxEmpty: expenses.length === 0
  };
}
