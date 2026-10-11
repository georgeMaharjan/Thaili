// IndexedDB is the source used by the UI. Supabase is a background replica;
// the durable snapshot includes the pending deletions needed after a restart.
import { supabase, ensureSession } from "./supabase";
import { PREF_KEYS, snapshot, hydrated, type PouchState } from "./pouch";
import { createCloudDriver } from "./cloud-store";
import { indexedDbStorage } from "./indexed-db-storage";
import { LocalLedger, mergePouches, type Pouch } from "./local-ledger";

export type StoreStatus = { kind: "local" | "offline" | "pending" | "syncing" | "synced" | "error"; pending: boolean };
const ledger = new LocalLedger(indexedDbStorage(), supabase ? createCloudDriver(supabase, ensureSession) : null);
type IncomingPouch = ReturnType<typeof hydrated> & { previous?: Pouch };
const listeners = new Set<(status: StoreStatus, pouch?: IncomingPouch) => void>();
export function mergeIncoming(pouch: IncomingPouch, state: PouchState) {
  return pouch.previous ? hydrated(mergePouches(pouch, pouch.previous, snapshot(state), { sources: {}, tx: {}, rules: {}, goals: {} })) : pouch;
}
let status: StoreStatus = { kind: "local", pending: false };
let retry: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 2000;
let started = false;
let storageFailed = false;
let running = false;
const online = () => typeof navigator === "undefined" || navigator.onLine;
function emit(kind: StoreStatus["kind"], pouch?: Pouch, previous?: Pouch) {
  status = { kind: storageFailed ? "error" : kind, pending: ledger.pending };
  listeners.forEach(listener => listener(status, pouch ? { ...hydrated(pouch), previous } : undefined));
}
ledger.onRemote = (p, previous) => emit("syncing", p, previous);
function schedule(delay = 500) {
  if (!supabase || !started || retry) return;
  retry = setTimeout(() => { retry = undefined; void retrySync(); }, delay);
}
export async function retrySync() {
  if (!started || running) return;
  clearTimeout(retry); retry = undefined;
  if (!supabase) { emit("local"); return; }
  if (!online()) { emit("offline"); return; }
  running = true;
  emit("syncing");
  try { await ledger.sync(); retryDelay = 2000; emit("synced"); }
  catch (error) {
    console.warn("[thaili] background sync deferred", error);
    emit(online() ? "pending" : "offline");
    schedule(retryDelay); retryDelay = Math.min(retryDelay * 2, 60000);
  } finally { running = false; }
}
export function subscribeStore(listener: (status: StoreStatus, pouch?: IncomingPouch) => void) {
  listeners.add(listener); listener(status);
  return () => { listeners.delete(listener); };
}
export async function load() {
  try { const p = await ledger.load(); return p ? hydrated(p) : null; }
  catch (error) { storageFailed = true; emit("error"); throw error; }
}
export async function initializeStore(state: PouchState) {
  try {
    await ledger.initialize(snapshot(state)); storageFailed = false;
    if (!started) {
      started = true;
      window.addEventListener("online", () => { void retrySync(); });
      window.addEventListener("offline", () => emit(supabase ? "offline" : "local"));
    }
    emit(supabase && !online() ? "offline" : "local");
    schedule(0);
  } catch (error) { storageFailed = true; emit("error"); throw error; }
}
export function save(prev: PouchState, next: PouchState) {
  // View changes (typing, navigation, sync status) need no disk writes.
  if ((["user", "sources", "roles", "tx", "rules", "goals", ...PREF_KEYS] as const).every(k => prev[k] === next[k])) return;
  const p = snapshot(next);
  void ledger.save(p).then(() => {
    storageFailed = false;
    emit(!supabase ? "local" : !online() ? "offline" : running ? "syncing" : ledger.pending && supabase ? "pending" : status.kind);
    schedule();
  }).catch(error => { storageFailed = true; console.error("[thaili] local save failed", error); emit("error"); });
}
