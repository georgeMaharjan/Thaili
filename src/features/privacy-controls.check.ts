import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Screens from "../screens/index.tsx";
import { AppController } from "../application/controller.ts";
import { captureConfiguration } from "../application/capture.ts";
import { initialState } from "../application/state.ts";
import { decodePouch, decodePreferences } from "../infrastructure/hydration.ts";
import { snapshot } from "../lib/pouch.ts";

const app = new AppController({});
app.patch = (update, done) => {
  const previous = app.state;
  app.state = { ...app.state, ...(typeof update === "function" ? update(app.state) : update) };
  // React registers screen history after rendering; reproduce that lifecycle for back navigation.
  if (previous.screen !== app.state.screen) app.componentDidUpdate({}, previous);
  done?.();
};
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
  assert.ok(!renderToStaticMarkup(createElement(Screens, { v: app.renderVals() })).includes('aria-describedby="sms-bank-'), "bank switches belong on their own screen");
  app.renderVals().permissionRows.find(row => row.key === "sms")!.tap();
  assert.equal(app.state.screen, "bank-sms");
  assert.ok(renderToStaticMarkup(createElement(Screens, { v: app.renderVals() })).includes('role="switch"'));
  assert.equal(app.back(), true); assert.equal(app.state.screen, "settings", "native back returns from bank access to Settings");
  app.renderVals().permissionRows.find(row => row.key === "sms")!.tap();
  const nabil = app.renderVals().smsBankRows.find(bank => bank.key === "nabil")!;
  assert.equal(nabil.on, false); nabil.tap();
  assert.ok(app.state.smsSince! <= Date.now() - 89 * 86400000, "enabling a bank reopens the recovery window");
  assert.deepEqual(Object.keys(captureConfiguration(app.state).senders), ["nabil"], "account identity works even with a custom account key");
  assert.equal(app.state.sources.length, 2, "turning SMS on must not change accounts");
  const senders = captureConfiguration(app.state).senders, permissions = [...app.state.perms];
  app.renderVals().bankSmsBack(); assert.equal(app.state.screen, "settings");
  app.renderVals().settingRows.find(row => row.label === "Thaili transaction alerts")!.tap();
  assert.equal(app.state.notifMode, "Off");
  assert.deepEqual(app.state.perms, permissions, "Thaili's outgoing alerts do not change incoming capture permissions");
  assert.deepEqual(captureConfiguration(app.state).senders, senders, "turning Thaili alerts off keeps selected bank capture");
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
