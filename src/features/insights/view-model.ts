import { kfmt } from "../../application/config";
import type { AppController } from "../../application/controller";
import { balHero, balRs, fmt, fmtTyped, rs, signed, whole } from "../../lib/format";
import { captureNotifications } from "../../lib/notifications";
import type { ViewContext } from "../context";
export function insightsViewModel(app: Pick<AppController, "patch" | "go" | "back" | "flash">, context: Pick<ViewContext, "s" | "DAY_OF_MONTH" | "MONTH_EN" | "bsDay" | "wdShort" | "income" | "spent" | "T" | "np" | "inMonth" | "cats" | "chip" | "keypad" | "isEss" | "txCard" | "dayMeta" | "inWin" | "debitSum" | "leakCats" | "essOut" | "leakOut" | "periodOut" | "leakTx" | "leakCut" | "periodIn" | "prevTotal" | "net" | "prevLeak" | "pctDelta" | "leakShare" | "unfiled" | "optionalPatterns" | "deltaChip" | "catRows" | "vsSentence" | "perDiv" | "perName" | "fit" | "savingsSources" | "savingsPot" | "floorShort" | "surplus" | "essCats" | "essMonthly" | "baseFor" | "baseDraft" | "kept" | "openBaseline">) {
  const { s, DAY_OF_MONTH, MONTH_EN, bsDay, wdShort, income, spent, T, np, inMonth, cats, chip, keypad, isEss, txCard, dayMeta, inWin, debitSum, leakCats, essOut, leakOut, periodOut, leakTx, leakCut, periodIn, prevTotal, net, prevLeak, pctDelta, leakShare, unfiled, optionalPatterns, deltaChip, catRows, vsSentence, perDiv, perName, fit, savingsSources, savingsPot, floorShort, surplus, essCats, essMonthly, baseFor, baseDraft, kept, openBaseline } = context;
  return {
    ranges: (["Daily", "Weekly", "Monthly"] as const).map(r => ({
      label: { Daily: T.daily, Weekly: T.weeklyR, Monthly: T.monthly }[r], bg: s.range === r ? "var(--surface)" : "transparent", fg: s.range === r ? "var(--ink)" : "var(--ink3)", shadow: s.range === r ? "0 1px 2px rgba(0,0,0,.08)" : "none",
      tap: () => app.patch({ range: r })
    })),
    keptHeadLabel: (net >= 0 ? (np ? "बचेको · " : "Kept · ") : (np ? "बढी खर्च · " : "Overspent · ")) + perName,
    keptBig: whole(net),
    keptFg: net >= 0 ? "var(--ink)" : "var(--warnInk)",
    keptFs: fit(whole(net).length, 52, 8, 34),
    keptSentence: periodIn > 0
      ? (net >= 0 ? "Income minus expenses · " + Math.round(net / periodIn * 100) + "% of what came in stayed with you" : "Expenses ran " + rs(-net) + " past income")
      : "No income landed in this period, so spending came from what you already had",
    inBig: "+" + whole(periodIn),
    outBig: "−" + whole(periodOut),
    flowFs: fit(Math.max(whole(periodIn).length, whole(periodOut).length) + 1, 30, 8, 18),
    inMeta: (n => n ? n + (n === 1 ? " deposit" : " deposits") : "Nothing yet")(s.tx.filter(t => t.dir === "credit" && inWin(t)).length),
    spentChip: deltaChip(periodOut, prevTotal),
    spentSentence: vsSentence(periodOut, prevTotal),
    toFlow: () => app.go("flow", { flowDir: "debit" }),
    toFlowIn: () => app.go("flow", { flowDir: "credit" }),
    toLeaks: () => app.go("leaks"),
    leaksBack: app.back,
    leakHeadLabel: T.leaks + " · " + perName,
    leakAmtLabel: rs(leakOut),
    leakCutLabel: rs(leakCut),
    savBaseLabel: rs(s.savingsGoal),
    savSurWord: surplus > 0 ? (np ? "माथि · लक्ष्यका लागि" : "Above · for goals") : (np ? "पुग्न बाँकी" : "Still to reach"),
    savSurLabel: rs(surplus > 0 ? surplus : floorShort),
    savSurFg: surplus > 0 ? "var(--pos)" : "var(--warnInk)",
    savSurDot: surplus > 0 ? "var(--pos)" : "var(--warn)",
    savLine: surplus > 0 ? "Your cushion is covered. Only the " + rs(surplus) + " above it goes to goals." : "Goals wait until savings reach the baseline — " + rs(floorShort) + " to go.",
    savExplain: s.savExplain,
    toggleSavExplain: () => app.patch({ savExplain: !s.savExplain }),
    savExplainLine: "You set it during setup — 3 or 6 months of essential spending, or your own amount — and can change it any time. It's a cushion you leave untouched. Thaili adds up every account marked Savings and compares it with the baseline. Below it, goals wait. Above it, the extra fills your goals in priority order.",
    savSteps: [
      { n: "1", label: "Income this month", value: "+" + fmt(income), fg: "var(--pos)" },
      { n: "2", label: "Expenses this month", value: "−" + fmt(spent), fg: "var(--ink)" },
      { n: "3", label: "Kept — move it into savings", value: signed(kept) + fmt(kept), fg: kept < 0 ? "var(--warnInk)" : "var(--navy)" },
      { n: "4", label: surplus > 0 ? "Savings above baseline → goals" : "Savings still below baseline", value: rs(surplus > 0 ? surplus : floorShort), fg: surplus > 0 ? "var(--pos)" : "var(--warnInk)" }
    ],
    toBaseline: openBaseline,
    whereTitle: np ? "पैसा कहाँ गयो" : "Where it went",
    splitRows: [
      { label: np ? "आवश्यक" : "Essential", amt: essOut, color: "var(--navy)" },
      { label: T.leaks, amt: leakOut, color: "var(--warn)" },
      { label: np ? "वर्ग छैन" : "Not filed", amt: unfiled, color: "var(--barDim)" }
    ].filter((g, i) => i < 2 || g.amt > 0).map(g => Object.assign(g, {
      pct: Math.round(g.amt / Math.max(periodOut, 1) * 100) + "%",
      width: Math.round(g.amt / Math.max(periodOut, 1) * 100) + "%"
    })),
    catRowsShown: s.insCatsAll ? catRows : catRows.slice(0, 5),
    catMore: catRows.length > 5,
    catMoreLabel: s.insCatsAll ? (np ? "कम देखाउनुहोस्" : "Show fewer") : (np ? "सबै " + catRows.length + " वर्ग" : "Show all " + catRows.length + " categories"),
    toggleCatsAll: () => app.patch({ insCatsAll: !s.insCatsAll }),
    leakBig: whole(leakOut),
    leakFs: fit(whole(leakOut).length, 52, 8, 34),
    leakSentence: (np ? "कुल खर्चको " + leakShare + "%" : leakShare + "% of what you spent") + (vsSentence(leakOut, prevLeak) && pctDelta(leakOut, prevLeak) !== 0 ? " · " + vsSentence(leakOut, prevLeak) : ""),
    leakPerDay: rs(Math.round(leakOut / perDiv)),
    leakPerDayMeta: s.range === "Daily" ? "today so far" : "average over " + perDiv + " days",
    leaksNoneLabel: np ? "वैकल्पिक खर्च छैन" : "No optional spending this period",
    leaksNone: leakCats.filter(x => x.amt > 0).length === 0,
    leakRows: leakCats.filter(x => x.amt > 0).map(x => ({
      label: x.c.label, amount: rs(x.amt), per: kfmt(Math.round(x.amt / perDiv)) + (np ? "/दिन" : "/day"),
      width: Math.round(x.amt / Math.max(leakCats[0].amt, 1) * 100) + "%"
    })),
    leakTxRows: leakTx.map(txCard("leaks", dayMeta)),
    leakTxCount: leakTx.length + (leakTx.length === 1 ? " spend" : " spends"),
    leakStats: [
      { value: optionalPatterns.heaviest ? bsDay(optionalPatterns.heaviest[0]) + " · " + kfmt(optionalPatterns.heaviest[1]) : "—", label: np ? "सबैभन्दा महँगो दिन" : "Heaviest day" },
      { value: rs(optionalPatterns.median), label: np ? "सामान्य खर्च" : "Typical spend" }
    ],
    leakWhatLine: cats.filter(c => !isEss(c.key)).map(c => c.label).join(", ") || "No categories marked optional",
    toEssEdit: () => app.go("cats", { catsMode: "edit", catsFrom: s.screen }),
    baseSetupMode: s.baseSetup,
    baseSetupNote: "Last step",
    baseBack: () => app.go(s.baseSetup ? "cats" : (s.baseFrom || "settings")),
    baseStatus: savingsPot >= baseDraft
      ? "Covered — " + balRs(savingsPot) + " in savings, " + rs(savingsPot - baseDraft) + " above it for goals"
      : rs(baseDraft - savingsPot) + " to go — " + balRs(savingsPot) + " in savings today. Goals wait until it's reached.",
    baseStatusFg: savingsPot >= baseDraft ? "var(--pos)" : "var(--warnInk)",
    baseAmtLabel: s.baseAmt ? fmtTyped(s.baseAmt) : "0",
    baseAmtFg: s.baseAmt ? "var(--ink)" : "var(--barDim)",
    baseKeys: keypad("baseAmt", s.baseFresh ? "" : s.baseAmt, 9, true).map(k => Object.assign({}, k, { tap: () => { k.tap(); app.patch({ baseFresh: false }); } })),
    baseChips: essMonthly ? ([[3, np ? "३ महिना" : "3 months"], [6, np ? "६ महिना" : "6 months"]] as const).map(([m, label]) =>
      chip(label + " · " + rs(baseFor(m)), baseDraft === baseFor(m), () => app.patch({ baseAmt: String(baseFor(m)), baseFresh: true }))) : [],
    baseBasisLine: essMonthly
      ? "Suggestions use " + rs(essMonthly) + " a month of essential spending (" + essCats.map(c => c.label).join(", ") + ") over the last three months. Optional spending is excluded."
      : "No essential spending in the last three months yet, so type your own amount.",
    baseCta: !baseDraft ? (np ? "रकम लेख्नुहोस्" : "Type an amount") : s.baseSetup ? "Save and finish" : "Save baseline",
    baseCtaBg: baseDraft ? "var(--action)" : "var(--surface2)",
    baseCtaFg: baseDraft ? "var(--onAction)" : "var(--ink3)",
    baseSave: () => {
      if (!baseDraft) return;
      if (s.baseSetup) {
        const at = Date.now();
        captureNotifications(true, true);
        app.patch({ savingsGoal: baseDraft, baseSetup: false, setupComplete: true, screen: "home",
          captureStartAt: s.captureStartAt ?? at, smsSince: s.smsSince ?? at,
          notificationSince: s.captureStartAt == null ? at : s.notificationSince });
        return;
      } // setup done: now ask for notifications
      const prev = s.savingsGoal;
      app.go(s.baseFrom || "settings", { savingsGoal: baseDraft });
      app.flash("Baseline set to " + rs(baseDraft), { savingsGoal: prev });
    },
    ...(() => {
      const buckets = s.range === "Daily" ? Array.from({ length: 6 }, (_, i) => ({ label: String(i * 4).padStart(2, "0") + "h", amount: debitSum(t => t.off === 0 && Math.floor(new Date(t.at).getHours() / 4) === i) }))
        : s.range === "Weekly" ? [6, 5, 4, 3, 2, 1, 0].map(off => ({ label: wdShort(off), amount: debitSum(t => t.off === off) }))
          : Array.from({ length: Math.ceil(DAY_OF_MONTH / 7) }, (_, i) => ({ label: (i * 7 + 1) + "–" + Math.min((i + 1) * 7, DAY_OF_MONTH), amount: debitSum(t => inMonth(t) && Math.floor((t.bs.d - 1) / 7) === i) }));
      const max = Math.max(1, ...buckets.map(b => b.amount));
      return {
        spendingTrend: buckets.map(b => ({ label: b.label, value: kfmt(b.amount), height: (b.amount / max * 100) + "%" })),
        trendCaption: s.range === "Monthly" ? MONTH_EN + " · day ranges, month to date" : s.range === "Weekly" ? "Daily spending · last seven days" : "Today · four-hour intervals",
        trendSummary: buckets.map(b => b.label + ": " + rs(b.amount)).join(", ")
      };
    })(),
    ...(() => {
      const sc = Math.max(savingsPot, s.savingsGoal, 1) * 1.12;
      return {
        savPotBig: balHero(savingsPot),
        savAcctLine: (np ? "बचतमा · " : "In savings · ") + savingsSources.length + (savingsSources.length === 1 ? " account" : " accounts")
          + " · " + Math.round(Math.max(0, savingsPot) / Math.max(s.savingsGoal, 1) * 100) + (np ? "% आधार" : "% of baseline"),
        // Saved up to the baseline (navy), the gap still to reach it (striped amber), anything above it (green).
        savSavedW: Math.max(0, Math.min(savingsPot, s.savingsGoal)) / sc * 100 + "%",
        savGapW: floorShort / sc * 100 + "%",
        savSurW: surplus / sc * 100 + "%",
        baseLeft: s.savingsGoal / sc * 100 + "%"
      };
    })(),
    ...(() => {
      const isIn = s.flowDir === "credit";
      const list = s.tx.filter(t => t.dir === (isIn ? "credit" : "debit") && inWin(t));
      return {
        flowName: isIn ? (np ? "आम्दानी" : "Income") : (np ? "खर्च" : "Expenses"),
        flowHeadLabel: (isIn ? (np ? "आम्दानी · " : "Came in · ") : (np ? "खर्च · " : "Spent · ")) + perName,
        flowBig: whole(isIn ? periodIn : periodOut),
        flowBigFg: isIn ? "var(--pos)" : "var(--ink)",
        flowSub: isIn ? "" : vsSentence(periodOut, prevTotal),
        flowSubFg: isIn ? "var(--ink3)" : deltaChip(periodOut, prevTotal).fg,
        flowListTitle: isIn ? (np ? "जम्मा भएका" : "Deposits") : (np ? "खर्चहरू" : "Spends"),
        flowCount: list.length + (isIn ? (list.length === 1 ? " deposit" : " deposits") : (list.length === 1 ? " spend" : " spends")),
        flowRows: list.map(txCard("flow", dayMeta)),
        flowEmptyLine: list.length ? "" : isIn ? "No income in this period" : "No spending in this period"
      };
    })()
  };
}
