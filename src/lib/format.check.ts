// `node src/lib/format.check.ts`
import assert from "node:assert/strict";
import { balHero, balRs, digits10, fmtPhone, initials, spaced, validPhone } from "./format.ts";

// NTC and Ncell: ten digits starting 98, 97 or 96
for (const ok of ["9841234567", "9761234567", "9651234567"]) assert.ok(validPhone(ok), ok);
for (const bad of ["9541234567", "984123456", "98412345678", "0841234567", ""]) assert.ok(!validPhone(bad), bad);
assert.equal(digits10("+977 984-123-4567"), "9841234567");
assert.equal(digits10("984 123 4567 89"), "9841234567");
assert.equal(fmtPhone("+9779841234567"), "+977 984 123 4567");
assert.equal(initials("  sita   shrestha kc "), "SS");
assert.equal(initials("Ram"), "R");

// the eye hides balances, sign and all; shown balances keep their sign
assert.equal(balHero(132810), "1,32,810");
assert.equal(balHero(-500), "−500");
assert.equal(balHero(132810, true), "••••••");
assert.equal(balRs(1500.5), "Rs 1,500.50");
assert.equal(balRs(-1500), "−Rs 1,500");
assert.equal(balRs(-1500, true), "Rs ••••");
assert.equal(balRs(1500, true, true), "Rs ••••••");

// Spacing: one multiplier — side margin 20 is 16 / 20 / 24
assert.equal(spaced(20, "compact"), 16);
assert.equal(spaced(20, "default"), 20);
assert.equal(spaced(20, "airy"), 24);
assert.equal(spaced(12, "compact"), 9.6);
assert.equal(spaced(-20, "airy"), -24); // bleed margins scale too

console.log("format: all checks pass");
