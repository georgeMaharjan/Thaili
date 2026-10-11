/* eslint-disable @typescript-eslint/no-explicit-any */
// The local snapshot and pending cloud work are committed together. Network calls
// never sit in the local write queue, so slow sync cannot hold up offline changes.
export type Pouch = { user: any; sources: any[]; tx: any[]; rules: any[]; goals: any[]; roles: Record<string, string>; prefs: Record<string, any> };
export const COLLECTIONS = ["sources", "tx", "rules", "goals"] as const;
type Collection = typeof COLLECTIONS[number];
export type Deletions = Record<Collection, Record<string, number>>;
export type LedgerRecord = { version: 1; snapshot: Pouch; baseline: Pouch; deleted: Deletions; revision: number; owner: string | null; uncertain: boolean };
export type LocalStorageDriver = { read(): Promise<LedgerRecord | null>; write(record: LedgerRecord): Promise<void> };
export type CloudDriver = {
  read(): Promise<{ pouch: Pouch; owner: string }>;
  write(pouch: Pouch, baseline: Pouch, deleted: Deletions, full: boolean): Promise<void>;
};
const id = (key: Collection, row: any): string => String(key === "sources" ? row.key : row.id);
const equal = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const emptyDeletions = (): Deletions => ({ sources: {}, tx: {}, rules: {}, goals: {} });
export const emptyPouch = (): Pouch => ({ user: null, sources: [], tx: [], rules: [], goals: [], roles: {}, prefs: {} });

export function mergePouches(remote: Pouch, before: Pouch, local: Pouch, deleted: Deletions, force = false): Pouch {
  const result = clone(remote);
  for (const key of COLLECTIONS) {
    const previous = new Map(before[key].map((row) => [id(key, row), row]));
    const current = new Map(local[key].map((row) => [id(key, row), row]));
    const merged = new Map(remote[key].map((row) => [id(key, row), row]));
    for (const [identifier, row] of current) if (force || !equal(row, previous.get(identifier))) merged.set(identifier, row);
    for (const identifier of previous.keys()) if (!current.has(identifier)) merged.delete(identifier);
    for (const identifier of Object.keys(deleted[key])) if (!current.has(identifier)) merged.delete(identifier);
    const reordered = !equal(local[key].map((row) => id(key, row)), before[key].map((row) => id(key, row)));
    const order = reordered ? [...current.keys(), ...merged.keys()] : [...merged.keys()];
    result[key] = [...new Set(order)].filter((identifier) => merged.has(identifier)).map((identifier) => merged.get(identifier));
  }
  for (const key of ["prefs", "roles"] as const) {
    result[key] = { ...remote[key] };
    for (const field of new Set([...Object.keys(before[key]), ...Object.keys(local[key])])) {
      if (force || !equal(before[key][field], local[key][field])) {
        if (local[key][field] === undefined) delete result[key][field];
        else result[key][field] = local[key][field];
      }
    }
  }
  if (force || !equal(before.user, local.user)) result.user = local.user;
  // A new/edited offline transaction must keep its account if another device
  // removed that account meanwhile. Untouched transactions follow remote deletes.
  const oldTx = new Map(before.tx.map(t => [t.id, t]));
  for (const t of local.tx) if (force || !equal(t, oldTx.get(t.id))) {
    for (const key of [t.src, t.to].filter(Boolean)) {
      if (result.sources.some(source => source.key === key)) continue;
      const source = local.sources.find(source => source.key === key);
      if (source) { result.sources.push(source); result.roles[key] = local.roles[key] || "spending"; }
    }
  }
  const keys = new Set(result.sources.map(source => source.key));
  result.tx = result.tx.filter(t => keys.has(t.src)).map(t => t.to && !keys.has(t.to) ? { ...t, to: null } : t);
  result.roles = Object.fromEntries(Object.entries(result.roles).filter(([key]) => keys.has(key)));
  return clone(result);
}

export class LocalLedger {
  private record: LedgerRecord | null = null;
  private opened: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private syncing: Promise<void> | null = null;
  private pulled = false;
  onRemote?: (pouch: Pouch, previous: Pouch) => void;

  private local: LocalStorageDriver;
  private cloud: CloudDriver | null;
  constructor(local: LocalStorageDriver, cloud: CloudDriver | null) { this.local = local; this.cloud = cloud; }

  private open() {
    return this.opened ??= this.local.read().then((record) => {
      if (record && record.version !== 1) throw new Error("Unsupported local data version");
      this.record = record;
    });
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async load(): Promise<Pouch | null> {
    await this.open();
    await this.queue;
    return this.record ? clone(this.record.snapshot) : null;
  }

  async initialize(snapshot: Pouch): Promise<void> {
    await this.open();
    await this.serial(async () => {
      if (this.record) return;
      const record: LedgerRecord = { version: 1, snapshot: clone(snapshot), baseline: clone(snapshot), deleted: emptyDeletions(), revision: 0, owner: null, uncertain: false };
      await this.local.write(record);
      this.record = record;
    });
  }

  async save(snapshot: Pouch): Promise<void> {
    const next = clone(snapshot); // Freeze the accepted state before another UI edit occurs.
    await this.open();
    await this.serial(async () => {
      const previous = this.record || { version: 1 as const, snapshot: emptyPouch(), baseline: emptyPouch(),
        deleted: emptyDeletions(), revision: 0, owner: null, uncertain: false };
      if (this.record && equal(previous.snapshot, next)) return;
      const record = clone(previous);
      record.revision++;
      for (const key of COLLECTIONS) {
        const current = new Set(next[key].map((row) => id(key, row)));
        previous.snapshot[key].forEach((row) => {
          if (!current.has(id(key, row))) record.deleted[key][id(key, row)] = record.revision;
        });
        current.forEach((identifier) => { delete record.deleted[key][identifier]; }); // Undo restores a row.
      }
      record.snapshot = next;
      await this.local.write(record);
      this.record = record;
    });
  }

  get pending() {
    const record = this.record;
    return !!record && (record.uncertain || !equal(record.snapshot, record.baseline)
      || COLLECTIONS.some((key) => Object.keys(record.deleted[key]).length > 0));
  }

  sync(): Promise<void> {
    if (!this.cloud) return Promise.resolve();
    if (this.syncing) return this.syncing;
    this.syncing = this.syncCloud().finally(() => { this.syncing = null; this.pulled = false; });
    return this.syncing;
  }

  private async syncCloud() {
    await this.open();
    await this.queue;
    if (!this.record || !this.cloud) return;
    if (!this.pulled) {
      const remote = await this.cloud.read();
      await this.serial(async () => {
        const local = this.record!;
        if (local.owner && local.owner !== remote.owner) throw new Error("The cloud account differs from this phone's saved account");
        const isEmpty = equal(remote.pouch, emptyPouch());
        const snapshot = isEmpty ? local.snapshot : mergePouches(remote.pouch, local.baseline, local.snapshot, local.deleted, local.uncertain);
        const record = { ...local, owner: remote.owner, baseline: clone(remote.pouch), snapshot: clone(snapshot) };
        await this.local.write(record);
        this.record = record;
        if (!equal(local.snapshot, snapshot)) this.onRemote?.(clone(snapshot), clone(local.snapshot));
      });
      this.pulled = true;
    }
    while (this.pending) {
      let sent!: LedgerRecord;
      await this.serial(async () => {
        sent = clone(this.record!);
        // A crash or partial cloud write must force a replay of current live rows
        // as well as saved deletion markers, including an undo of a failed delete.
        const uncertain = { ...this.record!, uncertain: true };
        await this.local.write(uncertain);
        this.record = uncertain;
      });
      await this.cloud.write(sent.snapshot, sent.baseline, sent.deleted, sent.uncertain);
      await this.serial(async () => {
        const record = clone(this.record!);
        record.baseline = sent.snapshot;
        record.uncertain = false;
        for (const key of COLLECTIONS) for (const [identifier, revision] of Object.entries(sent.deleted[key])) {
          if (record.deleted[key][identifier] === revision) delete record.deleted[key][identifier];
        }
        await this.local.write(record);
        this.record = record;
      });
    }
  }
}
