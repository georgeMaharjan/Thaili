// Bank SMS → transaction (spec §11–12, §15). Pure functions; the native side
// (ThailiPlugin.readSms) already dropped everything that isn't a money message.
import { NOTIFICATION_IGNORE, normalizeMoneyText, parseNotification } from "./notification-transactions.ts";
import { INSTITUTIONS, institutionForAccount } from "./institutions.ts";
import { duplicateScore, type CapturedEntry } from "./transaction-capture.ts";

// A bank or wallet name in free text: an account's name, a remark. Keys match recognized account keys.
// (?<![A-Z])…(?![A-Z]) instead of \b: sender IDs look like NIC_ALERT, and "_" is a word char.
const BANKS: Record<string, RegExp> = {
  nic: /NIC\s?ASIA|(?<![A-Z])NICA?(?![A-Z])/i,
  nabil: /NABIL/i,
  scb: /SCB|STANDARD\s?CHARTERED|STANCHART/i,
  everest: /EVEREST|(?<![A-Z])EBL(?![A-Z])/i,
  gibl: /GIBL|GLOBAL\s?IME/i,
  esewa: /E-?SEWA|(?<![A-Z])ESW(?![A-Z])/i,
  khalti: /KHALTI/i,
  ime: /IME\s?PAY/i,
};
// Who may report money: the alert sender IDs banks send from. Anyone else — a person, a promo
// short code — is ignored, whatever the text says. The same IDs also send OTPs and offers;
// TXN below decides which of their messages are transactions.
const SENDERS = Object.fromEntries(INSTITUTIONS.filter(i => i.sms).map(i => [i.key, i.sms!]));
export const knownSmsSenders = Object.fromEntries(Object.entries(SENDERS).map(([key, pattern]) => [key, pattern.source]));
export const bankOf = (sender: string) => Object.keys(SENDERS).find((k) => SENDERS[k].test(sender.trim())) || null;

const AMOUNT = /(?:NPR\.?|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i;
// The sentence that makes it a transaction, and which way the money went. Credit first:
// "credited to your A/C" can also mention a "debit card".
const TXN: [RegExp, "credit" | "debit"][] = [
  [/\b(?:has been|is|was)\s+(?:credited|deposited)\b/i, "credit"],
  [/\bhas been loaded\b.*\bto your \w+ wallet\b/i, "credit"], // Khalti
  [/\b(?:has been|is|was)\s+(?:debited|withdrawn)\b/i, "debit"],
  [/\bPayment\/Wallet Transfer\b.*\bis successful\b/i, "debit"], // Standard Chartered
];
// Masked: "A/C ...4821", "a/c XXXX4821", "Card no. **4821", "#4821".
// Mid-masked number (Nabil, NIC Asia): "Your 012##54821 has been…" — only the last four are kept.
const TAIL = /(?:A\/C|acc(?:oun)?t|card)[^\d]{0,14}?[.xX*#]{1,}\s?(\d{3,4})\b|(?:[xX*]{2,}|\.{2,}|#)(\d{3,4})\b|(?:Your|A\/C|acc(?:oun)?t)\s+(?:no\.?\s*)?[\dxX*#]{2,}?(\d{4})\b/i;
// Reminders and notices that mention money but aren't a transaction.
const NOT_A_TXN = /\bis due\b|\bdue (?:date|on)\b|will be (?:debited|deducted|charged)|\breminder\b/i;
const REMARK = /(?:Remarks?|Rmks|For|Narration|Desc(?:ription)?)\s*[:\-]\s*(.+?)(?:\.\s|\.?$|\n)|Wallet Transfer for (.+?) with the ref/i;
// Footers that are never the merchant (spec §12.1).
const JUNK = [/never share[^.]*\.?/gi, /download (?:the )?app:?.*$/gim, /https?:\/\/\S+/gi, /\bsurvey\b.*$/gim];

export type Parsed = {
  amt: number; dir: "debit" | "credit"; tail: string | null; rem: string | null;
  m: string; bank: string | null; raw: string; at: number;
};

// An app notification has no sender ID: the bank is known from the app that posted it (msg.bank).
export function parseSms(msg: { sender: string; body: string; at: number; bank?: string }): Parsed | null {
  const bank = msg.bank || bankOf(msg.sender || "");
  if (!bank || !Number.isFinite(msg.at) || NOTIFICATION_IGNORE.test(normalizeMoneyText(msg.body))) return null;
  const body = JUNK.reduce((t, re) => t.replace(re, ""), normalizeMoneyText(msg.body)).trim();
  const generic = () => {
    const parsed = parseNotification({ bank, body, at: msg.at });
    return parsed ? { ...parsed, raw: msg.body } : null;
  };
  const a = AMOUNT.exec(body);
  if (NOT_A_TXN.test(body)) return null;
  if (!a) return generic();
  const amt = parseFloat(a[1].replace(/,/g, ""));
  if (!(amt > 0) || !Number.isFinite(amt)) return null;
  const dir = TXN.find(([re]) => re.test(body))?.[1];
  if (!dir) return generic();
  const t = TAIL.exec(body);
  const r = REMARK.exec(body);
  const rem = r ? (r[1] || r[2]).trim().replace(/\s{2,}/g, " ") || null : null;
  // FonePay QR arrives as "MPAY FPQR" for every shop in the country (spec §12.1).
  const m = rem && /FPQR|FONEPAY/i.test(rem) ? "FONEPAY"
    : rem ? rem
    : /\bPOS\b/i.test(body) ? "POS transaction"
    : dir === "credit" ? "Money in" : "Money out";
  return { amt, dir, tail: t ? t[1] || t[2] || t[3] : null, rem, m, bank, raw: msg.body, at: msg.at };
}

// Resolve the institution before comparing suffixes, so two banks sharing a tail
// cannot change each other's balance.
type MatchableSource = { key: string; base?: string; name?: string; acct?: string | null; type?: string };
export function sourceFor<T extends MatchableSource>(p: Parsed, sources: T[]): T | null {
  const accounts = sources.filter((x) => !/manual/i.test(x.type || "") && (x.key === p.bank || institutionForAccount(x)?.key === p.bank));
  if (p.tail) {
    const matching = accounts.filter((x) => x.acct && String(x.acct).slice(-4) === p.tail!.slice(-4));
    if (matching.length) return matching.length === 1 ? matching[0] : null;
    if (accounts.some((x) => x.acct)) return null;
  }
  return accounts.length === 1 ? accounts[0] : null;
}

// A wallet load ("LoadeSewa/…", "eSewa Load …", "Load Wallet Khalti") reads the same whether it went to
// your wallet or to someone you paid. Only your own wallet number in the remark makes it a transfer here;
// otherwise it stays a payment until your wallet reports the money arriving (the importer pairs them).
const MOBILE = /(?<!\d)9[78]\d{5}(?:\d{3})?(?!\d)/;
// The tracked wallet a remark names, whoever's number follows it.
export function walletNamed<T extends MatchableSource>(rem: string | null | undefined, sources: T[]): T | null {
  const w = rem && ["esewa", "khalti"].find((k) => BANKS[k].test(rem));
  return (w && sources.find((x) => x.key === w || BANKS[w].test(x.base || x.name || ""))) || null;
}
export function transferTo<T extends MatchableSource>(p: { dir: string; rem: string | null }, sources: T[]): T | null {
  if (p.dir !== "debit" || !p.rem) return null;
  const wallet = walletNamed(p.rem, sources);
  if (!wallet) return null;
  const mobile = MOBILE.exec(p.rem)?.[0];
  return mobile && wallet.acct && mobile.endsWith(String(wallet.acct)) ? wallet : null;
}

// An identified own-wallet transfer plus its destination credit is stored once.
// Equal debit and credit amounts alone do not establish that they are a transfer.
type TransferEntry = { amt: number; src: string; dir: string; to?: string | null; at: string; cat?: string | null; auto?: string | null };
export function pairTransfers<T extends TransferEntry>(tx: T[]): T[] {
  const out = tx.slice();
  tx.filter((c) => c.dir === "credit").forEach((c) => {
    const i = out.findIndex((d) => d.amt === c.amt && d.src !== c.src
      && d.dir === "transfer" && d.to === c.src
      && Math.abs(Date.parse(d.at) - Date.parse(c.at)) <= 900000);
    if (i < 0) return;
    out[i] = { ...out[i], dir: "transfer", to: c.src, cat: null, auto: null };
    out.splice(out.indexOf(c), 1);
  });
  return out;
}

// The same checks, as pattern strings, for the native side that nudges "Review this transaction"
// while Thaili is closed (android/.../Capture.java). Only the user's own accounts' senders go.
export const nativeRules = (accounts: (string | MatchableSource)[]) => ({
  senders: Object.fromEntries(Object.keys(SENDERS).filter(k => accounts.some(a => typeof a === "string" ? a === k : institutionForAccount(a)?.key === k)).map(k => [k, SENDERS[k].source])),
  txn: TXN.map(([re, dir]) => [re.source, dir]),
  amount: AMOUNT.source, remark: REMARK.source, notTxn: NOT_A_TXN.source,
  wallets: BANKS.esewa.source + "|" + BANKS.khalti.source,
});

// Prefer notification identity and transaction reference; reference-less cross-channel
// duplicates must agree on account, amount and direction within three minutes.
export const isDuplicate = (t: CapturedEntry, existing: CapturedEntry[]) => existing.some(x => duplicateScore(t, x) !== null);

/** Most common last-4 per bank across messages — fills "ending 4821, seen in your messages". */
export function tailsByBank(msgs: { sender: string; body: string; at: number }[]) {
  const n: Record<string, Record<string, number>> = {};
  msgs.map(parseSms).forEach((p) => {
    if (!p || !p.bank || !p.tail) return;
    (n[p.bank] ||= {})[p.tail] = (n[p.bank][p.tail] || 0) + 1;
  });
  const out: Record<string, string> = {};
  Object.keys(n).forEach((b) => { out[b] = Object.keys(n[b]).sort((x, y) => n[b][y] - n[b][x])[0]; });
  return out;
}

/** A bank must have an account and explicit SMS opt-in; old backups default to no body access. */
export const enabledSmsBanks = (accounts: (string | MatchableSource)[], selected: string[]) =>
  Object.keys(nativeRules(accounts).senders).filter(key => selected.includes(key));

export const SMS_HISTORY_MS = 90 * 86400000;
