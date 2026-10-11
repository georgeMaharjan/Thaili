import { normalizeMoneyText, transactionReference } from "./notification-transactions.ts";

export type CaptureEvidence = { ch: "SMS" | "App"; id: string | null; src: string; dir: string;
  at: string; ref: string | null; fingerprint: string | null };
export type CapturedEntry = { id?: string; src: string; amt: number; at: string; dir?: string; to?: string | null;
  ch?: string; raw?: string | null; m?: string; rem?: string | null; capture?: CaptureEvidence[] };
const direction = (dir?: string) => dir === "transfer" ? "debit" : dir || "";
const distance = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b));

// A deterministic text fingerprint, not an encryption or authentication primitive.
export function textFingerprint(body: string): string {
  const text = normalizeMoneyText(body).trim().replace(/\s+/g, " ").toLowerCase();
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

export function evidenceFor(t: CapturedEntry): CaptureEvidence[] {
  if (t.capture?.length) return t.capture;
  if (t.ch !== "SMS" && t.ch !== "App") return [];
  return [{ ch: t.ch, id: t.ch === "App" ? t.id || null : null, src: t.src, dir: direction(t.dir), at: t.at,
    ref: transactionReference(t.raw || ""), fingerprint: t.raw ? textFingerprint(t.raw) : null }];
}

export function mergeEvidence(a: CaptureEvidence[], b: CaptureEvidence[]): CaptureEvidence[] {
  return [...new Map([...a, ...b].map(e => [JSON.stringify(e), e])).values()];
}

/** Exact IDs win; references can join delayed alerts (up to seven days).
 * Without references, pair at most one SMS with one app alert within three minutes.
 * Distinct IDs from the same channel and manual entries must remain separate. */
export function duplicateScore(incoming: CapturedEntry, existing: CapturedEntry): number | null {
  if (incoming.ch === "Manual" || existing.ch === "Manual") return null;
  if (incoming.amt !== existing.amt) return null;
  const next = evidenceFor(incoming), before = evidenceFor(existing);
  for (const a of next) for (const b of before) {
    if (a.src !== b.src || a.dir && b.dir && a.dir !== b.dir) continue;
    if (a.id && a.id === b.id && a.ch === b.ch) return 30;
    const elapsed = distance(a.at, b.at);
    if (a.ref && b.ref) {
      if (a.ref === b.ref && elapsed <= 7 * 86400000) return 20;
      continue;
    }
    if (elapsed > 180000 || !Number.isFinite(elapsed)) continue;
    if (a.ch === b.ch) {
      if (a.id && b.id && a.id !== b.id) continue;
      if (a.fingerprint && a.fingerprint === b.fingerprint) return 10;
      continue;
    }
    if (before.some(e => e.src === a.src && e.dir === a.dir && e.ch === a.ch)) continue;
    // If both channels name different shops, equal amounts are not enough evidence.
    const merchant = (t: CapturedEntry) => (t.rem || t.m || "").toUpperCase().replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ").filter(word => word && !/\d/.test(word)
        && !/^(FONEPAY|FPQR|MPAY|QR|PAYMENT|POS|CIPS|IPS|IBFT|FPY|TRANSACTION|MONEY|OUT|IN)$/.test(word))
      .join("").toLowerCase();
    const aShop = merchant(incoming), bShop = merchant(existing);
    const generic = /^(?:|postransaction)$/;
    if (!generic.test(aShop) && !generic.test(bShop) && aShop !== bShop) continue;
    return 1;
  }
  // Old records without channel metadata retain the former conservative time window.
  if (!next.length && !before.length && incoming.src === existing.src
    && (!incoming.dir || !existing.dir || direction(incoming.dir) === direction(existing.dir))
    && distance(incoming.at, existing.at) <= 180000) {
    const a = transactionReference(incoming.raw || ""), b = transactionReference(existing.raw || "");
    return a && b && a !== b ? null : 0;
  }
  return null;
}

export function duplicateIndex(t: CapturedEntry, entries: CapturedEntry[]): number {
  let index = -1, best = -1, nearest = Infinity;
  entries.forEach((entry, i) => {
    const score = duplicateScore(t, entry), elapsed = distance(t.at, entry.at);
    if (score !== null && (score > best || score === best && elapsed < nearest)) {
      index = i; best = score; nearest = elapsed;
    }
  });
  return index;
}
