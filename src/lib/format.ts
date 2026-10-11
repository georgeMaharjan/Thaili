// Money and phone formatting. Pure, so `node src/lib/format.check.ts` can test it.

// Paisa show only when there are any: "1,500", "1,500.50", "1,500.75".
export const fmt = (n: number) => { const a = Math.round(Math.abs(n) * 100) / 100; return a.toLocaleString("en-IN", { minimumFractionDigits: a % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
// Headline figures (hero, big totals) in whole rupees: paisa there only gets truncated.
export const whole = (n: number) => Math.round(Math.abs(n)).toLocaleString("en-IN");
// An amount mid-typing ("1500.", "1500.5") keeps its dot and digits; only the whole part gets commas.
export const fmtTyped = (v: string) => { const [w, f] = String(v).split("."); return fmt(Number(w) || 0) + (f === undefined ? "" : "." + f); };
export const rs = (n: number) => "Rs " + fmt(n);
// fmt/rs drop the sign (callers word it: "over", "more than expected"). A balance can
// really be below zero — an overdrawn account, cash spent past its opening — so keep it.
export const signed = (n: number) => (Math.round(n) < 0 ? "−" : "");

/* Account balances, which the eye toggle can hide. Transaction amounts never go through these. */
// Hero total beside a separate small "Rs": "1,32,810" or "••••••".
export const balHero = (n: number, hide = false) => hide ? "••••••" : signed(n) + whole(n);
// A balance in a row or a figure: "Rs 1,32,810" or "Rs ••••" (`long` for the single-account hero).
export const balRs = (n: number, hide = false, long = false) => hide ? "Rs " + (long ? "••••••" : "••••") : signed(n) + rs(n);

/* Nepali mobiles: NTC and Ncell numbers are ten digits starting 96, 97 or 98. */
// Typed or pasted: digits only, a leading 977 country code dropped, at most ten.
export const digits10 = (v: string) => { const d = String(v).replace(/\D/g, ""); return (d.length > 10 && d.startsWith("977") ? d.slice(3) : d).slice(0, 10); };
export const validPhone = (ten: string) => /^9[678]\d{8}$/.test(ten);
// "+9779841234567" → "+977 984 123 4567"
export const fmtPhone = (e164: string) => e164.replace(/^\+977(\d{3})(\d{3})(\d{4})$/, "+977 $1 $2 $3");
// Up to two initials: "Sita Shrestha" → "SS".
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

/* The Spacing setting: one multiplier on every padding, margin and gap (never on type, icons,
   touch targets or radii). Side margin 20 becomes 16 / 20 / 24. */
export const DENSITY = { compact: 0.8, default: 1, airy: 1.2 } as const;
export type Density = keyof typeof DENSITY;
export const spaced = (px: number, d: Density) => Math.round(px * (DENSITY[d] ?? 1) * 100) / 100;

