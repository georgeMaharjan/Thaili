export type NumericEntryKind = "amount" | "digits";
export type NumericEntryResult = { value: string; caret: number } | { error: "characters" | "length" | "precision" };

/** Normalize editable text without formatting it or moving a cursor to the end.
 * Account identifiers retain leading zeros; amounts use a single leading zero only before a decimal.
 * Empty and trailing-decimal drafts remain valid editing states, not confirmed amounts.
 */
export function numericEntry(text: string, caret: number, kind: NumericEntryKind, maxDigits: number): NumericEntryResult {
  const clean = (value: string) => value.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966)).replace(/[\s,]/g, "");
  let value = clean(text), position = clean(text.slice(0, caret)).length;
  if (!(kind === "amount" ? /^\d*(?:\.\d*)?$/ : /^\d*$/).test(value)) return { error: "characters" };
  if (kind === "amount") {
    const zeros = value.match(/^0+(?=\d)/)?.[0].length || 0;
    value = value.slice(zeros); position = Math.max(0, position - zeros);
    if (value.startsWith(".")) { value = "0" + value; position++; }
    if ((value.split(".")[1]?.length || 0) > 2) return { error: "precision" };
  }
  if (value.split(".")[0].length > maxDigits) return { error: "length" };
  return { value, caret: Math.min(position, value.length) };
}
