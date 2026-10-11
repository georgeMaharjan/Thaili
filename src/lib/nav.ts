// Back-stack rules for native navigation (Android back gesture / button).
// The four tabs are roots: Home clears history, another tab keeps only Home behind it.
// Settings is not a tab: it is pushed from the Home avatar, so back returns to Home.
// Opening any other screen remembers where it came from; returning to a screen that is
// already behind us trims the history there, so A → B → A leaves nothing to "go back" to B.
export const TABS = ["home", "txns", "insights", "accounts"];

export function nextStack(stack: string[], from: string, to: string): string[] {
  if (to === "home") return [];
  if (TABS.includes(to)) return ["home"];
  const i = stack.indexOf(to);
  return i > -1 ? stack.slice(0, i) : stack.concat([from]);
}

// Nothing past onboarding opens without a registered user: a tab asked for without one is Register instead.
export const gate = (to: string, hasUser: boolean) => (!hasUser && TABS.includes(to) ? "register" : to);

// Back dismisses the topmost presentation before touching screen history.
// Empty-string note drafts are open editors too.
export function backDismissal(s: Record<string, unknown>): Record<string, unknown> | null {
  for (const key of ["discardAdd", "discardGoal", "deleting", "stopSheet", "calOpen", "filtersOpen"]) {
    if (s[key]) return { [key]: false };
  }
  for (const key of ["ruleEdit", "rulePrompt", "remarkDraft"]) {
    if (s[key] != null) return { [key]: null };
  }
  if (s.editing) return { editing: false };
  return null;
}

// A spend asks for a category for a week after it reaches Thaili (setup imports count from setup,
// not from when the money moved). Past that it stays uncategorised and stops counting in Needs review.
export const REVIEW_DAYS = 7;
export const inReviewWindow = (addedAt: string | undefined, now: number) =>
  !addedAt || now - Date.parse(addedAt) < REVIEW_DAYS * 86400000;

// What the Needs review chip, the tab badge and the review stack all count:
// a spend missing its category or note, still inside its review week.
export const needsReview = (t: { dir: string; cat?: string | null; rem?: string | null; added?: string }, now: number) =>
  t.dir === "debit" && (!t.cat || !t.rem) && inReviewWindow(t.added, now);
