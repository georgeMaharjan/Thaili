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
  history: async () => { throw new Error("SMS denied"); }, now: Date.now,
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
  installed: async () => { unsupportedReads++; return []; }, history: async () => [], now: Date.now
});
await unsupported.scan(); assert.equal(state.detState, "unsupported"); assert.equal(unsupportedReads, 0);
unsupported.dispose();
// SMS-only banks are offered without pretending their apps are installed; OTPs are not discovery evidence.
const smsState = initialState();
state = smsState;
const smsDiscovery = new MoneyAppDiscovery({
  snapshot: () => state,
  commit(update, done) { state = { ...state, ...(typeof update === "function" ? update(state) : update) }; done?.(); },
  navigate(_screen, patch) { state = { ...state, ...patch }; }, supported: true,
  installed: async () => [{ pkg: "np.fixture.citizens", label: "Citizens Smart" }],
  history: async () => [
    { sender: "PRIME", body: "NPR 100 has been debited from A/C XXXX4821", at: Date.now() },
    { sender: "CITIZENS", body: "NPR 100 has been credited to A/C XXXX1234", at: Date.now() },
    { sender: "NABIL", body: "OTP is 123456. NPR 100 has been debited", at: Date.now() },
  ], now: Date.now,
});
await smsDiscovery.scan();
assert.deepEqual(state.detFound.map(d => d.key), ["citizens", "prime"]);
assert.deepEqual(state.detFound.find(d => d.key === "prime")!.packages, []);
assert.deepEqual(state.detFound.find(d => d.key === "citizens")!.packages, ["np.fixture.citizens"]);
assert.equal(state.detTails.prime, "4821"); assert.equal(state.detTails.nabil, undefined);
smsDiscovery.dispose();
console.log("discovery: stale scans, denied SMS, browser fallback and SMS-only banks pass");
