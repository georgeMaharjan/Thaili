// Back-stack rules for native navigation (Android back gesture / button).
// The four tabs are roots: Home clears history, another tab keeps only Home behind it.
// Opening any other screen remembers where it came from; returning to a screen that is
// already behind us trims the history there, so A → B → A leaves nothing to "go back" to B.
export const TABS = ["home", "txns", "insights", "accounts"];

export function nextStack(stack: string[], from: string, to: string): string[] {
  if (to === "home") return [];
  if (TABS.includes(to)) return ["home"];
  const i = stack.indexOf(to);
  return i > -1 ? stack.slice(0, i) : stack.concat([from]);
}
