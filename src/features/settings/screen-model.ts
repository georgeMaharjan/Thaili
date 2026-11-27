import type { AppViewModel } from "../view-model";

/** Only the values and actions consumed by this feature’s screens. */
export type SettingsScreenModel = Pick<AppViewModel,
  "permissionTitle" | "permissionNote" | "permissionRows" |
  "permissionIntro" | "androidPermissionsLabel" | "openAndroidPermissions" |
  "privacyTitle" | "privacySections" | "privacyBack" |
  "numericEditingLabel" |
  "darkBg" |
  "darkFg" |
  "darkSh" |
  "densityOpts" |
  "editLabel" |
  "enBg" |
  "enFg" |
  "enSh" |
  "lightBg" |
  "lightFg" |
  "lightSh" |
  "moneyTitle" | "appTitle" | "dataTitle" |
  "npBg" |
  "npFg" |
  "npSh" |
  "prefsTitle" |
  "profBack" |
  "profCta" |
  "profCtaBg" |
  "profCtaFg" |
  "profInitials" |
  "profName" |
  "profNameBorder" |
  "profNameType" |
  "profPhone" |
  "profPhoneBorder" |
  "profPhoneHint" |
  "profPhoneHintFg" |
  "profPhoneType" |
  "profSave" |
  "profSince" |
  "profTitle" |
  "regLabels" |
  "setDark" |
  "setEn" |
  "setLight" |
  "setNp" |
  "settingRows" |
  "resetDataOpen" | "resetDataTitle" | "resetDataDescription" | "resetDataCancel" | "resetDataConfirmLabel" | "cancelResetData" | "confirmResetData" |
  "expenseGoalOpen" | "expenseGoalTitle" | "expenseGoalDescription" | "expenseGoalAmountLabel" | "expenseGoalSaveLabel" | "expenseGoalDraft" | "expenseGoalDraftType" | "expenseGoalOptions" | "cancelExpenseGoal" | "saveExpenseGoal" |
  "settingsBack" | "settingsIsTab" |
  "spacingLabel" |
  "spacingMeta" |
  "storageLine" |
  "storageProblem" |
  "storageTitle" |
  "t" |
  "toProfile" |
  "userInitials" |
  "userName" |
  "userPhone"
>;
