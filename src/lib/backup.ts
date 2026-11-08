// A backup file is everything in the pouch (accounts, transactions, rules, goals, settings) wrapped in an
// envelope that says what it is, which format it uses and a checksum of its contents.
import type { Pouch } from "../domain/models.ts";
import { decodePouch } from "../infrastructure/hydration.ts";

export const BACKUP_FORMAT = 1;
export type BackupProblem = "notJson" | "notThaili" | "newer" | "damaged" | "invalid" | "empty";
export class BackupError extends Error {
  problem: BackupProblem;
  constructor(problem: BackupProblem, detail?: string) { super(detail || problem); this.problem = problem; }
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export async function encodeBackup(pouch: Pouch, exportedAt = new Date()) {
  const data = JSON.stringify(pouch);
  return JSON.stringify({ app: "thaili", format: BACKUP_FORMAT, exportedAt: exportedAt.toISOString(), checksum: await sha256(data), data: pouch });
}

export const backupName = (at = new Date()) => "thaili-backup-" + at.toISOString().slice(0, 10) + ".json";

/** Every check runs before anything is restored; any failure rejects the whole file. */
export async function decodeBackup(text: string): Promise<Pouch> {
  let file: Record<string, unknown>;
  try { file = JSON.parse(text); } catch { throw new BackupError("notJson"); }
  if (!file || typeof file !== "object" || file.app !== "thaili" || typeof file.format !== "number") throw new BackupError("notThaili");
  if (file.format > BACKUP_FORMAT) throw new BackupError("newer");
  if (file.format !== BACKUP_FORMAT || typeof file.checksum !== "string") throw new BackupError("notThaili");
  // JSON.parse → JSON.stringify reproduces the exported text exactly, so any edit or corruption shows here.
  if (await sha256(JSON.stringify(file.data)) !== file.checksum) throw new BackupError("damaged");
  let pouch: Pouch;
  try { pouch = decodePouch(file.data); } catch (e) { throw new BackupError("invalid", (e as Error).message); }
  if (!pouch.sources.length) throw new BackupError("empty");
  const unique = (ids: string[], what: string) => { if (new Set(ids).size !== ids.length) throw new BackupError("invalid", "Duplicate " + what); };
  unique(pouch.sources.map(s => s.key), "account");
  unique(pouch.tx.map(t => t.id), "transaction");
  unique(pouch.rules.map(r => r.id), "rule");
  unique(pouch.goals.map(g => g.id), "goal");
  const accounts = new Set(pouch.sources.map(s => s.key));
  for (const t of pouch.tx) {
    if (!accounts.has(t.src) || (t.to != null && !accounts.has(t.to))) throw new BackupError("invalid", "Transaction " + t.id + " names a missing account");
    if (t.amt < 0) throw new BackupError("invalid", "Negative amount in " + t.id);
  }
  return pouch;
}
