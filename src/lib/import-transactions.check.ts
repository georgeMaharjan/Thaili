import assert from "node:assert/strict";
import { importTransactions } from "./import-transactions.ts";
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
// Labels, month keys and transaction offsets advance together across a BS month end.
const bs = bsOf(now), last = adOf(bs.y, bs.m, daysInBsMonth(bs.y, bs.m)); last.setHours(12);
const next = new Date(last); next.setDate(next.getDate() + 1);
assert.equal(calendarAt(next).MONTH_KEY, calendarAt(last).MONTH_KEY + 1);
assert.equal(calendarAt(next).DAY_OF_MONTH, 1);
assert.equal(dated({ at: last.toISOString() }, next).off, 1);
assert.match(calendarAt(next).dayLabel(1), /^Yesterday/);
console.log("imports: pipeline, orphan accounts, duplicates, rules, wallet transfers and BS rollover pass");
