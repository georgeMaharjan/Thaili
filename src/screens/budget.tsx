import type { BudgetScreenModel as V } from "../features/budget/screen-model";
import { Hero,Section,TopBar,TxCard,cx } from "@/components/ui";

export function Budget({ v }: { v: V }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <TopBar onBack={v.budgetBack} title="Monthly budget" />
    <div className="min-h-0 flex-1 overflow-auto px-5 pt-2 pb-8">
      <div className="flex flex-col gap-6">
        <div className={cx("rounded-[20px] p-5",v.budgetOver?"bg-tint-w":"bg-surface-2")}>
          <span className="text-[13px] font-semibold text-ink-3">{v.budgetMonth}</span>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><span className="text-[13px] text-ink-2">Available</span><Hero value={v.budgetAvailable} fs="22px" rs="text-[12px]" /></div>
            <div><span className="text-[13px] text-ink-2">Used</span><Hero value={v.budgetSpent} fs="22px" rs="text-[12px]" /></div>
          </div>
          <div className="mt-4 h-[7px] overflow-hidden rounded-full bg-bar-track"><div className="h-full rounded-full" style={{width:v.budgetWidth,background:v.budgetOver?"var(--warnInk)":"var(--navy)"}} /></div>
          {v.budgetOver && <p className="mt-3 text-[13px] font-semibold text-warn-ink">Over budget by {v.budgetOverspent}</p>}
        </div>

        <Section title="Budget rule" action={<button onClick={v.budgetEditRule} className="min-h-[40px] px-2 text-[13px] font-semibold text-action">Edit</button>}>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <strong className="text-[15px]">{v.budgetRuleTitle}</strong>
            <p className="mt-1 text-[13px] leading-normal text-ink-2">{v.budgetRuleDetail}</p>
          </div>
        </Section>

        <Section title="Spending by category">
          {v.budgetCategories.map(c => <div key={c.key} className="flex min-h-[56px] items-center gap-3 border-t border-line"><span className="min-w-0 flex-1 truncate text-[15px]">{c.label}</span><span className="text-[12px] text-ink-3">{c.count}</span><strong className="font-display text-[16px]">{c.amount}</strong></div>)}
          {!v.budgetCategories.length && <p className="border-t border-line py-4 text-[14px] text-ink-3">No spending recorded this month.</p>}
        </Section>

        <Section title="Transactions this month">
          {v.budgetTxRows.map((row, i) => <TxCard key={i} r={row} />)}
          {v.budgetTxEmpty && <p className="border-t border-line py-4 text-[14px] text-ink-3">Your monthly expenses will appear here.</p>}
        </Section>
      </div>
    </div>
  </div>;
}
