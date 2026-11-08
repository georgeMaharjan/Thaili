import type { Transaction } from "../domain/models";
import { dated } from "./bs.ts";
import { parseNotification,transactionReference } from "./notification-transactions.ts";
import { autoFile,type FilingRule } from "./rules.ts";
import { parseSms,sourceFor,transferTo,walletNamed } from "./sms.ts";
import { duplicateIndex,evidenceFor,mergeEvidence,textFingerprint,type CapturedEntry,type CaptureEvidence } from "./transaction-capture.ts";

export type CapturedMessage = { id?: string; sender?: string; bank?: string; body: string; at: number; ch?: string };
type ImportAccount = { key: string; name: string; base?: string; acct?: string | null };

/** Parse → resolve account → recognize wallet transfer → auto-file → deduplicate.
 * The clock and ID generator are injected so the whole pipeline is reproducible. */
export function importTransactions(messages: CapturedMessage[], context: {
  sources: ImportAccount[]; rules: FilingRule[]; existing: CapturedEntry[]; now: Date; newId: () => string;
}) {
  const out: ReturnType<typeof dated<ReturnType<typeof capturedEntry>>>[] = [];
  const existing = context.existing.map(t => ({ ...t, capture: evidenceFor(t).slice() }));
  const updates = new Map<string, Patch>();
  const removedIds = new Set<string>();
  let orphans = 0;
  for (const msg of messages) {
    if (!Number.isFinite(msg.at)) continue;
    const parsed = msg.ch === "App" ? parseNotification({ ...msg, bank: msg.bank || "" })
      : parseSms({ ...msg, sender: msg.sender || "" });
    if (!parsed) continue;
    const source = sourceFor(parsed, context.sources);
    if (!source) { orphans++; continue; }
    const to = transferTo(parsed, context.sources);
    const base = dated(capturedEntry(msg, parsed, source.key, to?.key || null, context), context.now);
    const t = to ? base : autoFile(base, context.rules);
    const match = duplicateIndex(t, [...existing, ...out]);
    if (match >= 0 && match < existing.length) {
      const row = existing[match];
      row.capture = mergeEvidence(row.capture || [], t.capture || []);
      if (row.id) updates.set(row.id, { ...updates.get(row.id), capture: row.capture });
    } else if (match >= 0) {
      const row = out[match - existing.length];
      row.capture = mergeEvidence(row.capture || [], t.capture || []);
    }
    else out.push(t);
  }
  // A recognized wallet load can absorb its credit even when the two arrive in
  // different reads. Keep both sides' identities so later replays are also skipped.
  // A debit whose remark names the wallet but a number that didn't match (Nabil cuts it
  // to 7 digits) is your own load once that wallet reports the same amount coming in.
  // The reverse — a wallet's "Bank Withdraw" — pairs with the bank credit that names the wallet.
  const combined: CapturedEntry[] = [...existing, ...out];
  const existingIds = new Set(existing.map(t => t.id));
  const consumed = new Set<CapturedEntry>();
  for (const credit of combined.filter(t => t.dir === "credit" && t.ch !== "Manual")) {
    const transfer = combined.filter(t => t.ch !== "Manual" && t.src !== credit.src
      && (t.dir === "transfer" ? t.to === credit.src : t.dir === "debit" && (walletNamed(t.rem, context.sources)?.key === credit.src
        || walletNamed(credit.rem, context.sources)?.key === t.src))
      && t.amt === credit.amt && Math.abs(Date.parse(t.at) - Date.parse(credit.at)) <= 900000
      && !evidenceFor(t).some(e => e.src === credit.src && e.dir === "credit"))
      .sort((a, b) => Math.abs(Date.parse(a.at) - Date.parse(credit.at)) - Math.abs(Date.parse(b.at) - Date.parse(credit.at)))[0];
    if (!transfer) continue;
    const patch: Patch = { capture: mergeEvidence(evidenceFor(transfer), evidenceFor(credit)) };
    if (transfer.dir === "debit") Object.assign(patch, { dir: "transfer", to: credit.src, cat: null, auto: null });
    Object.assign(transfer, patch);
    consumed.add(credit);
    if (transfer.id && existingIds.has(transfer.id)) updates.set(transfer.id, { ...updates.get(transfer.id), ...patch });
    if (credit.id && existingIds.has(credit.id)) { removedIds.add(credit.id); updates.delete(credit.id); }
  }
  return { tx: out.filter(t => !consumed.has(t)), orphans,
    updates: [...updates].map(([id, patch]) => ({ id, ...patch })), removedIds: [...removedIds] };
}
type Patch = { capture: CaptureEvidence[]; dir?: string; to?: string; cat?: null; auto?: null };

function capturedEntry(msg: CapturedMessage, p: NonNullable<ReturnType<typeof parseSms>>, source: string, to: string | null,
  context: { now: Date; newId: () => string }): Transaction {
  const at = new Date(p.at).toISOString(), ch = msg.ch === "App" ? "App" : "SMS";
  const capture: CaptureEvidence[] = [{ ch, id: msg.id || null, src: source, dir: p.dir, at,
    ref: transactionReference(p.raw), fingerprint: textFingerprint(p.raw) }];
  return { id: msg.id || context.newId(), m: p.m, amt: p.amt, dir: to ? "transfer" : p.dir, to, src: source, capture,
    cat: null as string | null, auto: null as string | null, rem: p.rem, ch: msg.ch === "App" ? "App" : "SMS", raw: p.raw,
    at, added: context.now.toISOString() };
}

/** Commit accepted capture results in one state change; preserve user notes/categories. */
export function applyImportResult<T extends CapturedEntry>(existing: T[], result: ReturnType<typeof importTransactions>) {
  if (!result.tx.length && !result.updates.length && !result.removedIds.length) return existing;
  const updates = new Map(result.updates.map(({ id, ...patch }) => [id, patch]));
  const removed = new Set(result.removedIds);
  const previous = existing.filter(t => !t.id || !removed.has(t.id))
    .map(t => t.id && updates.has(t.id) ? { ...t, ...updates.get(t.id)! } : t);
  return [...result.tx, ...previous].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
