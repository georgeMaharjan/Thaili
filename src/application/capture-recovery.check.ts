import assert from "node:assert/strict";
import { CaptureCoordinator } from "./capture.ts";
import { initialState } from "./state.ts";
import type { Sms } from "../lib/device.ts";
const at = Date.parse("2026-11-11T12:00:00Z"), day = 86400000;
const seed = (): import("./state").AppState => ({ ...initialState(), loaded: true, setupComplete: true, smsBanks: ["nabil"],
  user: { name: "Fixture", phone: "+9779800000000", createdAt: new Date(at - 10 * day).toISOString() },
  sources: [{ key: "nabil", name: "Nabil", type: "Bank · SMS", opening: 1000, acct: "4821", dot: "red" }],
  smsSince: at, captureStartAt: at - 7 * day,
});
const missed: Sms = { id: "device-missed", sender: "NABIL", at: at - 2 * day,
  body: "NPR 100 has been debited from A/C XXXX4821. Ref: MISSED001" };
let state = seed(); const queries: number[] = [], notices: string[] = [];
const capture = new CaptureCoordinator({
  snapshot: () => state, commit: async update => { state = { ...state, ...update(state) }; }, apps: async () => [],
  readSms: async (since, selected) => { assert.deepEqual(selected, ["nabil"]); queries.push(since); return since <= missed.at ? [missed] : []; },
  readNotifications: async () => [], message: text => notices.push(text), now: () => at, newId: () => "recovered",
});
await capture.catchUp(); assert.equal(state.tx.length, 0, "recent reads cannot recover an already-skipped gap");
await capture.catchUp(true); assert.equal(state.tx.length, 1, "manual refresh recovers missed messages after a restore");
assert.equal(queries.at(-1), state.captureStartAt, "backfill still respects the user's history cutoff");
await capture.catchUp(true); assert.equal(state.tx.length, 1, "rescanning must not duplicate existing transactions");
state = { ...state, tx: [], captureStartAt: at - day };
await capture.catchUp(true); assert.equal(state.tx.length, 0, "explicitly skipped history stays skipped");
state = { ...seed(), smsBanks: [], smsSince: at - 5 * day }; const before = queries.length;
await capture.catchUp(true); assert.equal(queries.length, before); assert.equal(state.smsSince, at - 5 * day);
assert.match(notices.at(-1)!, /Choose banks/); capture.dispose();

state = { ...seed(), smsSince: at - 3 * day };
const denied = new CaptureCoordinator({
  snapshot: () => state, commit: async update => { state = { ...state, ...update(state) }; }, apps: async () => [],
  readSms: async () => { throw new Error("SMS_PERMISSION_REQUIRED"); }, readNotifications: async () => [],
  message: text => notices.push(text), now: () => at, newId: () => "denied",
});
await denied.catchUp(true); assert.equal(state.smsSince, at - 3 * day); assert.match(notices.at(-1)!, /permission/i); denied.dispose();

// A manual refresh queued during a normal read must keep its history-recovery intent.
state = seed(); let release!: (messages: Sms[]) => void; let reads = 0;
const queued = new CaptureCoordinator({
  snapshot: () => state, commit: async update => { state = { ...state, ...update(state) }; }, apps: async () => [],
  readSms: async since => { queries.push(since); return ++reads === 1 ? new Promise(done => { release = done; }) : [missed]; },
  readNotifications: async () => [], message() {}, now: () => at, newId: () => "queued-recovery",
});
const pending = queued.catchUp(); void queued.catchUp(true); release([]); await pending; queued.queue();
await new Promise(done => setTimeout(done, 250));
assert.equal(reads, 2); assert.equal(queries.at(-1), state.captureStartAt); assert.equal(state.tx.length, 1); queued.dispose();
console.log("capture recovery: restore gaps, deduplication, history cutoffs, disabled/denied SMS and queued refresh pass");
