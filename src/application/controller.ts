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
import { authenticate, installedApps, isDevice, permStatus, readNotifications, readSms, readSmsSenders, requestSms, openAppSettings, saveFile, setCapture } from "../lib/device";
import { BackupError, backupName, decodeBackup, encodeBackup } from "../lib/backup";
import { npDigits } from "../lib/bs";
import { hydrated, snapshot } from "../lib/pouch";
import { importTransactions } from "../lib/import-transactions";
import { rememberMoneyPackages } from "../lib/money-apps";
import { TABS, backDismissal, gate, nextStack } from "../lib/nav";
import { captureNotifications } from "../lib/notifications";
import { SMS_HISTORY_MS } from "../lib/sms";
import { checkForUpdate } from "../lib/update";
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
  /** Asks GitHub Releases for a newer APK. Quiet on launch; a manual check always answers. */
  checkUpdate = async (manual = false) => {
    const np = this.state.lang === "NP";
    if (!isDevice) { if (manual) this.flash(np ? "अपडेट Android एपमा मात्र जाँचिन्छ" : "Updates are checked in the Android app"); return; }
    try {
      const version = this.state.appVersion || (await CapApp.getInfo()).version;
      const update = await checkForUpdate(version);
      this.patch({ appVersion: version, update });
      if (update) this.flash(np ? "थैली " + update.version + " आयो — सेटिङबाट अपडेट गर्नुहोस्" : "Thaili " + update.version + " is available — update from Settings");
      else if (manual) this.flash(np ? "थैली " + version + " नै नयाँ संस्करण हो" : "Thaili " + version + " is the latest version");
    } catch (e) {
      console.warn("[thaili] update check failed", e);
      if (manual) this.flash(np ? "अपडेट जाँच्न सकिएन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।" : "Couldn't check for updates. Check your connection and try again.");
    }
  };
  /** Saves everything to a file the user places outside the app, so it survives an uninstall. */
  exportData = async () => {
    const np = this.state.lang === "NP";
    if (!isDevice) { this.flash(np ? "निर्यात Android एपमा मात्र हुन्छ" : "Export works in the Android app"); return; }
    try {
      if (await saveFile(backupName(), await encodeBackup(snapshot(this.state))))
        this.flash(np ? "सबै डेटा फाइलमा सुरक्षित भयो" : "All data saved to the backup file");
    } catch (e) {
      console.error("[thaili] export failed", e);
      this.flash(np ? "फाइल सुरक्षित गर्न सकिएन। फेरि प्रयास गर्नुहोस्।" : "Couldn't save the backup file. Try again.");
    }
  };
  /** Restores a backup into a fresh install only; it never replaces data already on this phone. */
  importData = async (file: Blob | undefined) => {
    const s = this.state, np = s.lang === "NP";
    if (!file) return;
    if (s.user || s.setupComplete || s.tx.length) { this.flash(np ? "यो फोनमा पहिले नै डेटा छ" : "This phone already has Thaili data, so nothing was restored"); return; }
    try {
      const pouch = await decodeBackup(await file.text());
      this.stack = [];
      this.applySavedPouch(hydrated(pouch), true, () => {
        this.flash(np ? npDigits(pouch.tx.length) + " कारोबार र " + npDigits(pouch.sources.length) + " खाता फिर्ता आए" : "Restored " + pouch.tx.length + " transactions and " + pouch.sources.length + " accounts");
        if (this.state.locked) this.unlock();
      });
    } catch (e) {
      console.warn("[thaili] import rejected", e);
      const problem = e instanceof BackupError ? e.problem : "notJson";
      this.flash({
        notJson: np ? "यो फाइल पढ्न सकिएन" : "That file can't be read",
        notThaili: np ? "यो थैलीको ब्याकअप फाइल होइन" : "That isn't a Thaili backup file",
        newer: np ? "यो ब्याकअप नयाँ थैलीबाट हो। पहिले एप अपडेट गर्नुहोस्।" : "This backup is from a newer Thaili. Update the app first.",
        damaged: np ? "ब्याकअप फाइल बिग्रिएको वा बदलिएको छ" : "The backup file is damaged or was changed",
        invalid: np ? "ब्याकअपको डेटा मिलेन" : "The backup's data doesn't check out",
        empty: np ? "ब्याकअपमा कुनै खाता छैन" : "The backup has no accounts in it",
      }[problem]);
    }
  };
  requestSmsPermission = async () => {
    const np = this.state.lang === "NP";
    if (!isDevice) { this.flash(np ? "SMS अनुमति Android फोनमा दिनुहोस्" : "Grant SMS permission on your Android phone"); return; }
    try {
      const permissions = await requestSms();
      this.patch(state => ({ perms: [permissions.sms, permissions.notifications],
        ...(permissions.sms ? { smsSince: Math.min(state.smsSince ?? Date.now(), Date.now() - SMS_HISTORY_MS) } : {}) }));
      this.flash(permissions.sms
        ? (np ? "SMS अनुमति चालु छ। पढ्न दिने बैंकहरू छान्नुहोस्।" : "SMS permission is on. Choose the banks Thaili may read.")
        : (np ? "SMS अनुमति बन्द छ। Android सेटिङ → अनुमति → SMS बाट चालु गर्न सकिन्छ।" : "SMS permission is off. Use Android app settings → Permissions → SMS if the dialog no longer appears."));
    } catch { this.flash(np ? "SMS अनुमति जाँच्न सकिएन" : "Could not check SMS permission"); }
  };
  openSmsPermission = () => this.state.perms[0] ? void openAppSettings() : void this.requestSmsPermission();
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
    installed: installedApps, senders: readSmsSenders, history: readSms, now: Date.now,
    message: text => this.flash(text),
  });
  discovery = this.createDiscovery();
  get appDiscovery() { return this.discovery.promise; }
  startDetection = (from = "setup") => { void this.discovery.scan(from); };
  confirmDetection = () => { void this.discovery.confirm(); };
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
    void this.checkUpdate();
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
    if (n.loaded && (prev.sources !== n.sources || prev.smsBanks !== n.smsBanks || prev.rules !== n.rules || prev.notifMode !== n.notifMode || prev.moneyApps !== n.moneyApps || prev.setupComplete !== n.setupComplete || !prev.loaded)) this.syncCapture();
    if (n.loaded && n.setupComplete && (!prev.setupComplete || prev.captureStartAt !== n.captureStartAt || prev.smsBanks !== n.smsBanks || (!prev.perms[0] && n.perms[0]))) void this.catchUpSms().catch(console.warn);
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
