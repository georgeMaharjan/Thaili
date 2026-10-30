import { P } from "@/components/ui";
import { newId, now } from "../../application/config";
import type { AppController } from "../../application/controller";
import { dated, npDigits } from "../../lib/bs";
import { balHero, fmt, rs, whole } from "../../lib/format";
import { manualEntry } from "../../lib/transactions";
import type { ViewContext } from "../context";

export function homeViewModel(app: Pick<AppController, "go" | "back" | "transactions" | "patch" | "flash" | "openDetail" | "adding">, context: Pick<ViewContext, "s" | "TODAY_BS" | "DAY_OF_MONTH" | "DAYS_IN_MONTH" | "MONTH_EN" | "MONTH_NP" | "bsLabel" | "dayLabel" | "income" | "spent" | "freeToSpend" | "remaining" | "lastDay" | "allowance" | "np" | "cats" | "incomeCats" | "review" | "card" | "srcOf" | "acctGroups" | "chip" | "catDot" | "txCard" | "addCategories" | "entryError" | "alloc" | "floorShort" | "targetPctNum" | "pacePctNum">) {
  const { s, TODAY_BS, DAY_OF_MONTH, DAYS_IN_MONTH, MONTH_EN, MONTH_NP, bsLabel, dayLabel, income, spent, freeToSpend, remaining, lastDay, allowance, np, cats, incomeCats, review, card, srcOf, acctGroups, chip, catDot, txCard, addCategories, entryError, alloc, floorShort, targetPctNum, pacePctNum } = context;
  return {
    toSettings: () => app.go("settings", { settingsFrom: s.screen === "settings" ? s.settingsFrom : s.screen }),
    toTxns: () => app.go("txns", { txFilter: "all" }),
    toGoal: () => app.go("goals", { goalsFrom: s.screen }),
    toReviewStack: () => app.go("stack", { stackIdx: 0 }),
    bsMonth: np ? MONTH_NP + " " + npDigits(TODAY_BS.y) : MONTH_EN + " " + TODAY_BS.y,
    haveLabel: np ? "कुल मौज्दात" : "Total balance",
    homeBalances: acctGroups.map(g => ({ label: g.label, total: balHero(g.sum, s.hideBal) })),
    monthlyTarget: rs(s.saveTarget),
    editPlan: () => app.go("cats", { catsMode: "edit", catsFrom: "home" }),
    haveMeta: np ? s.sources.length + " खाताको जम्मा" : "Across " + s.sources.length + (s.sources.length === 1 ? " account" : " accounts"),
    dayOfLine: np ? "दिन " + DAY_OF_MONTH + " / " + DAYS_IN_MONTH : "Day " + DAY_OF_MONTH + " of " + DAYS_IN_MONTH,
    spentWord: np ? "खर्च भयो" : "Spent",
    homeSpent: "Rs " + whole(spent),
    leftWord: remaining >= 0 ? (np ? "खर्च गर्न बाँकी" : "Left to spend") : (np ? "बढी खर्च" : "Over by"),
    homeLeft: rs(Math.abs(remaining)),
    leftFg: remaining > 0 ? "var(--pos)" : "var(--warnInk)",
    targetWidth: Math.min(100, targetPctNum) + "%",
    budgetBar: targetPctNum >= 100 ? "var(--warnInk)" : targetPctNum > pacePctNum + 8 ? "var(--warn)" : "var(--navy)",
    budgetLine: np ? rs(freeToSpend) + " को " + targetPctNum + "% खर्च भयो" : targetPctNum + "% of " + rs(freeToSpend) + " used",
    suggestLead: remaining <= 0 ? (np ? "खर्च गर्न मिल्ने भन्दा " : "You're ") : lastDay ? (np ? "आज " : "Keep today under ") : (np ? "दिनको " : "Try to keep each day under "),
    suggestAmt: remaining <= 0 ? rs(-remaining) : rs(allowance),
    suggestTail: remaining <= 0 ? (np ? " बढी खर्च भयो" : " past what was free to spend") : np ? " भित्र राख्नुहोस्" : lastDay ? "" : " to stay on track",
    suggestHow: (np ? MONTH_NP + "मा आएको " : "Came in this " + MONTH_EN + " ") + rs(income) + " − " + (np ? "बचत लक्ष्य " : "savings target ") + rs(s.saveTarget)
      + " = " + rs(freeToSpend) + (np ? " खर्च गर्न मिल्ने" : " free to spend"),
    floorPending: floorShort > 0,
    floorLine: np ? "बचत आधार " + rs(s.savingsGoal) + " पुगेपछि लक्ष्य भरिन थाल्छन् · " + rs(floorShort) + " बाँकी"
      : "Goals start filling once savings clear the " + rs(s.savingsGoal) + " baseline · " + rs(floorShort) + " to go",
    homeGoals: alloc.map(a => {
      const pct = Math.min(100, Math.round(a.got / Math.max(a.g.target, 1) * 100));
      return {
        name: a.g.name, got: rs(a.got), target: fmt(a.g.target), pct: pct + "%", width: pct + "%",
        ring: "conic-gradient(var(--pos) " + pct + "%, var(--barTrack) 0)",
        pctFg: a.short === 0 ? "var(--pos)" : "var(--ink)",
        tap: () => app.go("goals", { goalsFrom: "home" })
      };
    }),
    recent: s.tx.slice(0, 4).map(txCard("home")),
    stackProgress: review.length ? (Math.min(s.stackIdx + 1, review.length) + " of " + review.length) : "All clear",
    stackHasCard: !!card && review.length > 0,
    stackDone: review.length === 0,
    stackExit: app.back,
    cardAmount: card ? "−" + rs(card.amt) : "",
    cardMerchant: card ? card.m : "",
    cardMeta: card ? (dayLabel(card.off) + " · " + card.time + " · " + srcOf(card.src).name) : "",
    cardCats: cats.map(c => Object.assign(chip(c.label, !!(card && card.cat === c.key), () => card && app.transactions.setCat(card.id, c.key, c.label)), { dot: card && card.cat === c.key ? "var(--canvas)" : catDot(c.key) })),
    cardSkip: () => app.patch({ stackIdx: s.stackIdx + 1, toast: null }),
    cardOpen: () => card && app.openDetail(card.id, "stack", true),
    addDirection: s.addDir,
    addDirectionSet: (dir: "credit" | "debit") => app.patch({ addDir: dir, addCat: (dir === "credit" ? incomeCats : cats)[0]?.key || "", addError: "" }),
    addAmount: s.addEntry,
    addAmountType: (e: { target: { value: string } }) => { const value = e.target.value.replace(/,/g, ""); if (/^\d{0,9}(\.\d{0,2})?$/.test(value)) app.patch({ addEntry: value, addError: "" }); },
    addCategory: s.addCat,
    addCategoryOptions: addCategories,
    addCategorySet: (e: { target: { value: string } }) => app.patch({ addCat: e.target.value, addError: "" }),
    addAccount: s.addSrc,
    addAccounts: s.sources,
    addAccountSet: (e: { target: { value: string } }) => app.patch({ addSrc: e.target.value, addError: "" }),
    addNote: s.addNote,
    addNoteType: (e: { target: { value: string } }) => app.patch({ addNote: e.target.value.slice(0, 80) }),
    addDateLabel: bsLabel(0),
    addError: s.addError,
    addReady: !entryError,
    addCta: s.addDir === "credit" ? "Save income" : "Save expense",
    addCancel: app.back,
    commitAdd: () => {
      if (app.adding) return;
      try {
        const entry = dated(manualEntry({ amount: s.addEntry, direction: s.addDir, category: s.addCat, account: s.addSrc, note: s.addNote }, s.sources, addCategories, now(), newId()));
        entry.added = entry.at;
        app.adding = true;
        const prev = s.tx;
        app.patch({ tx: [entry].concat(prev), addEntry: "", addNote: "", addError: "" }, () => {
          app.back(); app.adding = false;
          app.flash((entry.dir === "credit" ? "Income" : "Expense") + " saved · " + rs(entry.amt), { tx: prev });
        });
      } catch (e) { app.patch({ addError: (e instanceof Error ? e.message : String(e)) }); }
    },
    settingsLabel: np ? "प्रोफाइल र सेटिङ" : "Profile and settings",
    toggleBal: (e: import("react").MouseEvent<HTMLElement>) => { e.stopPropagation(); app.patch({ hideBal: !s.hideBal }); },
    balEyeD: s.hideBal ? P.eyeOff : P.eye,
    balEyeLabel: s.hideBal ? (np ? "मौज्दात देखाउनुहोस्" : "Show balance") : (np ? "मौज्दात लुकाउनुहोस्" : "Hide balance")
  };
}
