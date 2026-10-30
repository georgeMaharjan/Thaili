import assert from "node:assert/strict";
import { AppController } from "../application/controller.ts";
import { CaptureCoordinator, captureConfiguration } from "../application/capture.ts";
import { initialState } from "../application/state.ts";
import { accountBalances } from "../lib/finance.ts";
import { importTransactions } from "../lib/import-transactions.ts";
import { hydrated, snapshot } from "../lib/pouch.ts";
import { decodePouch } from "../infrastructure/hydration.ts";
import type { MoneyNotification, Sms } from "../lib/device.ts";

const at = Date.now();
const oldSms: Sms = { id: "old-sms", sender: "NABIL", at: at - 20000, body: "NPR 100 has been debited from A/C XXXX4821. Ref: BEFORE-SKIP" };
const oldPush: MoneyNotification = { id: "old-push", pkg: "np.fixture.prabhu", at: at - 86400000, receivedAt: at + 10000,
  body: "NPR 500 has been credited to A/C XXXX1234" };
function fixture() {
  const app = new AppController({});
  app.patch = (update, done) => { app.state = { ...app.state, ...(typeof update === "function" ? update(app.state) : update) }; done?.(); };
  app.state = { ...initialState(), loaded: true, splash: false,
    user: { name: "Fixture", phone: "+9779800000000", createdAt: new Date(at).toISOString() },
    sources: [{ key: "nabil", name: "Nabil Bank", type: "Bank · SMS", dot: "red", opening: 10000, acct: "4821", openedAt: new Date(at - 60000).toISOString() }],
    roles: { nabil: "spending" },
    moneyApps: [{ key: "prabhu", base: "Prabhu Bank", app: "Prabhu Smart", kind: "bank", packages: ["np.fixture.prabhu"] }],
    perms: [true, true], screen: "scan", smsSince: at - 30000,
  };
  return app;
}
function captureFixture(app: AppController) {
  const feed = { sms: [oldSms], notes: [oldPush], smsQueries: [] as number[], noteQueries: [] as number[], now: at + 120000 };
  const capture = new CaptureCoordinator({
    snapshot: () => app.state, commit: async update => app.patch(update), apps: async () => app.state.moneyApps,
    readSms: async since => { feed.smsQueries.push(since); return feed.sms; },
    readNotifications: async since => { feed.noteQueries.push(since); return feed.notes; },
    message() {}, now: () => feed.now, newId: () => "generated",
  });
  return { feed, capture };
}
const finish = (app: AppController) => { app.renderVals().catsNext(); app.renderVals().baseSave(); assert.equal(app.state.setupComplete, true); };

// Automatic native reads cannot commit transactions while setup is deciding about history.
{
  const app = fixture(), { capture, feed } = captureFixture(app);
  try {
    assert.equal(captureConfiguration(app.state).notify, false);
    await capture.catchUp(); assert.deepEqual(feed.smsQueries, []); assert.deepEqual(feed.noteQueries, []);
    app.renderVals().scanSkipTap();
    const floor = app.state.captureStartAt!;
    assert.ok(floor >= at); assert.equal(app.state.smsSince, floor); assert.equal(app.state.notificationSince, floor);
    finish(app); await capture.catchUp();
    assert.equal(app.state.tx.length, 0, "skipped SMS and buffered push must stay skipped");
    assert.equal(app.state.sources.length, 1, "old push must not add an unselected account and inflate the total");
    assert.equal(accountBalances(app.state.sources, app.state.tx).nabil, 10000);
    assert.equal(feed.smsQueries[0], floor, "the three-minute reread cannot cross the skip boundary");
    assert.equal(feed.noteQueries[0], floor);
    // The cutoff survives saved-data decoding and a restart, independently of moving cursors.
    const stored = decodePouch(snapshot(app.state));
    assert.equal(stored.prefs.captureStartAt, floor);
    app.state = { ...initialState(), ...hydrated(stored), ...stored.prefs, loaded: true, moneyApps: app.state.moneyApps };
    await capture.catchUp(); assert.equal(app.state.tx.length, 0);
    // New transactions still update the user's entered balance exactly once.
    feed.sms = [oldSms, { ...oldSms, id: "new-sms", at: floor + 1, body: "NPR 100 has been debited from A/C XXXX4821. Ref: AFTER-SKIP" }];
    await capture.catchUp(); await capture.catchUp();
    assert.equal(app.state.tx.length, 1); assert.equal(accountBalances(app.state.sources, app.state.tx).nabil, 9900);
  } finally { capture.dispose(); app.componentWillUnmount(); }
}
// Choosing no SMS history also excludes old push alerts, including recently re-buffered ones.
{
  const app = fixture(), { capture } = captureFixture(app);
  try {
    app.patch({ perms: [false, true], screen: "source" });
    app.renderVals().setupNext(); assert.equal(app.state.screen, "cats"); finish(app);
    await capture.catchUp(); assert.equal(app.state.tx.length, 0); assert.equal(app.state.sources.length, 1);
    assert.equal(accountBalances(app.state.sources, app.state.tx).nabil, 10000);
  } finally { capture.dispose(); app.componentWillUnmount(); }
}
// Explicitly accepted history remains available for insights without being added to today's opening twice.
{
  const app = fixture();
  try {
    const historical = { ...oldSms, at: at - 86400000 };
    const result = importTransactions([historical], { sources: app.state.sources, existing: [], rules: [], now: new Date(at), newId: () => "history" });
    app.patch({ scanTx: result.tx, scanResult: result, smsSince: at });
    app.renderVals().toCats(); finish(app);
    assert.equal(app.state.tx.length, 1); assert.equal(accountBalances(app.state.sources, app.state.tx).nabil, 10000);
    assert.ok(app.state.captureStartAt! < historical.at);
  } finally { app.componentWillUnmount(); }
}
// A zero opening is a valid, explicitly confirmed baseline, distinct from a detected placeholder.
{
  const app = fixture();
  try {
    app.patch({ sources: app.state.sources.map(source => ({ ...source, opening: 0, openedAt: null })) });
    app.editSource("nabil"); assert.equal(app.state.newSrcAmt, "");
    app.patch({ newSrcAmt: "0", srcNewFrom: "source" }); app.renderVals().newSrcCreate();
    assert.equal(app.state.screen, "source"); assert.equal(app.state.sources[0].opening, 0);
    assert.ok(app.state.sources[0].openedAt); assert.equal(app.renderVals().setupSources[0].opening, "Rs 0");
    assert.equal(app.renderVals().setupContinue, "Continue with 1 account");
    app.editSource("nabil"); assert.equal(app.state.newSrcAmt, "0");
    const savedAt = app.state.sources[0].openedAt; app.renderVals().newSrcCreate();
    assert.equal(app.state.sources[0].openedAt, savedAt, "unchanged confirmed balances keep their cutoff");
  } finally { app.componentWillUnmount(); }
}
// Saving a legacy/unconfirmed balance must establish a cutoff even if the amount is unchanged.
{
  const app = fixture();
  try {
    app.patch({ sources: app.state.sources.map(source => ({ ...source, openedAt: null })) });
    app.editSource("nabil"); app.renderVals().newSrcCreate();
    assert.ok(app.state.sources[0].openedAt); assert.equal(app.state.sources[0].opening, 10000);
    assert.equal(accountBalances(app.state.sources, importTransactions([{ ...oldSms, at: at - 86400000 }], {
      sources: app.state.sources, existing: [], rules: [], now: new Date(at), newId: () => "historical",
    }).tx).nabil, 10000);
  } finally { app.componentWillUnmount(); }
}
// A new cutoff chosen while an update is queued invalidates the old read rather than overwriting it.
{
  const app = fixture();
  let apply!: () => void, entered!: () => void;
  const committing = new Promise<void>(resolve => { entered = resolve; });
  const capture = new CaptureCoordinator({
    snapshot: () => app.state,
    commit: update => new Promise<void>(resolve => { apply = () => { app.patch(update); resolve(); }; entered(); }),
    apps: async () => [], readSms: async () => [oldSms], readNotifications: async () => [],
    message() {}, now: () => at, newId: () => "stale",
  });
  try {
    app.patch({ setupComplete: true });
    const pending = capture.catchUp(); await committing;
    app.patch({ captureStartAt: at, smsSince: at, notificationSince: at }); apply(); await pending;
    assert.equal(app.state.tx.length, 0); assert.equal(app.state.smsSince, at);
  } finally { capture.dispose(); app.componentWillUnmount(); }
}
// Finishing setup starts capture without requiring a later app resume or incoming notification.
{
  const app = fixture();
  try {
    app.renderVals().scanSkipTap(); const previous = app.state; finish(app);
    let calls = 0; app.catchUpSms = async () => { calls++; };
    app.componentDidUpdate({}, previous); assert.equal(calls, 1);
  } finally { app.componentWillUnmount(); }
}
console.log("setup balance: skip/no-SMS, restart, late push, accepted history, zero openings and capture races pass");
