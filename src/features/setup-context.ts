import { SRC_KINDS, isManualSrc, needsAcctNumber } from "../application/config";
import type { AppController } from "../application/controller";
import { sourceForMoneyApp } from "../lib/money-apps";
import type { GoalContext } from "./goal-context";
import type { SharedContext } from "./shared-context";

export function setupContext(_app: Pick<AppController, "patch">, context: Pick<SharedContext & GoalContext, "s">) {
  const { s } = context;
  const newKind = SRC_KINDS.filter(k => k.key === s.newSrcKind)[0] || SRC_KINDS[0];
  const newSrcAmtNum = parseFloat(s.newSrcAmt || "0");
  const newSrcAmtValid = s.newSrcAmt.trim() !== "" && Number.isFinite(Number(s.newSrcAmt)) && newSrcAmtNum >= 0;
  const needAcct = newKind.key === "bank";
  const acctOk = !needAcct || s.newSrcAcct.length === 4;
  const srcMissing = s.sources.filter(x => !isManualSrc(x) && ((needsAcctNumber(x) && !x.acct) || !x.openedAt));
  const detectAccounts = s.detFrom === "accounts";
  const detAvailable = s.detFound.filter(d => !detectAccounts || !sourceForMoneyApp(d, s.sources));
  const detOnKeys = detAvailable.filter(d => s.detOn[d.key]).map(d => d.key);
  const OB = ["permission", "detect", "source", "scan", "cats"];
  const obStep = (s.screen === "cats" && s.catsMode === "edit") || (s.screen === "detect" && detectAccounts) ? 0 : OB.indexOf(s.screen) + 1;
  const debitCount = s.tx.filter(t => t.dir === "debit").length;
  const autoFiled = s.tx.filter(t => t.dir === "debit" && t.auto).length;
  return { newKind, newSrcAmtNum, newSrcAmtValid, needAcct, acctOk, srcMissing, detectAccounts, detAvailable, detOnKeys, OB, obStep, debitCount, autoFiled };
}
export type SetupContext = ReturnType<typeof setupContext>;
