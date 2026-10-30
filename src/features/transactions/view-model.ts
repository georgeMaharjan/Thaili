import { SI, WD_FULL } from "../../application/config";
import type { AppController } from "../../application/controller";
import { adOf, monthName, npDigits } from "../../lib/bs";
import { rs } from "../../lib/format";
import { checkRule, hay, words } from "../../lib/rules";
import { evidenceFor } from "../../lib/transaction-capture";
import { filterEntries } from "../../lib/transactions";
import type { ViewContext } from "../context";
export function transactionsViewModel(app: Pick<AppController, "patch" | "back" | "transactions" | "transactions" | "transactions" | "go" | "transactions" | "transactions">, context: Pick<ViewContext, "s" | "MONTH_KEY" | "dayOf" | "bsLabel" | "bsDay" | "adLabel" | "np" | "allCats" | "incomeCats" | "clabel" | "cats" | "detail" | "srcOf" | "chip" | "isEss" | "catDot" | "filterContext" | "appliedFilters" | "filtered" | "draftFilters" | "previewFilters" | "previewRows" | "filteredTotals" | "rows" | "calY" | "calM" | "calDays" | "offOf" | "calLo" | "calHi" | "fit" | "debitCount" | "autoFiled">) {
  const { s, MONTH_KEY, dayOf, bsLabel, bsDay, adLabel, np, allCats, incomeCats, clabel, cats, detail, srcOf, chip, isEss, catDot, filterContext, appliedFilters, filtered, draftFilters, previewFilters, previewRows, filteredTotals, rows, calY, calM, calDays, offOf, calLo, calHi, fit, debitCount, autoFiled } = context;
  return {
    txRows: rows,
    txCount: filtered.length,
    txTotals: { income: rs(filteredTotals.income), expenses: rs(filteredTotals.expenses) },
    txRange: s.txRange,
    txRangeSet: (e: { target: { value: string } }) => e.target.value === "custom" ? app.patch({ calOpen: true, calA: s.txFrom, calB: s.txTo }) : app.patch({ txRange: e.target.value }),
    txFilterCount: s.txCategories.length + (s.txSpending !== "all" ? 1 : 0) + (s.txFilter === "review" ? 1 : 0),
    txFilterSummary: [s.txSpending !== "all" ? (s.txSpending === "essential" ? "Essential" : "Optional") : "", s.txCategories.length ? s.txCategories.length + (s.txCategories.length === 1 ? " category" : " categories") : "", s.txFilter === "review" ? "Needs review" : ""].filter(Boolean).join(" · "),
    txReset: () => app.patch({ txQuery: "", txCategories: [], txSpending: "all", txFilter: "all", txRange: "month" }),
    filtersOpen: s.filtersOpen,
    filtersShow: () => app.patch({ filtersOpen: true, filterDraft: { ...appliedFilters, categories: [...s.txCategories] } }),
    filtersClose: () => app.patch({ filtersOpen: false, filterDraft: null }),
    filterSpending: draftFilters.spending,
    filterSpendingSet: (value: string) => app.patch({ filterDraft: { ...draftFilters, spending: value } }),
    filterReview: draftFilters.review,
    filterReviewSet: () => app.patch({ filterDraft: { ...draftFilters, review: !draftFilters.review } }),
    filterCategories: allCats.concat(incomeCats).filter(c => s.picked.includes(c.key) || s.tx.some(t => t.cat === c.key) || draftFilters.categories.includes(c.key)).concat([{ key: "uncategorised", label: "Uncategorised" }, { key: "transfer", label: "Transfers" }]).map(c => ({
      key: c.key, label: c.label, selected: draftFilters.categories.includes(c.key),
      count: filterEntries(s.tx, { ...previewFilters, categories: [c.key] }, filterContext).length,
      tap: () => app.patch({ filterDraft: { ...draftFilters, categories: draftFilters.categories.includes(c.key) ? draftFilters.categories.filter(k => k !== c.key) : [...draftFilters.categories, c.key] } }),
    })),
    filterResultCount: previewRows.length,
    filtersReset: () => app.patch({ filterDraft: { ...draftFilters, categories: [], spending: "all", review: false } }),
    filtersApply: () => app.patch({ txCategories: draftFilters.categories, txSpending: draftFilters.spending, txFilter: draftFilters.review ? "review" : "all", filtersOpen: false, filterDraft: null }),
    dateChips: [["today", "Today"], ["week", "Week"], ["month", "Month"],
    ["custom", s.txRange !== "custom" ? "Custom" : s.txFrom === s.txTo ? bsDay(s.txFrom ?? 0) : bsDay(s.txFrom ?? 0) + " – " + bsDay(s.txTo ?? 0)]
    ].map(([k, label]) => {
      const on = s.txRange === k;
      return {
        label: label, isCustom: k === "custom", bg: on ? "var(--ink)" : "transparent", fg: on ? "var(--canvas)" : "var(--ink2)", border: on ? "var(--ink)" : "var(--line)",
        tap: () => k === "custom" ? app.patch({ calOpen: true, calA: s.txFrom, calB: s.txTo, toast: null }) : app.patch({ txRange: k, toast: null })
      };
    }),
    txEmpty: !rows.length,
    txEmptyTitle: "No matching transactions",
    txEmptyLine: "Try fewer filters, another search or a wider date range.",
    txQuery: s.txQuery,
    txQueryType: (e: { target: { value: string } }) => app.patch({ txQuery: e.target.value.slice(0, 40) }),
    txQueryClear: () => app.patch({ txQuery: "" }),
    calOpen: s.calOpen,
    calShow: () => app.patch({ calOpen: true, calA: s.txFrom, calB: s.txTo }),
    calClose: () => app.patch({ calOpen: false }),
    calPickFrom: () => app.patch({ calA: null, calB: null }),
    calPickTo: () => app.patch({ calB: null }),
    calFromLabel: s.calA !== null ? bsDay(s.calA) : "Pick a day",
    calToLabel: s.calB !== null ? bsDay(s.calB) : s.calA !== null ? "Same day" : "—",
    calFromFg: s.calA !== null ? "var(--ink)" : "var(--ink3)",
    calToFg: s.calB !== null ? "var(--ink)" : "var(--ink3)",
    calFromBorder: s.calA === null || s.calB !== null ? "var(--action)" : "var(--line)",
    calToBorder: s.calA !== null && s.calB === null ? "var(--action)" : "var(--line)",
    calTitle: monthName(s.calKey, np) + " " + (np ? npDigits(calY) : calY),
    calPrev: () => app.patch({ calKey: s.calKey - 1 }),
    calNext: () => { if (s.calKey < MONTH_KEY) app.patch({ calKey: s.calKey + 1 }); },
    calHasNext: s.calKey < MONTH_KEY,
    calCells: (() => {
      const blank = { label: "", band: "transparent", bandR: "0", bg: "transparent", fg: "var(--ink)", ring: "none", weight: 500 };
      const out: (typeof blank & { future?: boolean; tap?: () => void })[] = Array.from({ length: adOf(calY, calM, 1).getDay() }, () => blank);
      for (let d = 1; d <= calDays; d++) {
        const off = offOf(d), future = off < 0, end = calLo !== null && (off === calLo || off === calHi);
        const inR = calLo !== null && off <= calLo && off >= (calHi ?? 0), span = calLo !== null && calHi !== calLo;
        out.push({
          label: String(d), future: future,
          band: inR && span ? "var(--tintN)" : "transparent",
          bandR: span && off === calLo ? "21px 0 0 21px" : span && off === calHi ? "0 21px 21px 0" : "0",
          bg: end ? "var(--ink)" : "transparent",
          fg: end ? "var(--canvas)" : future ? "var(--barDim)" : "var(--ink)",
          ring: off === 0 && !end ? "inset 0 0 0 1.5px var(--action)" : "none",
          weight: end || off === 0 ? 700 : 500,
          tap: () => {
            if (future) return;
            if (s.calA === null || s.calB !== null) app.patch({ calA: off, calB: null });
            else if (off > s.calA) app.patch({ calA: off });
            else app.patch({ calB: off });
          }
        });
      }
      while (out.length % 7) out.push(blank);
      return out;
    })(),
    calCta: s.calA !== null ? "Show " + ((calLo ?? 0) - (calHi ?? 0) + 1) + (calLo === calHi ? " day" : " days") : "Pick a start date",
    calCtaBg: s.calA !== null ? "var(--action)" : "var(--surface2)",
    calCtaFg: s.calA !== null ? "var(--onAction)" : "var(--ink3)",
    calApply: () => { if (s.calA === null) return; app.patch({ txRange: "custom", txFrom: calLo, txTo: calHi, calOpen: false }); },
    detailAmount: (detail.dir === "credit" ? "+" : detail.dir === "transfer" ? "→ " : "−") + rs(detail.amt),
    detailKindLabel: detail.dir === "credit" ? "Income · money in" : detail.dir === "transfer" ? "Transfer" : "Expense · money out",
    detailKindIcon: detail.dir === "credit" ? SI.inA : detail.dir === "transfer" ? SI.xfer : SI.outA,
    detailFg: detail.dir === "credit" ? "var(--pos)" : detail.dir === "transfer" ? "var(--navy)" : "var(--ink)",
    detailMerchant: detail.m,
    detailFs: fit(rs(detail.amt).length + 1, 44, 10, 24),
    detailBack: app.back,
    detailCats: (detail.dir === "credit" ? incomeCats : cats).map(c => Object.assign(chip(c.label, detail.cat === c.key, () => { app.transactions.setCat(detail.id, c.key, c.label); app.patch({ editing: false }); }),
      { dot: detail.cat === c.key ? "var(--canvas)" : detail.dir === "credit" ? "var(--pos)" : catDot(c.key) })),
    detailShowCats: detail.dir !== "transfer" && s.editing,
    detailEditClose: () => app.patch({ editing: false }),
    detailDate: bsLabel(detail.off),
    detailAccount: srcOf(detail.src).name,
    detailCatsTitle: detail.dir === "credit" ? "Income category" : "Expense category",
    detailAuto: !!detail.auto,
    detailAutoLine: detail.auto ? "“" + detail.auto + "” in the message means " + clabel(detail.cat) + ". Filed without asking." : "",
    detailAutoDrop: () => {
      const r = s.rules.filter(x => x.kw === detail.auto)[0];
      if (r) app.transactions.dropRule(r.id);
    },
    promptOpen: !!s.rulePrompt,
    promptLine: s.rulePrompt ? "Every time “" + s.rulePrompt.kw + "” shows up, file it as " + s.rulePrompt.label + "?" : "",
    promptYes: () => { const p = s.rulePrompt; if (p) app.transactions.addRule(p.kw || "", p.cat, p.label); },
    promptNo: () => app.patch({ rulePrompt: null }),
    rulesBack: () => app.go("settings"),
    rulesStat: autoFiled + " of " + debitCount + " spends this month were filed by a rule. The rest asked you.",
    rulesCount: s.rules.length + (s.rules.length === 1 ? " rule" : " rules"),
    ruleNew: () => app.patch({ ruleEdit: { id: null, kw: "", cat: cats[0] ? cats[0].key : null }, toast: null }),
    ruleSheet: !!s.ruleEdit,
    ruleClose: () => app.patch({ ruleEdit: null }),
    ruleSheetTitle: s.ruleEdit && s.ruleEdit.id ? "Edit rule" : "New rule",
    ruleIsEdit: !!(s.ruleEdit && s.ruleEdit.id),
    ruleKw: s.ruleEdit ? s.ruleEdit.kw : "",
    ruleKwType: (e: { target: { value: string } }) => app.patch({ ruleEdit: Object.assign({}, s.ruleEdit, { kw: e.target.value.toUpperCase().replace(/\s+/g, " ").slice(0, 32) }) }),
    ruleKwClear: () => app.patch({ ruleEdit: Object.assign({}, s.ruleEdit, { kw: "" }) }),
    ruleRows: s.rules.map(r => ({
      kw: r.kw, cat: clabel(r.cat), catFg: isEss(r.cat) ? "var(--navy)" : "var(--warnInk)",
      edit: () => app.patch({ ruleEdit: { id: r.id, kw: r.kw, cat: r.cat }, toast: null }),
      origin: r.own ? "You taught this" : "Built in",
      matches: s.tx.filter(t => hay(t).indexOf(r.kw) > -1).length + " matched",
      drop: () => app.transactions.dropRule(r.id)
    })),
    rulesEmpty: s.rules.length === 0,
    detailFields: [
      ...(detail.dir === "transfer" ? [] : [{ label: "Category", value: detail.cat ? clabel(detail.cat) : "Not set", fg: detail.cat ? "var(--ink)" : "var(--uncat)", action: s.editing ? "" : "Change", tap: () => app.patch({ editing: true, toast: null }) }]),
      { label: "Account", value: srcOf(detail.src).name, fg: "var(--ink)" },
      ...(detail.to ? [{ label: "To account", value: srcOf(detail.to).name, fg: "var(--ink)" }] : []),
      { label: "Date", value: bsLabel(detail.off) + " · " + detail.time, fg: "var(--ink)" },
      { label: "Gregorian", value: adLabel(detail.off) + " · " + WD_FULL[dayOf(detail.off).getDay()], fg: "var(--ink3)" },
      {
        label: "Remarks", value: detail.rem || "None", fg: detail.rem ? "var(--ink)" : "var(--ink3)",
        action: s.remarkDraft != null ? "" : detail.rem ? "Edit" : "Add",
        tap: () => { if (s.remarkDraft == null) app.patch({ remarkDraft: detail.rem || "", toast: null }); }
      },
      { label: "Captured by", value: [...new Set(evidenceFor(detail).map(e => e.ch))].join(" + ") || detail.ch, fg: "var(--ink3)" },
      { label: "Receipt", value: "None attached", fg: "var(--ink3)" }
    ],
    remarkOpen: s.remarkDraft != null,
    remarkDraft: s.remarkDraft || "",
    remarkTitle: detail.rem ? "Edit the remark" : "Add a remark",
    remarkCount: (s.remarkDraft || "").length + " / 80",
    remarkType: (e: { target: { value: string } }) => app.patch({ remarkDraft: e.target.value.slice(0, 80) }),
    remarkSave: () => app.transactions.saveRemark(detail.id),
    remarkCancel: () => app.patch({ remarkDraft: null }),
    rawOpen: s.rawOpen,
    toggleRaw: () => app.patch({ rawOpen: !s.rawOpen }),
    detailRaw: detail.raw,
    askDelete: () => app.patch({ deleting: true }),
    ...(() => {
      const e = s.ruleEdit, kw = e ? words(e.kw) : "", v = e ? checkRule(kw, e.id, s.rules, allCats) : { block: true, msg: "" };
      const hits = kw ? s.tx.filter(t => t.dir === "debit" && hay(t).indexOf(kw) > -1).length : 0;
      const c = e && cats.filter(x => x.key === e.cat)[0];
      const ok = !!e && !v.block && !!c;
      return {
        ruleMsg: v.msg || "", ruleMsgFg: v.block ? "var(--action)" : "var(--warnInk)",
        ruleMsgLink: !!v.dupId,
        ruleOpenDup: () => { const d = s.rules.filter(r => r.id === v.dupId)[0]; if (d) app.patch({ ruleEdit: { id: d.id, kw: d.kw, cat: d.cat } }); },
        ruleKwBorder: v.msg && v.block ? "var(--action)" : v.warn ? "var(--warn)" : "var(--line)",
        ruleHint: !kw ? "Copy a word that always appears in this shop's SMS or notification."
          : hits ? "Matches " + hits + (hits === 1 ? " past spend" : " past spends") + " — uncategorised ones get filed on save."
            : "No past spends match yet. It will apply to new ones.",
        ruleCats: cats.map(x => Object.assign(chip(x.label, !!e && e.cat === x.key, () => app.patch({ ruleEdit: Object.assign({}, s.ruleEdit, { cat: x.key }) })),
          { dot: e && e.cat === x.key ? "var(--canvas)" : catDot(x.key) })),
        ruleSaveLabel: e && e.id ? "Save changes" : "Add rule",
        ruleSaveBg: ok ? "var(--action)" : "var(--surface2)", ruleSaveFg: ok ? "var(--onAction)" : "var(--ink3)",
        ruleSave: () => { if (ok) app.transactions.saveRule(c.label); },
        ruleDelete: () => { if (e && e.id) { app.patch({ ruleEdit: null }); app.transactions.dropRule(e.id); } }
      };
    })()
  };
}
