// Parser self-check: `node src/lib/sms.check.ts`. Formats from spec §12.1 and the design's samples.
import assert from "node:assert/strict";
import { parseSms, sourceFor, isDuplicate, tailsByBank, transferTo, pairTransfers } from "./sms.ts";

const at = Date.parse("2026-09-24T10:00:00Z");
const p = (sender: string, body: string) => parseSms({ sender, body, at });

// NIC Asia: "is debited by", Remarks, OTP footer stripped
let r = p("NIC_ALERT", "Your A/C ...4821 is debited by NPR 1,500.00 on 05-09. Remarks: MPAY FPQR. Never Share Password/OTP With Anyone");
assert.deepEqual([r?.amt, r?.dir, r?.tail, r?.rem, r?.m, r?.bank], [1500, "debit", "4821", "MPAY FPQR", "FONEPAY", "nic"]);

// Nabil: "withdrawn", no-thousands amount
r = p("NABIL", "Your A/C ...0190 has been withdrawn by NPR 4000.00. Remarks: BHATBHATENI SUPERMARKET");
assert.deepEqual([r?.amt, r?.dir, r?.tail, r?.m, r?.bank], [4000, "debit", "0190", "BHATBHATENI SUPERMARKET", "nabil"]);

// Everest: "For:" remark
r = p("EBL_ALERT", "Your A/C XXXX2234 is debited by NPR 2,340.00. For: NEA BILL");
assert.deepEqual([r?.amt, r?.tail, r?.rem, r?.bank], [2340, "2234", "NEA BILL", "everest"]);

// Standard Chartered: no remark, POS
r = p("SC_ALERT", "NPR 4000.00 has been debited from your account 9001 as POS transaction. Login to Online Banking or call our 24X7 Contact Centre at 01-0000000 for more information. StanChart");
assert.deepEqual([r?.amt, r?.dir, r?.rem, r?.m, r?.bank], [4000, "debit", null, "POS transaction", "scb"]);
// Standard Chartered bill payment / wallet load: payee is the remark
r = p("StanChart", "Your Bill Payment/Wallet Transfer for Khalti Pvt Ltd with the ref. num. 123456789 for the amount NPR 4200.00 is successful. StanChart");
assert.deepEqual([r?.amt, r?.dir, r?.rem, r?.bank], [4200, "debit", "Khalti Pvt Ltd", "scb"]);

// Credit
r = p("NIC_ALERT", "Your A/C ...4821 is credited by NPR 45,000.00. Remarks: SALARY BHADRA");
assert.deepEqual([r?.amt, r?.dir, r?.rem], [45000, "credit", "SALARY BHADRA"]);

// Only bank alert senders count, whatever the text says
assert.equal(p("+9779851000000", "Your A/C ...4821 is debited by NPR 500.00. Remarks: NIC ASIA"), null);
assert.equal(p("Ncell", "Rs 500 has been debited for your data pack"), null);
assert.equal(p("Fonepay", "Received Rs.100 from 98XXXXXXXX for RRN 123456, shop."), null);
// A bank sender's offers and notices are not transactions
assert.equal(p("NICA_ALERT", "Get 5% cashback up to Rs. 500 on MoBank payments. NIC ASIA"), null);
assert.equal(p("Khalti", "Top up from Khalti and win Rs 200 cashback! Link: kk5.io/Topup"), null);
assert.equal(p("NABIL_ALERT", "Dear Cardholder, Your Debit Card XXXX5020 was used at SHOP for Purchase of USD 20.00 on 10-SEPT-26 NABIL BANK"), null);
// App notification: no sender ID, the bank comes from the app that posted it
r = parseSms({ sender: "", bank: "nic", body: "Your 270###52401 has been Debited by NPR 1,250.50 on 01/10/2026 10:00:00, Remarks: DARAZ", at });
assert.deepEqual([r?.amt, r?.dir, r?.bank, r?.m], [1250.5, "debit", "nic", "DARAZ"]);
assert.equal(parseSms({ sender: "", bank: "esewa", body: "Get Rs 50 cashback on your next top-up!", at }), null);
// Khalti wallet load is money in
r = p("Khalti", "Fund worth Rs 1700.0 has been loaded from NIC ASIA Bank Limited to your Khalti wallet: 9800000000.");
assert.deepEqual([r?.amt, r?.dir, r?.bank], [1700, "credit", "khalti"]);

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

// Account matching: institution is resolved before last-4; hand-added accounts still match.
const sources = [{ key: "nic", base: "NIC Asia", acct: "4821" }, { key: "src1", base: "Nabil Bank", acct: null }];
assert.equal(sourceFor(p("NABIL", "A/C ...4821 is debited by NPR 5.00")!, sources)?.key, "src1");
assert.equal(sourceFor(p("NABIL", "A/C ...9999 has been withdrawn by NPR 5.00")!, sources)?.key, "src1");
assert.equal(sourceFor(p("EBL_ALERT", "A/C ...7777 is debited by NPR 5.00")!, sources), null);

// Wallet loads from a bank are transfers to that wallet, when you have it
const own = [{ key: "nic", base: "NIC Asia" }, { key: "esewa", base: "eSewa", acct: "1395" }, { key: "khalti", base: "Khalti", acct: "1395" }];
assert.equal(transferTo(p("NICA_ALERT", "Your 270###52401 has been Debited by NPR 500.00 on 29/03/2026 15:06:40, Remarks: LoadeSewa/412258213.. NIC ASIA")!, own)?.key, "esewa");
assert.equal(transferTo(p("NICA_ALERT", "Your 270###52401 has been Debited by NPR 500.00, Remarks: Khalti Load/409108317/9860001395.. NIC ASIA")!, own)?.key, "khalti");
assert.equal(transferTo(p("NABIL_ALERT", "Your 098##44344 has been withdrawn by NPR 500.00, Remarks: Load Wallet Khalti")!, own)?.key, "khalti");
// Someone else's mobile number: you paid them through their wallet
assert.equal(transferTo(p("NABIL_ALERT", "Your 098##44344 has been withdrawn by NPR 500.00 on 31/08/2026 18:38:55, Remarks: eSewa Load 9851172")!, own), null);
assert.equal(transferTo(p("NICA_ALERT", "Your 270###52401 has been Debited by NPR 500.00, Remarks: Khalti Load/409108317/9851172000.. NIC ASIA")!, own), null);
assert.equal(transferTo(p("NABIL_ALERT", "Your 098##44344 has been withdrawn by NPR 500.00, Remarks: MPAY FPQR,123")!, own), null);
assert.equal(transferTo(p("NICA_ALERT", "Your A/C ...4821 is debited by NPR 500.00. Remarks: LoadeSewa/1")!, [{ key: "nic", base: "NIC Asia" }]), null);

// Only an explicitly identified transfer can absorb its matching destination credit.
const tx = (id: string, src: string, dir: string, amt: number, min: number, to: string | null = null) =>
  ({ id, src, dir, amt, to, cat: "food", auto: "X", at: new Date(at + min * 60000).toISOString() });
let pr = pairTransfers([tx("d", "nic", "transfer", 1700, 0, "khalti"), tx("c", "khalti", "credit", 1700, 2), tx("o", "nic", "debit", 50, 1)]);
assert.deepEqual(pr.map((t) => [t.id, t.dir, t.to, t.cat]), [["d", "transfer", "khalti", null], ["o", "debit", null, "food"]]);
pr = pairTransfers([tx("d", "nic", "transfer", 1700, 0, "khalti"), tx("c", "khalti", "credit", 1700, 1)]);
assert.deepEqual(pr.map((t) => [t.id, t.to]), [["d", "khalti"]]);
assert.equal(pairTransfers([tx("d", "nic", "debit", 1700, 0), tx("c", "khalti", "credit", 1700, 16)]).length, 2);
assert.equal(pairTransfers([tx("d", "nic", "debit", 1700, 0), tx("c", "nic", "credit", 1700, 1)]).length, 2);
assert.equal(pairTransfers([tx("purchase", "nic", "debit", 1700, 0), tx("salary", "khalti", "credit", 1700, 1)]).length, 2);

// Dedup: ±3 minutes, same account and amount
const t = { src: "nic", amt: 100, at: "2026-09-24T10:00:00Z" };
assert.equal(isDuplicate(t, [{ src: "nic", amt: 100, at: "2026-09-24T10:02:59Z" }]), true);
assert.equal(isDuplicate(t, [{ src: "nic", amt: 100, at: "2026-09-24T10:03:01Z" }]), false);
assert.equal(isDuplicate(t, [{ src: "esewa", amt: 100, at: "2026-09-24T10:00:00Z" }]), false);
assert.equal(isDuplicate({ ...t, dir: "credit" }, [{ ...t, dir: "debit" }]), false);
assert.equal(isDuplicate({ ...t, dir: "debit", raw: "You paid Rs 100 Ref: ABC1234" }, [{ ...t, dir: "debit", raw: "You paid Rs 100 Ref: XYZ1234" }]), false);
assert.equal(isDuplicate({ ...t, id: "same", ch: "App", dir: "debit" }, [{ ...t, id: "same", ch: "App", dir: "debit" }]), true);
assert.equal(isDuplicate({ ...t, id: "new", ch: "App", dir: "debit" }, [{ ...t, id: "old", ch: "App", dir: "debit" }]), false);
assert.equal(sourceFor(p("NIC_ALERT", "A/C ...9999 is debited by NPR 5")!, sources), null);

// Tail discovery for onboarding
assert.deepEqual(tailsByBank([
  { sender: "NIC_ALERT", body: "A/C ...4821 is debited by NPR 5.00", at },
  { sender: "NIC_ALERT", body: "A/C ...4821 is credited by NPR 5.00", at },
  { sender: "+9779800000000", body: "A/C ...1111 is debited by NPR 5.00 NIC ASIA", at },
  { sender: "NIC_ALERT", body: "A/C ...1111 is debited by NPR 5.00", at },
]), { nic: "4821" });

console.log("sms parser: all checks pass");
