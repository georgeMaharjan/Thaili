import assert from "node:assert/strict";
import { AuthenticationSession, authenticationMessage, type AuthenticationResult } from "./authentication.ts";

let visible = false, calls = 0;
const states: boolean[] = [];
let complete: (result: AuthenticationResult) => void = () => {};
let fail: (error: Error) => void = () => {};
const session = new AuthenticationSession(() => {
  calls++;
  return new Promise((resolve, reject) => { complete = resolve; fail = reject; });
}, () => visible, active => states.push(active));

assert.deepEqual(await session.run("Unlock"), { ok: false, reason: "not-ready" });
assert.equal(calls, 0); // Background loading must not send a prompt into a saved Android activity.
visible = true;
let pending = session.run("Unlock");
assert.equal(session.active, true);
assert.deepEqual(await session.run("Unlock"), { ok: false, reason: "busy" });
assert.equal(calls, 1); // Rapid taps cannot replace the first prompt's callback.
complete({ ok: false, reason: "not-ready" });
assert.equal((await pending).ok, false);
assert.equal(session.active, false); // Native lifecycle refusal permits a later real tap.
pending = session.run("Unlock");
fail(new Error("Native bridge rejected"));
assert.deepEqual(await pending, { ok: false, reason: "unavailable" });
assert.equal(session.active, false);
pending = session.run("Unlock");
complete({ ok: false, reason: "cancelled" });
assert.equal((await pending).ok, false);
pending = session.run("Unlock");
visible = false; // The device PIN activity can hide the WebView during authentication.
assert.deepEqual(await session.run("Unlock"), { ok: false, reason: "busy" });
complete({ ok: true });
assert.deepEqual(await pending, { ok: true });
assert.equal(session.active, false);
assert.deepEqual(states, [true, false, true, false, true, false, true, false]);
assert.match(authenticationMessage("no-lock"), /screen lock/);
assert.match(authenticationMessage("not-ready"), /Unlock again/);
assert.match(authenticationMessage("cancelled"), /cancelled/);
assert.match(authenticationMessage("unavailable"), /try again/);
console.log("authentication: hidden startup, concurrent taps, lifecycle refusal, cancellation, rejection and retry pass");
