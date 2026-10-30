import type { AppViewModel } from "../view-model";

/** Only the values and actions consumed by this feature’s screens. */
export type AccountsScreenModel = Pick<AppViewModel,
  "newSrcAmountInput" |
  "newSrcAccountInput" |
  "newSrcInitialField" |
  "changeSourceAmount" |
  "changeSourceAccount" |
  "balanceFieldLabel" |
  "numericEditingLabel" |
  "numericEditHint" |
  "amountInputHint" |
  "accountInputHint" |
  "accountNextLabel" |
  "clearAmountLabel" |
  "clearAccountLabel" |
  "amountInputErrors" |
  "accountInputErrors" |

  "acctFieldLabel" |
  "acctGroups" |
  "acctSplit" |
  "balEyeD" |
  "balEyeLabel" |
  "balFs" |
  "enableTransactionNotifications" |
  "goalLabel" |
  "goalName" |
  "goalNote" |
  "goalWidth" |
  "isEditSrc" |
  "newSrcCreate" |
  "newSrcCta" |
  "newSrcCtaBg" |
  "newSrcCtaFg" |
  "newSrcFeedNote" |
  "newSrcKinds" |
  "newSrcNameChips" |
  "newSrcUsesPicker" |
  "newSrcName" |
  "newSrcNameOptions" |
  "pickSrcName" |
  "newSrcOpeningNote" |
  "newSrcPickLabel" |
  "newSrcRoles" |
  "pickAcctField" |
  "pickAmtField" |
  "roleChips" |
  "scanAccountApps" |
  "scanAccountAppsLabel" |
  "sourceBack" |
  "srcAcctFg" |
  "srcAcctLine" |
  "srcBalance" |
  "srcDelete" |
  "srcDeleteLabel" |
  "srcEdit" |
  "srcIn" |
  "srcMeta" |
  "srcName" |
  "srcNeedsAcct" |
  "srcNewCancel" |
  "srcNewTitle" |
  "srcOut" |
  "srcTxns" |
  "t" |
  "toGoal" |
  "toSrcNew" |
  "toggleBal" |
  "totalBal" |
  "totalMeta" |
  "transactionNotificationsLabel" |
  "transactionNotificationsNote" |
  "transactionNotificationsStatus"
>;
