// Bank SMS → transaction (spec §11–12, §15). Pure functions; the native side
// (ThailiPlugin.readSms) already dropped everything that isn't a money message.
/* eslint-disable @typescript-eslint/no-explicit-any */

// A bank or wallet name in free text: an account's name, a remark. Keys match DETECTED / account keys.
// (?<![A-Z])…(?![A-Z]) instead of \b: sender IDs look like NIC_ALERT, and "_" is a word char.
const BANKS: Record<string, RegExp> = {
  nic: /NIC\s?ASIA|(?<![A-Z])NICA?(?![A-Z])/i,
  nabil: /NABIL/i,
  scb: /SCB|STANDARD\s?CHARTERED|STANCHART/i,
  everest: /EVEREST|(?<![A-Z])EBL(?![A-Z])/i,
  gibl: /GIBL|GLOBAL\s?IME/i,
  esewa: /E-?SEWA/i,
  khalti: /KHALTI/i,
  ime: /IME\s?PAY/i,
};
// Who may report money: the alert sender IDs banks send from. Anyone else — a person, a promo
// short code — is ignored, whatever the text says. The same IDs also send OTPs and offers;
// TXN below decides which of their messages are transactions.
const SENDERS: Record<string, RegExp> = {
  nic: /^NICA?[_-]?(ALERT|ASIA)?$/i,
  nabil: /^NABIL[_-]?(ALERT)?$/i,
  scb: /^(SCB?[_-]?ALERT|STANCHART|SCBNL)$/i,
  everest: /^EBL[_-]?ALERT$/i,
  gibl: /^GIBL[_-]?(ALERT)?$/i,
  khalti: /^KHALTI$/i,
};
export const bankOf = (sender: string) => Object.keys(SENDERS).find((k) => SENDERS[k].test(sender.trim())) || null;

const AMOUNT = /(?:NPR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i;
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
  if (!bank) return null;
  const body = JUNK.reduce((t, re) => t.replace(re, ""), msg.body).trim();
  const a = AMOUNT.exec(body);
  if (!a || NOT_A_TXN.test(body)) return null;
  const amt = parseFloat(a[1].replace(/,/g, ""));
  if (!(amt > 0)) return null;
  const dir = TXN.find(([re]) => re.test(body))?.[1];
  if (!dir) return null;
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

// The account a message belongs to: the last four digits first, then the bank.
export function sourceFor(p: Parsed, sources: any[]) {
  const tail = p.tail;
  return (tail && sources.find((x) => x.acct && String(x.acct).slice(-4) === tail.slice(-4)))
    || (p.bank && sources.find((x) => x.key === p.bank || BANKS[p.bank!].test(x.base || x.name)))
    || null;
}

// A debit that loads one of your wallets ("LoadeSewa/…", "eSewa Load …", "Wallet Transfer for Khalti")
// is a transfer, not a spend. The wallet sends no SMS of its own for it, so the remark is all there is.
// A mobile number in the remark that isn't the wallet's ("eSewa Load 9851172") loaded someone
// else's wallet: that's a payment. Nabil cuts the number to 7 digits, so your own load reads as
// a payment there too — ponytail: store the full wallet number to tell those apart.
const MOBILE = /(?<!\d)9[78]\d{5}(?:\d{3})?(?!\d)/;
export function transferTo(p: { dir: string; rem: string | null }, sources: any[]) {
  if (p.dir !== "debit" || !p.rem) return null;
  const w = ["esewa", "khalti"].find((k) => BANKS[k].test(p.rem!));
  const wallet = w && sources.find((x) => x.key === w || BANKS[w].test(x.base || x.name));
  if (!wallet) return null;
  const mobile = MOBILE.exec(p.rem)?.[0];
  return mobile && !(wallet.acct && mobile.endsWith(String(wallet.acct))) ? null : wallet;
}

// Money out of one of your accounts and the same amount into another within 15 minutes is
// one transfer: the debit becomes "transfer to", the credit goes. Pure; returns a new list.
// ponytail: pairs within one batch of messages; a pair split across two SMS reads stays two lines.
export function pairTransfers(tx: any[]) {
  const out = tx.slice();
  tx.filter((c) => c.dir === "credit").forEach((c) => {
    const i = out.findIndex((d) => d.amt === c.amt && d.src !== c.src
      && (d.dir === "debit" || (d.dir === "transfer" && d.to === c.src))
      && Math.abs(Date.parse(d.at) - Date.parse(c.at)) <= 900000);
    if (i < 0) return;
    out[i] = { ...out[i], dir: "transfer", to: c.src, cat: null, auto: null };
    out.splice(out.indexOf(c), 1);
  });
  return out;
}

// The same checks, as pattern strings, for the native side that nudges "Review this transaction"
// while Thaili is closed (android/.../Capture.java). Only the user's own accounts' senders go.
export const nativeRules = (accountKeys: string[]) => ({
  senders: Object.fromEntries(Object.keys(SENDERS).filter((k) => accountKeys.includes(k)).map((k) => [k, SENDERS[k].source])),
  txn: TXN.map(([re, dir]) => [re.source, dir]),
  amount: AMOUNT.source, remark: REMARK.source, notTxn: NOT_A_TXN.source,
  wallets: BANKS.esewa.source + "|" + BANKS.khalti.source,
});

// Spec §15: same amount + same account within ±3 minutes is one transaction.
export const isDuplicate = (t: { src: string; amt: number; at: string }, existing: any[]) =>
  existing.some((x) => x.src === t.src && x.amt === t.amt && Math.abs(Date.parse(x.at) - Date.parse(t.at)) <= 180000);

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
