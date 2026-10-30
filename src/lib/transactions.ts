import type { Transaction } from "../domain/models";
/** Shared rules for manual entry and the transaction filters. Amounts are always
 * positive; direction alone determines whether an account gains or loses money. */
export type Entry = { amt: number; dir: string; cat?: string | null; src: string; m: string; rem?: string | null; off: number; at: string };
export type Filters = { query: string; categories: string[]; spending: string; review: boolean };

export function filterEntries<T extends Entry>(entries: T[], filters: Filters, context: {
  inRange: (t: T) => boolean; needsReview: (t: T) => boolean;
  essential: (key: string) => boolean; category: (key: string) => string; account: (key: string) => string;
}): T[] {
  const query = filters.query.trim().toLowerCase().replace(/,/g, "");
  return entries.filter(t => context.inRange(t)
    && (!filters.review || context.needsReview(t))
    && (!filters.categories.length || filters.categories.includes(t.dir === "transfer" ? "transfer" : t.cat || "uncategorised"))
    && (filters.spending === "all" || t.dir === "debit" && !!t.cat && context.essential(t.cat) === (filters.spending === "essential"))
    && (!query || [t.m, t.rem, t.cat ? context.category(t.cat) : "Uncategorised", context.account(t.src), t.amt]
      .join(" ").toLowerCase().replace(/,/g, "").includes(query)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export const flowTotals = (entries: Pick<Entry, "amt" | "dir">[]) => entries.reduce((sum, t) => ({
  income: sum.income + (t.dir === "credit" ? t.amt : 0),
  expenses: sum.expenses + (t.dir === "debit" ? t.amt : 0),
}), { income: 0, expenses: 0 });

export function manualEntry(draft: { amount: string; direction: string; category: string; account: string; note: string },
  accounts: { key: string; name: string }[], categories: { key: string; label: string }[], at: string, id: string): Transaction {
  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(draft.amount) || Number(draft.amount) <= 0) throw new Error("Enter an amount greater than zero, with up to two decimal places.");
  if (draft.direction !== "credit" && draft.direction !== "debit") throw new Error("Choose income or expense.");
  const account = accounts.find(a => a.key === draft.account);
  if (!account) throw new Error("Choose an account for this transaction.");
  const category = categories.find(c => c.key === draft.category);
  if (!category) throw new Error("Choose a category.");
  const note = draft.note.trim().slice(0, 80);
  return { id, at, amt: Number(draft.amount), dir: draft.direction, src: account.key, cat: category.key,
    m: note || category.label, rem: note || category.label, ch: "Manual", raw: "Entered by hand." };
}

/** Call with the selected period and spending type, never all-time expenses. */
export function spendingPatterns(entries: Pick<Entry, "amt" | "off">[]) {
  const sorted = entries.map(t => t.amt).sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  const median = !sorted.length ? 0 : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const days = new Map<number, number>();
  entries.forEach(t => days.set(t.off, (days.get(t.off) || 0) + t.amt));
  const heaviest = [...days].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return { median, heaviest };
}
