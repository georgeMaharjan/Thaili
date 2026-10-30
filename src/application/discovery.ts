import type { Sms } from "../lib/device.ts";
import { INSTITUTIONS } from "../lib/institutions.ts";
import { detectMoneyApps, rememberMoneyPackages, scanMoneyApps, sourceForMoneyApp, type InstalledApp, type MoneyApp } from "../lib/money-apps.ts";
import { parseSms, tailsByBank } from "../lib/sms.ts";
import type { AppState, StateWriter } from "./state.ts";
export type DiscoveryPorts = {
  snapshot(): AppState; commit: StateWriter;
  navigate(screen: string, patch: Partial<AppState>): void;
  supported: boolean; installed(): Promise<InstalledApp[]>; history(since: number): Promise<Sms[]>; now(): number;
};

/** Scans are cancellable; a late result cannot reopen a screen the user has left. */
export class MoneyAppDiscovery {
  promise: Promise<MoneyApp[]> = Promise.resolve([]);
  private generation = 0;
  private disposed = false;
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
    return scanMoneyApps(this.ports.installed, () => this.ports.history(this.ports.now() - 90 * 86400000)).then(({ apps: installed, messages }) => {
      if (this.disposed || generation !== this.generation) return;
      const found = new Map(installed.map(app => [app.key, app]));
      // A completed bank SMS is discovery evidence even when its app isn't installed.
      for (const message of messages) {
        const parsed = parseSms(message);
        const identity = parsed && INSTITUTIONS.find(i => i.key === parsed.bank);
        if (identity && !found.has(identity.key)) found.set(identity.key, {
          key: identity.key, base: identity.name, app: identity.name, kind: identity.kind, packages: [],
        });
      }
      const apps = [...found.values()].sort((a, b) => a.app.localeCompare(b.app));
      const sources = this.ports.snapshot().sources;
      const detOn = Object.fromEntries(apps.map(app => [app.key, from !== "accounts" || !sourceForMoneyApp(app, sources)]));
      this.ports.commit(state => ({ detState: "done", detFound: apps, moneyApps: apps, detOn, detTails: tailsByBank(messages), sources: rememberMoneyPackages(state.sources, apps) }));
      this.promise = Promise.resolve(apps);
    }).catch(() => { if (!this.disposed && generation === this.generation) this.ports.commit({ detState: "error" }); });
  }
  cancel() { this.generation++; }
  dispose() { this.disposed = true; this.cancel(); }
}
