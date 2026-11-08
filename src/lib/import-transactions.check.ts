import assert from "node:assert/strict";
import { applyImportResult, importTransactions } from "./import-transactions.ts";
import { dated, adOf, daysInBsMonth, bsOf } from "./bs.ts";
import { calendarAt } from "./calendar.ts";

const now = new Date("2026-10-07T12:00:00Z");
let sequence = 0;
const context = { sources: [{ key: "nabil", name: "Nabil Bank", acct: "4821" }, { key: "esewa", name: "eSewa", acct: null }],
  rules: [{ id: "rule", kw: "SHOP", cat: "grocery" }], existing: [], now, newId: () => `generated-${++sequence}` };
const message = { id: "sms", sender: "NABIL", body: "NPR 100 has been debited from A/C XXXX4821. Remarks: SHOP.", at: now.getTime() };
const result = importTransactions([message, message, { sender: "NABIL", body: "NPR 100 has been debited from A/C XXXX9999.", at: now.getTime() },
  { sender: "NABIL", body: "Your OTP is 123456", at: now.getTime() }, { ...message, at: NaN }], context);
assert.equal(result.tx.length, 1); assert.equal(result.orphans, 1);
assert.equal(result.tx[0].cat, "grocery"); assert.equal(result.tx[0].auto, "SHOP");
assert.equal(result.tx[0].added, now.toISOString()); assert.equal(result.tx[0].off, 0);
assert.equal(importTransactions([message], { ...context, existing: result.tx }).tx.length, 0);
const transfer = importTransactions([{ ...message, id: "load", body: "NPR 500 has been debited from A/C XXXX4821. Remarks: eSewa Load." },
  { id: "wallet", ch: "App", bank: "esewa", body: "You received Rs 500.", at: now.getTime() }], context);
assert.equal(transfer.tx.length, 1); assert.equal(transfer.tx[0].dir, "transfer"); assert.equal(transfer.tx[0].to, "esewa");
assert.equal(context.sources.length, 2); assert.equal(context.existing.length, 0);
// Nabil cuts the wallet number to 7 digits; the eSewa credit is what proves it was your own load.
const nabilLoad = { id: "nabil-load", sender: "NABIL_ALERT", at: now.getTime(),
  body: "Dear Customer, Your 098##44821 has been withdrawn by NPR 50.00 on 30/10/2026 16:30:56, Remarks: eSewa Load 9860981 Download App: https://rebrand.ly/nBank" };
const esewaIn = { id: "esewa-in", ch: "App", bank: "esewa", at: now.getTime() - 120000,
  body: "NABIL BANK LTD.\nDear George,\nYou have received NPR. 50.0 from NABIL BANK LTD. in your eSewa account.\nThank you.\neSewa." };
const together = importTransactions([esewaIn, nabilLoad], context);
assert.deepEqual(together.tx.map(t => [t.id, t.dir, t.to]), [["nabil-load", "transfer", "esewa"]]);
const debitFirst = importTransactions([nabilLoad], context);
assert.equal(debitFirst.tx[0].dir, "debit");
const later = importTransactions([esewaIn], { ...context, existing: debitFirst.tx });
assert.deepEqual([later.tx.length, later.updates[0]?.dir, later.updates[0]?.to], [0, "transfer", "esewa"]);
assert.equal(applyImportResult(debitFirst.tx, later)[0].dir, "transfer");
// NIC "LoadeSewa/<ref>" with no eSewa credit after it paid someone else's wallet.
const paid = importTransactions([{ id: "nic-pay", sender: "NICA_ALERT", at: now.getTime(),
  body: "Your 270###52401 has been Debited by NPR 1,500.00 on 05/11/2026 11:48:46, Remarks: LoadeSewa/432280041. Survey: https://bit.ly/42utwDR ,Help us improve!. NIC AS" }],
  { ...context, sources: [...context.sources, { key: "nic", name: "NIC Asia", acct: "2401" }] });
assert.deepEqual(paid.tx.map(t => [t.dir, t.to]), [["debit", null]]);
// eSewa → bank: eSewa says only "Bank Withdraw"; Nabil's deposit remark names eSewa.
const withdraw = importTransactions([{ id: "esewa-out", ch: "App", bank: "esewa", at: now.getTime() - 60000,
  body: "Bank Withdraw\nDear George,\r\nYour transaction of Rs. 100.0 for Bank Withdraw has been successfully completed.\r\nThank you.\r\neSewa." },
  { id: "nabil-in", sender: "NABIL_ALERT", at: now.getTime(),
    body: "Dear Customer, Your 098##44821 has been deposited by NPR 100.00 on 02/11/2026 21:51:31, Remarks: ESW LAW:1793635590" }], context);
assert.deepEqual(withdraw.tx.map(t => [t.id, t.src, t.dir, t.to]), [["esewa-out", "esewa", "transfer", "nabil"]]);
// Khalti's own load notification pairs with Nabil's "Load Wallet Khalti".
const khaltiContext = { ...context, sources: [...context.sources, { key: "khalti", name: "Khalti", acct: null }] };
const khalti = importTransactions([{ id: "khalti-in", ch: "App", bank: "khalti", at: now.getTime(),
  body: "Fund Received\nRs. 50 has been loaded successfully from Nabil Bank Limited." },
  { id: "nabil-khalti", sender: "NABIL_ALERT", at: now.getTime(),
    body: "Dear Customer, Your 098##44821 has been withdrawn by NPR 50.00 on 02/11/2026 21:57:49, Remarks: Load Wallet Khalti" }], khaltiContext);
assert.deepEqual(khalti.tx.map(t => [t.id, t.dir, t.to]), [["nabil-khalti", "transfer", "khalti"]]);
// Labels, month keys and transaction offsets advance together across a BS month end.
const bs = bsOf(now), last = adOf(bs.y, bs.m, daysInBsMonth(bs.y, bs.m)); last.setHours(12);
const next = new Date(last); next.setDate(next.getDate() + 1);
assert.equal(calendarAt(next).MONTH_KEY, calendarAt(last).MONTH_KEY + 1);
assert.equal(calendarAt(next).DAY_OF_MONTH, 1);
assert.equal(dated({ at: last.toISOString() }, next).off, 1);
assert.match(calendarAt(next).dayLabel(1), /^Yesterday/);
console.log("imports: pipeline, orphan accounts, duplicates, rules, wallet transfers and BS rollover pass");
