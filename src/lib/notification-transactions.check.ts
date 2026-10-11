import assert from "node:assert/strict";
import { notificationInbox, parseNotification, transactionReference } from "./notification-transactions.ts";
import { allMoneyPackages, detectMoneyApps } from "./money-apps.ts";
const at = Date.parse("2026-10-07T08:00:00Z");
const parse = (body: string) => parseNotification({ bank: "app:np.example.wallet", body, at });
const cases: [string, number, string][] = [
  ["Payment successful\nYou paid Rs. 1,250.50 to MOMO HOUSE. Ref: ABC12345", 1250.5, "debit"],
  ["Money received\nYou received NPR 2,000 from Sita.", 2000, "credit"],
  ["Rs 500 sent to 9800000000 successfully", 500, "debit"],
  ["Your account was debited by NRs. 850.00. Available balance: Rs 10,000", 850, "debit"],
  ["Available balance: Rs 20,000\nYou paid Rs 600 to SHOP", 600, "debit"],
  ["Refund successful\nNPR 500 refunded to your wallet", 500, "credit"],
  ["Payment received\nPayment of Rs 300 received from Ram", 300, "credit"],
  ["Fund worth Rs 1700.0 has been loaded from NIC ASIA Bank to your Khalti wallet", 1700, "credit"],
  ["Cashback credited\nRs 25 credited to your wallet", 25, "credit"],
  ["NPR 1,23,456.78 has been credited to your account", 123456.78, "credit"],
  ["Payment successful\nAmount: 400", 400, "debit"],
  ["You received 500 NPR from Ram", 500, "credit"],
  ["भुक्तानी सफल\nरु १,२५०.५० भुक्तानी भयो", 1250.5, "debit"],
  ["रू २,००० प्राप्त भयो", 2000, "credit"],
  ["Account credited NPR 500.00. Debit card ending 1234", 500, "credit"],
  ["You paid Rs 500. Fee: Rs 5. Balance: Rs 1000", 500, "debit"],
  ["Credit Alert\nAmount: NPR 500", 500, "credit"],
  ["Transaction Type: DR\nAmount: 500", 500, "debit"],
  ["Rs 500 has been added to your wallet", 500, "credit"],
  ["You successfully made a payment of NPR 500", 500, "debit"],
];
for (const [body, amt, dir] of cases) {
  const result = parse(body);
  assert.deepEqual([result?.amt, result?.dir], [amt, dir], body);
}
assert.equal(parse(cases[0][0])?.m, "MOMO HOUSE");
assert.equal(parse(cases[1][0])?.m, "Sita");
for (const body of [
  "Get Rs 50 cashback on your next top-up!", "Payment failed: Rs 500",
  "Payment pending\nNPR 500", "Payment request received for Rs 500",
  "You requested money Rs 500", "NPR 500 will be debited tomorrow",
  "Your payment of NPR 500 is due", "Earn cashback Rs 500 when you pay",
  "Payment successful\nOTP is 123456 for NPR 500", "NPR 500 paid. Verification code: 123456",
  "Balance updated\nAvailable balance: NPR 500", "USD 20 paid to SHOP", "You paid Rs 0",
  "You paid Rs 500 and received Rs 200", "Payment successful", "NPR 500",
]) assert.equal(parse(body), null, body);
assert.equal(transactionReference(cases[0][0]), "ABC12345");

const apps = detectMoneyApps([{ pkg: "np.example.wallet", label: "New Wallet" }, { pkg: "com.f1soft.esewa", label: "eSewa" }]);
const tracked = [{ key: "src-existing", base: "eSewa" }];
const packets = [
  { id: "debit", pkg: "np.example.wallet", body: cases[0][0], at },
  { id: "credit", pkg: "np.example.wallet", body: cases[1][0], at },
  { id: "otp", pkg: "np.example.wallet", body: "OTP is 123456 for NPR 500", at },
  { id: "existing", pkg: "com.f1soft.esewa", body: "Rs 100 received", at },
  { id: "unrelated", pkg: "com.example.chat", body: "Rs 100 received", at },
];
const inbox = notificationInbox(packets, apps, tracked, allMoneyPackages(tracked, apps));
assert.equal(inbox.additions.length, 1);
assert.equal(inbox.additions[0].key, "app:np.example.wallet");
assert.deepEqual(inbox.additions[0].packages, ["np.example.wallet"]);
assert.equal(inbox.messages.length, 3);
assert.equal(inbox.messages[2].bank, "esewa"); // Institution identity, then suffix resolution in the importer.
assert.equal(inbox.messages[0].id, "debit");
assert.equal(notificationInbox(packets, apps, [...tracked, ...inbox.additions], allMoneyPackages(tracked, apps)).additions.length, 0);
assert.equal(notificationInbox([packets[2]], apps, tracked, {}).additions.length, 0);
// Saved package metadata still routes through institution/suffix resolution when discovery fails.
const savedAccounts = [{ key: "src-nabil-one", base: "Nabil Bank", packages: ["np.fixture.nabil"], acct: "1111" },
  { key: "src-nabil-two", base: "Nabil Bank", packages: ["np.fixture.nabil"], acct: "2222" }];
const savedAlert = notificationInbox([{ pkg: "np.fixture.nabil", body: "Account XX1111 debited NPR 500", at }], [], savedAccounts, allMoneyPackages(savedAccounts, []));
assert.equal(savedAlert.messages[0].bank, "nabil");
console.log("notification transactions: debit, credit, amount, exclusions and references pass");
