// `node src/lib/nav.check.ts`
import assert from "node:assert/strict";
import { gate, inReviewWindow, needsReview, nextStack, backDismissal } from "./nav.ts";

const walk = (screens: string[]) => screens.slice(1).reduce((st, to, i) => nextStack(st, screens[i], to), [] as string[]);

// onboarding goes back step by step; an edit screen visited and left is not re-entered
assert.deepEqual(walk(["welcome", "permission", "detect", "source", "src-new", "source"]), ["welcome", "permission", "detect"]);
// finishing onboarding clears everything
assert.deepEqual(walk(["welcome", "permission", "cats", "signup", "home"]), []);
// tabs: a non-home tab has only Home behind it
assert.deepEqual(walk(["home", "insights", "txns"]), ["home"]);
// Accounts is a tab: switching to it drops the Transactions trail; its detail screen stacks on it
assert.deepEqual(walk(["home", "txns", "detail", "accounts", "source-detail"]), ["home", "accounts"]);
// in-app back arrow to a screen behind us behaves like back
assert.deepEqual(walk(["home", "accounts", "source-detail", "accounts"]), ["home"]);
// Back closes nested sheets before filters, and preserves even empty note drafts.
assert.deepEqual(backDismissal({ calOpen: true, filtersOpen: true }), { calOpen: false });
assert.deepEqual(backDismissal({ filtersOpen: true }), { filtersOpen: false });
assert.deepEqual(backDismissal({ remarkDraft: "", editing: true }), { remarkDraft: null });
assert.deepEqual(backDismissal({ ruleEdit: {}, editing: true }), { ruleEdit: null });
assert.deepEqual(backDismissal({ discardAdd: true }), { discardAdd: false });
assert.deepEqual(backDismissal({ discardGoal: true }), { discardGoal: false });
assert.equal(backDismissal({ remarkDraft: null, calOpen: false }), null);
assert.deepEqual(walk(["home", "txns", "add", "txns"]), ["home"]);
assert.deepEqual(walk(["home", "insights", "flow", "detail", "flow"]), ["home", "insights"]);
// no Home (or any tab) without a registered user; onboarding screens stay reachable
for (const tab of ["home", "txns", "insights", "accounts"]) {
  assert.equal(gate(tab, false), "register");
  assert.equal(gate(tab, true), tab);
}
for (const s of ["welcome", "register", "permission", "cats", "signup", "restore"]) assert.equal(gate(s, false), s);

// Settings is pushed from the Home avatar: back returns Home, and its own sub-screens come back to it
assert.deepEqual(walk(["home", "settings"]), ["home"]);
assert.deepEqual(walk(["home", "settings", "profile"]), ["home", "settings"]);
assert.deepEqual(walk(["home", "settings", "profile", "settings"]), ["home"]);
// Accounts is a tab root now: only Home sits behind it
assert.deepEqual(walk(["home", "txns", "accounts"]), ["home"]);
// Account scans and account-detail editing return to Accounts without re-entering setup.
assert.deepEqual(walk(["home", "accounts", "detect", "accounts"]), ["home"]);
assert.deepEqual(walk(["home", "accounts", "detect", "src-new", "accounts"]), ["home"]);

// the Needs review chip: a spend missing a category or note, inside its week; never income or transfers
const rowAt = (o: object) => Object.assign({ dir: "debit", cat: "food", rem: "lunch", added: "2026-10-01T09:00:00Z" }, o);
const at = Date.parse("2026-10-03T09:00:00Z");
assert.ok(needsReview(rowAt({ cat: null }), at));
assert.ok(needsReview(rowAt({ rem: null }), at));
assert.ok(!needsReview(rowAt({}), at));
assert.ok(!needsReview(rowAt({ dir: "credit", cat: null }), at));
assert.ok(!needsReview(rowAt({ dir: "transfer", cat: null }), at));
assert.ok(!needsReview(rowAt({ cat: null }), Date.parse("2026-10-09T09:00:00Z")));

// needs review for 7 days after import, then it quietly stays uncategorised
const t0 = Date.parse("2026-10-01T09:00:00Z"), day = 86400000;
assert.ok(inReviewWindow("2026-10-01T09:00:00Z", t0 + 6 * day));
assert.ok(!inReviewWindow("2026-10-01T09:00:00Z", t0 + 7 * day));
assert.ok(inReviewWindow(undefined, t0)); // added on this phone, not saved yet: it's new

console.log("nav: all checks pass");
