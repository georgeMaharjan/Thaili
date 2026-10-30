import type { AppController } from "../application/controller";
import type { DatedTransaction } from "../domain/models";
import { adOf, daysInBsMonth, monthKey } from "../lib/bs";
import { needsReview } from "../lib/nav";
import { filterEntries, flowTotals } from "../lib/transactions";
import type { SharedContext } from "./shared-context";

export function transactionContext(app: Pick<AppController, never>, context: Pick<SharedContext, "s" | "MONTH_KEY" | "dayLabel" | "clabel" | "srcOf" | "isEss" | "txCard">) {
  const { s, MONTH_KEY, dayLabel, clabel, srcOf, isEss, txCard } = context;
  const inTxWin = (t: DatedTransaction) => s.txRange === "today" ? t.off === 0 : s.txRange === "week" ? t.off < 7
    : s.txRange === "custom" ? s.txFrom !== null && s.txTo !== null && t.off <= s.txFrom && t.off >= s.txTo : monthKey(t.bs) === MONTH_KEY;
  const q = s.txQuery.trim().toLowerCase();
  const filterContext = { inRange: inTxWin, needsReview: (t: DatedTransaction) => needsReview(t, Date.now()), essential: isEss, category: clabel, account: (k: string) => srcOf(k).name };
  const appliedFilters = { query: s.txQuery, categories: s.txCategories, spending: s.txSpending, review: s.txFilter === "review" };
  const filtered = filterEntries(s.tx, appliedFilters, filterContext);
  const draftFilters = s.filterDraft || appliedFilters;
  const previewFilters = { ...draftFilters, query: s.txQuery };
  const previewRows = filterEntries(s.tx, previewFilters, filterContext);
  const filteredTotals = flowTotals(filtered);
  const rows: ({ isHeader: true; label: string } | ReturnType<ReturnType<typeof txCard>>)[] = [];
  let lastHeader: string | null = null;
  filtered.forEach(t => {
    const dl = dayLabel(t.off);
    if (dl !== lastHeader) { rows.push({ isHeader: true, label: dl }); lastHeader = dl; }
    rows.push(txCard("txns")(t));
  });
  const calY = Math.floor(s.calKey / 12), calM = s.calKey % 12, calDays = daysInBsMonth(calY, calM);
  const offOf = (d: number) => Math.round((new Date().setHours(0, 0, 0, 0) - adOf(calY, calM, d).setHours(0, 0, 0, 0)) / 86400000);
  const calLo = s.calA, calHi = s.calB === null ? s.calA : s.calB;
  return { inTxWin, q, filterContext, appliedFilters, filtered, draftFilters, previewFilters, previewRows, filteredTotals, rows, lastHeader, calY, calM, calDays, offOf, calLo, calHi };
}
export type TransactionContext = ReturnType<typeof transactionContext>;
