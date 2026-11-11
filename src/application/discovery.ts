import { CASH, SRC_KINDS, tailName } from "./config.ts";
import type { Account } from "../domain/models.ts";
import type { Sms } from "../lib/device.ts";
import { INSTITUTIONS } from "../lib/institutions.ts";
import { appendMoneyAccounts, detectMoneyApps, rememberMoneyPackages, sourceForMoneyApp, type InstalledApp, type MoneyApp } from "../lib/money-apps.ts";
import { bankOf, tailsByBank } from "../lib/sms.ts";
import type { AppState, StateWriter } from "./state.ts";
export type DiscoveryPorts = {
  snapshot(): AppState; commit: StateWriter;
  navigate(screen: string, patch: Partial<AppState>): void;
  supported: boolean; installed(): Promise<InstalledApp[]>; senders(since: number): Promise<string[]>;
  history(since: number, selected: string[]): Promise<Sms[]>; now(): number; message(text: string): void;
};

/** Scans are cancellable; a late result cannot reopen a screen the user has left. */
export class MoneyAppDiscovery {
  promise: Promise<MoneyApp[]> = Promise.resolve([]);
  private generation = 0;
  private disposed = false;
  private confirming = false;
  private ports: DiscoveryPorts;
  constructor(ports: DiscoveryPorts) { this.ports = ports; }
  refresh(fallback = false) {
    this.promise = this.ports.installed().then(detectMoneyApps).then(apps => {
      if (!this.disposed) this.ports.commit(state => ({ moneyApps: apps, sources: rememberMoneyPackages(state.sources, apps) }));
      return apps;
    });
    if (fallback) this.promise = this.promise.catch(() => this.ports.snapshot().moneyApps);
    return this.promise;
  }
  scan(from = "setup") {
    const generation = ++this.generation;
    this.ports.navigate("detect", { detFrom: from, detState: this.ports.supported ? "scanning" : "unsupported", detFound: [], detOn: {}, detTails: {} });
    if (!this.ports.supported || this.disposed) return Promise.resolve();
    return Promise.all([this.ports.installed(), this.ports.senders(this.ports.now() - 90 * 86400000).catch(() => [])]).then(([list, senders]) => {
      if (this.disposed || generation !== this.generation) return;
      const installed = detectMoneyApps(list);
      const found = new Map(installed.map(app => [app.key, app]));
      // Sender metadata offers suggestions; no message bodies are read during discovery.
      for (const sender of senders) {
        const bank = bankOf(sender);
        const identity = bank && INSTITUTIONS.find(i => i.key === bank);
        if (identity && !found.has(identity.key)) found.set(identity.key, {
          key: identity.key, base: identity.name, app: identity.name, kind: identity.kind, packages: [],
        });
      }
      const apps = [...found.values()].sort((a, b) => a.app.localeCompare(b.app));
      const detOn = Object.fromEntries(apps.map(app => [app.key, false]));
      this.ports.commit(state => ({ detState: "done", detFound: apps, moneyApps: apps, detOn, detTails: {}, sources: rememberMoneyPackages(state.sources, apps) }));
      this.promise = Promise.resolve(apps);
    }).catch(() => { if (!this.disposed && generation === this.generation) this.ports.commit({ detState: "error" }); });
  }
  async confirm() {
    const state = this.ports.snapshot();
    if (this.disposed || this.confirming || state.screen !== "detect" || state.detState !== "done") return;
    const selected = state.detFound.filter(app => state.detOn[app.key] && (state.detFrom !== "accounts" || !sourceForMoneyApp(app, state.sources)));
    if (!selected.length) return;
    const generation = this.generation;
    this.confirming = true;
    this.ports.commit({ detState: "reading" });
    try {
      const messages = await this.ports.history(this.ports.now() - 90 * 86400000, selected.map(app => app.key)).catch(() => []);
      if (this.disposed || generation !== this.generation || this.ports.snapshot().screen !== "detect") return;
      const tails = tailsByBank(messages);
      const made: Account[] = selected.map(app => {
        const kind = SRC_KINDS.find(kind => kind.key === app.kind)!;
        return { key: app.key, base: app.base, name: tailName(app.base, tails[app.key] || null), short: app.base,
          packages: app.packages, type: kind.type, dot: kind.dot, opening: 0, acct: tails[app.key] || null };
      });
      if (state.detFrom === "accounts") {
        const current = this.ports.snapshot();
        const merged = appendMoneyAccounts(current.sources, made, current.roles);
        this.ports.navigate("accounts", { sources: merged.sources, roles: merged.roles, detState: "done", detTails: tails,
          smsBanks: [...new Set([...current.smsBanks, ...selected.map(app => app.key)])] });
        this.ports.message(merged.added.length + (state.lang === "NP" ? " खाता थपियो — मौज्दात र विवरण राख्नुहोस्" : " accounts added — set their balances and details"));
      } else {
        made.push(CASH);
        this.ports.navigate("source", { sources: made, roles: Object.fromEntries(made.map(account => [account.key, "spending"])), detState: "done", detTails: tails, smsBanks: selected.map(app => app.key) });
      }
    } finally { this.confirming = false; }
  }
  cancel() { this.generation++; }
  dispose() { this.disposed = true; this.cancel(); }
}
