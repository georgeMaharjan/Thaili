import type { Bs } from "./bs";

/** Financial calculations accept ledger data, never React state or storage. */
export type Account = { key: string; opening: number; openedAt?: string | null };
export type Movement = { amt: number; dir: string; src: string; to?: string | null; at: string };
export type PeriodEntry = Movement & { bs: Bs; cat?: string | null };
export type AccountRoles = Record<string, string>;

export const paisa = (amount: number) => Math.round(amount * 100);
export const rupees = (amount: number) => amount / 100;
const keyOf = (date: Bs) => date.y * 12 + date.m;

/** History at/before an opening timestamp is already included in that opening. */
export function accountBalances(accounts: Account[], entries: Movement[]): Record<string, number> {
  const totals = new Map(accounts.map(a => [a.key, paisa(a.opening)]));
  const since = new Map(accounts.map(a => [a.key, a.openedAt ? Date.parse(a.openedAt) : 0]));
  for (const t of entries) {
    const at = Date.parse(t.at), amount = paisa(t.amt);
    if (totals.has(t.src) && at > since.get(t.src)!) {
      totals.set(t.src, totals.get(t.src)! + (t.dir === "credit" ? amount : -amount));
    }
    if (t.dir === "transfer" && t.to && totals.has(t.to) && at > since.get(t.to)!) {
      totals.set(t.to, totals.get(t.to)! + amount);
    }
  }
  return Object.fromEntries([...totals].map(([key, total]) => [key, rupees(total)]));
}

export function monthlyBudget(entries: PeriodEntry[], month: Bs, daysInMonth: number, saveTarget: number) {
  let income = 0, spent = 0;
  for (const t of entries) if (keyOf(t.bs) === keyOf(month)) {
    if (t.dir === "credit") income += paisa(t.amt);
    if (t.dir === "debit") spent += paisa(t.amt);
  }
  const free = Math.max(0, income - paisa(saveTarget));
  const remaining = free - spent;
  const daysLeft = Math.max(1, daysInMonth - month.d);
  return { income: rupees(income), spent: rupees(spent), freeToSpend: rupees(free), remaining: rupees(remaining),
    daysLeft, lastDay: month.d >= daysInMonth,
    allowance: Math.max(0, Math.round(rupees(remaining) / daysLeft / 10) * 10) };
}

/** Net money reaching savings over this and the preceding two BS months.
 * Transfers within either role cancel; withdrawals and savings expenses reduce the rate.
 * Openings are stocks, not recurring income. A nonpositive rate has no ETA. */
export function monthlySavingsRate(entries: PeriodEntry[], roles: AccountRoles, month: Bs): number {
  let net = 0;
  const savings = (key: string | null | undefined) => !!key && roles[key] === "savings";
  for (const t of entries) {
    const age = keyOf(month) - keyOf(t.bs);
    if (age < 0 || age > 2) continue;
    const amount = paisa(t.amt);
    if (t.dir === "transfer") net += amount * (Number(savings(t.to)) - Number(savings(t.src)));
    else if (savings(t.src)) net += t.dir === "credit" ? amount : -amount;
  }
  return Math.max(0, Math.round(rupees(net) / 3));
}

export function essentialMonthly(entries: PeriodEntry[], categories: string[], month: Bs): number {
  const picked = new Set(categories);
  const total = entries.reduce((sum, t) => {
    const age = keyOf(month) - keyOf(t.bs);
    return sum + (age >= 1 && age <= 3 && t.dir === "debit" && t.cat && picked.has(t.cat) ? paisa(t.amt) : 0);
  }, 0);
  return Math.round(rupees(total) / 3);
}
