import type { HomeScreenModel as V } from "../features/home/screen-model";
// Balance-led Home and native manual-entry form.
import { Picker } from "@/components/sheet";
import { Bar,Btn,CARD,Chevron,Chips,HeadLink,Hero,Icon,IconBtn,P,Pull,Section,TopBar,TxCard,cx } from "@/components/ui";

export function Home({ v }: { v: V }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <header className="flex flex-none items-center gap-3 px-5 py-4">
      <span className="flex h-[40px] w-[35px] items-center justify-center rounded-xl bg-brand"><img src="./thaili-mark-line.png" alt="Thaili" className="h-[30px] w-[23px] object-contain" /></span>
      <div className="min-w-0 flex-1"><div className="font-display text-[24px] font-bold leading-tight">Thaili <span className="text-[16px]">थैली</span></div><div className="text-[13px] text-ink-3">{v.bsMonth}</div></div>
    </header>
    <Pull onRefresh={v.refreshTransactions} className="min-h-0 flex-1">
      <div className="flex flex-col gap-6 px-5 pb-[48px]">
        <section className="balance-card rounded-[20px] px-5 py-3" aria-label="Account balances">
          <div className="flex items-center justify-between"><span className="text-[15px] font-medium">{v.haveLabel}</span><button onClick={v.toggleBal} aria-label={v.balEyeLabel} className="press flex size-[44px] items-center justify-center"><Icon d={v.balEyeD} size={19} /></button></div>
          <Hero value={v.totalBal} fs="32px" rs="text-[16px]" />
          <span className="mt-1 block text-[12px] text-ink-2">{v.haveMeta}</span>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
            {[{label:"Spent this month", total:v.homeSpentCompact},{label:"Savings balance", total:v.homeSavingsTotal}].map((g) => <button key={g.label} onClick={v.toAccounts} className="press min-h-[42px] text-left"><span className="block text-[12px] text-ink-2">{g.label}</span><span className="break-words font-display text-[20px] font-semibold tabular-nums">{g.total}</span></button>)}
          </div>
        </section>
        {v.showReviewBanner && <div className="flex items-center rounded-2xl bg-tint-u"><button onClick={v.toReviewStack} className="press flex min-w-0 flex-1 items-center gap-3 p-4 pr-1 text-left"><span className="flex min-w-[32px] items-center justify-center rounded-lg bg-uncat px-2 py-1 text-[16px] font-semibold text-canvas">{v.reviewCount}</span><span className="flex-1"><strong className="block text-[15px]">Ready to sort</strong><span className="text-[13px] text-ink-2">Give new entries a category or note</span></span><Chevron /></button><IconBtn d={P.close} label="Dismiss" onClick={v.dismissReviewBanner} size={18} className="mr-1 text-ink-3" /></div>}
        <Section title={v.t.goals} action={<HeadLink onClick={v.toGoal}>Manage</HeadLink>} className="gap-3">
          <button onClick={v.toGoal} className="press flex min-h-[64px] w-full items-center justify-between rounded-2xl bg-tint-g px-4 py-3 text-left"><strong className="text-[15px]">Monthly savings goal</strong><strong className="font-display text-[20px]">{v.homeSavingsTarget}</strong></button>
          {v.homeGoals.slice(0,2).map((g, i: number) => <button key={i} onClick={g.tap} className="press flex flex-col gap-3 rounded-2xl bg-tint-g p-4"><span className="flex w-full items-center justify-between gap-3"><strong className="min-w-0 truncate text-[15px]">{g.name}</strong><span className="text-[13px] text-ink-2">{g.pct}</span></span><Bar width={g.width} color="var(--pos)" className="h-[6px] w-full rounded-full" /><span className="text-[13px] text-ink-2">{g.got} of Rs {g.target}</span></button>)}
          {v.floorPending && <p className="text-[13px] leading-normal text-ink-3">{v.floorLine}</p>}
        </Section>
        <Section title="Monthly budget">
          <button onClick={v.toBudget} className={cx("press flex w-full flex-col gap-3 rounded-2xl p-4 text-left",v.homeBudgetOver?"bg-tint-w":"bg-surface-2")}>
            <div className="grid w-full grid-cols-2 gap-3"><span className="text-[13px] text-ink-2">Available<strong className="mt-1 block font-display text-[20px] text-ink">{v.homeBudgetAvailable}</strong></span><span className="text-[13px] text-ink-2">Used<strong className="mt-1 block font-display text-[20px] text-ink">{v.homeBudgetUsed}</strong></span></div>
            <Bar width={v.homeBudgetWidth} color={v.homeBudgetOver?"var(--warnInk)":"var(--navy)"} className="h-[6px] w-full rounded-full" />
            <span className="flex w-full items-center justify-between gap-2 text-[12px] text-ink-3"><span className="truncate">{v.homeBudgetOver?"Over budget · "+v.homeBudgetOverAmount:v.homeBudgetRule}</span><Chevron /></span>
          </button>
        </Section>
        <Section title={v.t.recent} action={<HeadLink onClick={v.toTxns}>{v.t.seeAll}</HeadLink>}>{v.recent.slice(0,3).map((r, i: number) => <TxCard key={i} r={r} />)}{!v.recent.length && <p className="py-4 text-[14px] text-ink-3">Your transactions will appear here. Add an entry to get started.</p>}</Section>
      </div>
    </Pull>
  </div>;
}

export function Add({ v }: { v: V }) {
  return <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={e => { e.preventDefault(); v.commitAdd(); }}>
    <TopBar onBack={v.addCancel} icon={P.close} label="Cancel transaction" title="New transaction" />
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-5 pt-3 pb-6">
      <div className="native-segment" aria-label="Transaction type">{([["debit","Expense"],["credit","Income"]] as const).map(([key,label]) => <button type="button" key={key} aria-pressed={v.addDirection === key} onClick={() => v.addDirectionSet(key)}>{label}</button>)}</div>
      <label className="flex flex-col gap-2 rounded-[20px] bg-surface-2 p-5"><span className="text-[14px] text-ink-2">{v.addDirection === "credit" ? "Amount received" : "Amount paid"}</span><span className="flex min-w-0 items-baseline gap-2"><span className="font-display text-[22px] text-ink-3">Rs</span><input aria-label="Amount" inputMode="decimal" autoComplete="off" value={v.addAmount} onChange={v.addAmountType} className="min-w-0 w-full bg-transparent font-display text-[44px] font-bold tabular-nums outline-none" /></span></label>
      <Picker label={v.addDirection === "credit" ? "Received into" : "Paid from"} value={v.addAccount} onChange={v.addAccountSet} options={v.addAccounts.map((a) => ({ value: a.key, label: a.name }))} />
      <Picker label="Category" value={v.addCategory} onChange={v.addCategorySet} options={v.addCategoryOptions.map((c) => ({ value: c.key, label: c.label }))} />
      <button type="button" onClick={v.addCategoryNew} className="-mt-4 min-h-[40px] self-start text-[14px] font-semibold text-action">+ Add a category</button>
      <label className="field">Note <span className="sr-only">optional</span><textarea rows={2} value={v.addNote} onChange={v.addNoteType} maxLength={80} /></label>
      <div className="flex items-center gap-2 text-[13px] text-ink-3"><Icon d={P.calendar} size={17} />Today · {v.addDateLabel}</div>
      {v.addError && <p role="alert" className="text-[14px] text-action">{v.addError}</p>}
      {!v.addAccounts.length && <p role="status" className="text-[14px] text-ink-2">Add an account in Accounts before recording a transaction.</p>}
    </div>
    <div className="flex-none border-t border-line bg-canvas px-5 py-4"><button type="submit" disabled={!v.addReady} className="press flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-action px-4 py-3 text-center text-[16px] font-semibold text-on-action">{v.addCta}</button></div>
  </form>;
}

export function Stack({ v }: { v: V }) {
  const action = "flex items-center gap-1.5 px-1 py-3 text-[13px] font-semibold";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.stackExit} icon={P.close} label="Close" title={v.t.review}>
        <span className="flex-none px-3 text-[13px] font-semibold text-ink-3">{v.stackProgress}</span>
      </TopBar>
      {v.stackHasCard && (
        <div className="flex flex-1 flex-col gap-4 overflow-auto px-5 pb-6">
          <div className={cx(CARD, "flex flex-col gap-5 px-6 py-6")}>
            <div className="flex flex-col gap-1">
              <span className="font-display text-[52px] font-extrabold leading-none tracking-[-0.03em]">{v.cardAmount}</span>
              <span className="text-[15px] font-semibold text-ink-2">{v.cardMerchant}</span>
              <span className="text-[12px] text-ink-3">{v.cardMeta}</span>
            </div>
            <Chips items={v.cardCats} className="" />
          </div>
          <div className="flex items-center justify-between px-1.5">
            <button onClick={v.cardSkip} className={cx(action, "text-ink-3")}>Skip<Icon d="M5 12h14M13 6l6 6-6 6" size={16} /></button>
            <button onClick={v.cardOpen} className={cx(action, "text-action")}><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17ZM12 11v5M12 7.8h.01" size={17} />Details</button>
          </div>
        </div>
      )}
      {v.stackDone && (
        <div className="flex flex-1 flex-col justify-center gap-4 px-6 pb-8">
          <span className="flex size-[56px] items-center justify-center rounded-card bg-tint-g text-pos"><Icon d={P.check} size={30} sw={2.4} /></span>
          <div className="font-display text-[32px] font-bold leading-[1.15] tracking-[-0.02em]">Nothing left uncategorised</div>
          <Btn onClick={v.stackExit} className="self-start">Back to Home</Btn>
        </div>
      )}
    </div>
  );
}
