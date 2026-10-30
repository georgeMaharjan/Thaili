import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppController } from "../application/controller.ts";
import { SCREENS, isScreen } from "../application/routes.ts";
import { initialState } from "../application/state.ts";
import { accountBalances } from "../lib/finance.ts";
import { hydrated, snapshot } from "../lib/pouch.ts";
import Screens from "../screens/index.tsx";
import { NEPAL_BFIS } from "../lib/nepal-bfis.ts";
import { institutionForAccount } from "../lib/institutions.ts";

const app = new AppController({});
// A synchronous state writer exercises the same commands/models without browser or native effects.
app.patch = (update, done) => { app.state = { ...app.state, ...(typeof update === "function" ? update(app.state) : update) }; done?.(); };
app.auth = async () => ({ ok: true });
app.state = { ...initialState(), loaded: true, splash: false };
app.renderVals().toPermission(); assert.equal(app.state.screen, "register");
app.patch({ regName: "Fixture User", regPhone: "9800000000" }); app.renderVals().regSubmit();
assert.equal(app.state.user!.phone, "+9779800000000"); assert.equal(app.state.screen, "permission");
app.renderVals().detectManual(); assert.equal(app.state.sources[0].key, "cash");
app.go("src-new", { newSrcKind: "manual", newSrcName: "Savings", newSrcAmt: "10000", newSrcRole: "savings", srcNewFrom: "source" });
app.renderVals().newSrcCreate(); assert.equal(app.state.sources.length, 2);
const savings = app.state.sources.find(s => s.key !== "cash")!;
app.patch({ sources: app.state.sources.map(s => ({ ...s, openedAt: "2026-10-01T00:00:00Z" })) });
assert.equal(app.state.roles[savings.key], "savings");
app.renderVals().setupNext(); assert.equal(app.state.screen, "cats");
app.renderVals().catsNext(); assert.equal(app.state.screen, "baseline");
app.patch({ baseAmt: "", baseFresh: false });
app.renderVals().baseKeys.find(k => k.label === "0")!.tap();
app.renderVals().baseKeys.find(k => k.label === "5")!.tap();
assert.equal(app.state.baseAmt, "5");
app.patch({ baseAmt: "0" });
app.renderVals().baseKeys.find(k => k.label === ".")!.tap();
app.renderVals().baseKeys.find(k => k.label === "5")!.tap();
assert.equal(app.state.baseAmt, "0.5");
app.patch({ baseAmt: "200000" });
app.renderVals().baseSave(); assert.equal(app.state.screen, "home"); assert.equal(app.state.setupComplete, true);

app.renderVals().toAdd(); app.patch({ addEntry: "100.50", addNote: "Tea", addSrc: savings.key, addCat: "food" });
app.renderVals().commitAdd(); assert.equal(app.state.tx.length, 1);
assert.equal(app.state.tx[0].amt, 100.5); assert.equal(accountBalances(app.state.sources, app.state.tx)[savings.key], 9899.5);
const tx = app.state.tx[0];
app.openDetail(tx.id, "txns"); app.patch({ remarkDraft: "A personal note" }); app.renderVals().remarkSave();
assert.equal(app.state.tx[0].rem, "A personal note"); app.renderVals().undo(); assert.equal(app.state.tx[0].rem, "Tea");
app.transactions.setCat(tx.id, "grocery", "Groceries"); assert.equal(app.state.tx[0].cat, "grocery");
app.renderVals().undo(); assert.equal(app.state.tx[0].cat, "food");
await app.renderVals().confirmDelete(); assert.equal(app.state.tx.length, 0); app.renderVals().undo(); assert.equal(app.state.tx.length, 1);
app.renderVals().toGoalNew(); app.patch({ goalName: "Laptop", goalAmt: "50000" }); app.renderVals().goalCreate();
assert.equal(app.state.screen, "goals"); assert.equal(app.state.goals[0].target, 50000);
const saved = snapshot(app.state), restored = hydrated(saved);
assert.equal(restored.tx[0].id, tx.id); assert.equal(restored.user!.name, "Fixture User"); assert.equal(restored.goals[0].name, "Laptop");
assert.equal("goalAmt" in saved.prefs, false); assert.equal("off" in saved.tx[0], false);

// The full catalog is reachable in the real account form, and selection drives saved identity.
app.go("src-new", { newSrcKind: "bank", newSrcName: "Nabil Bank", newSrcAmt: "5000", newSrcAcct: "1234" });
assert.equal(app.renderVals().newSrcNameOptions.length, 106);
for (const institution of NEPAL_BFIS) {
  app.renderVals().pickSrcName({ target: { value: institution.name } });
  assert.equal(app.state.newSrcName, institution.name);
}
app.renderVals().pickSrcName({ target: { value: "Unknown Bank" } });
assert.equal(app.state.newSrcName, NEPAL_BFIS.at(-1)!.name);
app.renderVals().pickSrcName({ target: { value: "Prime Commercial Bank" } });
const accountForm = renderToStaticMarkup(createElement(Screens, { v: app.renderVals() }));
assert.ok(accountForm.includes('aria-label="Which bank"'));
for (const institution of NEPAL_BFIS) assert.ok(accountForm.includes('value="' + institution.name.replace(/&/g, "&amp;") + '"'));
app.renderVals().newSrcCreate();
assert.equal(institutionForAccount(app.state.sources.at(-1)!)?.key, "prime");

// Retired prototypes cannot be reached or invoked. Review notes use Details' real editor.
for (const retired of ["signup", "restore", "merge", "sync"]) {
  assert.equal(isScreen(retired), false); assert.throws(() => app.go(retired), /Unknown screen/);
}
for (const action of ["authSubmit", "restoreNow", "mergeNow", "backupNow", "stopThis", "deleteSynced", "cardNote", "cardReceipt"]) {
  assert.equal(action in app.renderVals(), false, action);
}
app.go("settings");
const settingsMarkup = renderToStaticMarkup(createElement(Screens, { v: app.renderVals() }));
assert.ok(settingsMarkup.includes("Thaili cloud sync and backup are unavailable."));
assert.ok(!settingsMarkup.includes("Sync settings"));
app.patch({ storageStatus: { kind: "error", pending: false } });
assert.ok(app.renderVals().storageLine.includes("Keep Thaili open"));
app.go("stack");
const reviewMarkup = renderToStaticMarkup(createElement(Screens, { v: app.renderVals() }));
assert.ok(!reviewMarkup.includes("Receipt")); assert.ok(!reviewMarkup.includes("Typed in the notification"));

// All routes render with an empty pouch and with the completed setup, in both languages.
const populated = app.state;
let renders = 0;
for (const screen of SCREENS) for (const empty of [true, false]) for (const lang of ["EN", "NP"] as const) {
  app.state = { ...(empty ? initialState() : populated), screen, lang };
  const markup = renderToStaticMarkup(createElement(Screens, { v: app.renderVals() }));
  assert.ok(markup.length > 0, screen); renders++;
}
assert.equal(renders, SCREENS.length * 4);
app.componentWillUnmount();
console.log("application flow: setup, account creation, transaction edits/delete/undo, goals, persistence and all supported route renders pass");
