// Bank SMS → transaction (spec §11–12, §15). Pure functions; the native side
// (ThailiPlugin.readSms) already dropped everything that isn't a money message.
/* eslint-disable @typescript-eslint/no-explicit-any */

// Which bank sent it, by sender ID or wording. Keys match DETECTED / account keys.
// (?<![A-Z])…(?![A-Z]) instead of \b: sender IDs look like NIC_ALERT, and "_" is a word char.
const BANKS: Record<string, RegExp> = {
  nic: /NIC\s?ASIA|(?<![A-Z])NICA?(?![A-Z])/i,
  nabil: /NABIL/i,
  scb: /SCB|STANDARD\s?CHARTERED|STANCHART/i,
  everest: /EVEREST|(?<![A-Z])EBL(?![A-Z])/i,
  gibl: /GIBL|GLOBAL\s?IME/i,
};
export const bankOf = (text: string) => Object.keys(BANKS).find((k) => BANKS[k].test(text)) || null;

const AMOUNT = /(?:NPR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i;
const CREDIT = /credited|deposited|received|refund/i;
const DEBIT = /debited|withdrawn|debit|paid|purchase|\bPOS\b|spent/i;
// Masked: "A/C ...4821", "a/c XXXX4821", "Card no. **4821", "#4821".
// Mid-masked number (Nabil, NIC Asia): "Your 012##54821 has been…" — only the last four are kept.
const TAIL = /(?:A\/C|acc(?:oun)?t|card)[^\d]{0,14}?[.xX*#]{1,}\s?(\d{3,4})\b|(?:[xX*]{2,}|\.{2,}|#)(\d{3,4})\b|(?:Your|A\/C|acc(?:oun)?t)\s+(?:no\.?\s*)?[\dxX*#]{2,}?(\d{4})\b/i;
// Reminders and notices that mention money but aren't a transaction.
const NOT_A_TXN = /\bis due\b|\bdue (?:date|on)\b|will be (?:debited|deducted|charged)|\breminder\b/i;
const REMARK = /(?:Remarks?|Rmks|For|Narration|Desc(?:ription)?)\s*[:\-]\s*(.+?)(?:\.\s|\.?$|\n)/i;
// Footers that are never the merchant (spec §12.1).
const JUNK = [/never share[^.]*\.?/gi, /download (?:the )?app:?.*$/gim, /https?:\/\/\S+/gi, /\bsurvey\b.*$/gim];

export type Parsed = {
  amt: number; dir: "debit" | "credit"; tail: string | null; rem: string | null;
  m: string; bank: string | null; raw: string; at: number;
};

export function parseSms(msg: { sender: string; body: string; at: number }): Parsed | null {
  const body = JUNK.reduce((t, re) => t.replace(re, ""), msg.body).trim();
  const a = AMOUNT.exec(body);
  if (!a || NOT_A_TXN.test(body)) return null;
  const amt = parseFloat(a[1].replace(/,/g, ""));
  if (!(amt > 0)) return null;
  // Credit words win: "credited to your A/C" can also say "debit card".
  const dir = CREDIT.test(body) ? "credit" : DEBIT.test(body) ? "debit" : null;
  if (!dir) return null;
  const t = TAIL.exec(body);
  const r = REMARK.exec(body);
  const rem = r ? r[1].trim().replace(/\s{2,}/g, " ") || null : null;
  const bank = bankOf(msg.sender + " " + body);
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
