// `node src/lib/nav.check.ts`
import assert from "node:assert/strict";
import { nextStack, weeklyDue } from "./nav.ts";

const walk = (screens: string[]) => screens.slice(1).reduce((st, to, i) => nextStack(st, screens[i], to), [] as string[]);

// onboarding goes back step by step; an edit screen visited and left is not re-entered
assert.deepEqual(walk(["welcome", "permission", "detect", "source", "src-new", "source"]), ["welcome", "permission", "detect"]);
// finishing onboarding clears everything
assert.deepEqual(walk(["welcome", "permission", "cats", "signup", "home"]), []);
// tabs: a non-home tab has only Home behind it
assert.deepEqual(walk(["home", "insights", "txns"]), ["home"]);
// txns → detail → accounts → source-detail
assert.deepEqual(walk(["home", "txns", "detail", "accounts", "source-detail"]), ["home", "txns", "detail", "accounts"]);
// in-app back arrow to a screen behind us behaves like back
assert.deepEqual(walk(["home", "accounts", "source-detail", "accounts"]), ["home"]);
// weekly review: Sundays from 8 am, gone once done that Sunday, never on other days
const sun = (h: number) => new Date(2026, 9, 4, h, 30); // Sun 4 Oct 2026
assert.equal(weeklyDue(sun(7), null), false);
assert.equal(weeklyDue(sun(8), null), true);
assert.equal(weeklyDue(sun(23), null), true);
assert.equal(weeklyDue(sun(20), sun(9).getTime()), false); // finished this morning
assert.equal(weeklyDue(sun(9), new Date(2026, 8, 27, 9).getTime()), true); // last Sunday's doesn't count
assert.equal(weeklyDue(new Date(2026, 9, 5, 9), null), false); // Monday
console.log("nav: all checks pass");
