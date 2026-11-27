import assert from "node:assert/strict";
import test from "node:test";
import { AppController } from "../application/controller.ts";
import { initialState } from "../application/state.ts";

function fixture() {
  const app = new AppController({});
  app.patch = (update, done) => {
    app.state = { ...app.state, ...(typeof update === "function" ? update(app.state) : update) };
    done?.();
  };
  app.state = { ...initialState(), loaded: true, splash: false, screen: "settings", appVersion: "1.4.7" };
  return app;
}

test("Settings downloads an available update in-app and disables repeat taps", () => {
  const app = fixture();
  let installs = 0;
  app.state.update = { version: "1.4.8", url: "https://github.com/georgeMaharjan/Thaili/releases/download/v1.4.8/thaili.apk" };
  app.installUpdate = async () => { installs++; };

  let row = app.renderVals().settingRows.find(item => item.label === "App update")!;
  assert.match(row.meta, /download and install/i);
  row.tap();
  assert.equal(installs, 1);

  app.patch({ updateBusy: true });
  row = app.renderVals().settingRows.find(item => item.label === "App update")!;
  assert.equal(row.busy, true);
  assert.match(row.meta, /downloading/i);
  row.tap();
  assert.equal(installs, 1);
  app.componentWillUnmount();
});

test("Settings checks for an update when none is cached", () => {
  const app = fixture();
  let checks = 0;
  app.checkUpdate = async () => { checks++; };
  app.renderVals().settingRows.find(item => item.label === "App update")!.tap();
  assert.equal(checks, 1);
  app.componentWillUnmount();
});
