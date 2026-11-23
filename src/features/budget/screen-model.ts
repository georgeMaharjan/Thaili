import type { AppViewModel } from "../view-model";

export type BudgetScreenModel = Pick<AppViewModel,
  "budgetBack" |
  "budgetMonth" |
  "budgetSpent" |
  "budgetAvailable" |
  "budgetOver" |
  "budgetOverspent" |
  "budgetWidth" |
  "budgetRuleTitle" |
  "budgetRuleDetail" |
  "budgetEditRule" |
  "budgetCategories" |
  "budgetTxRows" |
  "budgetTxEmpty"
>;
