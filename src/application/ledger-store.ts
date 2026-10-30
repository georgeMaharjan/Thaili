import { LocalLedger, mergePouches, type Pouch } from "../lib/local-ledger.ts";
import { hydrated, PREF_KEYS, snapshot, type PouchState } from "../lib/pouch.ts";

export type StoreStatus = { kind: "local" | "offline" | "pending" | "syncing" | "synced" | "error"; pending: boolean };
export type IncomingPouch = ReturnType<typeof hydrated> & { previous?: Pouch };
export type StoreListener = (status: StoreStatus, pouch?: IncomingPouch) => void;
export type NetworkPort = { online(): boolean; listen(event: "online" | "offline", listener: () => void): () => void };
export function mergeIncoming(pouch: IncomingPouch, state: PouchState) {
  return pouch.previous ? hydrated(mergePouches(pouch, pouch.previous, snapshot(state), { sources: {}, tx: {}, rules: {}, goals: {} })) : pouch;
}

/** One isolated store owns retries, subscribers and network listeners for one ledger. */
export function createLedgerStore(ledger: LocalLedger, cloud: boolean, network: NetworkPort) {
  const listeners = new Set<StoreListener>();
  let status: StoreStatus = { kind: "local", pending: false };
  let retry: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 2000;
  let started = false;
  let storageFailed = false;
  let running = false;
  let disposed = false;
  let unlisten: (() => void)[] = [];
  function emit(kind: StoreStatus["kind"], pouch?: Pouch, previous?: Pouch) {
    if (disposed) return;
    status = { kind: storageFailed ? "error" : kind, pending: ledger.pending };
    listeners.forEach(listener => listener(status, pouch ? { ...hydrated(pouch), previous } : undefined));
  }
  ledger.onRemote = (p, previous) => emit("syncing", p, previous);
  function schedule(delay = 500) {
    if (!cloud || !started || disposed || retry) return;
    retry = setTimeout(() => { retry = undefined; void retrySync(); }, delay);
  }
  async function retrySync() {
    if (!started || disposed || running) return;
    clearTimeout(retry); retry = undefined;
    if (!cloud) { emit("local"); return; }
    if (!network.online()) { emit("offline"); return; }
    running = true;
    emit("syncing");
    try { await ledger.sync(); retryDelay = 2000; emit("synced"); }
    catch (error) {
      console.warn("[thaili] background sync deferred", error);
      emit(network.online() ? "pending" : "offline");
      schedule(retryDelay); retryDelay = Math.min(retryDelay * 2, 60000);
    } finally { running = false; }
  }
  function subscribeStore(listener: StoreListener) {
    if (disposed) throw new Error("Store is disposed");
    listeners.add(listener); listener(status);
    return () => { listeners.delete(listener); };
  }
  async function load() {
    try { const p = await ledger.load(); return p ? hydrated(p) : null; }
    catch (error) { storageFailed = true; emit("error"); throw error; }
  }
  async function initializeStore(state: PouchState) {
    if (disposed) throw new Error("Store is disposed");
    try {
      await ledger.initialize(snapshot(state));
      if (disposed) return;
      storageFailed = false;
      if (!started) {
        started = true;
        unlisten = [network.listen("online", () => { void retrySync(); }), network.listen("offline", () => emit(cloud ? "offline" : "local"))];
      }
      emit(cloud && !network.online() ? "offline" : "local");
      schedule(0);
    } catch (error) { storageFailed = true; emit("error"); throw error; }
  }
  function save(prev: PouchState, next: PouchState): Promise<void> {
    if (disposed) return Promise.reject(new Error("Store is disposed"));
    if ((["user", "sources", "roles", "tx", "rules", "goals", ...PREF_KEYS] as const).every(k => prev[k] === next[k])) return Promise.resolve();
    const p = snapshot(next);
    return ledger.save(p).then(() => {
      storageFailed = false;
      emit(!cloud ? "local" : !network.online() ? "offline" : running ? "syncing" : ledger.pending ? "pending" : status.kind);
      schedule();
    }).catch(error => { storageFailed = true; console.error("[thaili] local save failed", error); emit("error"); });
  }
  function dispose() {
    disposed = true; started = false;
    clearTimeout(retry); retry = undefined;
    unlisten.forEach(remove => remove()); unlisten = [];
    listeners.clear(); ledger.onRemote = undefined;
  }
  return { load, initializeStore, save, subscribeStore, retrySync, dispose };
}
