import { categoryLists, newId } from "../../application/config";
import type { AppState, StatePatch, StateWriter } from "../../application/state";
import { applyRule, checkRule, findRule, kwFor, unfileRule, words } from "../../lib/rules";

export type TransactionPorts = { snapshot(): AppState; commit: StateWriter; message(text: string, undo?: StatePatch): void };
/** Transaction edits and filing are shared by detail, review, rules and imported history. */
export class TransactionCommands {
  private ports: TransactionPorts;
  constructor(ports: TransactionPorts) { this.ports = ports; }
  private get state() { return this.ports.snapshot(); }
  private patch: StateWriter = (update, done) => this.ports.commit(update, done);
  private flash = (text: string, undo?: StatePatch) => this.ports.message(text, undo);
  saveRemark(id: string | null) {
    const s = this.state, v = (s.remarkDraft || "").trim(), prev = s.tx;
    const cur = (prev.filter(t => t.id === id)[0] || {}).rem || null;
    if ((v || null) === cur) { this.patch({ remarkDraft: null }); return; }
    this.patch({ tx: prev.map(t => t.id === id ? Object.assign({}, t, { rem: v || null }) : t), remarkDraft: null });
    this.flash(v ? (cur ? "Remark updated" : "Remark added") : "Remark removed", { tx: prev });
  }
  setCat(id: string | null, cat: string, label: string) {
    const prev = this.state.tx;
    const t = prev.filter(x => x.id === id)[0];
    const known = findRule(t, this.state.rules);
    this.patch({
      tx: prev.map(x => x.id === id ? Object.assign({}, x, { cat: cat, rem: x.rem || label, auto: null }) : x),
      /* Only offer to learn when there is a word to learn and no rule yet. */
      rulePrompt: (!known && t && t.dir === "debit" && kwFor(t)) ? { kw: kwFor(t), cat: cat, label: label } : null
    });
    this.flash(label + " saved", { tx: prev });
  }
  addRule(kw: string, cat: string, label: string) {
    const prevT = this.state.tx, prevR = this.state.rules;
    kw = words(kw);
    if (!kw) return;
    const rule = { id: newId(), kw: kw, cat: cat, own: true };
    const rules = prevR.concat([rule]);
    const { tx, filed } = applyRule(prevT, rule);
    this.patch({ rules: rules, tx: tx, rulePrompt: null });
    this.flash("“" + kw + "” now files as " + label + (filed ? " · " + filed + " older " + (filed === 1 ? "line" : "lines") + " filed too" : ""), { rules: prevR, tx: prevT });
  }
  saveRule(label: string) {
    const s = this.state, e = s.ruleEdit;
    const kw = e ? words(e.kw) : "";
    if (!e || !e.cat || checkRule(kw, e.id, s.rules, categoryLists(s.customCats).every).block) return;
    if (!e.id) { this.addRule(kw, e.cat, label); this.patch({ ruleEdit: null }); return; }
    const prevR = s.rules, prevT = s.tx, old = prevR.filter(r => r.id === e.id)[0];
    const rules = prevR.map(r => r.id === e.id ? Object.assign({}, r, { kw: kw, cat: e.cat, own: true }) : r);
    const { tx, filed } = applyRule(prevT, { id: e.id, kw, cat: e.cat }, old);
    this.patch({ rules: rules, tx: tx, ruleEdit: null });
    this.flash("Rule updated · “" + kw + "” → " + label + (filed ? " · " + filed + " filed" : ""), { rules: prevR, tx: prevT });
  }
  dropRule(id: string) {
    const prevR = this.state.rules, prevT = this.state.tx;
    const r = prevR.filter(x => x.id === id)[0];
    if (!r) return;
    /* Dropping a rule un-files what only that rule was holding up, so the
       review queue tells the truth again. */
    this.patch({
      rules: prevR.filter(x => x.id !== id),
      tx: unfileRule(prevT, r)
    });
    this.flash("Rule for “" + r.kw + "” removed", { rules: prevR, tx: prevT });
  }
}
