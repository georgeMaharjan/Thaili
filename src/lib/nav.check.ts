// `node src/lib/nav.check.ts`
import assert from "node:assert/strict";
import { nextStack } from "./nav.ts";

const walk = (screens: string[]) => screens.slice(1).reduce((st, to, i) => nextStack(st, screens[i], to), [] as string[]);

// onboarding goes back step by step; an edit screen visited and left is not re-entered
assert.deepEqual(walk(["welcome", "permission", "detect", "source", "src-new", "source"]), ["welcome", "permission", "detect"]);
// finishing onboarding clears everything
assert.deepEqual(walk(["welcome", "permission", "cats", "signup", "home"]), []);
// tabs: a non-home tab has only Home behind it
assert.deepEqual(walk(["home", "insights", "txns"]), ["home"]);
// txns → detail → settings → rules
assert.deepEqual(walk(["home", "txns", "detail", "settings", "rules"]), ["home", "txns", "detail", "settings"]);
// in-app back arrow to a screen behind us behaves like back
assert.deepEqual(walk(["home", "settings", "rules", "settings"]), ["home"]);
console.log("nav: all checks pass");
