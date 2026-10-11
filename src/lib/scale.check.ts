// `node src/lib/scale.check.ts` — fails when UI code uses a spacing, type or radius value off the design scales.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const UI = ["src/components/ui.tsx", "src/lib/logic.tsx", ...readdirSync("src/screens").map((f) => "src/screens/" + f)];
// Spacing in 4pt steps (Tailwind units ×4): 2 4 6 8 12 16 20 24 32 40. These are the ones the Spacing setting scales.
const SPACE = new Set([0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]);
const TYPE = new Set([12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 44, 52, 60]);
// 8 thumb · 12 track/tile · 16 card · 18 transaction row · 20 sheet/hero; the rest are pills and bars at height ÷ 2.
const RADIUS = new Set([3, 5, 7, 8, 9, 10, 12, 16, 18, 20]);
const SPACING = /(?<![\w[-])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-(\d+(?:\.\d+)?)(?![\w./\]])/g;
// Sizes must be fixed px so the Spacing setting never resizes them.
const SIZED = /(?<![\w[-])-?(?:w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|inset-x|inset-y|leading)-(\d+(?:\.\d+)?)(?![\w./\]])/g;

const bad: string[] = [];
for (const f of UI) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    const at = f + ":" + (i + 1) + " ";
    for (const m of line.matchAll(SPACING)) if (+m[1] && !SPACE.has(+m[1])) bad.push(at + m[0]);
    for (const m of line.matchAll(SIZED)) if (+m[1]) bad.push(at + m[0] + " (use [Npx])");
    for (const m of line.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) if (!TYPE.has(+m[1])) bad.push(at + m[0]);
    for (const m of line.matchAll(/rounded(?:-[tblr]{1,2})?-\[(\d+)px\]/g)) if (!RADIUS.has(+m[1])) bad.push(at + m[0]);
  });
}
assert.deepEqual(bad, [], "off-scale values:\n" + bad.join("\n"));
console.log("scale: all checks pass");
