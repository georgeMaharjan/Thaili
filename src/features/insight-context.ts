import { SI } from "../application/config";
import type { AppController } from "../application/controller";
import type { DatedTransaction } from "../domain/models";
import { monthKey } from "../lib/bs";
import { rs } from "../lib/format";
import { spendingPatterns } from "../lib/transactions";
import type { SharedContext } from "./shared-context";

export function insightContext(app: Pick<AppController, "go">, context: Pick<SharedContext, "s" | "MONTH_KEY" | "DAY_OF_MONTH" | "MONTH_EN" | "MONTH_NP" | "PREV_MONTH_EN" | "wdShort" | "np" | "spendCatsEver" | "inMonth" | "isEss">) {
  const { s, MONTH_KEY, DAY_OF_MONTH, MONTH_EN, MONTH_NP, PREV_MONTH_EN, wdShort, np, spendCatsEver: allCats, inMonth, isEss } = context;
  const inWin = (t: DatedTransaction) => s.range === "Daily" ? t.off === 0 : s.range === "Weekly" ? t.off < 7 : inMonth(t);
  const inPrev = (t: DatedTransaction) => s.range === "Daily" ? t.off === 1 : s.range === "Weekly" ? t.off >= 7 && t.off < 14 : monthKey(t.bs) === MONTH_KEY - 1 && t.bs.d <= DAY_OF_MONTH;
  const debitSum = (pred: (t: DatedTransaction) => boolean) => s.tx.filter(t => t.dir === "debit" && pred(t)).reduce((a, t) => a + t.amt, 0);
  const catIn = (k: string) => debitSum(t => t.cat === k && inWin(t));
  const catPrev = (k: string) => debitSum(t => t.cat === k && inPrev(t));
  const leakCats = allCats.filter(c => !isEss(c.key)).map(c => ({ c: c, amt: catIn(c.key) })).sort((a, b) => b.amt - a.amt);
  const essOut = allCats.filter(c => isEss(c.key)).reduce((a, c) => a + catIn(c.key), 0);
  const leakOut = leakCats.reduce((a, x) => a + x.amt, 0);
  const periodOut = debitSum(inWin);
  const leakTx = s.tx.filter(t => t.dir === "debit" && t.cat && !isEss(t.cat) && inWin(t));
  const leakCut = Math.round(leakOut / 3 * 100) / 100;
  const periodIn = s.tx.filter(t => t.dir === "credit" && inWin(t)).reduce((a, t) => a + t.amt, 0);
  const prevTotal = debitSum(inPrev);
  const net = periodIn - periodOut;
  const prevName = { Daily: "Yest.", Weekly: "Last wk", Monthly: PREV_MONTH_EN }[s.range];
  const prevLeak = allCats.filter(c => !isEss(c.key)).reduce((a, c) => a + catPrev(c.key), 0);
  const pctDelta = (now: number, was: number) => was ? Math.round((now - was) / was * 100) : 0;
  const leakShare = Math.round(leakOut / Math.max(periodOut, 1) * 100);
  const unfiled = Math.max(0, periodOut - essOut - leakOut);
  const trendDaily = [6, 5, 4, 3, 2, 1, 0].map(o => [wdShort(o), debitSum(t => t.off === o)]);
  const optionalPatterns = spendingPatterns(leakTx);
  const deltaChip = (now: number, was: number) => {
    const d = pctDelta(now, was);
    return { icon: d > 0 ? SI.up : d < 0 ? SI.down : SI.flat, text: Math.abs(d) + "%", fg: d === 0 ? "var(--ink3)" : d < 0 ? "var(--pos)" : "var(--warnInk)", bg: d === 0 ? "var(--surface2)" : d < 0 ? "var(--tintG)" : "var(--surface)" };
  };
  const catAmts = allCats.map(c => ({ k: c.key, label: c.label, amt: catIn(c.key), prev: catPrev(c.key), limit: c.limit }));
  const catRows = catAmts.filter(c => c.amt || c.prev).sort((a, b) => b.amt - a.amt).map(c => {
    const pct = c.amt / Math.max(periodOut, 1) * 100;
    const d = deltaChip(c.amt, c.prev);
    return {
      label: c.label, amount: rs(c.amt), width: pct + "%", share: Math.round(pct) + "%",
      tap: () => app.go("txns", { txCategories: [c.k], txSpending: "all", txFilter: "all", txQuery: "", txRange: { Daily: "today", Weekly: "week", Monthly: "month" }[s.range] }),
      color: isEss(c.k) ? "var(--navy)" : "var(--warn)",
      dWord: c.prev && d.text !== "0%" ? (c.amt > c.prev ? "↑ " : "↓ ") + d.text : "", dFg: c.prev ? d.fg : "var(--ink3)"
    };
  });
  const prevWord = { Daily: np ? "हिजो" : "yesterday", Weekly: np ? "गत हप्ता" : "last week", Monthly: "the same days in " + PREV_MONTH_EN }[s.range];
  const vsSentence = (now: number, was: number) => {
    const d = pctDelta(now, was);
    return !was ? "" : d === 0 ? (np ? prevWord + " जत्तिकै" : "Same as " + prevWord)
      : np ? prevWord + " भन्दा " + Math.abs(d) + "% " + (d > 0 ? "बढी" : "कम") : Math.abs(d) + "% " + (d > 0 ? "more" : "less") + " than " + prevWord;
  };
  const perDiv = s.range === "Daily" ? 1 : s.range === "Weekly" ? 7 : DAY_OF_MONTH;
  const perName = s.range === "Monthly" ? (np ? MONTH_NP : MONTH_EN) : s.range === "Weekly" ? (np ? "यो हप्ता" : "this week") : (np ? "आज" : "today");
  const fit = (len: number, full: number, n: number, min: number) => (len <= n ? full : Math.max(min, Math.floor(full * n / len))) + "px";
  return { inWin, inPrev, debitSum, catIn, catPrev, leakCats, essOut, leakOut, periodOut, leakTx, leakCut, periodIn, prevTotal, net, prevName, prevLeak, pctDelta, leakShare, unfiled, trendDaily, optionalPatterns, deltaChip, catAmts, catRows, prevWord, vsSentence, perDiv, perName, fit };
}
export type InsightContext = ReturnType<typeof insightContext>;
