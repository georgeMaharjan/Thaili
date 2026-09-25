// Parser self-check: `node src/lib/sms.check.ts`. Formats from spec §12.1 and the design's samples.
import assert from "node:assert/strict";
import { parseSms, sourceFor, isDuplicate, tailsByBank } from "./sms.ts";

const at = Date.parse("2026-09-24T10:00:00Z");
const p = (sender: string, body: string) => parseSms({ sender, body, at });

// NIC Asia: "is debited by", Remarks, OTP footer stripped
let r = p("NIC_ALERT", "Your A/C ...4821 is debited by NPR 1,500.00 on 05-09. Remarks: MPAY FPQR. Never Share Password/OTP With Anyone");
assert.deepEqual([r?.amt, r?.dir, r?.tail, r?.rem, r?.m, r?.bank], [1500, "debit", "4821", "MPAY FPQR", "FONEPAY", "nic"]);

// Nabil: "withdrawn", no-thousands amount
r = p("NABIL", "NPR 4000.00 withdrawn from A/C ...0190. Remarks: BHATBHATENI SUPERMARKET");
assert.deepEqual([r?.amt, r?.dir, r?.tail, r?.m, r?.bank], [4000, "debit", "0190", "BHATBHATENI SUPERMARKET", "nabil"]);

// Everest: "For:" remark
r = p("EBL_ALERT", "Your A/C XXXX2234 is debited by NPR 2,340.00. For: NEA BILL");
assert.deepEqual([r?.amt, r?.tail, r?.rem, r?.bank], [2340, "2234", "NEA BILL", "everest"]);

// Standard Chartered: no remark, POS, trailing "Download App:" junk
r = p("SCBNL", "POS transaction NPR 2280.00. Download App: https://sc.com/np");
assert.deepEqual([r?.amt, r?.dir, r?.rem, r?.m, r?.bank], [2280, "debit", null, "POS transaction", "scb"]);

// Credit
r = p("NIC_ALERT", "Your A/C ...4821 is credited by NPR 45,000.00. Remarks: SALARY BHADRA");
assert.deepEqual([r?.amt, r?.dir, r?.rem], [45000, "credit", "SALARY BHADRA"]);

// "communication" must not read as NIC Asia
assert.equal(p("NABIL", "NPR 10.00 debited for SMS communication charge")?.bank, "nabil");
assert.equal(p("AD", "NPR 10.00 debited for SMS communication charge")?.bank, null);

// Real Nabil / NIC Asia shapes (numbers made up): full account number, "has been … by", date inside
r = p("NABIL_ALERT", "Dear Customer, Your 0123454821 has been withdrawn by NPR 1,250.00 on 12/09/2026 14:03:11, Remarks: FONEPAY QR MOMO HOUSE");
assert.deepEqual([r?.amt, r?.dir, r?.tail, r?.bank, r?.m], [1250, "debit", "4821", "nabil", "FONEPAY"]);
r = p("NABIL_ALERT", "Dear Customer, Your 0123454821 has been deposited by NPR 45,000.00 on 01/09/2026 09:00:00, Remarks: SALARY");
assert.deepEqual([r?.dir, r?.tail, r?.rem], ["credit", "4821", "SALARY"]);
r = p("NIC_ASIA", "Your 01234567890 has been Debited by NPR 350.00 on 20/09/2026 18:22:40, Remarks: DARAZ");
assert.deepEqual([r?.amt, r?.dir, r?.tail, r?.bank, r?.m], [350, "debit", "7890", "nic", "DARAZ"]);
r = p("NIC_ASIA", "Your 01234567890 has been Credited by NPR 2,000.00 on 21/09/2026 10:01:02, Remarks: REFUND");
assert.deepEqual([r?.dir, r?.tail], ["credit", "7890"]);

// Banks mask the middle of the number with "#"
r = p("NABIL_ALERT", "Dear Customer, Your 012##54821 has been withdrawn by NPR 80.00 on 12/09/2026 14:03:11, Remarks: TEA");
assert.equal(r?.tail, "4821");
r = p("NIC_ASIA", "Your 012###67890 has been Debited by NPR 80.00 on 12/09/2026 14:03:11, Remarks: TEA");
assert.equal(r?.tail, "7890");

// Reminders are not transactions
assert.equal(p("ROCFIT", "Dear Customer, your payment of NPR 3000 is due. Please deposit asap. ROC Fitness Club"), null);

// Not a transaction
assert.equal(p("NIC_ALERT", "Dear customer, our branch is closed on Friday."), null);

// Account matching: last-4 beats bank; bank name matches a hand-added account
const sources = [{ key: "nic", base: "NIC Asia", acct: "4821" }, { key: "src1", base: "Nabil Bank", acct: null }];
assert.equal(sourceFor(p("X", "A/C ...4821 is debited by NPR 5.00")!, sources)?.key, "nic");
assert.equal(sourceFor(p("NABIL", "NPR 5.00 withdrawn from A/C ...9999")!, sources)?.key, "src1");
assert.equal(sourceFor(p("UNKNOWNBK", "A/C ...7777 is debited by NPR 5.00")!, sources), null);

// Dedup: ±3 minutes, same account and amount
const t = { src: "nic", amt: 100, at: "2026-09-24T10:00:00Z" };
assert.equal(isDuplicate(t, [{ src: "nic", amt: 100, at: "2026-09-24T10:02:59Z" }]), true);
assert.equal(isDuplicate(t, [{ src: "nic", amt: 100, at: "2026-09-24T10:03:01Z" }]), false);
assert.equal(isDuplicate(t, [{ src: "esewa", amt: 100, at: "2026-09-24T10:00:00Z" }]), false);

// Tail discovery for onboarding
assert.deepEqual(tailsByBank([
  { sender: "NIC_ALERT", body: "A/C ...4821 is debited by NPR 5.00", at },
  { sender: "NIC_ALERT", body: "A/C ...4821 is credited by NPR 5.00", at },
  { sender: "NIC_ALERT", body: "A/C ...1111 is debited by NPR 5.00", at },
]), { nic: "4821" });

console.log("sms parser: all checks pass");
