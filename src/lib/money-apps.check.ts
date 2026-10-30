import assert from "node:assert/strict";
import { appendMoneyAccounts, capturePackages, detectMoneyApps, rememberMoneyPackages, scanMoneyApps, sourceForMoneyApp } from "./money-apps.ts";
import { parseSms, sourceFor } from "./sms.ts";

const apps = detectMoneyApps([
  { pkg: "com.f1soft.esewa", label: "eSewa" },
  { pkg: "com.f1soft.esewa", label: "Another launcher activity" },
  { pkg: "np.example.prabhu", label: "Prabhu Smart" },
  { pkg: "np.example.wallet", label: "My Digital Wallet" },
  { pkg: "np.example.newbank", label: "New Bank Mobile" },
  { pkg: "com.sc.retail.nepal", label: "SC Mobile Nepal" },
  { pkg: "np.example.khalti", label: "IME Khalti" },
  { pkg: "com.khalti", label: "Khalti" },
  { pkg: "com.android.camera", label: "Camera" },
  { pkg: "com.example.messages", label: "Messages" },
]);
assert.equal(apps.length, 6);
assert.deepEqual(apps.find((d) => d.key === "esewa")?.packages, ["com.f1soft.esewa"]);
assert.deepEqual(apps.find((d) => d.key === "khalti")?.packages, ["np.example.khalti", "com.khalti"]);
assert.equal(apps.find((d) => d.key === "scb")?.app, "SC Mobile Nepal");
assert.equal(apps.find((d) => d.key === "prabhu")?.kind, "bank");
assert.equal(apps.find((d) => d.key === "app:np.example.wallet")?.kind, "wallet");
assert.deepEqual(detectMoneyApps([]), []); // No catalog entries masquerading as installed apps.

const sources = [{ key: "cash" }, { key: "scb" }, { key: "app:np.example.newbank" }];
const packages = capturePackages(sources, apps);
assert.equal(packages["com.sc.retail.nepal"], "scb");
assert.equal(packages["np.example.newbank"], "app:np.example.newbank");
assert.equal(packages["com.f1soft.esewa"], undefined); // Unselected apps aren't captured.
assert.equal(capturePackages(sources)["np.example.newbank"], "app:np.example.newbank"); // Reloaded account.

// A later scan recognizes saved/manual accounts and adds only new accounts.
const existing = [
  { key: "cash", base: "Cash on hand", opening: 1500, acct: null },
  { key: "src-manual", base: "Standard Chartered", opening: 5000, acct: "1234" },
  { key: "esewa", base: "eSewa", opening: 250, acct: "5678" },
];
const scb = apps.find((d) => d.key === "scb")!;
assert.equal(sourceForMoneyApp(scb, existing), existing[1]);
assert.equal(sourceForMoneyApp(apps.find((d) => d.key === "esewa")!, existing), existing[2]);
assert.equal(capturePackages(existing, apps)["com.sc.retail.nepal"], "src-manual");
assert.equal(sourceForMoneyApp(apps.find((d) => d.key === "app:np.example.newbank")!, existing), undefined);
const added = { key: "app:np.example.newbank", base: "New Bank", opening: 0, acct: null };
const merged = appendMoneyAccounts(existing, [existing[2], added, added], { cash: "spending", "src-manual": "savings", esewa: "spending" });
assert.deepEqual(merged.sources, [...existing, added]);
assert.equal(merged.sources[1], existing[1]); // Preserve balances, account details and identity.
assert.equal(merged.roles["src-manual"], "savings");
assert.equal(merged.roles[added.key], "spending");
assert.deepEqual(merged.added, [added]);
assert.deepEqual(appendMoneyAccounts(existing, [], { "src-manual": "savings" }).sources, existing);

const labelOnly: { key: string; base: string; type: string; opening: number; packages?: string[] }[] = [{ key: "src-prabhu", base: "Prabhu Bank", type: "Bank · SMS", opening: 250 }];
const remembered = rememberMoneyPackages(labelOnly, apps);
assert.deepEqual(remembered[0].packages, ["np.example.prabhu"]);
assert.equal(remembered[0].opening, 250);
assert.equal(capturePackages(remembered)["np.example.prabhu"], "src-prabhu");
assert.equal(rememberMoneyPackages(remembered, apps), remembered); // Repeated discovery doesn't resave unchanged accounts.
assert.equal(rememberMoneyPackages(remembered, []), remembered); // Failed/empty discovery doesn't erase saved capture.
const manual = [{ key: "src-prabhu", base: "Prabhu Bank", type: "Savings · manual" }];
assert.equal(rememberMoneyPackages(manual, apps), manual);
assert.deepEqual(capturePackages(manual, apps), {});

const transaction = parseSms({ sender: "", bank: packages["np.example.newbank"], body: "NPR 450 has been debited. Remarks: Shop", at: Date.now() });
assert.ok(transaction);
assert.equal(sourceFor(transaction, sources)?.key, "app:np.example.newbank");
assert.equal(sourceFor(transaction, [{ key: "cash" }]), null); // Unknown identity must not throw.

const scanned = await scanMoneyApps(
  async () => [{ pkg: "com.f1soft.esewa", label: "eSewa" }],
  async () => { throw new Error("SMS permission denied"); },
);
assert.equal(scanned.apps[0].key, "esewa");
assert.deepEqual(scanned.messages, []);
await assert.rejects(scanMoneyApps(async () => { throw new Error("App scan failed"); }, async () => []), /App scan failed/);

console.log("money apps: all checks pass");
