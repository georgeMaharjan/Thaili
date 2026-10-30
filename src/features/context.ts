import type { AppController } from "../application/controller";
import { budgetContext } from "./budget-context";
import { goalContext } from "./goal-context";
import { insightContext } from "./insight-context";
import { setupContext } from "./setup-context";
import { sharedContext } from "./shared-context";
import { transactionContext } from "./transaction-context";

// Private composition of feature selectors. Screens receive only their feature's typed model.
export function createViewContext(app: AppController) {
  const shared = sharedContext(app);
  const goals = goalContext(app, shared);
  return {
    ...shared, ...transactionContext(app, shared), ...insightContext(app, shared), ...goals,
    ...setupContext(app, { ...shared, ...goals }), ...budgetContext(app, shared)
  };
}
export type ViewContext = ReturnType<typeof createViewContext>;
