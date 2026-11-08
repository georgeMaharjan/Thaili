import assert from "node:assert/strict";
import test from "node:test";
import type { IncomingPouch as Pouch } from "./ledger-store.ts";
import { AppController } from "./controller.ts";
import { initialState, type StatePatch } from "./state.ts";

// Same headless harness as features/application-flow.check.ts: synchronous state, no native effects.
function controller(patch: StatePatch = {}) {
  const app = new AppController({});
  app.patch = (update, done) => { app.state = { ...app.state, ...(typeof update === "function" ? update(app.state) : update) }; done?.(); };
  app.state = { ...initialState(), loaded: true, splash: false, user: { name: "U", phone: "+9779800000000", createdAt: "2026-10-01T00:00:00Z" }, ...patch };
  return app;
}

test("go rejects unknown screens and resets transient UI", () => {
  const app = controller({ calOpen: true, filtersOpen: true, toast: "x" });
  assert.throws(() => app.go("nowhere"), /Unknown screen/);
  app.go("txns");
  assert.equal(app.state.screen, "txns");
  assert.equal(app.state.calOpen, false);
  assert.equal(app.state.filtersOpen, false);
  assert.equal(app.state.toast, null);
});

test("back: locked does nothing, overlays close before history moves", () => {
  assert.equal(controller({ locked: true, calOpen: true }).back(), false);
  const app = controller({ screen: "txns", calOpen: true });
  assert.equal(app.back(), true);
  assert.equal(app.state.calOpen, false);
  assert.equal(app.state.screen, "txns");
});

test("back asks before discarding an unsaved add or goal draft", () => {
  const add = controller({ screen: "add", addEntry: "50" });
  add.back();
  assert.equal(add.state.discardAdd, true);
  assert.equal(add.state.screen, "add");
  const goal = controller({ screen: "goal-new", goalName: "Bike" });
  goal.back();
  assert.equal(goal.state.discardGoal, true);
});

test("back pops history, never re-enters scan, then tabs fall back to home and home is a root", () => {
  const app = controller({ screen: "detail" });
  app.stack = ["home", "scan", "txns"];
  assert.equal(app.back(), true);
  assert.equal(app.state.screen, "txns");
  assert.equal(app.back(), true);
  assert.equal(app.state.screen, "home"); // skipped "scan"
  assert.equal(app.stack.length, 0);
  const tab = controller({ screen: "insights" });
  assert.equal(tab.back(), true);
  assert.equal(tab.state.screen, "home");
  assert.equal(controller({ screen: "home" }).back(), false);
});

test("moveGoal swaps neighbours, ignores out-of-range moves, undo restores order", () => {
  const goals = [{ id: "a", name: "A", target: 1 }, { id: "b", name: "B", target: 2 }];
  const app = controller({ goals });
  app.moveGoal(0, -1);
  assert.equal(app.state.goals, goals);
  app.moveGoal(0, 1);
  assert.deepEqual(app.state.goals.map(g => g.id), ["b", "a"]);
  assert.equal(app.state.toast, "A moved to #2");
  app.renderVals().undo();
  assert.deepEqual(app.state.goals.map(g => g.id), ["a", "b"]);
  clearTimeout(app._t);
});

test("editSource prefills the account form from the saved account", () => {
  const app = controller({
    screen: "accounts", roles: { nabil: "spending" },
    sources: [{ key: "nabil", name: "Nabil Bank ··1234", base: "Nabil Bank", type: "Bank · SMS", dot: "#000", opening: 5000, openedAt: "2026-10-01T00:00:00Z", acct: "0011234" }],
  });
  app.editSource("missing");
  assert.equal(app.state.screen, "accounts");
  app.editSource("nabil");
  assert.equal(app.state.screen, "src-new");
  assert.equal(app.state.newSrcKind, "bank");
  assert.equal(app.state.newSrcName, "Nabil Bank");
  assert.equal(app.state.newSrcAmt, "5000");
  assert.equal(app.state.newSrcAcct, "1234");
  assert.equal(app.state.newSrcField, "amt");
  assert.equal(app.state.newSrcRole, "spending");
  assert.equal(app.state.srcNewFrom, "accounts");
});

test("opening a saved pouch routes to the right first screen and applies app lock", () => {
  const pouch = (p: Partial<Pouch>) => ({ user: null, sources: [], tx: [], rules: [], goals: [], roles: {}, prefs: {}, isNew: false, ...p }) as Pouch;
  const cash = { key: "cash", name: "Cash", type: "Cash", dot: "#000", opening: 0 };
  const user = { name: "U", phone: "+9779800000000", createdAt: "2026-10-01T00:00:00Z" };
  const open = (p: Pouch) => { const app = controller({ loaded: false, screen: "welcome", user: null }); let done = false; app.applySavedPouch(p, true, () => { done = true; }); assert.equal(done, true); return app.state; };

  assert.equal(open(pouch({})).screen, "welcome");
  assert.equal(open(pouch({ user })).screen, "permission");
  assert.equal(open(pouch({ user, sources: [cash], prefs: { setupComplete: false } })).screen, "source");
  const home = open(pouch({ user, sources: [cash], prefs: { appLock: true } }));
  assert.equal(home.screen, "home");
  assert.equal(home.setupComplete, true);
  assert.equal(home.locked, true);
  assert.equal(home.loaded, true);
  assert.equal(home.addSrc, "cash");
});

test("a notification tap before load is held until startup finishes", () => {
  const app = controller({ loaded: false });
  app.openFromNotification({ open: "weekly", at: 0 });
  assert.deepEqual(app.pendingOpen, { open: "weekly", at: 0 });
  app.patch({ loaded: true, screen: "txns" });
  app.openFromNotification({ open: "weekly", at: 0 });
  assert.equal(app.state.screen, "home");
});

test("startSetup registers first when there is no user", () => {
  const none = controller({ user: null });
  none.startSetup();
  assert.equal(none.state.screen, "register");
  assert.equal(none.state.regThen, "permission");
  const known = controller();
  known.startSetup();
  assert.equal(known.state.screen, "permission");
});
