// Production storage is local-only while verified sync/recovery is unavailable.
import { createLedgerStore, type NetworkPort } from "../application/ledger-store";
import { indexedDbStorage } from "./indexed-db-storage";
import { LocalLedger, type LocalStorageDriver } from "./local-ledger";

export { mergeIncoming } from "../application/ledger-store";
export type { IncomingPouch,StoreStatus } from "../application/ledger-store";

// This boundary deliberately accepts no cloud driver or backend configuration.
export function createDeviceStore(storage: LocalStorageDriver, network: NetworkPort) {
  return createLedgerStore(new LocalLedger(storage, null), false, network);
}
const store = createDeviceStore(indexedDbStorage(), {
  online: () => typeof navigator === "undefined" || navigator.onLine,
  listen(event, listener) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  },
});
export const { load, initializeStore, save, subscribeStore, retrySync } = store;
