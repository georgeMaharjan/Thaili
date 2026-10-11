// IndexedDB adapter. Resolve only on transaction commit, including reads.
import type { LocalStorageDriver } from "./local-ledger";

export function indexedDbStorage(): LocalStorageDriver {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("thaili-local", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("ledger");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close older Thaili tabs to open local storage"));
  });
  return {
    async read() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("ledger", "readonly");
        const request = transaction.objectStore("ledger").get("current");
        transaction.oncomplete = () => resolve(request.result || null);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    },
    async write(record) {
      const db = await open();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("ledger", "readwrite");
        transaction.objectStore("ledger").put(record, "current");
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    },
  };
}
