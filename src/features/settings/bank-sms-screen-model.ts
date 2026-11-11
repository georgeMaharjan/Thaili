import type { AppViewModel } from "../view-model";

/** Bank selection, Android SMS access and history recovery belong to this screen. */
export type BankSmsScreenModel = Pick<AppViewModel,
  "bankSmsBack" | "smsPermissionTitle" | "smsPermissionOn" | "smsPermissionState" |
  "smsPermissionNote" | "smsPermissionAction" | "manageSmsPermission" |
  "smsRecoverTitle" | "smsRecoverLabel" | "smsRecoverHint" | "smsCanRecover" | "recoverBankSms" |
  "smsAccessTitle" | "smsBanksTitle" | "smsAccessNote" | "smsBankRows" |
  "smsAccessIntro" | "smsAccessDetailsLabel" | "smsBankCount" |
  "smsEmptyTitle" | "smsEmptyNote" | "smsAccountsLabel" | "openSmsAccounts"
>;
