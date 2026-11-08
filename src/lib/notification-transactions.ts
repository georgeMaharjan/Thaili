import type { Parsed } from "./sms";
import { sourceForMoneyApp, type MoneyApp } from "./money-apps.ts";
import { institutionForAccount } from "./institutions.ts";

export const normalizeMoneyText = (text: string) => text
  .replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
  .replace(/[\u200b-\u200d\ufeff]/g, "").replace(/\u00a0/g, " ");

const NUMBER = "([0-9]+(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?)";
const CURRENCY = "(?:NPR\\.?|NRs?\\.?|Rs\\.?|रु\\.?|रू\\.?)";
const PREFIX = new RegExp(CURRENCY + "\\s*[:=-]?\\s*" + NUMBER + "(?![0-9]|\\.[0-9])", "gi");
const SUFFIX = new RegExp(NUMBER + "\\s*" + CURRENCY + "(?![A-Za-z])", "gi");
const LABELED = new RegExp("\\b(?:amount|amt)\\s*[:=]\\s*" + NUMBER + "(?![0-9]|\\.[0-9])", "gi");

// Reject a request, failed payment, OTP or promotion before attempting direction/amount.
export const NOTIFICATION_IGNORE = /\b(?:failed|declined|unsuccessful|pending|cancelled|canceled|scheduled|processing)\b|\b(?:payment|money|transfer)\s+request\b|\b(?:request|requested)\s+(?:for\s+)?(?:money|payment)\b|\b(?:will be|to be)\s+(?:debited|credited|deducted)\b|\b(?:is due|due date|reminder|pay now|please pay|up to|win|offer|earn cashback)\b|(?:OTP|one[- ]?time password|verification code|passcode)\W{0,8}(?:is\W*)?[0-9]{4,8}\b|\b[0-9]{4,8}\s+(?:is your\s+)?(?:OTP|verification code)\b|असफल|प्रक्रियामा/i;
const CREDIT = /\b(?:credited|received|deposited|refunded)\b|\b(?:funds?|money|balance)\s+(?:has been\s+|is\s+|was\s+)?(?:added|loaded)\b|\b(?:added|loaded)\s+to\s+your\s+(?:wallet|account|balance)\b|\bloaded\b[^\n]*\b(?:your|wallet)\b|\b(?:has been|was)\s+loaded\s+with\b|\b(?:refund|cashback|deposit|top[- ]?up|load)\s+(?:successful|completed|received)\b|\bcredit\s+(?:alert|transaction)\b|\bcredit\s*[:\n]|\b(?:transaction\s*type|type)\s*[:=-]\s*(?:cr|credit)\b|जम्मा\s*(?:भएको|भयो|गरिएको)|प्राप्त/i;
const DEBIT = /\b(?:debited|deducted|paid|sent|withdrawn|spent|charged|purchased)\b|\b(?:payment|purchase|withdrawal|bill payment|wallet transfer)\s+(?:was\s+|is\s+)?(?:successful|completed|success)\b|\b(?:made|completed)\s+(?:a\s+)?payment\b|\b(?:transfer|your\s+transaction)\s+of\b[^\n]*?\b(?:is|was|has been)\s+(?:successfully\s+)?(?:successful|completed)\b|\b(?:successfully\s+(?:paid|sent|transferred)|transferred\s+(?:to|from your))\b|\bdebit\s+(?:alert|transaction)\b|\bdebit\s*[:\n]|\b(?:transaction\s*type|type)\s*[:=-]\s*(?:dr|debit)\b|भुक्तानी\s*(?:भएको|भयो|सफल)|कटौती|खर्च\s*भयो|पठाइएको/i;
const BALANCE = /(?:\b(?:available|current|remaining|closing|opening|avl)\s*)?\b(?:balance|bal)\.?\s*[:=\-]?\s*$/i;
const FEE = /\b(?:fee|fees|charge|charges)\s*[:=\-]?\s*$/i;
const TAIL = /(?:A\/C|account|acct|card)\s*(?:no\.?\s*)?[: ]*[^\n]{0,14}?[xX*#.]([0-9]{4})\b|(?:your|A\/C|account)\s+[0-9xX*#]{2,}?([0-9]{4})\b/i;

export function transactionReference(raw: string): string | null {
  const body = normalizeMoneyText(raw);
  return /\b(?:transaction\s*(?:id|no\.?|number)|txn\s*(?:id|no\.?)|ref(?:erence)?(?:\.?\s*(?:id|no\.?|number|num\.?))?|rrn)\s*[:#=.-]?\s*([A-Za-z0-9][A-Za-z0-9-]{3,})\b/i.exec(body)?.[1].toUpperCase() || null;
}

export function parseNotification(msg: { bank: string; body: string; at: number }): Parsed | null {
  if (!msg.bank || !Number.isFinite(msg.at)) return null;
  const body = normalizeMoneyText(msg.body);
  if (NOTIFICATION_IGNORE.test(body)) return null;
  const credit = CREDIT.exec(body), debit = DEBIT.exec(body);
  // "Payment successful" can accompany "You received ..."; actual movement wins
  // over the generic title. Conflicting explicit movements are left unlogged.
  const explicitDebit = /\b(?:debited|deducted|paid|sent|withdrawn|spent|charged|purchased|transferred)\b|कटौती/.exec(body.toLowerCase());
  if ((!credit && !debit) || (credit && explicitDebit)) return null;
  const dir = credit ? "credit" : "debit";
  const movement = credit || debit!;
  const candidates: { amt: number; index: number; distance: number }[] = [];
  for (const re of [PREFIX, SUFFIX, LABELED]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(body))) {
      const before = body.slice(Math.max(0, match.index - 50), match.index);
      if (BALANCE.test(before) || FEE.test(before)) continue;
      const amt = Number(match[1].replace(/,/g, ""));
      if (amt > 0 && Number.isFinite(amt)) candidates.push({ amt, index: match.index, distance: Math.abs(match.index - movement.index) });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const chosen = candidates[0];
  const tail = TAIL.exec(body);
  const remark = (/\b(?:remarks?|rmks|narration|description|merchant)\s*[:\-]\s*([^\n]+?)(?:\.\s|$|\n)/i.exec(body)?.[1]?.trim()
    || /\b(?:paid|payment(?:\s+(?:of|for)\s+[^\n]+?)?)\b[^\n]*?\bto\s+([^\n]+?)(?:[.,]\s|\s+(?:on|ref|txn|transaction|available|balance)\b|$)/i.exec(body)?.[1]?.trim()
    || /\btransaction\s+of\b[^\n]*?\bfor\s+([^\n]+?)\s+(?:is|was|has been)\b/i.exec(body)?.[1]?.trim()
    || /\b(?:received|credited)\b[^\n]*?\bfrom\s+([^\n]+?)(?:[.,]\s|\s+(?:on|ref|txn|transaction|available|balance)\b|$)/i.exec(body)?.[1]?.trim()
    || null)?.replace(/[.,]$/, "") || null;
  return {
    amt: chosen.amt, dir, tail: tail ? tail[1] || tail[2] : null, rem: remark,
    m: remark || (dir === "credit" ? "Money in" : "Money out"), bank: msg.bank, raw: msg.body, at: msg.at,
  };
}

// Native capture stores candidates; the parser above decides whether they are transactions.
export const notificationRules = () => ({
  amount: PREFIX.source + "|" + SUFFIX.source + "|" + LABELED.source,
  ignore: NOTIFICATION_IGNORE.source,
  debit: DEBIT.source,
  credit: CREDIT.source,
});

// A valid alert can introduce a previously untracked financial app. Non-transactions
// never create accounts, and accounts added by hand retain their saved identity.
export function notificationInbox(
  notifications: { id?: string; pkg: string; body: string; at: number }[],
  apps: MoneyApp[],
  sources: { key: string; base?: string; name?: string; acct?: string | null }[],
  fallback: Record<string, string>,
) {
  const additions: { key: string; base: string; name: string; short: string; type: string; dot: string; opening: number; acct: string | null; packages: string[] }[] = [];
  const messages: { id?: string; sender: string; bank: string; body: string; at: number; ch: string }[] = [];
  for (const n of notifications) {
    const app = apps.find((a) => a.packages.includes(n.pkg));
    const existing = app && sourceForMoneyApp(app, [...sources, ...additions]);
    // Use institution identity to resolve the tail across multiple accounts.
    // Binding an alert to the first account here would bypass that resolution.
    const savedKey = fallback[n.pkg];
    const savedIdentity = sources.find(s => s.key === savedKey);
    const key = app?.key && !app.key.startsWith("app:") ? app.key
      : existing?.key || (savedIdentity && institutionForAccount(savedIdentity)?.key) || savedKey || app?.key;
    if (!key) continue;
    const parsed = parseNotification({ bank: key, body: n.body, at: n.at });
    if (!parsed) continue;
    if (!existing && app && !sources.some((s) => s.key === key) && !additions.some((s) => s.key === key)) {
      additions.push({
        key, base: app.base, name: app.base, short: app.base, packages: app.packages,
        type: app.kind === "wallet" ? "Wallet · notifications" : "Bank · SMS",
        dot: app.kind === "wallet" ? "#2B3A4A" : "#D02A2E", opening: 0, acct: parsed.tail,
      });
    }
    messages.push({ ...n, sender: "", bank: key, ch: "App" });
  }
  return { additions, messages };
}
