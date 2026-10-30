import assert from "node:assert/strict";
import { AppLifecycle, type Subscription } from "./lifecycle.ts";
let called = 0, removed = 0, registrations = 0, wake = () => { };
let finish!: (handle: Subscription) => void;
const pending = new Promise<Subscription>(done => { finish = done; });
const lifecycle = new AppLifecycle({
  visibility(listener) { registrations++; wake = listener; return () => { removed++; }; },
  keys() { return () => { removed++; }; }, back: () => pending,
  open: async () => ({ remove() { removed++; } }), money: async () => ({ remove() { removed++; } }),
});
const actions = { visible() { called++; }, key() { }, back() { }, open() { }, money() { } };
lifecycle.start(actions); lifecycle.start(actions); wake(); assert.equal(called, 1); assert.equal(registrations, 1);
await Promise.resolve(); lifecycle.dispose(); lifecycle.dispose(); wake(); assert.equal(called, 1);
finish({ remove() { removed++; } }); await pending; await Promise.resolve();
assert.equal(removed, 5);
console.log("lifecycle: single registration, late native handles and complete cleanup pass");
