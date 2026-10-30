import type { Bs } from "../lib/bs";
import type { Goal, SplitMode } from "../lib/goals";
import type { FilingRule } from "../lib/rules";
import type { CaptureEvidence } from "../lib/transaction-capture";

/** Durable values shared by presentation, import and persistence. Dates on screen are derived. */
export type Direction = "credit" | "debit" | "transfer";
export type Channel = "SMS" | "App" | "Manual";
export type AccountRole = "spending" | "savings" | "";
export type Account = {
  key: string; name: string; base?: string; short?: string; type: string; dot: string;
  opening: number; openedAt?: string | null; acct?: string | null; packages?: string[];
};
export type Transaction = {
  id: string; m: string; amt: number; dir: Direction; src: string; to?: string | null;
  cat?: string | null; rem?: string | null; auto?: string | null; ch: Channel;
  raw?: string | null; at: string; added?: string; capture?: CaptureEvidence[];
};
export type DatedTransaction = Transaction & { off: number; time: string; bs: Bs };
export type Profile = { name: string; phone: string; createdAt: string };
// in: a money-in category; gone: deleted. customCats also holds renames/deletes of built-ins under their key.
export type Category = { key: string; label: string; limit?: number; in?: boolean; gone?: boolean };
export type Preferences = {
  picked?: string[]; customCats?: Category[]; ess?: Record<string, boolean>;
  saveTarget?: number; savingsGoal?: number; theme?: "light" | "dark"; lang?: "EN" | "NP";
  splitMode?: SplitMode; syncCell?: boolean; syncRaw?: boolean; syncAlert?: boolean;
  appLock?: boolean; notifMode?: "On" | "Off"; smsSince?: number | null;
  notificationSince?: number | null; hideBal?: boolean; setupComplete?: boolean;
  captureStartAt?: number | null;
};
export type Pouch = {
  user: Profile | null; sources: Account[]; tx: Transaction[]; rules: FilingRule[];
  goals: Goal[]; roles: Record<string, string>; prefs: Preferences;
};
