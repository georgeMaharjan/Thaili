import type { AppController } from "../application/controller";
import { accountsViewModel } from "./accounts/view-model";
import { createViewContext } from "./context";
import { goalsViewModel } from "./goals/view-model";
import { homeViewModel } from "./home/view-model";
import { insightsViewModel } from "./insights/view-model";
import { onboardingViewModel } from "./onboarding/view-model";
import { settingsViewModel } from "./settings/view-model";
import { shellViewModel } from "./shell/view-model";
import { transactionsViewModel } from "./transactions/view-model";

export function createAppViewModel(app: AppController) {
  const context = createViewContext(app);
  return {
    ...onboardingViewModel(app, context),
    ...accountsViewModel(app, context),
    ...transactionsViewModel(app, context),
    ...goalsViewModel(app, context),
    ...insightsViewModel(app, context),
    ...settingsViewModel(app, context),
    ...homeViewModel(app, context),
    ...shellViewModel(app, context),
  };
}
export type AppViewModel = ReturnType<typeof createAppViewModel>;
