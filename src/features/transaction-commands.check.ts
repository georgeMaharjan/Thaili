import assert from "node:assert/strict";
import test from "node:test";
import { initialState, type AppState, type StatePatch } from "../application/state.ts";
import type { DatedTransaction, Transaction } from "../domain/models.ts";
import { dated } from "../lib/bs.ts";
import { TransactionCommands } from "./transactions/commands.ts";

const tx = (id: string, m: string, extra: Partial<Transaction> = {}): DatedTransaction => dated(
  { id, m, amt: 100, dir: "debit", src: "cash", ch: "Manual", at: "2026-10-01T00:00:00Z", ...extra } as Transaction);

function harness(patch: StatePatch) {
  let state: AppState = { ...initialState(), ...patch };
  const messages: { text: string; undo?: StatePatch }[] = [];
  const commands = new TransactionCommands({
    snapshot: () => state,
    commit: (update, done) => { state = { ...state, ...(typeof update === "function" ? update(state) : update) }; done?.(); },
    message: (text, undo) => messages.push({ text, undo }),
  });
  return { commands, messages, get state() { return state; }, undo() { state = { ...state, ...messages.at(-1)!.undo }; } };
}

test("addRule files older unfiled spends, never hand-filed ones, and undo restores both lists", () => {
  const h = harness({ tx: [tx("a", "BHATBHATENI 01"), tx("b", "Bhatbhateni", { cat: "food" }), tx("c", "BHATBHATENI", { dir: "credit" })], rules: [] });
  h.commands.addRule("bhatbhateni", "grocery", "Groceries");
  assert.equal(h.state.rules.length, 1);
  assert.equal(h.state.rules[0].kw, "BHATBHATENI");
  assert.deepEqual(h.state.tx.map(t => t.cat), ["grocery", "food", undefined]);
  assert.equal(h.state.tx[0].auto, "BHATBHATENI");
  assert.match(h.messages[0].text, /1 older line filed too/);
  h.undo();
  assert.equal(h.state.rules.length, 0);
  assert.equal(h.state.tx[0].cat, undefined);
});

test("addRule ignores a keyword with no letters", () => {
  const h = harness({ tx: [tx("a", "SHOP")], rules: [] });
  h.commands.addRule("  --  ", "food", "Food");
  assert.equal(h.state.rules.length, 0);
  assert.equal(h.messages.length, 0);
});

test("saveRule blocks short or duplicate keywords", () => {
  const rules = [{ id: "r1", kw: "DARAZ", cat: "shopping", own: true }];
  const h = harness({ tx: [], rules, ruleEdit: { id: null, kw: "ab", cat: "food" } as AppState["ruleEdit"] });
  h.commands.saveRule("Food");
  assert.equal(h.state.rules, rules);
  const dup = harness({ tx: [], rules, ruleEdit: { id: null, kw: "daraz", cat: "food" } as AppState["ruleEdit"] });
  dup.commands.saveRule("Food");
  assert.equal(dup.state.rules.length, 1);
});

test("saveRule edit refiles what the old rule held and releases what no longer matches", () => {
  const rules = [{ id: "r1", kw: "PATHAO", cat: "transport", own: true }];
  const h = harness({
    rules,
    tx: [tx("a", "PATHAO FOOD", { cat: "transport", auto: "PATHAO" }), tx("b", "PATHAO RIDE", { cat: "transport", auto: "PATHAO" }), tx("c", "PATHAO FOOD")],
    ruleEdit: { id: "r1", kw: "pathao food", cat: "food" } as AppState["ruleEdit"],
  });
  h.commands.saveRule("Food");
  assert.equal(h.state.ruleEdit, null);
  assert.deepEqual(h.state.rules[0], { id: "r1", kw: "PATHAO FOOD", cat: "food", own: true });
  assert.deepEqual(h.state.tx.map(t => [t.cat, t.auto]), [["food", "PATHAO FOOD"], [null, null], ["food", "PATHAO FOOD"]]);
  h.undo();
  assert.equal(h.state.rules, rules);
  assert.equal(h.state.tx[1].cat, "transport");
});

test("saveRule with no id creates a rule and closes the editor", () => {
  const h = harness({ tx: [tx("a", "KFC DURBARMARG")], rules: [], ruleEdit: { id: null, kw: "kfc", cat: "food" } as AppState["ruleEdit"] });
  h.commands.saveRule("Food");
  assert.equal(h.state.rules.length, 1);
  assert.equal(h.state.ruleEdit, null);
  assert.equal(h.state.tx[0].cat, "food");
});

test("dropRule un-files only what that rule auto-filed", () => {
  const h = harness({
    rules: [{ id: "r1", kw: "DARAZ", cat: "shopping" }],
    tx: [tx("a", "DARAZ", { cat: "shopping", auto: "DARAZ" }), tx("b", "DARAZ", { cat: "gift" })],
  });
  h.commands.dropRule("r1");
  assert.equal(h.state.rules.length, 0);
  assert.deepEqual(h.state.tx.map(t => t.cat), [null, "gift"]);
  h.commands.dropRule("missing");
  assert.equal(h.messages.length, 1);
  h.undo();
  assert.equal(h.state.rules.length, 1);
  assert.equal(h.state.tx[0].cat, "shopping");
});

test("setCat clears auto, keeps an existing remark and only offers a rule when none matches", () => {
  const h = harness({ tx: [tx("a", "HIMALAYAN JAVA 22", { auto: "X", rem: "Coffee" })], rules: [] });
  h.commands.setCat("a", "food", "Food");
  assert.equal(h.state.tx[0].cat, "food");
  assert.equal(h.state.tx[0].auto, null);
  assert.equal(h.state.tx[0].rem, "Coffee");
  assert.deepEqual(h.state.rulePrompt, { kw: "COFFEE", cat: "food", label: "Food" });

  const known = harness({ tx: [tx("a", "HIMALAYAN JAVA")], rules: [{ id: "r", kw: "JAVA", cat: "food" }] });
  known.commands.setCat("a", "food", "Food");
  assert.equal(known.state.rulePrompt, null);
  assert.equal(known.state.tx[0].rem, "Food");
});

test("saveRemark trims, no-ops on unchanged text and removes on blank", () => {
  const h = harness({ tx: [tx("a", "SHOP", { rem: "Tea" })], remarkDraft: "  Tea  " });
  h.commands.saveRemark("a");
  assert.equal(h.messages.length, 0);
  assert.equal(h.state.remarkDraft, null);
  h.commands.saveRemark("a"); // null draft = blank → remove
  assert.equal(h.state.tx[0].rem, null);
  assert.equal(h.messages[0].text, "Remark removed");
  h.undo();
  assert.equal(h.state.tx[0].rem, "Tea");
});
