export type FilingRule = { id: string; kw: string; cat: string; own?: boolean };
export type FileableEntry = { dir: string; m: string; rem?: string | null; raw?: string | null; cat?: string | null; auto?: string | null };

export const words = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z0-9&]+/g, " ").trim();
export const hay = (t: FileableEntry) => words(t.m + " " + (t.rem || "") + " " + (t.raw || ""));
const RAILS = /^(FONEPAY|FPQR|MPAY|QR|PAYMENT|POS|CIPS|IPS|IBFT|FPY|TRANSACTION|MONEY|OUT|IN)$/;
export const kwFor = (t: FileableEntry) => words(t.rem || t.m).split(" ")
  .filter(w => w && !/\d/.test(w) && !RAILS.test(w)).join(" ") || null;

export function findRule(t: FileableEntry | undefined, rules: FilingRule[]) {
  if (!t || t.dir !== "debit") return null;
  const text = hay(t);
  return rules.find(r => text.includes(words(r.kw))) || null;
}

export function autoFile<T extends FileableEntry>(t: T, rules: FilingRule[]): T {
  const rule = findRule(t, rules);
  return rule ? { ...t, cat: rule.cat, auto: rule.kw } : t;
}

export function checkRule(keyword: string, id: string | null, rules: FilingRule[], categories: { key: string; label: string }[]) {
  const kw = words(keyword), others = rules.filter(r => r.id !== id);
  const label = (key: string) => categories.find(c => c.key === key)?.label || "Uncategorised";
  if (!kw) return { block: true, msg: "" };
  if (kw.length < 3) return { block: true, msg: "Use at least 3 letters, or it will catch unrelated spends." };
  const duplicate = others.find(r => words(r.kw) === kw);
  if (duplicate) return { block: true, msg: "“" + kw + "” already files as " + label(duplicate.cat) + ".", dupId: duplicate.id };
  if (kw.split(" ").every(w => RAILS.test(w) || /^(ESEWA|KHALTI|IME|NPR|RS|TRANSFER)$/.test(w))) {
    return { block: true, msg: kw + " is a payment rail, not a shop — it would file every payment the same way." };
  }
  const overlap = others.find(r => words(r.kw).includes(kw) || kw.includes(words(r.kw)));
  if (overlap) return { block: false, warn: true, msg: "Overlaps with “" + overlap.kw + "” (" + label(overlap.cat) + "). The rule higher in the list wins." };
  return { block: false };
}

/** Refiling never overrides a category the user chose by hand. */
export function applyRule<T extends FileableEntry>(entries: T[], rule: FilingRule, previous?: FilingRule) {
  let filed = 0;
  const tx = entries.map(t => {
    if (t.dir !== "debit") return t;
    const held = !!previous && t.auto === previous.kw, hit = hay(t).includes(words(rule.kw));
    if (held && !hit) return { ...t, cat: null, auto: null };
    if ((held || !t.cat) && hit) { filed++; return { ...t, cat: rule.cat, auto: rule.kw }; }
    return t;
  });
  return { tx, filed };
}

export function unfileRule<T extends FileableEntry>(entries: T[], rule: FilingRule): T[] {
  return entries.map(t => t.auto === rule.kw ? { ...t, cat: null, auto: null } : t);
}
