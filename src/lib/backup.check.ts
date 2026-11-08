import assert from "node:assert/strict";
import test from "node:test";
import type { Pouch } from "../domain/models.ts";
import { BackupError, backupName, decodeBackup, encodeBackup } from "./backup.ts";

const pouch = (): Pouch => ({
  user: { name: "Fixture User", phone: "+9779800000000", createdAt: "2026-10-01T00:00:00.000Z" },
  sources: [
    { key: "cash", name: "Cash", base: "Cash", short: "Cash", type: "Manual entry", dot: "#B4721F", opening: 0, acct: null, openedAt: null, packages: [] },
    { key: "esewa", name: "eSewa", base: "eSewa", short: "eSewa", type: "Wallet · notifications", dot: "#2B3A4A", opening: 300.5, acct: null, openedAt: "2026-10-01T00:00:00.000Z", packages: [] },
  ],
  tx: [{ id: "t1", m: "Tea", amt: 100.5, dir: "debit", src: "esewa", ch: "Manual", at: "2026-10-02T00:00:00.000Z", to: null, cat: "food", rem: "Tea", auto: null, raw: null, capture: [] }],
  rules: [{ id: "r1", kw: "DARAZ", cat: "shopping", own: true }],
  goals: [{ id: "g1", name: "Laptop", target: 50000 }],
  roles: { esewa: "spending" },
  prefs: { lang: "NP", theme: "dark", appLock: true, setupComplete: true, smsSince: 1700000000000 },
});
const problem = async (text: string) => {
  try { await decodeBackup(text); } catch (e) { assert.ok(e instanceof BackupError, String(e)); return e.problem; }
  assert.fail("backup was accepted");
};
const edit = async (change: (file: { data: Pouch } & Record<string, unknown>) => void) => {
  const file = JSON.parse(await encodeBackup(pouch()));
  change(file);
  return JSON.stringify(file);
};

test("an export restores to exactly the same accounts, entries, rules, goals and settings", async () => {
  assert.deepEqual(await decodeBackup(await encodeBackup(pouch())), pouch());
  assert.equal(backupName(new Date("2026-11-08T10:00:00Z")), "thaili-backup-2026-11-08.json");
});

test("files that are not Thaili backups are rejected", async () => {
  assert.equal(await problem("not json {"), "notJson");
  assert.equal(await problem("null"), "notThaili");
  assert.equal(await problem(JSON.stringify({ app: "other", format: 1, data: pouch() })), "notThaili");
  assert.equal(await problem(await edit(f => { delete f.checksum; })), "notThaili");
  assert.equal(await problem(await edit(f => { f.format = 2; })), "newer");
});

test("an edited or damaged file fails the checksum", async () => {
  assert.equal(await problem(await edit(f => { f.data.tx[0].amt = 1; })), "damaged");
  assert.equal(await problem(await edit(f => { f.data.goals = []; })), "damaged");
});

// Re-sign the edited data so only the content checks can catch it.
const resigned = async (change: (p: Pouch) => void) => {
  const p = pouch(); change(p);
  return encodeBackup(p);
};

test("structurally invalid or inconsistent data is rejected even with a matching checksum", async () => {
  assert.equal(await problem(await resigned(p => { (p.tx[0] as { amt: unknown }).amt = "100"; })), "invalid");
  assert.equal(await problem(await resigned(p => { (p.tx[0] as { dir: string }).dir = "sideways"; })), "invalid");
  assert.equal(await problem(await resigned(p => { p.tx[0].src = "gone"; })), "invalid");
  assert.equal(await problem(await resigned(p => { p.tx[0].to = "gone"; p.tx[0].dir = "transfer"; })), "invalid");
  assert.equal(await problem(await resigned(p => { p.tx.push({ ...p.tx[0] }); })), "invalid");
  assert.equal(await problem(await resigned(p => { p.tx[0].amt = -5; })), "invalid");
  assert.equal(await problem(await resigned(p => { (p.prefs as { theme: string }).theme = "neon"; })), "invalid");
  assert.equal(await problem(await resigned(p => { p.sources = []; p.tx = []; })), "empty");
});
