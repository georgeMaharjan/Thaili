import assert from 'node:assert/strict';
import type { Direction } from '../../../src/domain/models.ts';
import { writeFileSync } from 'node:fs';
// Audit evidence: asserts the observed defects, not desired regression behavior.
// Use the command in docs/LOGIC-AUDIT-2026-10-20.md; adapters use synthetic data only.
import { AppController } from '../../../src/application/controller.ts';
import { initialState } from '../../../src/application/state.ts';
import { CaptureCoordinator, captureConfiguration } from '../../../src/application/capture.ts';
import { accountBalances, monthlyBudget } from '../../../src/lib/finance.ts';
import { parseSms } from '../../../src/lib/sms.ts';
import { allocateGoals } from '../../../src/lib/goals.ts';
import { dated } from '../../../src/lib/bs.ts';
import { checkRule, kwFor } from '../../../src/lib/rules.ts';
import { detectMoneyApps } from '../../../src/lib/money-apps.ts';
import { notificationInbox } from '../../../src/lib/notification-transactions.ts';
import { importTransactions } from '../../../src/lib/import-transactions.ts';
import { createLedgerStore } from '../../../src/application/ledger-store.ts';
import { LocalLedger, emptyPouch, mergePouches } from '../../../src/lib/local-ledger.ts';
const results: object[] = [];
const record = (id: string, observed: object) => { results.push({ id, ...observed }); console.log(id, JSON.stringify(observed)); };
const at=Date.now(), iso=new Date(at).toISOString();
const transaction = (id: string, dir: Direction='debit', src='nabil', amount=100, to: string | null=null) => dated({id,dir,src,amt:amount,to,m:'Fixture',rem:'Fixture',cat:'food',ch:'Manual' as const,at:iso},new Date(at));
function fixture() {
 const app=new AppController({});
 app.patch=(update,done)=>{app.state={...app.state,...(typeof update==='function'?update(app.state):update)};done?.();};
 app.auth=async()=>({ok:true});
 app.state={...initialState(),loaded:true,splash:false,setupComplete:true,screen:'home',
  user:{name:'Fixture User',phone:'+9779800000000',createdAt:iso},
  sources:[{key:'nabil',name:'Nabil Bank',base:'Nabil Bank',opening:1000,openedAt:new Date(at-86400000).toISOString(),acct:'4821',dot:'red',type:'Bank · SMS'}],roles:{nabil:'spending'}};
 return app;
}
// F01/F02 removed: acceptance coverage lives in src/lib/device-store.check.ts
// and src/features/application-flow.check.ts. Original observations stay in evidence.json.
{
 const balanceFirst=parseSms({sender:'NABIL',at,body:'Available balance NPR 10000. Your A/C XXXX4821 has been debited by NPR 500. Remarks: SHOP.'});
 const foreign=parseSms({sender:'NABIL',at,body:'Your A/C XXXX4821 has been debited by USD 20. Available balance NPR 10000.'});
 const conflict=parseSms({sender:'NABIL',at,body:'Your A/C XXXX4821 has been debited by NPR 500 and receiver account has been credited.'});
 assert.equal(balanceFirst?.amt,10000);assert.equal(foreign?.amt,10000);assert.equal(conflict?.dir,'credit');
 record('SMS_AMOUNT_DIRECTION',{balanceBeforeMovement:balanceFirst?.amt,foreignPaymentParsedAsNpr:foreign?.amt,conflictingDirectionChosen:conflict?.dir});
}
{
 const app=fixture();try {
  app.patch({tx:[transaction('original')]}); app.flash('Category changed',{tx:app.state.tx});
  app.patch({tx:[...app.state.tx,transaction('new-background-entry')]}); app.renderVals().undo();
  assert.equal(app.state.tx.some(t=>t.id==='new-background-entry'),false);
  record('UNDO_ERASES_BACKGROUND',{remainingIds:app.state.tx.map(t=>t.id)});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();try {
  app.patch({tx:[transaction('expense')]});const before=accountBalances(app.state.sources,app.state.tx).nabil;
  app.editSource('nabil');const shown=app.state.newSrcAmt;app.renderVals().newSrcCreate();
  const after=accountBalances(app.state.sources,app.state.tx).nabil;
  assert.equal(shown,'1000');assert.equal(after,900);
  record('OPENING_EDIT',{balanceBefore:before,enteredAndSaved:shown,balanceAfter:after});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();let authCalls=0;try {
  app.auth=async()=>{authCalls++;return {ok:false,reason:'cancelled'};};
  app.patch({sources:[...app.state.sources,{...app.state.sources[0],key:'destination',name:'Other',base:'Other'}],tx:[transaction('transfer','transfer','nabil',100,'destination')]});
  app.editSource('destination');app.renderVals().srcDelete();
  assert.equal(authCalls,0);assert.equal(app.state.sources.length,1);assert.equal(app.state.tx[0].to,'destination');
  record('ACCOUNT_REMOVAL',{authCalls,sources:app.state.sources.length,retainedTransfer:app.state.tx[0].id,danglingDestination:app.state.tx[0].to});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();let capture:CaptureCoordinator|undefined;try {
  app.patch({captureStartAt:at-1000,moneyApps:[{key:'prabhu',base:'Prabhu Bank',app:'Prabhu Smart',kind:'bank',packages:['np.fixture.prabhu']}]});
  assert.ok(captureConfiguration(app.state).packages['np.fixture.prabhu']);
  capture=new CaptureCoordinator({snapshot:()=>app.state,commit:async update=>app.patch(update),apps:async()=>app.state.moneyApps,
   readSms:async()=>[],readNotifications:async()=>[{id:'unselected',pkg:'np.fixture.prabhu',at,body:'NPR 500 has been credited to your account XXXX1234'}],
   message(){},now:()=>at,newId:()=> 'auto-added'});
  await capture.catchUp();assert.ok(app.state.sources.some(s=>s.key==='prabhu'));
  record('UNSELECTED_ACCOUNT',{watchedPackage:true,accountsAfterAlert:app.state.sources.map(s=>s.key)});
 }finally{capture?.dispose();app.componentWillUnmount();}
}
{
 const app=fixture();try{
  const apps=detectMoneyApps([{pkg:'example.untrusted.fakebank',label:'Nabil Bank'}]);
  const inbox=notificationInbox([{id:'spoof',pkg:'example.untrusted.fakebank',at,body:'NPR 900 has been debited from your account'}],apps,app.state.sources,{});
  const imported=importTransactions(inbox.messages,{sources:app.state.sources,rules:[],existing:[],now:new Date(at),newId:()=> 'spoof'});
  assert.equal(imported.tx[0].src,'nabil');
  record('APP_LABEL_SPOOF',{recognizedAs:apps[0].key,affectedAccount:imported.tx[0].src,balanceAfter:accountBalances(app.state.sources,imported.tx).nabil});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();try{
  const parsed=parseSms({sender:'NABIL',at,body:'Your A/C XXXX4821 has been debited by NPR 100 on 01/01/2026. Remarks: SHOP.'})!;
  assert.equal(parsed.at,at);
  const imported=importTransactions([{sender:'NABIL',at,body:parsed.raw}],{sources:app.state.sources,rules:[],existing:[],now:new Date(at),newId:()=> 'late-old-movement'});
  record('BODY_DATE_IGNORED',{bodyTransactionDate:'2026-01-01',savedTransactionDate:imported.tx[0].at,balanceAfter:accountBalances(app.state.sources,imported.tx).nabil});
 }finally{app.componentWillUnmount();}
}
{
 const month={y:2083,m:5,d:31};
 const budget=monthlyBudget([{...transaction('income','credit','nabil',6),bs:month}],month,31,0);
 assert.equal(budget.remaining,6);assert.equal(budget.allowance,10);
 const goal=[{id:'one',name:'One',target:50}];
 const shared=allocateGoals(goal,0,50,100,'Share').allocations[0].waitMonths;
 const queued=allocateGoals(goal,0,50,100,'Queue').allocations[0].waitMonths;
 assert.equal(shared,2);assert.equal(queued,1);
 record('BUDGET_AND_ETA',{remaining:budget.remaining,recommendedAllowance:budget.allowance,oneGoalShareMonths:shared,oneGoalQueueMonths:queued});
}
{
 const word=kwFor({dir:'debit',m:'किराना पसल',rem:'किराना पसल'});
 assert.equal(word,null);assert.equal(checkRule('किराना',null,[],[]).block,true);
 record('NEPALI_RULES',{suggestedKeyword:word,validNepaliKeywordRejected:true});
}
{
 const before=emptyPouch();before.prefs.captureStartAt=100;const local=structuredClone(before);local.prefs.captureStartAt=200;
 const acknowledged=structuredClone(local);const remote=structuredClone(acknowledged);remote.prefs.captureStartAt=50;
 const merged=mergePouches(remote,acknowledged,local,{sources:{},tx:{},rules:{},goals:{}});
 assert.equal(merged.prefs.captureStartAt,50);
 record('DEVICE_CAPTURE_POLICY_MERGED',{localBoundary:200,otherDeviceBoundary:50,result:merged.prefs.captureStartAt});
}

{
 const app=fixture();let fail=false;
 const ledger=new LocalLedger({read:async()=>null,write:async()=>{if(fail)throw new Error('fixture disk temporarily unavailable');}},null);
 const store=createLedgerStore(ledger,false,{online:()=>true,listen:()=>()=>{}});
 try {
  await store.initializeStore(app.state);const previous=app.state;app.patch({tx:[transaction('unsaved')]});
  fail=true;await store.save(previous,app.state);fail=false;await store.retrySync();
  const durable=await store.load();assert.equal(durable!.tx.length,0);assert.equal(app.state.tx.length,1);
  record('LOCAL_SAVE_NO_RETRY',{memoryEntries:app.state.tx.length,durableEntries:durable!.tx.length,savePromiseResolvedDespiteFailure:true});
 }finally{store.dispose();app.componentWillUnmount();}
}
{
 const app=fixture();try{
  app.patch({sources:[...app.state.sources,{key:'esewa',name:'eSewa',base:'eSewa',opening:0,acct:'4821',dot:'green',type:'Wallet · notifications'}]});
  const result=importTransactions([{sender:'NABIL',at,body:'Your A/C XXXX4821 has been debited by NPR 500. Remarks: eSewa Load 9612349999.'}],{sources:app.state.sources,rules:[],existing:[],now:new Date(at),newId:()=> 'payment-to-another-person'});
  assert.equal(result.tx[0].dir,'transfer');assert.equal(result.tx[0].to,'esewa');
  record('WALLET_96_RECIPIENT',{savedOwnWalletTail:'4821',actualPayee:'9612349999',classified:result.tx[0].dir,to:result.tx[0].to});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();try{
  app.editSource('nabil');app.renderVals().pickSrcName({target:{value:'Kumari Bank'}});app.renderVals().newSrcCreate();
  const result=importTransactions([{sender:'KBL',at,body:'NPR 100 has been debited from A/C XXXX4821'}],{sources:app.state.sources,rules:[],existing:[],now:new Date(at),newId:()=> 'new-bank'});
  assert.equal(app.state.sources[0].base,'Kumari Bank');assert.equal(result.tx.length,0);assert.equal(result.orphans,1);
  record('INSTITUTION_EDIT_STALE_ID',{displayed:app.state.sources[0].base,key:app.state.sources[0].key,kumariEntriesImported:result.tx.length,orphans:result.orphans});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();try{
  app.patch({rules:[],tx:[{...transaction('learn'),m:'TRANSFER',rem:'TRANSFER',cat:null}]});
  app.transactions.setCat('learn','food','Eating out');assert.ok(app.state.rulePrompt);app.renderVals().promptYes();
  assert.equal(app.state.rules[0].kw,'TRANSFER');assert.equal(checkRule('TRANSFER',null,[],[]).block,true);
  record('AUTO_LEARN_BYPASSES_VALIDATION',{createdKeyword:app.state.rules[0].kw,blockedByNormalRuleEditor:true});
 }finally{app.componentWillUnmount();}
}
// F19 removed: no fabricated review note or receipt action remains.
{
 let threw=false;
 try{importTransactions([{sender:'NABIL',at:Number.MAX_VALUE,body:'NPR 100 has been debited from A/C XXXX4821'}],{sources:[{key:'nabil',name:'Nabil Bank',acct:'4821'}],rules:[],existing:[],now:new Date(at),newId:()=> 'bad-time'});}catch{threw=true;}
 assert.ok(threw);
 const tooLarge=parseSms({sender:'NABIL',at,body:'NPR 1000000000000 has been debited from A/C XXXX4821'});
 assert.equal(tooLarge?.amt,1000000000000);
 record('UNBOUNDED_IMPORT',{finiteInvalidDateCrashesBatch:threw,acceptedAmountBeyondNumeric14_2:tooLarge?.amt});
}
{
 const app=fixture();try{
  app.catchUpSms=async()=>{};
  app.patch({tx:[{...transaction('unrelated-newer'),at:new Date(at+60000).toISOString()},transaction('clicked-entry')]});
  app.openFromNotification({open:'review',at});await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(app.state.detailId,'unrelated-newer');
  record('WRONG_REVIEW_ENTRY',{clickedTransaction:'clicked-entry',openedTransaction:app.state.detailId});
 }finally{app.componentWillUnmount();}
}
{
 const app=fixture();try{
  app.patch({sources:[...app.state.sources,{key:'esewa',name:'eSewa',base:'eSewa',opening:0,acct:'4821',dot:'green',type:'Wallet · notifications'}]});
  const result=importTransactions([
   {sender:'NABIL',at,body:'Your A/C XXXX4821 has been debited by NPR 500. Remarks: eSewa Load 9840004821. Ref: LOAD12345.'},
   {bank:'esewa',ch:'App',at:at+60000,body:'NPR 500 has been credited to your account XXXX4821. Ref: GIFT99999.'}
  ],{sources:app.state.sources,rules:[],existing:[],now:new Date(at),newId:(()=>{let id=0;return()=> 'pair'+(++id);})()});
  assert.equal(result.tx.length,1);assert.equal(result.tx[0].capture!.length,2);
  record('UNRELATED_WALLET_CREDIT_ABSORBED',{distinctReferences:result.tx[0].capture!.map(e=>e.ref),remainingEntries:result.tx.length,remainingDirection:result.tx[0].dir});
 }finally{app.componentWillUnmount();}
}
writeFileSync(new URL('./remaining-evidence.json', import.meta.url),JSON.stringify(results,null,2));
