/** Transport configuration consumed by the Android capture adapter. */
export type CaptureConfiguration = {
  /** Bank key → exact sender IDs explicitly selected by the user. */
  senders: Record<string, string[]>; txn: string[][];
  amount: string; remark: string; notTxn: string; wallets: string;
  packages: Record<string, string>; rules: string[]; notify: boolean;
  notification: { amount: string; ignore: string; debit: string; credit: string };
};
