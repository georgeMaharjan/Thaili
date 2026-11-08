import { SRC_KINDS, isManualSrc, needsAcctNumber, tailName } from "../../application/config";
import type { AppController } from "../../application/controller";
import { openNotificationAccess } from "../../lib/device";
import { balRs, fmt, rs } from "../../lib/format";
import type { ViewContext } from "../context";

export function accountsViewModel(app: Pick<AppController, "patch" | "go" | "startDetection" | "flash" | "editSource" | "openDetail">, context: Pick<ViewContext, "s" | "dayLabel" | "balance" | "np" | "shownSrc" | "amtStr" | "txLook" | "amtFg" | "acctGrand" | "acctGroups" | "chip" | "savingsPot" | "newKind" | "newSrcAmtNum" | "newSrcAmtValid" | "needAcct" | "acctOk" | "inTxWin" | "txCard">) {
  const { s, dayLabel, balance, np, shownSrc, acctGrand, acctGroups, chip, savingsPot, newKind, newSrcAmtNum, newSrcAmtValid, needAcct, acctOk, inTxWin, txCard } = context;
  // Everything that moved this account's money in the chosen dates — transfers into it included.
  const srcList = s.tx.filter(t => (t.src === s.srcKey || (t.dir === "transfer" && t.to === s.srcKey)) && inTxWin(t));
  const intoSrc = (t: { src: string; dir: string }) => t.dir === "credit" || (t.dir === "transfer" && t.src !== s.srcKey);
  const srcRows: ({ isHeader: true; label: string } | ReturnType<ReturnType<typeof txCard>>)[] = [];
  let lastHeader: string | null = null;
  srcList.forEach(t => {
    const label = dayLabel(t.off);
    if (label !== lastHeader) { srcRows.push({ isHeader: true, label }); lastHeader = label; }
    const card = txCard("source-detail")(t);
    // From this account's side a transfer is money in or out, not an arrow.
    srcRows.push(t.dir === "transfer" ? { ...card, amount: (intoSrc(t) ? "+" : "−") + fmt(t.amt), fg: intoSrc(t) ? "var(--pos)" : "var(--ink)" } : card);
  });
  return {
    totalMeta: s.sources.length + (np ? " खाता · " : " accounts · ") + balRs(savingsPot, s.hideBal) + (np ? " बचतमा गनिएको" : " of it counted as savings"),
    acctGroups: acctGroups,
    acctSplit: acctGroups.map(g => {
      const pct = Math.round(Math.max(0, g.sum) / acctGrand * 100) + "%";
      return { label: g.label, color: g.color, width: pct, pct: pct };
    }),
    srcNewCancel: () => { app.patch({ editSrcKey: null }); app.go(s.srcNewFrom || "accounts"); },
    scanAccountApps: () => app.startDetection("accounts"),
    enableTransactionNotifications: () => openNotificationAccess(),
    showNotifCard: !s.perms[1] && !s.notifCardHidden,
    dismissNotifCard: () => app.patch({ notifCardHidden: true }),
    transactionNotificationsLabel: np ? "कारोबारका सूचनाहरू" : "Transaction notifications",
    transactionNotificationsNote: np ? "बैंक र वालेटका सूचनाबाट आम्दानी र खर्च टिपिन्छ" : "Logs money in and out from all detected banks and wallets",
    transactionNotificationsStatus: s.perms[1] ? (np ? "चालु" : "On") : (np ? "खोल्नुहोस्" : "Enable"),
    scanAccountAppsLabel: np ? "बैंक र वालेट एप खोज्नुहोस्" : "Scan for banking & wallet apps",
    srcNewTitle: np ? (s.srcNewFrom === "source" ? "खाताको विवरण" : s.editSrcKey ? "खाता सम्पादन" : "खाता थप्नुहोस्") : s.srcNewFrom === "source" ? "Account details" : s.editSrcKey ? "Edit account" : "Add an account",
    isEditSrc: !!s.editSrcKey,
    newSrcAmountInput: s.newSrcAmt,
    newSrcAccountInput: s.newSrcAcct,
    newSrcInitialField: needAcct && s.newSrcField === "acct" ? "acct" : "amt",
    changeSourceAmount: (value: string) => app.patch({ newSrcAmt: value }),
    changeSourceAccount: (value: string) => app.patch({ newSrcAcct: value }),
    balanceFieldLabel: np ? "मौज्दात" : s.editSrcKey && s.sources.find(x => x.key === s.editSrcKey)?.openedAt ? "Current balance" : "Opening balance",
    numericEditingLabel: np ? "लेख्दै" : "Editing",
    numericEditHint: np ? "कर्सर सार्न अङ्कबीच ट्याप गर्नुहोस्। अङ्क छानेर बदल्न सकिन्छ।" : "Tap between digits to move the cursor, or select digits to replace them.",
    amountInputHint: np ? "अहिलेको मौज्दात लेख्नुहोस्। शून्य पनि राख्न सकिन्छ।" : "Enter the balance right now. Zero is allowed.",
    accountInputHint: np ? "अन्तिम ४ अङ्क मात्र · " + s.newSrcAcct.length + "/४" : "Last 4 digits only · " + s.newSrcAcct.length + "/4 entered",
    accountNextLabel: np ? "मौज्दात लेख्नुहोस्" : "Next: balance",
    clearAmountLabel: np ? "मौज्दात खाली गर्नुहोस्" : "Clear balance",
    clearAccountLabel: np ? "अन्तिम अङ्क खाली गर्नुहोस्" : "Clear account digits",
    amountInputErrors: {
      characters: np ? "अङ्क र एउटा दशमलव बिन्दु मात्र राख्नुहोस्।" : "Use digits and one decimal point.",
      length: np ? "दशमलवअघि बढीमा ९ अङ्क राख्नुहोस्।" : "Use up to 9 digits before the decimal point.",
      precision: np ? "दशमलवपछि बढीमा २ अङ्क राख्नुहोस्।" : "Use up to 2 decimal places."
    },
    accountInputErrors: {
      characters: np ? "अङ्क मात्र राख्नुहोस्।" : "Use digits only.",
      length: np ? "अन्तिम ४ अङ्क मात्र राख्नुहोस्।" : "Enter only the last 4 digits.",
      precision: np ? "अङ्क मात्र राख्नुहोस्।" : "Use digits only."
    },
    newSrcOpeningNote: s.editSrcKey
      ? "Balance — what is in " + s.newSrcName + " right now. Change it and the account is counted from this moment."
      : "Opening balance — what is in " + s.newSrcName + " right now. Every later figure is counted from here, and it locks once the first transaction lands.",
    srcNeedsAcct: needAcct,
    acctFieldLabel: np ? "खाता नम्बर · अन्तिम ४ अङ्क" : "Account number · last 4 digits",
    pickAcctField: () => app.patch({ newSrcField: "acct" }),
    pickAmtField: () => app.patch({ newSrcField: "amt" }),
    newSrcKinds: SRC_KINDS.map(k => ({
      label: k.label,
      bg: s.newSrcKind === k.key ? "var(--navy)" : "transparent",
      fg: s.newSrcKind === k.key ? "var(--canvas)" : "var(--ink2)",
      tap: () => app.patch({ newSrcKind: k.key, newSrcName: k.names[0], newSrcField: k.key === "manual" ? "amt" : s.newSrcField })
    })),
    newSrcPickLabel: newKind.key === "manual" ? "Which one" : "Which " + newKind.label.toLowerCase(),
    newSrcUsesPicker: newKind.key !== "manual",
    newSrcName: s.newSrcName,
    newSrcNameOptions: newKind.names.includes(s.newSrcName) ? newKind.names : newKind.names.concat(s.newSrcName),
    pickSrcName: (event: { target: { value: string } }) => {
      if (newKind.names.includes(event.target.value)) app.patch({ newSrcName: event.target.value });
    },
    newSrcNameChips: (newKind.names.indexOf(s.newSrcName) > -1 ? newKind.names : newKind.names.concat([s.newSrcName])).map(n => chip(n, s.newSrcName === n, () => app.patch({ newSrcName: n }))),
    newSrcRoles: [["savings", "Saving"], ["spending", "Spending"]].map(r => ({
      label: r[1],
      bg: s.newSrcRole === r[0] ? "var(--navy)" : "transparent",
      fg: s.newSrcRole === r[0] ? "var(--canvas)" : "var(--ink2)",
      tap: () => app.patch({ newSrcRole: r[0] })
    })),
    newSrcFeedNote: newKind.key === "manual"
      ? "Nothing to read here — no SMS, no notifications. You add entries by hand, so this balance only moves when you move it."
      : newKind.key === "wallet"
        ? "Thaili watches " + s.newSrcName + " notifications and matches its alerts to this account."
        : "Thaili reads recognized " + s.newSrcName + " SMS and transaction notifications from its detected app. Set the last four digits to match your account. SMS sender names and alert wording vary by bank.",
    newSrcCta: !newSrcAmtValid ? "Type the opening balance" : !acctOk ? "Add the last 4 digits" : s.editSrcKey ? "Save " + s.newSrcName : "Add " + s.newSrcName,
    newSrcCtaBg: newSrcAmtValid && acctOk ? "var(--action)" : "var(--surface2)",
    newSrcCtaFg: newSrcAmtValid && acctOk ? "var(--onAction)" : "var(--ink3)",
    newSrcCreate: () => {
      if (!newSrcAmtValid || !acctOk) return;
      const prevS = s.sources, prevR = s.roles;
      // A wallet number Thaili detected itself is kept; it is never asked for.
      const acct = needAcct ? s.newSrcAcct : newKind.key === "wallet" ? s.sources.find(x => x.key === s.editSrcKey)?.acct ?? null : null;
      const shown = tailName(s.newSrcName, acct);
      const back = s.srcNewFrom || "accounts";
      if (s.editSrcKey) {
        app.patch({
          sources: prevS.map(x => x.key === s.editSrcKey
            ? Object.assign({}, x, {
              name: shown, base: s.newSrcName, short: s.newSrcName, acct: acct, type: newKind.type, dot: newKind.dot, opening: newSrcAmtNum,
              openedAt: !x.openedAt || newSrcAmtNum !== x.opening ? new Date().toISOString() : x.openedAt
            }) : x),
          roles: Object.assign({}, prevR, { [s.editSrcKey]: s.newSrcRole }),
          screen: back, editSrcKey: null, newSrcAmt: "", newSrcAcct: ""
        });
        app.flash(shown + " updated", { sources: prevS, roles: prevR });
        return;
      }
      const key = "src" + Date.now();
      app.patch({
        sources: prevS.concat([{ key: key, name: shown, base: s.newSrcName, short: s.newSrcName, acct: acct, type: newKind.type, dot: newKind.dot, opening: newSrcAmtNum, openedAt: new Date().toISOString() }]),
        roles: Object.assign({}, prevR, { [key]: s.newSrcRole }),
        screen: back, newSrcAmt: "", newSrcAcct: ""
      });
      app.flash(shown + " added · " + rs(newSrcAmtNum) + (s.newSrcRole === "savings" ? " counted toward your floor" : " as a spending account"), { sources: prevS, roles: prevR });
    },
    srcDelete: () => {
      if (!s.editSrcKey) return;
      const prevS = s.sources, prevT = s.tx;
      app.patch({
        sources: prevS.filter(x => x.key !== s.editSrcKey),
        tx: prevT.filter(t => t.src !== s.editSrcKey),
        screen: s.srcNewFrom === "source" ? "source" : "accounts", editSrcKey: null, newSrcAmt: ""
      });
      app.flash(s.newSrcName + " removed with its " + prevT.filter(t => t.src === s.editSrcKey).length + " entries", { sources: prevS, tx: prevT });
    },
    srcDeleteLabel: "Remove " + s.newSrcName + " and everything read from it",
    srcName: shownSrc.name,
    srcBalance: balRs(balance(s.srcKey), s.hideBal, true),
    srcMeta: shownSrc.type,
    srcAcctLine: isManualSrc(shownSrc) ? "Manual account · no number to match" : shownSrc.acct ? (/Wallet/.test(shownSrc.type) ? "Mobile ending " : "A/C ending ") + shownSrc.acct.slice(-4) : /Wallet/.test(shownSrc.type) ? "Matched by wallet app" : "Last 4 digits not set",
    srcAcctFg: !needsAcctNumber(shownSrc) || shownSrc.acct ? "var(--ink3)" : "var(--warnInk)",
    srcEdit: () => app.editSource(s.srcKey),
    srcIn: fmt(srcList.filter(intoSrc).reduce((a, t) => a + t.amt, 0)),
    srcOut: fmt(srcList.filter(t => !intoSrc(t)).reduce((a, t) => a + t.amt, 0)),
    srcRows,
    srcFlowWhen: { today: np ? "आज" : "today", week: np ? "यो हप्ता" : "this week", month: np ? "यो महिना" : "this month", custom: np ? "छानिएका मिति" : "selected dates" }[s.txRange as "today"] ?? "",
    srcEmpty: !srcList.length,
    srcEmptyLine: np ? "यो मितिमा कुनै कारोबार छैन" : "No transactions in these dates",
    roleChips: [["savings", "Saving"], ["spending", "Spending"], ["", "Not set"]].map(r => ({
      label: r[1],
      bg: (s.roles[s.srcKey || ""] || "") === r[0] ? "var(--navy)" : "var(--surface2)",
      fg: (s.roles[s.srcKey || ""] || "") === r[0] ? "var(--canvas)" : "var(--ink2)",
      tap: () => {
        const prev = s.roles;
        app.patch({ roles: Object.assign({}, prev, { [s.srcKey || ""]: r[0] }) });
        app.flash(shownSrc.short + " is now " + (r[0] === "spending" ? "a spending account" : r[0] === "savings" ? "a savings account" : "unassigned — counted as savings"), { roles: prev });
      }
    })),
    sourceBack: () => app.go(s.srcFrom || "insights"),
  };
}
