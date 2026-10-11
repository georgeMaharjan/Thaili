// Bikram Sambat calendar helpers. All financial periods run on BS (spec §6);
// the month tables come from nepali-datetime (supported through 2099 BS).
import NepaliDate from "nepali-datetime";

export const BS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
export const BS_NP = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];

export type Bs = { y: number; m: number; d: number }; // m is 0-based

export const bsOf = (date: Date): Bs => {
  const n = new NepaliDate(date);
  return { y: n.getYear(), m: n.getMonth(), d: n.getDate() };
};
// The AD date a BS day falls on.
export const adOf = (y: number, m: number, d: number) => new NepaliDate(y, m, d).getDateObject();
export const daysInBsMonth = (y: number, m: number) => NepaliDate.getDaysOfMonth(y, m);
// Months as one running number, so "previous month" is just key - 1 across year ends.
export const monthKey = (b: Bs) => b.y * 12 + b.m;
export const monthName = (key: number, np = false) => (np ? BS_NP : BS_EN)[((key % 12) + 12) % 12];
export const npDigits = (n: number | string) => String(n).replace(/\d/g, (c) => "०१२३४५६७८९"[+c]);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// The design's logic reads a transaction's day offset from today (`off`), its
// clock time and its BS date; all three are derived from the stored timestamp.
export function dated<T extends { at: string }>(t: T, today = new Date()) {
  const at = new Date(t.at);
  return Object.assign({}, t, {
    off: Math.round((startOfDay(today) - startOfDay(at)) / 86400000),
    time: at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase(),
    bs: bsOf(at),
  });
}
