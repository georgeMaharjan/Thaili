import assert from "node:assert/strict";
import { MoneyAppDiscovery } from "./discovery.ts";
import { initialState } from "./state.ts";
import type { InstalledApp } from "../lib/money-apps.ts";
let state = initialState(), release!: (apps: InstalledApp[]) => void;
let calls = 0;
const discovery = new MoneyAppDiscovery({
  snapshot: () => state,
  commit(update, done) { state = { ...state, ...(typeof update === "function" ? update(state) : update) }; done?.(); },
  navigate(screen, patch) { assert.equal(screen, "detect"); state = { ...state, ...patch, screen: "detect" }; },
  supported: true, installed: () => ++calls === 1 ? new Promise(done => { release = done; }) : Promise.resolve([{ pkg: "com.f1soft.esewa", label: "eSewa" }]),
  senders: async () => { throw new Error("SMS denied"); }, history: async () => [], message() {}, now: Date.now,
});
const older = discovery.scan(); await discovery.scan("accounts");
release([{ pkg: "com.f1soft.nabilmbank", label: "Nabil" }]); await older;
assert.equal(state.detState, "done"); assert.equal(state.detFound[0].key, "esewa");
assert.equal(state.detFrom, "accounts"); assert.deepEqual(state.detTails, {});
discovery.dispose();
let unsupportedReads = 0;
const unsupported = new MoneyAppDiscovery({
  snapshot: () => state, commit() { },
  navigate(_screen, patch) { state = { ...state, ...patch }; }, supported: false,
  installed: async () => { unsupportedReads++; return []; }, senders: async () => [], history: async () => [], message() {}, now: Date.now
});
await unsupported.scan(); assert.equal(state.detState, "unsupported"); assert.equal(unsupportedReads, 0);
unsupported.dispose();
// Discovery uses sender names only, including senders that also issue OTPs. Bodies require selection.
const smsState = initialState();
state = smsState;
let bodyReads = 0;
const smsDiscovery = new MoneyAppDiscovery({
  snapshot: () => state,
  commit(update, done) { state = { ...state, ...(typeof update === "function" ? update(state) : update) }; done?.(); },
  navigate(screen, patch) { state = { ...state, ...patch, screen: screen as typeof state.screen }; }, supported: true,
  installed: async () => [{ pkg: "np.fixture.citizens", label: "Citizens Smart" }],
  senders: async () => ["PRIME", "CITIZENS", "NABIL"],
  history: async (_since, selected) => {
    bodyReads++; assert.deepEqual(selected, ["prime"]);
    return [
    { sender: "PRIME", body: "NPR 100 has been debited from A/C XXXX4821", at: Date.now() },
    { sender: "CITIZENS", body: "NPR 100 has been credited to A/C XXXX1234", at: Date.now() },
    { sender: "NABIL", body: "OTP is 123456. NPR 100 has been debited", at: Date.now() },
    ].filter(message => message.sender === "PRIME");
  }, message() {}, now: Date.now,
});
await smsDiscovery.scan();
assert.deepEqual(state.detFound.map(d => d.key), ["citizens", "nabil", "prime"]);
assert.deepEqual(state.detFound.find(d => d.key === "prime")!.packages, []);
assert.deepEqual(state.detFound.find(d => d.key === "citizens")!.packages, ["np.fixture.citizens"]);
assert.equal(bodyReads, 0); assert.deepEqual(state.detTails, {});
assert.deepEqual(Object.values(state.detOn), [false, false, false]);
await smsDiscovery.confirm(); assert.equal(bodyReads, 0, "empty selection cannot read message bodies");
state = { ...state, screen: "detect", detOn: { prime: true } };
await smsDiscovery.confirm();
assert.equal(bodyReads, 1); assert.equal(state.detTails.prime, "4821");
assert.deepEqual(state.sources.map(account => account.key), ["prime", "cash"]);
assert.deepEqual(state.smsBanks, ["prime"]); assert.equal(state.screen, "source");

smsDiscovery.dispose();
console.log("discovery: stale scans, denied SMS, browser fallback and SMS-only banks pass");

// Leaving the scan while selected history is pending must not reopen setup or add accounts.
state = initialState(); let finishHistory!: (messages: import("../lib/device").Sms[]) => void;
const cancelled = new MoneyAppDiscovery({
  snapshot: () => state,
  commit(update) { state = { ...state, ...(typeof update === "function" ? update(state) : update) }; },
  navigate(screen, patch) { state = { ...state, ...patch, screen: screen as typeof state.screen }; },
  supported: true, installed: async () => [], senders: async () => ["NABIL"],
  history: () => new Promise(done => { finishHistory = done; }), now: Date.now, message() {},
});
await cancelled.scan(); state = { ...state, detOn: { nabil: true } };
const pendingConfirmation = cancelled.confirm();
await cancelled.confirm(); // Double tap must not create a second read.
cancelled.cancel(); state = { ...state, screen: "permission" };
finishHistory([]); await pendingConfirmation;
assert.equal(state.screen, "permission"); assert.deepEqual(state.sources, []); assert.deepEqual(state.smsBanks, []);
cancelled.dispose();
