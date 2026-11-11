import { OB_STEPS } from "../../application/config";
import type { AppController } from "../../application/controller";
import { balHero, balRs, fmt, initials, rs, whole } from "../../lib/format";
import { TABS } from "../../lib/nav";
import type { ViewContext } from "../context";
export function shellViewModel(app: Pick<AppController, "patch" | "go" | "flash" | "back" | "transactions" | "auth" | "state" | "catchUpSms" | "_t">, context: Pick<ViewContext, "s" | "DAY_OF_MONTH" | "DAYS_IN_MONTH" | "MONTH_EN" | "MONTH_NP" | "adLabel" | "balance" | "spent" | "remaining" | "daysLeft" | "lastDay" | "allowance" | "T" | "np" | "clabel" | "cats" | "review" | "detail" | "fit" | "savingsPot" | "floorPct" | "floorShort" | "surplus" | "unallocated" | "claimed" | "fundedCount" | "baseDraft" | "obStep" | "segBg" | "segFg" | "segSh">) {
  const { s, DAY_OF_MONTH, DAYS_IN_MONTH, MONTH_EN, MONTH_NP, adLabel, balance, spent, remaining, daysLeft, lastDay, allowance, T, np, clabel, cats, review, detail, fit, savingsPot, floorPct, floorShort, surplus, unallocated, claimed, fundedCount, baseDraft, obStep, segBg, segFg, segSh } = context;
  return {
    screen: s.screen,
    setEn: () => app.patch({ lang: "EN" }),
    setNp: () => app.patch({ lang: "NP" }),
    enBg: segBg(s.lang === "EN"),
    enFg: segFg(s.lang === "EN"),
    enSh: segSh(s.lang === "EN"),
    npBg: segBg(s.lang === "NP"),
    npFg: segFg(s.lang === "NP"),
    npSh: segSh(s.lang === "NP"),
    t: T,
    obDots: obStep ? Array.from({ length: OB_STEPS }, (_, i) => i + 1).map(i => ({ bg: i <= obStep ? "var(--action)" : "var(--barTrack)" })) : [],
    toAccounts: () => app.go("accounts"),
    totalBal: balHero(s.sources.reduce((a, x) => a + balance(x.key), 0), s.hideBal),
    toSrcNew: () => app.go("src-new", { srcNewFrom: s.screen, editSrcKey: null, newSrcAmt: "" }),
    showTabs: TABS.indexOf(s.screen) > -1,
    addNewLabel: np ? "नयाँ थप्नुहोस्" : "Add new",
    toAdd: () => app.go("add", { addEntry: "", addNote: "", addError: "", addDir: "debit", addCat: cats[0]?.key || "", addSrc: s.sources.find(x => x.key === "cash")?.key || s.sources[0]?.key || "", discardAdd: false }),
    adRange: (np ? "दिन " + DAY_OF_MONTH + " / " : "Day " + DAY_OF_MONTH + " of ") + DAYS_IN_MONTH + " · " + adLabel(0),
    allowAmount: fmt(allowance),
    allowFg: remaining <= 0 ? "var(--warnInk)" : "var(--ink)",
    daysLeftShort: lastDay ? "last day" : daysLeft + " days",
    balFs: fit(whole(s.sources.reduce((a, x) => a + balance(x.key), 0)).length, 44, 8, 22),
    budgetFs: fit(Math.max(whole(spent).length, fmt(remaining).length) + 3, 28, 9, 18),
    budgetTitle: np ? MONTH_NP + "मा खर्च गर्न मिल्ने" : "Spendable in " + MONTH_EN,
    goalsManage: np ? "व्यवस्थापन" : "Manage",
    goalName: surplus > 0 ? "Surplus above your baseline" : "Savings baseline",
    goalLabel: surplus > 0 ? balRs(surplus, s.hideBal) + " free" : floorPct + "%",
    goalWidth: surplus > 0 ? Math.round(claimed / Math.max(surplus, 1) * 100) + "%" : floorPct + "%",
    goalNote: surplus <= 0
      ? balRs(savingsPot, s.hideBal) + " of " + rs(s.savingsGoal) + " saved" + (s.hideBal ? "" : " · " + rs(floorShort) + " to go before goals start funding")
      : s.goals.length === 0
        ? balRs(surplus, s.hideBal) + " sitting free above your " + rs(s.savingsGoal) + " baseline, unclaimed"
        : fundedCount + " of " + s.goals.length + " goals covered" + (unallocated > 0 ? " · " + rs(unallocated) + " still free" : " · fully claimed"),
    noGoals: s.goals.length === 0,
    toGoalNew: () => app.go("goal-new", { goalAmt: "", goalName: "", goalPos: "bottom", goalError: "" }),
    discardGoal: s.discardGoal,
    keepGoal: () => app.patch({ discardGoal: false }),
    discardGoalEntry: () => app.patch({ discardGoal: false, goalName: "", goalAmt: "" }, () => app.back()),
    hasReview: review.length > 0,
    reviewCount: review.length,
    // Dismissed, it stays away until more entries need sorting.
    showReviewBanner: review.length > s.reviewHidden,
    dismissReviewBanner: () => app.patch({ reviewHidden: review.length }),
    reviewCountBig: review.length + (review.length === 1 ? " item" : " items"),
    reviewChip: {
      label: T.review + " · " + review.length,
      bg: s.txFilter === "review" ? "var(--uncat)" : "var(--tintU)",
      fg: s.txFilter === "review" ? "var(--surface)" : "var(--uncat)",
      tap: () => app.patch({ txFilter: s.txFilter === "review" ? "all" : "review", toast: null })
    },
    detailKindBg: detail.dir === "credit" ? "var(--tintG)" : detail.dir === "transfer" ? "var(--tintN)" : "var(--tintO)",
    detailKindFg: detail.dir === "credit" ? "var(--pos)" : detail.dir === "transfer" ? "var(--navy)" : "var(--out)",
    editing: s.editing,
    toggleEdit: () => app.patch({ editing: !s.editing, toast: null }),
    detailCategoryLabel: detail.cat ? clabel(detail.cat) : "Choose category",
    detailCatsHint: !detail.cat ? "Needed for Insights" : "Tap to change",
    detailCatsHintFg: !detail.cat ? "var(--uncat)" : "var(--ink3)",
    detailIsDebit: detail.dir === "debit",

    remarkKey: (e: import("react").KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") app.transactions.saveRemark(detail.id); if (e.key === "Escape") app.patch({ remarkDraft: null }); },
    remarkClear: () => app.patch({ remarkDraft: "" }),
    deleting: s.deleting,
    cancelDelete: () => app.patch({ deleting: false }),
    confirmDelete: async () => {
      if (!(await app.auth("Delete transaction")).ok) return;
      const prev = app.state.tx;
      app.patch({ deleting: false, screen: s.from || "txns", tx: prev.filter(t => t.id !== detail.id) });
      app.flash("Transaction deleted", { tx: prev });
    },



    baseDraftBig: fmt(baseDraft),
    discardAdd: s.discardAdd,
    keepAdd: () => app.patch({ discardAdd: false }),
    discardEntry: () => { app.patch({ discardAdd: false, addEntry: "", addNote: "" }, () => app.back()); },

    userInitials: s.user ? initials(s.user.name) : "",
    editLabel: np ? "सम्पादन" : "Edit",

    goTab: (k: string) => app.go(k),
    refreshTransactions: () => app.catchUpSms(true),
    hasToast: !!s.toast,
    toast: s.toast,
    canUndo: !!s.undoState,
    toastBottom: TABS.indexOf(s.screen) > -1 ? "152px" : "24px",
    dismissToastLabel: np ? "सूचना बन्द गर्नुहोस्" : "Dismiss notification",
    dismissToast: () => {
      clearTimeout(app._t);
      app.patch({ toast: null, undoState: null });
    },
    undo: () => {
      clearTimeout(app._t);
      app.patch(Object.assign({ toast: null, undoState: null }, s.undoState || {}));
    }
  };
}
