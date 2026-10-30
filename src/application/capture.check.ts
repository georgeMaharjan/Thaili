import assert from "node:assert/strict";
import { CaptureCoordinator } from "./capture.ts";
import { initialState } from "./state.ts";
import type { Sms } from "../lib/device.ts";
const at = Date.parse("2026-10-11T12:00:00Z");
const seed = (): import("./state").AppState => ({
  ...initialState(), loaded: true, setupComplete: true, user: { name: "Fixture", phone: "+9779800000000", createdAt: new Date(at).toISOString() },
  sources: [{ key: "nabil", name: "Nabil", type: "Bank · SMS", opening: 1000, acct: "4821", dot: "red" }], smsSince: at - 60000, notificationSince: at - 60000
});
const message: Sms = { id: "sms", sender: "NABIL", body: "NPR 100 has been debited from A/C XXXX4821. Remarks: SHOP. Ref: TXN10001", at };
let state = seed(), resolveRead!: (messages: Sms[]) => void, reads = 0, commits = 0;
const coordinator = new CaptureCoordinator({
  snapshot: () => state,
  commit: async update => { commits++; state = { ...state, ...update(state) }; },
  apps: async () => [], readSms: async () => { reads++; return new Promise<Sms[]>(done => { resolveRead = done; }); },
  readNotifications: async () => { throw new Error("permission denied"); }, message() { }, now: () => at, newId: () => "generated",
});
const first = coordinator.catchUp(), second = coordinator.catchUp();
assert.equal(first, second); assert.equal(reads, 1);
// Account edits accepted during a native read survive capture's commit.
state = { ...state, sources: state.sources.map(s => ({ ...s, opening: 2500 })), roles: { nabil: "savings" } };
resolveRead([message]); await first;
assert.equal(commits, 1); assert.equal(state.tx.length, 1); assert.equal(state.sources[0].opening, 2500);
assert.equal(state.roles.nabil, "savings"); assert.equal(state.smsSince, at);
assert.equal(state.notificationSince, at - 60000); // Failed channel is retried from its old cursor.
coordinator.dispose(); await coordinator.catchUp(); assert.equal(reads, 1);

state = seed(); let release!: (messages: Sms[]) => void;
const stopped = new CaptureCoordinator({
  snapshot: () => state, commit: async update => { state = { ...state, ...update(state) }; },
  apps: async () => [], readSms: () => new Promise(done => { release = done; }), readNotifications: async () => [],
  message() { }, now: () => at, newId: () => "late",
});
const pending = stopped.catchUp(); stopped.dispose(); release([message]); await pending;
assert.equal(state.tx.length, 0); assert.equal(state.smsSince, at - 60000);
console.log("capture coordinator: one active read, concurrent edits, failed cursors and disposal pass");
