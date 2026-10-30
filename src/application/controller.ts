import { isScreen } from "./routes";
import { App as CapApp } from "@capacitor/app";
import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import React from "react";
import type { AppState, StatePatch } from "../application/state";
import type { DatedTransaction } from "../domain/models";
import { TransactionCommands } from "../features/transactions/commands";
import { createAppViewModel } from "../features/view-model";
import { AuthenticationSession, authenticationMessage } from "../lib/authentication";
import type { Sms } from "../lib/device";
import { authenticate, installedApps, isDevice, permStatus, readNotifications, readSms, setCapture } from "../lib/device";
import { importTransactions } from "../lib/import-transactions";
import { rememberMoneyPackages } from "../lib/money-apps";
import { TABS, backDismissal, gate, nextStack } from "../lib/nav";
import { captureNotifications } from "../lib/notifications";
import { initializeStore, load, mergeIncoming, save, subscribeStore } from "../lib/store";
import { CalendarClock } from "./calendar-clock";
import { CaptureCoordinator, captureConfiguration } from "./capture";
import { SRC_KINDS, newId } from "./config";
import { MoneyAppDiscovery } from "./discovery";
import { createAppLifecycle } from "./runtime";
import { initialState } from "./state";

export class AppController extends React.Component<Record<string, never>, AppState> {
  root: HTMLDivElement | null = null;
  shownScreen = "";
  anim = "";
  popping = false;
  private disposed = false;
  private startup = 0;
  saving = false;
  pendingOpen: { open: string; at: number } | null = null;
  _t?: ReturnType<typeof setTimeout>;
  _s?: ReturnType<typeof setTimeout>;
  storeSub?: () => void;
  lifecycle = createAppLifecycle();
  state = initialState();
  transactions = new TransactionCommands({ snapshot: () => this.state, commit: (update, done) => this.patch(update, done), message: (text, undo) => this.flash(text, undo) });
  creatingGoal = false;
  adding = false;
  patch: import("./state").StateWriter = (update, done) => {
    if (this.disposed) { done?.(); return; }
    this.setState(state => ({ ...state, ...(typeof update === "function" ? update(state) : update) }), done);
  };
  smsToTx(msgs: Sms[], existing: DatedTransaction[]) {
    return importTransactions(msgs, {
      sources: this.state.sources, rules: this.state.rules,
      existing, now: new Date(), newId
    });
  }
  private createCapture = () => new CaptureCoordinator({
    snapshot: () => this.state,
    commit: update => new Promise<void>(done => this.patch(update, done)),
    apps: () => this.appDiscovery,
    readSms, readNotifications, message: text => this.flash(text), now: Date.now, newId,
  });
  capture = this.createCapture();
  queueCapture = () => this.capture.queue();
  catchUpSms = (manual = false) => this.capture.catchUp(manual);
  syncCapture() {
    const s = this.state;
    const sources = rememberMoneyPackages(s.sources, s.moneyApps);
    if (sources !== s.sources) this.patch({ sources });
    void setCapture(captureConfiguration({ ...s, sources }));
  }
  openFromNotification = (o: { open: string; at: number }) => {
    if (!this.state.loaded) { this.pendingOpen = o; return; }
    if (o.open === "weekly") { this.go("home"); return; }
    Promise.resolve(this.catchUpSms()).then(() => {
      const t = this.state.tx.filter(x => x.dir === "debit" && Math.abs(Date.parse(x.at) - o.at) <= 180000)[0];
      if (t) this.openDetail(t.id, "home"); else this.go("txns", { txFilter: "review" });
    });
  };
  stack: string[] = [];
  back = () => {
    const s = this.state;
    if (s.locked) return false;
    const dismissal = backDismissal(s);
    if (dismissal) { this.patch(dismissal as StatePatch); return true; }
    if (s.screen === "add" && (s.addEntry || s.addNote)) { this.patch({ discardAdd: true }); return true; }
    if (s.screen === "goal-new" && (s.goalName || s.goalAmt)) { this.patch({ discardGoal: true }); return true; }
    while (this.stack.length) {
      const to = this.stack.pop()!;
      if (to === "scan") continue; // back never re-enters the history import
      this.popping = true;
      this.go(to!);
      return true;
    }
    if (TABS.indexOf(s.screen) > 0) { this.go("home"); return true; }
    return false; // a root: let Android background the app
  };
  onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); this.back(); } };
  scrollPositions = new Map<string, number[]>();
  getSnapshotBeforeUpdate(_: Record<string, never>, prev: AppState) {
    if (prev.screen !== this.state.screen) this.scrollPositions.set(prev.screen,
      Array.from(this.root?.querySelectorAll<HTMLElement>(".scr .overflow-auto, .scr .overflow-y-auto") || []).map(el => el.scrollTop));
    return null;
  }
  paintBars = () => {
    if (isDevice) SystemBars.setStyle({ style: this.state.theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  };
  refreshPerms = () => permStatus().then(p => this.patch({ perms: [p.sms, p.notifications] }));
  authentication = new AuthenticationSession(authenticate, () => document.visibilityState === "visible",
    active => this.patch({ unlockBusy: active }));
  get authing() { return this.authentication.active; }
  auth = (title: string) => this.authentication.run(title);
  unlock = () => {
    if (this.authing || document.visibilityState !== "visible") return;
    this.patch({ unlockError: null });
    this.auth("Unlock Thaili").then(r => {
      if (r.ok) this.patch({ locked: false, unlockError: null });
      else this.patch({ unlockError: authenticationMessage(r.reason) });
    });
  };
  onVisible = () => {
    if (document.visibilityState === "hidden") {
      if (this.state.appLock && !this.authing) this.patch({ locked: true });
      return;
    }
    this.refreshCalendar();
    this.refreshPerms();
    void this.discovery.refresh(true);
    if (this.state.locked) this.unlock();
    this.catchUpSms();
  };
  calendar = new CalendarClock(() => this.state, (update, done) => this.patch(update, done));
  refreshCalendar = () => this.calendar.refresh();
  private createDiscovery = () => new MoneyAppDiscovery({
    snapshot: () => this.state, commit: (update, done) => this.patch(update, done),
    navigate: (screen, patch) => this.go(screen, patch), supported: isDevice,
    installed: installedApps, history: readSms, now: Date.now,
  });
  discovery = this.createDiscovery();
  get appDiscovery() { return this.discovery.promise; }
  startDetection = (from = "setup") => { void this.discovery.scan(from); };
  cancelDetection = () => this.discovery.cancel();
  componentDidMount() {
    this.disposed = false;
    this.saving = false;
    const startup = ++this.startup;
    this.capture.dispose(); this.capture = this.createCapture();
    this.discovery.dispose(); this.discovery = this.createDiscovery();
    this.lifecycle.dispose(); this.lifecycle = createAppLifecycle();
    this.refreshCalendar();
    this.lifecycle.start({
      visible: this.onVisible, key: this.onKey, open: this.openFromNotification, money: this.queueCapture,
      back: () => { if (!this.back()) void CapApp.minimizeApp(); },
    });
    captureNotifications(false).catch(console.warn); // cancel reminders from previous versions
    this.paintBars();
    this._s = setTimeout(() => this.patch({ splash: false }), 2200); // let the mark finish drawing
    this.refreshPerms();
    this.discovery.refresh().catch(() => { }); // Setup offers a retry if discovery fails.
    this.storeSub = subscribeStore((storageStatus, pouch) => {
      this.patch({ storageStatus });
      if (pouch) this.applySavedPouch(pouch, false);
    });
    load().then(d => {
      if (this.disposed || startup !== this.startup) return;
      const ready = async () => {
        if (this.disposed || startup !== this.startup) return;
        const initial = this.state;
        try {
          await initializeStore(initial);
          if (this.disposed || startup !== this.startup) return;
          this.saving = true;
          save(initial, this.state);
        } catch (e) {
          console.error("[thaili] local initialization failed", e);
          this.flash("Unable to save on this phone. Check available storage and reopen Thaili.");
          return;
        }
        if (this.state.locked) this.unlock();
        captureNotifications(this.state.notifMode !== "Off");
        if (this.pendingOpen) { this.openFromNotification(this.pendingOpen); this.pendingOpen = null; }
        else this.catchUpSms();
      };
      if (d) this.applySavedPouch(d, true, ready);
      else this.patch({ loaded: true }, ready);
    }).catch((e: unknown) => {
      if (this.disposed || startup !== this.startup) return;
      // A disk read failure must never replace an existing pouch with an empty one.
      console.error("[thaili] local load failed", e);
      this.patch({ loaded: true });
      this.flash("Unable to open saved data on this phone. Reopen Thaili to try again.");
    });
  }
  applySavedPouch(d: import("../lib/store").IncomingPouch, opening: boolean, done?: () => void) {
    if (!opening) d = mergeIncoming(d, this.state);
    const complete = d.prefs.setupComplete ?? !!d.sources.length;
    const screen = complete ? "home" : d.user ? (d.sources.length ? "source" : "permission") : "welcome";
    const patch: StatePatch = Object.assign({}, d.prefs, {
      setupComplete: complete, user: d.user, sources: rememberMoneyPackages(d.sources, this.state.moneyApps), roles: d.roles,
      tx: d.tx, rules: d.rules, goals: d.goals,
    });
    if (opening) Object.assign(patch, { loaded: true, locked: !!d.prefs.appLock, screen });
    // Returning cloud-only installs are restored in the background after local startup.
    else if (complete && !this.state.setupComplete && !this.state.user) {
      Object.assign(patch, { screen, locked: !!d.prefs.appLock });
      this.stack = [];
    }
    if (!d.sources.some(x => x.key === this.state.srcKey)) patch.srcKey = d.sources[0]?.key || null;
    if (!d.sources.some(x => x.key === this.state.addSrc)) patch.addSrc = d.sources[0]?.key || "cash";
    this.patch(patch, () => {
      done?.();
      if (!opening) {
        if (this.state.locked) this.unlock();
        this.catchUpSms();
      }
    });
  }
  componentDidUpdate(_: Record<string, never>, prev: AppState) {
    if (this.saving && prev.loaded) save(prev, this.state);
    const n = this.state;
    if (n.loaded && (prev.sources !== n.sources || prev.rules !== n.rules || prev.notifMode !== n.notifMode || prev.moneyApps !== n.moneyApps || prev.setupComplete !== n.setupComplete || !prev.loaded)) this.syncCapture();
    if (n.loaded && n.setupComplete && (!prev.setupComplete || prev.captureStartAt !== n.captureStartAt)) void this.catchUpSms().catch(console.warn);
    if (prev.theme !== this.state.theme) this.paintBars();
    const to = this.state.screen;
    if (prev.screen === to) return;
    const positions = this.scrollPositions.get(to) || [];
    Array.from(this.root?.querySelectorAll<HTMLElement>(".scr .overflow-auto, .scr .overflow-y-auto") || []).forEach((el, i) => { el.scrollTop = positions[i] || 0; });
    // Every road to Home passes the register gate.
    if (gate(to, !!n.user) !== to) {
      this.stack = []; this.popping = true; // nothing to go back to: back leaves the app
      this.patch({ screen: "register", regThen: to, regName: "", regPhone: "" });
      return;
    }
    if (this.popping) { this.popping = false; return; }
    this.stack = nextStack(this.stack, prev.screen, to);
  }
  componentWillUnmount() { this.disposed = true; this.startup++; this.capture.dispose(); this.calendar.dispose(); this.discovery.dispose(); this.storeSub?.(); this.lifecycle.dispose(); clearTimeout(this._t); clearTimeout(this._s); }
  startSetup() {
    if (this.state.user) this.go("permission");
    else this.go("register", { regThen: "permission", regName: "", regPhone: "" });
  }
  flash(msg: string, undoState?: StatePatch) {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.patch({ toast: null, undoState: null }), 3800);
    this.patch({ toast: msg, undoState: undoState || null });
  }
  go(screen: string, extra?: StatePatch) { if (!isScreen(screen)) throw new Error("Unknown screen: " + screen); clearTimeout(this._t); this.patch(Object.assign({ screen: screen, toast: null, undoState: null, calOpen: false, filtersOpen: false, ruleEdit: null }, extra)); }
  openDetail(id: string | null, from: import("./routes").Screen, raw = false, edit = false) {
    this.go("detail", { detailId: id, from: from, rawOpen: !!raw, editing: !!edit, remarkDraft: null });
  }
  moveGoal(i: number, dir: number) {
    const j = i + dir;
    const prev = this.state.goals;
    if (j < 0 || j >= prev.length) return;
    const next = prev.slice();
    next[i] = prev[j]; next[j] = prev[i];
    this.patch({ goals: next });
    this.flash(next[j].name + " moved to #" + (j + 1), { goals: prev });
  }
  editSource(key: string | null) {
    const x = this.state.sources.filter(y => y.key === key)[0];
    if (!x) return;
    const kind = SRC_KINDS.filter(k => k.type === x.type)[0] || SRC_KINDS[2];
    this.go("src-new", {
      editSrcKey: key, srcNewFrom: this.state.screen,
      newSrcKind: kind.key, newSrcName: x.base || x.name, newSrcAmt: x.openedAt || x.opening ? String(x.opening) : "",
      newSrcAcct: x.acct ? x.acct.slice(-4) : "", newSrcField: kind.key === "manual" ? "amt" : (x.acct ? "amt" : "acct"),
      newSrcRole: this.state.roles[key || ""] || "savings"
    });
  }
  renderVals() { return createAppViewModel(this); }
}
