import { CI, ESS_DEFAULT, IC, L, categoryLists, NO_SRC, NO_TX, SI, isManualSrc, needsAcctNumber } from "../application/config";
import type { AppController } from "../application/controller";
import type { Account, DatedTransaction } from "../domain/models";
import { monthKey } from "../lib/bs";
import { calendarAt } from "../lib/calendar";
import { numericEntry } from "../lib/numeric-entry";
import { accountBalances, monthlyBudget } from "../lib/finance";
import { balRs, fmt } from "../lib/format";
import { inReviewWindow, needsReview } from "../lib/nav";

export function sharedContext(app: Pick<AppController, "state" | "go" | "patch" | "openDetail">) {
  const s = app.state;
  const today = new Date();
  const { TODAY_BS, MONTH_KEY, DAY_OF_MONTH, DAYS_IN_MONTH, MONTH_EN, MONTH_NP, PREV_MONTH_EN,
    dayOf, bsLabel, bsDay, dayLabel, adLabel, wdShort } = calendarAt(today);
  const balances = accountBalances(s.sources, s.tx);
  const balance = (key: string | null) => balances[key || ""] || 0;
  const { income, spent, freeToSpend, remaining, daysLeft, lastDay, allowance } = monthlyBudget(s.tx, TODAY_BS, DAYS_IN_MONTH, s.saveTarget);
  const T = L[s.lang] || L.EN;
  const np = s.lang === "NP";
  const dark = s.theme === "dark";
  const catLists = categoryLists(s.customCats);
  const allCats = catLists.out, incomeCats = catLists.income;
  // Deleted spend categories stay in insights so past spending isn't dropped from the breakdown.
  const spendCatsEver = catLists.every.filter(c => !c.in);
  const clabel = (k: string | null | undefined) => { const c = catLists.every.filter(x => x.key === k)[0]; return c ? c.label : "Uncategorised"; };
  const inMonth = (t: DatedTransaction) => monthKey(t.bs) === MONTH_KEY;
  const evenLimit = Math.round(Math.max(0, income - s.saveTarget) / Math.max(s.picked.length, 1));
  const cats = allCats.filter(c => s.picked.indexOf(c.key) > -1).map(c => Object.assign({ limit: evenLimit }, c));
  const fresh = (t: { added?: string }) => inReviewWindow(t.added, Date.now());
  const review = s.tx.filter(t => needsReview(t, Date.now()));
  const scanAccts = new Set(s.scanTx.map(t => t.src)).size;
  const scanGroups = Object.values(s.scanTx.reduce<Record<string, { m: string; dir: string; n: number; amt: number; cat?: string | null }>>((g, t) => {
    const k = t.dir + "|" + t.m;
    const x = g[k] || (g[k] = { m: t.m, dir: t.dir, n: 0, amt: 0, cat: t.cat });
    x.n++; x.amt += t.amt; if (!t.cat) x.cat = null;
    return g;
  }, {})).sort((a, b) => b.n - a.n);
  const card = review[Math.min(s.stackIdx, Math.max(0, review.length - 1))];
  const detail = s.tx.filter(t => t.id === s.detailId)[0] || s.tx[0] || { ...NO_TX, bs: TODAY_BS };
  const srcOf = (k: string | null) => s.sources.filter(x => x.key === k)[0] || s.sources[0] || NO_SRC;
  const shownSrc = srcOf(s.srcKey);
  const amtStr = (t: { dir: string; amt: number }) => (t.dir === "credit" ? "+" : t.dir === "transfer" ? "→" : "−") + fmt(t.amt);
  const txLook = (t: { dir: string; cat?: string | null }) => { const l = t.dir === "credit" ? [SI.inA, "var(--tintG)", "var(--pos)"] : t.dir === "transfer" ? [SI.xfer, "var(--surface2)", "var(--ink2)"] : !t.cat ? [SI.ask, "var(--tintW)", "var(--warnInk)"] : [CI[t.cat] || IC.tag, "var(--surface2)", "var(--ink2)"]; return { icon: l[0], tint: l[1], ifg: l[2] }; };
  const acctLook = (x: Account, bank: string[]) => {
    const k = /Wallet/.test(x.type) ? "wallet" : /Savings|Sahakari|deposit|SIP/i.test(x.type + " " + x.name) ? "save" : isManualSrc(x) ? "cash" : "bank";
    const l = { bank: bank, wallet: [IC.wallet, "var(--tintN)", "var(--navy)"], cash: [IC.cash, "var(--tintW)", "var(--warnInk)"], save: [IC.vault, "var(--tintG)", "var(--pos)"] }[k];
    return { icon: l[0], tint: l[1], ifg: l[2] };
  };
  const amtFg = (t: { dir: string }) => t.dir === "credit" ? "var(--pos)" : t.dir === "transfer" ? "var(--navy)" : "var(--ink)";
  const acctGrand = Math.max(1, s.sources.reduce((a, x) => a + Math.max(0, balance(x.key)), 0));
  const acctGroups = [
    { key: "spending", label: np ? "खर्च" : "Spending", hint: np ? "दैनिक खर्च यहीँबाट" : "Day-to-day money", color: "var(--navy)", tint: "var(--tintN)", fg: "var(--navy)", icon: IC.wallet },
    { key: "savings", label: np ? "बचत" : "Savings", hint: np ? "बचत आधार र लक्ष्य" : "Counts toward floor & goals", color: "var(--pos)", tint: "var(--tintG)", fg: "var(--pos)", icon: IC.vault }
  ].map(g => {
    const list = s.sources.filter(x => (s.roles[x.key] === "savings" ? "savings" : "spending") === g.key);
    const sum = list.reduce((a, x) => a + balance(x.key), 0);
    return Object.assign(g, {
      sum: sum, total: balRs(sum, s.hideBal),
      rows: list.map(x => ({
        name: x.name, icon: acctLook(x, [IC.bank]).icon, meta: !isManualSrc(x) && ((needsAcctNumber(x) && !x.acct) || !x.openedAt) ? (np ? "खाताको विवरण थप्नुहोस्" : "Add account details") : x.type.split(" · ")[0], balance: balRs(balance(x.key), s.hideBal),
        tap: () => app.go("source-detail", { srcKey: x.key, srcFrom: "accounts" })
      }))
    });
  }).filter(g => g.rows.length);
  const chip = (label: string, on: boolean, tap: () => void) => ({
    label: label, tap: tap,
    bg: on ? "var(--ink)" : "var(--surface2)", fg: on ? "var(--canvas)" : "var(--ink2)",
    border: on ? "var(--ink)" : "var(--line)", weight: on ? 600 : 500, check: on ? "✓ " : ""
  });
  const keypad = (target: "newSrcAcct" | "newSrcAmt" | "baseAmt", cur: string, max: number, amount = false) => {
    const put = (digit: string) => {
      const text = cur + digit;
      const result = numericEntry(text, text.length, amount ? "amount" : "digits", max);
      if (!("error" in result)) app.patch({ [target]: result.value, toast: null });
    };
    return ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map<{ label: string; fg: string; tap: () => void; isBack?: boolean }>(d => ({ label: d, fg: "var(--ink)", tap: () => put(d) })).concat([
      amount ? { label: ".", fg: "var(--ink3)", tap: () => put(".") } : { label: "", fg: "var(--ink3)", tap: () => { } },
      { label: "0", fg: "var(--ink)", tap: () => put("0") },
      { label: "", isBack: true, fg: "var(--ink3)", tap: () => app.patch({ [target]: cur.slice(0, -1), toast: null }) }
    ]);
  };
  const isEss = (k: string) => s.ess[k] !== undefined ? s.ess[k] : ESS_DEFAULT[k] !== false;
  const kindOf = (t: { dir: string; cat?: string | null; added?: string }) => t.dir === "transfer" ? "xfer" : t.dir === "credit" ? "in" : !t.cat ? (fresh(t) ? "uncat" : "unfiled") : isEss(t.cat) ? "ess" : "leak";
  const KIND = {
    in: ["var(--pos)", "var(--tintG)", "Income"], ess: ["var(--navy)", "var(--tintN)", "Essential"], leak: ["var(--warnInk)", "var(--tintW)", "Optional"],
    uncat: ["var(--uncat)", "var(--tintU)", "Needs category"], xfer: ["var(--ink3)", "var(--surface2)", "Transfer"],
    unfiled: ["var(--ink3)", "var(--surface2)", "Uncategorised"] // past its review week: no longer asks
  };
  const catDot = (k: string) => isEss(k) ? "var(--navy)" : "var(--warn)";
  const txCard = (from: import("../application/routes").Screen, meta?: (t: DatedTransaction) => string) => (t: DatedTransaction) => {
    const k = kindOf(t), [ifg, tint, word] = KIND[k];
    return {
      title: t.m, icon: txLook(t).icon, amount: amtStr(t), fg: amtFg(t), isUncat: k === "uncat", ifg: ifg, rowBg: tint, kindWord: word,
      chip: t.cat ? clabel(t.cat) : word, meta: meta ? meta(t) : srcOf(t.src).short,
      tap: () => app.openDetail(t.id, from, false, k === "uncat")
    };
  };
  const dayMeta = (t: DatedTransaction) => dayLabel(t.off).split(" · ")[0] + " · " + srcOf(t.src).short;
  return { s, today, TODAY_BS, MONTH_KEY, DAY_OF_MONTH, DAYS_IN_MONTH, MONTH_EN, MONTH_NP, PREV_MONTH_EN, dayOf, bsLabel, bsDay, dayLabel, adLabel, wdShort, balances, balance, income, spent, freeToSpend, remaining, daysLeft, lastDay, allowance, T, np, dark, allCats, incomeCats, spendCatsEver, clabel, inMonth, evenLimit, cats, fresh, review, scanAccts, scanGroups, card, detail, srcOf, shownSrc, amtStr, txLook, acctLook, amtFg, acctGrand, acctGroups, chip, keypad, isEss, kindOf, KIND, catDot, txCard, dayMeta };
}
export type SharedContext = ReturnType<typeof sharedContext>;
