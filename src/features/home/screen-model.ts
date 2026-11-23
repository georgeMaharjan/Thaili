import type { AppViewModel } from "../view-model";

/** Only the values and actions consumed by this feature’s screens. */
export type HomeScreenModel = Pick<AppViewModel,
  "addAccount" |
  "addAccountSet" |
  "addAccounts" |
  "addAmount" |
  "addAmountType" |
  "addCancel" |
  "addCategory" |
  "addCategoryOptions" |
  "addCategoryNew" |
  "addCategorySet" |
  "addCta" |
  "addDateLabel" |
  "addDirection" |
  "addDirectionSet" |
  "addError" |
  "addNote" |
  "addNoteType" |
  "addReady" |
  "balEyeD" |
  "balEyeLabel" |
  "bsMonth" |
  "cardAmount" |
  "cardCats" |
  "cardMerchant" |
  "cardMeta" |
  "cardOpen" |
  "cardSkip" |
  "commitAdd" |
  "floorLine" |
  "floorPending" |
  "hasReview" |
  "showReviewBanner" |
  "dismissReviewBanner" |
  "haveLabel" |
  "haveMeta" |
  "homeSavingsTarget" |
  "homeBudgetAvailable" |
  "homeBudgetUsed" |
  "homeBudgetOver" |
  "homeBudgetOverAmount" |
  "homeBudgetWidth" |
  "homeBudgetRule" |
  "homeSpentCompact" |
  "homeSavingsTotal" |
  "homeGoals" |
  "noGoals" |
  "recent" |
  "reviewCount" |
  "stackDone" |
  "stackExit" |
  "stackHasCard" |
  "stackProgress" |
  "refreshTransactions" |
  "t" |
  "toAccounts" |
  "toBudget" |
  "toGoal" |
  "toGoalNew" |
  "toReviewStack" |
  "toTxns" |
  "toggleBal" |
  "totalBal"
>;
