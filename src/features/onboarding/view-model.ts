import { CASH, SRC_KINDS, isManualSrc, needsAcctNumber, now, tailName } from "../../application/config";
import type { AppController } from "../../application/controller";
import type { Account, Category } from "../../domain/models";
import { isDevice, openAppSettings, openNotificationAccess, readSms, requestSms } from "../../lib/device";
import { digits10, fmt, rs, validPhone } from "../../lib/format";
import { applyImportResult } from "../../lib/import-transactions";
import { appendMoneyAccounts, sourceForMoneyApp } from "../../lib/money-apps";
import type { ViewContext } from "../context";
export function onboardingViewModel(app: Pick<AppController, "go" | "patch" | "startDetection" | "cancelDetection" | "state" | "flash" | "startSetup" | "smsToTx" | "editSource" | "importData">, context: Pick<ViewContext, "s" | "DAYS_IN_MONTH" | "income" | "freeToSpend" | "T" | "np" | "allCats" | "incomeCats" | "clabel" | "scanAccts" | "scanGroups" | "isEss" | "essMonthly" | "baseFor" | "srcMissing" | "detectAccounts" | "detAvailable" | "detOnKeys">) {
  const { s, DAYS_IN_MONTH, income, freeToSpend, T, np, allCats, incomeCats, clabel, scanAccts, scanGroups, isEss, essMonthly, baseFor, srcMissing, detectAccounts, detAvailable, detOnKeys } = context;
  // "Food", "food " and "FOOD" are one category.
  const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();
  // Deleted categories keep their label on past transactions; rules filing into them go.
  const deleteCat = (c: Category) => {
    const save = s.customCats.some(x => x.key === c.key) ? s.customCats.map(x => x.key === c.key ? { ...x, gone: true } : x) : s.customCats.concat([{ ...c, gone: true }]);
    const undo = { customCats: s.customCats, picked: s.picked, rules: s.rules };
    app.patch({ customCats: save, picked: s.picked.filter(k => k !== c.key), rules: s.rules.filter(r => r.cat !== c.key), catDeleting: null });
    app.flash(c.label + " deleted", undo);
  };
  const pendingCat = allCats.concat(incomeCats).find(c => c.key === s.catDeleting);
  const pendingTx = pendingCat ? s.tx.filter(t => t.cat === pendingCat.key).length : 0;
  const pendingRules = pendingCat ? s.rules.filter(r => r.cat === pendingCat.key).length : 0;
  const dupLine = (name: string) => np ? "“" + name + "” पहिल्यै छ" : "“" + name + "” already exists";
  return {
    obBack: () => {
      if (s.screen === "cats") { app.go(s.catsMode === "edit" ? (s.catsFrom || "settings") : "scan"); return; }
      const m: Record<string, string> = { permission: "welcome", detect: "permission", source: "detect", scan: "source" };
      app.go(m[s.screen] || "welcome");
    },
    catsEdit: s.catsMode === "edit",
    catsStepLabel: s.catsMode === "edit" ? T.editCats : T.step5,
    scanSkipTap: () => {
      const at = Date.now();
      app.go(s.perms[0] ? "cats" : "permission", {
        scanTx: [], scanResult: null, scanOrphans: 0,
        ...(s.perms[0] ? { captureStartAt: at, smsSince: at, notificationSince: at } : {}),
      });
    },
    detectScanning: s.detState === "scanning",
    detectDone: s.detState === "done",
    toDetect: () => app.startDetection("setup"),
    detectRetry: () => app.startDetection(s.detFrom),
    detectAccounts,
    detectStep: detectAccounts ? (np ? "खाता खोज्नुहोस्" : "Find accounts") : T.step2,
    detectAddedLabel: np ? "पहिल्यै थपिएको" : "Already added",
    detectCanAdd: detAvailable.length > 0,
    detectSkipLabel: detectAccounts ? (np ? "खाताहरूमा फर्कनुहोस्" : "Back to accounts") : "Skip — I'll add accounts by hand",
    detectBack: () => { app.cancelDetection(); app.go(detectAccounts ? "accounts" : "permission"); },
    detectManual: () => {
      if (detectAccounts) {
        app.cancelDetection();
        app.go("src-new", { srcNewFrom: "accounts", editSrcKey: null, newSrcAmt: "", newSrcAcct: "" });
      } else {
        app.go("source", { sources: [CASH], roles: { cash: "spending" } });
      }
    },
    detectError: s.detState === "error",
    detectUnavailable: s.detState === "unsupported",
    detectTitle: s.detState === "scanning" ? "Looking for your banks and wallets"
      : s.detState === "error" ? "Couldn't scan your apps"
        : s.detState === "unsupported" ? "App scanning needs Android"
          : detectAccounts && s.detFound.length && !detAvailable.length ? "No new banks or wallets found"
            : !s.detFound.length ? "No banks or wallets found"
              : s.detFound.length + (s.detFound.length === 1 ? " bank or wallet" : " banks and wallets") + " on this phone",
    detectSub: s.detState === "scanning"
      ? "Thaili checks installed apps and recognized bank transaction SMS when permitted. It never opens banking apps or asks for a login."
      : s.detState === "error" ? "We couldn't read the installed-app list. Try again or add your accounts by hand."
        : s.detState === "unsupported" ? "Open Thaili on your Android phone to find installed banking and wallet apps. You can add accounts by hand here."
          : detectAccounts && s.detFound.length && !detAvailable.length ? "All the banks and wallets found are already in your accounts. Scan again after installing a new app or receiving bank alerts."
            : detectAccounts && s.detFound.length ? "Select the banks and wallets to add. Existing accounts are marked below. Add each new account’s balance and last four digits afterward."
              : detectAccounts ? "No banking apps or recognized transaction SMS were found. Scan again or add an account by hand."
                : s.detFound.length ? "Untick anything you don't actually use. Anything the scan can't see — a sahakari, an FD, cash — you add on the next screen."
                  : "No banking apps or recognized transaction SMS were found. Scan again or add accounts by hand on the next screen.",
    detectRows: s.detFound.map(d => {
      const added = detectAccounts && !!sourceForMoneyApp(d, s.sources);
      return {
        key: d.key, app: d.app, added,
        detail: (d.kind === "bank" ? "Bank" : "Wallet") + " · " + (s.detTails[d.key] ? "ending " + s.detTails[d.key] + ", seen in your messages" : d.packages.length ? "installed app" : "transaction SMS"),
        border: !added && s.detOn[d.key] ? "var(--action)" : "var(--line)",
        justify: s.detOn[d.key] ? "flex-end" : "flex-start",
        track: s.detOn[d.key] ? "var(--pos)" : "var(--barDim)",
        tap: () => { if (!added) app.patch({ detOn: Object.assign({}, s.detOn, { [d.key]: !s.detOn[d.key] }) }); }
      };
    }),
    detectCta: detOnKeys.length ? "Add " + detOnKeys.length + (detOnKeys.length === 1 ? " account" : " accounts") : "Pick at least one",
    detectCtaBg: detOnKeys.length ? "var(--action)" : "var(--surface2)",
    detectCtaFg: detOnKeys.length ? "var(--onAction)" : "var(--ink3)",
    detectConfirm: () => {
      if (!detOnKeys.length) return;
      const made: Account[] = detAvailable.filter(d => s.detOn[d.key]).map(d => {
        const kind = SRC_KINDS.filter(k => k.key === d.kind)[0];
        return {
          key: d.key, base: d.base, name: tailName(d.base, s.detTails[d.key] || null), short: d.base, packages: d.packages,
          type: kind.type, dot: kind.dot, opening: 0, acct: s.detTails[d.key] || null
        };
      });
      if (detectAccounts) {
        const merged = appendMoneyAccounts(app.state.sources, made, app.state.roles);
        app.go("accounts", { sources: merged.sources, roles: merged.roles });
        app.flash("Added " + merged.added.length + (merged.added.length === 1 ? " account" : " accounts") + " — tap each new account to set its balance and details");
        return;
      }
      made.push(CASH);
      const roles: Record<string, string> = {};
      made.forEach(x => { roles[x.key] = "spending"; });
      app.go("source", { sources: made, roles: roles });
    },
    detectSkip: () => {
      app.cancelDetection();
      if (detectAccounts) { app.go("accounts"); return; }
      app.patch({
        sources: [CASH],
        roles: { cash: "spending" }, screen: "source"
      });
      app.flash("Nothing added from the scan — add accounts by hand");
    },
    catsNext: () => {
      if (s.picked.length < 3) return;
      if (s.catsMode === "edit") { app.go(s.catsFrom || "settings"); app.flash("Categories saved"); return; }
      // Setup's last step: pick the savings baseline, 3 months of essentials suggested.
      app.go("baseline", { baseSetup: true, baseFrom: "cats", baseAmt: String(essMonthly ? baseFor(3) : s.savingsGoal), baseFresh: true });
    },
    toPermission: () => app.startSetup(),
    restoreLabel: np ? "ब्याकअपबाट फिर्ता ल्याउनुहोस्" : "Restore from a backup",
    restorePick: (event: { target: { files?: FileList | null; value: string } }) => {
      void app.importData(event.target.files?.[0]);
      event.target.value = ""; // picking the same file again still fires
    },
    toCats: () => {
      if (s.screen === "scan" && s.scanResult) { // "Import them"
        app.patch({ tx: applyImportResult(s.tx, s.scanResult), scanTx: [], scanResult: null,
          captureStartAt: Math.max(0, (s.smsSince ?? Date.now()) - 90 * 86400000), notificationSince: null });
        app.flash(s.scanTx.length + " transactions imported");
      }
      app.go("cats");
    },
    setupContinue: srcMissing.length
      ? srcMissing.length + (srcMissing.length === 1 ? " account still needs its details" : " accounts still need their details")
      : "Continue with " + s.sources.length + (s.sources.length === 1 ? " account" : " accounts"),
    setupCtaBg: srcMissing.length ? "var(--surface2)" : "var(--action)",
    setupCtaFg: srcMissing.length ? "var(--ink3)" : "var(--onAction)",
    setupNext: () => {
      if (!srcMissing.length) {
        if (!s.perms[0]) {
          const at = Date.now();
          app.go("cats", { captureStartAt: s.captureStartAt ?? at, smsSince: s.smsSince ?? at, notificationSince: s.notificationSince ?? at });
          return;
        }
        const t0 = Date.now();
        readSms(t0 - 90 * 86400000).then(msgs => {
          const r = app.smsToTx(msgs, app.state.tx);
          app.go("scan", { scanTx: r.tx, scanResult: r, scanOrphans: r.orphans, smsSince: t0 });
        });
        return;
      }
      app.flash("Tap " + srcMissing[0].name + " to add its " + (needsAcctNumber(srcMissing[0]) ? "account number and balance" : "balance"));
    },
    setupSources: s.sources.map(x => ({
      name: x.name, detail: x.type, dot: x.dot,
      acct: isManualSrc(x) ? "No number needed" : /Wallet/.test(x.type) ? (x.acct ? "Mobile ending " + x.acct.slice(-4) : "No number needed") : x.acct ? "A/C ending " + x.acct.slice(-4) : "Last 4 digits needed",
      acctFg: !needsAcctNumber(x) || x.acct ? "var(--ink3)" : "var(--warnInk)",
      opening: isManualSrc(x) || x.openedAt ? rs(x.opening) : "Rs —",
      openFg: isManualSrc(x) || x.openedAt ? "var(--ink2)" : "var(--action)",
      openLabel: isManualSrc(x) || x.openedAt ? "opening" : "set balance",
      tap: () => app.editSource(x.key)
    })),
    perms: [
      { name: "Read bank SMS", detail: "Recognized bank and wallet senders. 90 days of transaction history, then ongoing." },
      { name: "Notification access", detail: "Reads transaction alerts from detected bank and wallet apps. Logs amounts and money in or out." }
    ].map((p, i) => ({
      name: p.name, detail: p.detail,
      justify: s.perms[i] ? "flex-end" : "flex-start",
      track: s.perms[i] ? "var(--pos)" : "var(--barDim)",
      tap: () => {
        if (!isDevice) { app.patch({ perms: s.perms.map((v, j) => j === i ? !v : v) }); return; } // browser preview
        if (i === 1) { openNotificationAccess(); return; } // system page; refreshed on return
        if (s.perms[0]) { openAppSettings(); app.flash("Turn SMS off under Permissions"); return; } // only Android can revoke
        requestSms().then(p => {
          app.patch({ perms: [p.sms, p.notifications] });
          if (!p.sms) app.flash("SMS stays off — Thaili works on quick add and notifications");
        });
      }
    })),
    permNote: s.perms[0]
      ? "The system dialog next looks alarming. It's the standard Android one."
      : "Without SMS, Thaili runs on quick add and wallet notifications. You can turn SMS on any time.",
    permCta: s.perms[0] ? (np ? "अनुमति दिनुहोस्, फोन स्क्यान गर्नुहोस्" : "Allow, then scan this phone") : (np ? "SMS बिना अगाडि बढ्नुहोस्" : "Continue without SMS"),
    scanTitle: !s.perms[0] ? "Nothing to scan — and that's fine"
      : s.scanTx.length ? "Found " + s.scanTx.length + " transactions across " + scanAccts + (scanAccts === 1 ? " account" : " accounts")
        : "No bank messages in the last 90 days",
    scanSub: !s.perms[0]
      ? "With SMS off there's no history to read. Thaili starts empty and fills up as you add spends by hand."
      : s.scanTx.length ? "Ninety days, already sorted where the merchant was recognisable. The rest is grouped so it's a handful of decisions."
        + (s.scanOrphans ? " " + s.scanOrphans + " more came from accounts you haven't added." : "")
        : "Nothing matched your accounts" + (s.scanOrphans ? " — " + s.scanOrphans + " messages came from banks you haven't added." : ". New messages are picked up from now on."),
    scanGroups: !s.perms[0] ? [
      { label: "Quick add", meta: "The + button, three taps per spend", tag: "Ready", tagBg: "var(--tintG)", tagFg: "var(--pos)" },
      { label: "Notification access", meta: "Bank and wallet transaction alerts still work without SMS", tag: s.perms[1] ? "On" : "Off", tagBg: "var(--tintN)", tagFg: "var(--navy)" }
    ] : scanGroups.slice(0, 4).map(g => {
      const tag = g.dir === "credit" ? "Income" : g.cat ? clabel(g.cat) : "Needs you";
      const ok = g.dir === "credit" || g.cat;
      return {
        label: g.m + " × " + g.n, meta: rs(g.amt) + (ok ? " · recognised" : " · needs a category"),
        tag: tag, tagBg: ok ? "var(--tintG)" : "var(--tintW)", tagFg: ok ? "var(--pos)" : "var(--warnInk)"
      };
    }),
    scanCta: s.perms[0] && s.scanTx.length ? "Import them" : s.perms[0] ? "Continue" : "Start empty",
    scanSkip: s.perms[0] ? (s.scanTx.length ? "Skip — start from today" : "") : "Go back and allow SMS",
    saveTargetLabel: fmt(s.saveTarget),
    saveUp: () => app.patch({ saveTarget: s.saveTarget + 1000 }),
    saveDown: () => app.patch({ saveTarget: Math.max(1000, s.saveTarget - 1000) }),
    saveTargetNote: "On " + rs(income) + " coming in, that leaves " + rs(freeToSpend) + " free to spend — about " + rs(Math.round(freeToSpend / DAYS_IN_MONTH / 10) * 10) + " a day.",
    newCatName: s.newCatName,
    newCatType: (e: { target: { value: string } }) => app.patch({ newCatName: e.target.value }),
    newCatFg: s.newCatName.trim() ? "var(--action)" : "var(--ink3)",
    newCatIn: s.newCatIn,
    catDirs: [false, true].map(isIn => ({
      label: isIn ? "Money in" : "Money out", tap: () => app.patch({ newCatIn: isIn }),
      bg: s.newCatIn === isIn ? "var(--surface)" : "transparent", fg: s.newCatIn === isIn ? "var(--ink)" : "var(--ink3)",
    })),
    addCatNote: s.newCatIn
      ? "Where your money comes from. Offered when you log money in."
      : "Anything the list misses. Rules can file into it.",
    // Renames and deletes of built-ins are stored in customCats under the same key; deleted
    // categories keep their label on past transactions, and rules filing into them are removed.
    catRows: (s.newCatIn ? incomeCats : allCats).map((c, _, list) => {
      const save = (change: Partial<Category>) => s.customCats.some(x => x.key === c.key)
        ? s.customCats.map(x => x.key === c.key ? { ...x, ...change } : x)
        : s.customCats.concat([{ ...c, ...change }]);
      return {
        key: c.key + "|" + c.label, label: c.label,
        // Pick and essential/optional only apply to money-out categories.
        on: c.in ? null : s.picked.includes(c.key),
        toggle: () => app.patch({ picked: s.picked.includes(c.key) ? s.picked.filter(k => k !== c.key) : s.picked.concat([c.key]) }),
        ess: isEss(c.key),
        toggleEss: () => app.patch({ ess: Object.assign({}, s.ess, { [c.key]: !isEss(c.key) }) }),
        rename: (e: { target: { value: string } }) => {
          const label = e.target.value.trim().replace(/\s+/g, " ");
          if (!label || label === c.label) return;
          if (list.some(x => x.key !== c.key && sameName(x.label, label))) { e.target.value = c.label; app.flash(dupLine(label)); return; }
          app.patch({ customCats: save({ label }) });
        },
        // In use: confirm first, so nobody loses a category their entries and rules rely on.
        remove: () => s.tx.some(t => t.cat === c.key) || s.rules.some(r => r.cat === c.key) ? app.patch({ catDeleting: c.key }) : deleteCat(c),
      };
    }),
    catDeleteOpen: !!pendingCat,
    catDeleteTitle: pendingCat ? (np ? pendingCat.label + " मेटाउने?" : "Delete " + pendingCat.label + "?") : "",
    catDeleteLine: np
      ? pendingTx + " कारोबार यो वर्गमा छन्। तिनले यही नाम राख्छन्" + (pendingRules ? ", तर यसमा फाइल गर्ने " + pendingRules + " नियम हट्नेछन्।" : "।")
      : pendingTx + (pendingTx === 1 ? " transaction is" : " transactions are") + " filed under it. They keep this label" + (pendingRules ? ", but " + pendingRules + (pendingRules === 1 ? " rule that files" : " rules that file") + " into it will be removed." : ", but you can't pick it for new entries."),
    catDeleteCancel: () => app.patch({ catDeleting: null }),
    catDeleteConfirm: () => { if (pendingCat) deleteCat(pendingCat); },
    addCustomCat: () => {
      const name = s.newCatName.trim().replace(/\s+/g, " ");
      if (!name) return;
      if ((s.newCatIn ? incomeCats : allCats).some(c => sameName(c.label, name))) { app.flash(dupLine(name)); return; }
      const key = "c" + Date.now();
      app.patch({
        customCats: s.customCats.concat([s.newCatIn ? { key, label: name, in: true } : { key, label: name }]),
        picked: s.newCatIn ? s.picked : s.picked.concat([key]), newCatName: ""
      });
      app.flash(name + (s.newCatIn ? " added" : " added and switched on"));
    },
    catCta: s.picked.length >= 3 ? (s.catsMode === "edit" ? T.done : (np ? "अगाडि" : "Next")) : (np ? "कम्तीमा तीन छान्नुहोस्" : "Pick at least three"),
    catCtaBg: s.picked.length >= 3 ? "var(--action)" : "var(--surface2)",
    catCtaFg: s.picked.length >= 3 ? "var(--onAction)" : "var(--ink3)",
    ...(() => {
      const ph = digits10(s.regPhone), phoneOk = validPhone(ph), nameOk = s.regName.trim().length >= 2, ready = phoneOk && nameOk;
      return {
        regLabels: np ? { name: "नाम", phone: "मोबाइल नम्बर" } : { name: "Name", phone: "Mobile number" },
        regNamePh: np ? "तपाईंको पूरा नाम" : "Your full name",
        regCanBack: s.regThen === "permission",
        regBack: () => app.go("welcome"),
        regStepLabel: np ? "तपाईंको खाता" : "Your account",
        regTitle: np ? "नाम र फोन नम्बर" : "Your name and number",
        regSub: np ? "थैली यही नामले तपाईंलाई चिन्छ।" : "So Thaili knows whose pouch this is.",
        regName: s.regName, regNameType: (e: { target: { value: string } }) => app.patch({ regName: e.target.value.slice(0, 40) }),
        regNameBorder: nameOk ? "var(--pos)" : "var(--line)",
        regPhone: ph, regPhoneType: (e: { target: { value: string } }) => app.patch({ regPhone: digits10(e.target.value) }),
        regPhoneBorder: phoneOk ? "var(--pos)" : ph.length === 10 ? "var(--action)" : "var(--line)",
        regPhoneHint: phoneOk ? (np ? "ठीक छ।" : "Looks right.") : ph.length === 10 ? T.badPhone : (np ? "कसैलाई देखाइँदैन।" : "Never shown to anyone."),
        regPhoneHintFg: phoneOk ? "var(--pos)" : ph.length === 10 ? "var(--action)" : "var(--ink3)",
        regCta: ready ? (np ? "अगाडि बढ्नुहोस्" : "Continue") : (np ? "नाम र नम्बर लेख्नुहोस्" : "Add your name and number"),
        regCtaBg: ready ? "var(--action)" : "var(--surface2)", regCtaFg: ready ? "var(--onAction)" : "var(--ink3)",
        regFine: np ? "थैलीले तपाईंको नम्बर कसैलाई दिँदैन।" : "Thaili never shares your number.",
        regSubmit: () => {
          if (!ready) return;
          const user = { name: s.regName.trim(), phone: "+977" + ph, createdAt: now() };
          app.go(s.regThen || "permission", { user: user, regName: "", regPhone: "" });
          app.flash((np ? "स्वागत छ, " : "Welcome, ") + user.name.split(/\s+/)[0]);
        }
      };
    })()
  };
}
