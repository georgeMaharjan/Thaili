import type { AppViewModel } from "../view-model";

/** Only the values and actions consumed by this feature’s screens. */
export type SettingsScreenModel = Pick<AppViewModel,
  "permissionTitle" | "permissionNote" | "permissionRows" |
  "smsRecoverLabel" | "smsRecoverHint" | "smsCanRecover" | "recoverBankSms" |
  "privacyTitle" | "privacySections" | "privacyBack" |
  "smsAccessTitle" | "smsAccessNote" | "smsBankRows" |
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
  "manageTitle" |
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
  "settingsBack" |
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
