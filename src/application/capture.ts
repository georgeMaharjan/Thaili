import type { CaptureConfiguration } from "../domain/capture-contract";
import type { MoneyNotification, Sms } from "../lib/device.ts";
import { applyImportResult, importTransactions } from "../lib/import-transactions.ts";
import { allMoneyPackages, appendMoneyAccounts, type MoneyApp } from "../lib/money-apps.ts";
import { notificationInbox, notificationRules } from "../lib/notification-transactions.ts";
import { words } from "../lib/rules.ts";
import { bankOf, enabledSmsBanks, nativeRules, SMS_HISTORY_MS } from "../lib/sms.ts";
import type { AppState, StatePatch } from "./state.ts";

export type CaptureSnapshot = Pick<AppState, "loaded" | "setupComplete" | "captureStartAt" | "user" | "sources" | "roles" | "rules" | "tx" | "moneyApps" | "smsSince" | "notificationSince" | "notifMode" | "smsBanks" | "lang">;
export type CapturePorts = {
  snapshot(): CaptureSnapshot;
  commit(update: (state: CaptureSnapshot) => StatePatch): Promise<void>;
  apps(): Promise<MoneyApp[]>;
  readSms(since: number, selected: string[]): Promise<Sms[]>;
  readNotifications(since: number): Promise<MoneyNotification[]>;
  message(text: string): void;
  now(): number;
  newId(): string;
};

/** Owns buffered reads, channel cursors, duplicate reconciliation and event coalescing. */
export class CaptureCoordinator {
  private state: { kind: "idle" } | { kind: "reading"; promise: Promise<void>; again: boolean; manualAgain: boolean } = { kind: "idle" };
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private queuedManual = false;
  private ports: CapturePorts;
  constructor(ports: CapturePorts) { this.ports = ports; }

  queue = (manual = false) => {
    if (this.disposed) return;
    this.queuedManual ||= manual;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const recover = this.queuedManual; this.queuedManual = false;
      void this.catchUp(recover).catch(console.warn);
    }, 120);
  };

  catchUp = (manual = false): Promise<void> => {
    const s = this.ports.snapshot();
    if (this.disposed || !s.loaded || !s.setupComplete || !s.user || !s.sources.length) return Promise.resolve();
    if (this.state.kind === "reading") { this.state.again = true; this.state.manualAgain ||= manual; return this.state.promise; }
    const at = this.ports.now();
    const selected = enabledSmsBanks(s.sources, s.smsBanks);
    const read = <T>(promise: Promise<T[]>) => promise.then(items => ({ ok: true, items })).catch(() => ({ ok: false, items: [] as T[] }));
    const promise = Promise.all([
      selected.length ? read(this.ports.readSms(Math.max(s.captureStartAt ?? 0, at - SMS_HISTORY_MS, manual ? 0 : (s.smsSince ?? at) - 180000), selected))
        : Promise.resolve({ ok: false, items: [] as Sms[] }),
      read(this.ports.readNotifications(Math.max(s.captureStartAt ?? 0, s.notificationSince ?? s.smsSince ?? 0))),
      this.ports.apps().catch(() => s.moneyApps),
    ]).then(async ([sms, notes, apps]) => {
      if (this.disposed) return;
      const current = this.ports.snapshot();
      if (!current.setupComplete) return;
      // Cursors deliberately overlap reads. The user's history decision is a separate,
      // durable lower bound, checked against occurrence time even for newly buffered alerts.
      const allowed = (message: { at: number }) => current.captureStartAt == null || message.at > current.captureStartAt;
      const inbox = notificationInbox(notes.items.filter(allowed), apps, current.sources, allMoneyPackages(current.sources, apps));
      const merged = appendMoneyAccounts(current.sources, inbox.additions, current.roles);
      const imported = importTransactions([...sms.items.filter(message => allowed(message) && enabledSmsBanks(current.sources, current.smsBanks).includes(bankOf(message.sender) || "")), ...inbox.messages], {
        sources: merged.sources, rules: current.rules, existing: current.tx,
        now: new Date(at), newId: this.ports.newId,
      });
      const found = imported.tx.length;
      await this.ports.commit(latest => {
        if (!latest.setupComplete || latest.captureStartAt !== current.captureStartAt) return {};
        const accounts = appendMoneyAccounts(latest.sources, inbox.additions, latest.roles);
        return {
          sources: accounts.sources, roles: accounts.roles,
          smsSince: sms.ok && enabledSmsBanks(latest.sources, latest.smsBanks).join("|") === selected.join("|") ? at : latest.smsSince,
          notificationSince: notes.ok ? at : latest.notificationSince,
          tx: applyImportResult(latest.tx, imported)
        };
      });
      if (this.disposed || !this.ports.snapshot().setupComplete || this.ports.snapshot().captureStartAt !== current.captureStartAt) return;
      if (found) this.ports.message(found + (found === 1 ? " new transaction" : " new transactions") + " from bank and wallet alerts");
      else if (manual && !sms.ok) this.ports.message(selected.length
        ? (current.lang === "NP" ? "बैंक SMS पढ्न सकिएन। सेटिङमा SMS अनुमति जाँचेर फेरि प्रयास गर्नुहोस्।" : "Bank SMS could not be read. Check SMS permission in Settings, then try again.")
        : (current.lang === "NP" ? "छुटेका SMS खोज्न सेटिङ → बैंक SMS पहुँचबाट बैंक छान्नुहोस्।" : "Choose banks under Settings → Bank SMS access to check for missed SMS."));
      else if (manual) this.ports.message(current.lang === "NP" ? "छानिएका बैंकका पछिल्ला ९० दिन र सुरक्षित वालेट सूचना जाँचियो — नयाँ कारोबार छैन।" : "Up to date — checked selected banks’ last 90 days and saved wallet alerts");
    }).finally(() => {
      const again = this.state.kind === "reading" && this.state.again;
      const manualAgain = this.state.kind === "reading" && this.state.manualAgain;
      this.state = { kind: "idle" };
      if (again) this.queue(manualAgain);
    });
    this.state = { kind: "reading", promise, again: false, manualAgain: false };
    return promise;
  };

  dispose() { this.disposed = true; clearTimeout(this.timer); }
}

export function captureConfiguration(s: CaptureSnapshot): CaptureConfiguration {
  return {
    ...nativeRules(enabledSmsBanks(s.sources, s.smsBanks)), packages: allMoneyPackages(s.sources, s.moneyApps), notification: notificationRules(),
    rules: s.rules.map(r => words(r.kw)).filter(Boolean), notify: s.setupComplete && s.notifMode !== "Off",
  };
}
