import assert from "node:assert/strict";
import { AppController } from "../application/controller.ts";
import { captureConfiguration } from "../application/capture.ts";
import { initialState } from "../application/state.ts";
import { decodePouch, decodePreferences } from "../infrastructure/hydration.ts";
import { snapshot } from "../lib/pouch.ts";

const app = new AppController({});
app.patch = (update, done) => { app.state = { ...app.state, ...(typeof update === "function" ? update(app.state) : update) }; done?.(); };
app.state = { ...initialState(), loaded: true, splash: false, screen: "permission",
  sources: [
    { key: "manual-nabil", base: "Nabil Bank", name: "My bank", acct: "4821", type: "Bank · SMS", dot: "red", opening: 1000 },
    { key: "prime", base: "Prime Commercial Bank", name: "Prime", acct: "1234", type: "Bank · SMS", dot: "blue", opening: 2000 },
  ]
};
try {
  const v = app.renderVals();
  assert.ok(v.permissionRows.some(row => row.key === "sms" && row.state === "Off"));
  assert.match(v.permissionNote, /backup does not restore Android permissions/);
  assert.equal(v.smsCanRecover, false);
  v.openPrivacy(); assert.equal(app.state.screen, "privacy");
  assert.ok(app.renderVals().privacySections.length >= 7);
  app.renderVals().privacyBack(); assert.equal(app.state.screen, "permission");
  assert.deepEqual(captureConfiguration(app.state).senders, {}, "Android permission alone grants no bank body reads");
  app.go("settings");
  const nabil = app.renderVals().smsBankRows.find(bank => bank.key === "nabil")!;
  assert.equal(nabil.on, false); nabil.tap();
  assert.ok(app.state.smsSince! <= Date.now() - 89 * 86400000, "enabling a bank reopens the recovery window");
  assert.deepEqual(Object.keys(captureConfiguration(app.state).senders), ["nabil"], "account identity works even with a custom account key");
  assert.equal(app.state.sources.length, 2, "turning SMS on must not change accounts");
  const restored = decodePouch(snapshot(app.state)); assert.deepEqual(restored.prefs.smsBanks, ["nabil"]);
  app.renderVals().smsBankRows.find(bank => bank.key === "nabil")!.tap();
  assert.deepEqual(captureConfiguration(app.state).senders, {});
  assert.equal(app.state.sources.length, 2, "turning SMS off keeps the ledger");
  assert.deepEqual(decodePreferences({ smsBanks: ["nabil", "nabil"] }).smsBanks, ["nabil"]);
  assert.throws(() => decodePreferences({ smsBanks: "nabil" }), /SMS banks/);
  const legacy = snapshot(app.state); delete legacy.prefs.smsBanks;
  const reopened = { ...initialState(), ...decodePouch(legacy).prefs, sources: legacy.sources };
  assert.deepEqual(captureConfiguration(reopened).senders, {}, "old backups require an explicit bank selection");
} finally { app.componentWillUnmount(); }
console.log("privacy controls: accessible policy, explicit per-bank consent, persistence, revocation and legacy opt-in pass");
