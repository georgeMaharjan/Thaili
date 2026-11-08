import type { InsightsScreenModel as V } from "../features/insights/screen-model";
// Insights: one calm scroll for today, this week or this BS month — kept, income and expenses, leaks, savings, where it went.
// Income/Expenses and Leaks open their own screens; the savings baseline is set on its own screen too.
import { AmountEntry,Chevron,Chips,Cta,HeadLink,Hero,Icon,Keypad,P,Section,Seg,TopBar,TxCard,cx } from "@/components/ui";
import type { ReactNode } from "react";

const NUM = "font-display tabular-nums";
const ROW_TOP = "border-t border-line";
const RANGE_ITEM = "flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-[8px] px-3 text-[14px]";
const Ranges = ({ v }: { v: V }) => <Seg items={v.ranges} className="w-full flex-none rounded-xl" itemClass={RANGE_ITEM} />;
const Dot = ({ color }: { color: string }) => <span className="size-[8px] flex-none rounded-full" style={{ background: color }} />;

// A labelled number in a stat row.
const Stat = ({ label, value, className, fg, fs, children }: { label: ReactNode; value: ReactNode; className: string; fg?: string; fs?: string; children?: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">{label}</span>
    <span className={cx(NUM, "whitespace-nowrap font-extrabold", className)} style={{ color: fg, fontSize: fs }}>{value}</span>
    {children}
  </div>
);

// Name, a side note, the amount, and a thin bar under it.
const BarLine = ({ label, note, noteFg, amount, width, color }: { label: string; note: ReactNode; noteFg?: string; amount: string; width: string; color: string }) => (
  <div className={cx(ROW_TOP, "flex min-h-[64px] flex-col justify-center gap-2")}>
    <div className="flex items-baseline gap-3">
      <span className="min-w-0 flex-1 truncate text-[16px] font-medium">{label}</span>
      <span className="whitespace-nowrap text-[13px] font-semibold text-ink-3" style={{ color: noteFg }}>{note}</span>
      <span className={cx(NUM, "min-w-[80px] flex-none whitespace-nowrap text-right text-[20px] font-bold")}>{amount}</span>
    </div>
    <div className="h-[4px] overflow-hidden rounded-xs bg-bar-track"><div className="h-full rounded-xs" style={{ width, background: color }} /></div>
  </div>
);

// A pushed screen with the period switch on the right of its back bar.
const RangeScreen = ({ v, title, children }: { v: V; title: ReactNode; children: ReactNode }) => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar onBack={v.leaksBack} title={title} />
    <div className="flex-none px-5 pb-3"><Ranges v={v} /></div>
    <div className="flex flex-1 flex-col gap-10 overflow-auto px-5 pt-2 pb-10">{children}</div>
  </div>
);

export function Insights({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex flex-none flex-col gap-3 px-5 pt-4 pb-3"><h1 className="font-display text-[28px] font-bold">{v.t.insights}</h1><Ranges v={v} /></header>
      <div className="flex flex-1 flex-col gap-6 overflow-auto px-5 pt-2 pb-6">

        <div className="flex flex-col gap-2 rounded-[20px] bg-surface-2 p-5">
          <span className="text-[14px] font-semibold text-ink-2">{v.keptHeadLabel}</span>
          <Hero value={v.keptBig} fs={v.keptFs} fg={v.keptFg} />
          <span className="text-pretty text-[14px] leading-normal text-ink-2">{v.keptSentence}</span><span className="text-[12px] text-ink-3">Transfers between your accounts are excluded.</span>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <button onClick={v.toFlowIn} className="press self-start text-left">
              <Stat label={<><Dot color="var(--pos)" />Income<Chevron /></>} value={v.inBig} fg="var(--pos)" fs={v.flowFs} className="leading-[1.15] tracking-[-0.01em]">
                <span className="text-[13px] text-ink-3">{v.inMeta}</span>
              </Stat>
            </button>
            <button onClick={v.toFlow} className="press self-start text-left">
              <Stat label={<><Dot color="var(--out)" />Expenses<Chevron /></>} value={v.outBig} fs={v.flowFs} className="leading-[1.15] tracking-[-0.01em]">
                <span className="text-[13px]" style={{ color: v.spentChip.fg }}>{v.spentSentence}</span>
              </Stat>
            </button>
          </div>
        </div>

        <Section title="Spending over time" className="gap-3">
          <p className="text-[13px] text-ink-3">{v.trendCaption}</p>
          <div className="flex h-[128px] items-end gap-2" role="img" aria-label={v.trendSummary}>
            {v.spendingTrend.map((d,i: number) => <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"><span className="text-[12px] tabular-nums text-ink-2">{d.value}</span><div className="flex h-[80px] w-full items-end rounded-t-md bg-surface-2"><div className="w-full rounded-t-md bg-navy" style={{height:d.height}} /></div><span className="text-[12px] text-ink-3">{d.label}</span></div>)}
          </div>
        </Section>
        <button onClick={v.toLeaks} className="press flex flex-col gap-3 rounded-2xl bg-tint-w p-4 text-left">
          <span className="flex w-full items-center justify-between gap-2"><span className="text-[15px] font-semibold">Optional spending</span><Chevron /></span><span className="font-display text-[32px] font-bold tabular-nums">{v.leakAmtLabel}</span><span className="text-[13px] leading-normal text-ink-2">One-third less would leave {v.leakCutLabel} more to keep. Explore categories and patterns.</span>
        </button>

        <Section title="Savings" action={<HeadLink onClick={v.toBaseline}>{v.editLabel}</HeadLink>}>
          <button onClick={v.toAccounts} className="press flex flex-col gap-1 pt-1 pb-3 text-left">
            <span className="flex items-center justify-between gap-3 text-[13px] text-ink-3">{v.savAcctLine}<Chevron /></span>
            <Hero value={v.savPotBig} fs="44px" />
          </button>
          <div className="relative py-1.5">
            <div className="flex h-[14px] overflow-hidden rounded-[7px] bg-bar-track">
              <div className="h-full bg-navy" style={{ width: v.savSavedW }} />
              <div className="h-full" style={{ width: v.savGapW, background: GAP }} />
              <div className="h-full bg-pos" style={{ width: v.savSurW }} />
            </div>
            {/* the baseline marker: a tall ink tick across the bar */}
            <div className="absolute inset-y-0 -ml-px w-[2px] rounded-xs bg-ink" style={{ left: v.baseLeft }} />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3">
            <Stat label={<><span className="h-[12px] w-[2px] flex-none rounded-xs bg-ink" />Baseline</>} value={v.savBaseLabel} className="text-[22px] leading-[1.2]" />
            <div className="flex min-w-0 flex-col items-end gap-0.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                <span className="size-[10px] flex-none rounded-[3px]" style={{ background: v.savSurDot === "var(--warn)" ? GAP : v.savSurDot }} />{v.savSurWord}
              </span>
              <span className={cx(NUM, "whitespace-nowrap text-[22px] font-extrabold leading-[1.2]")} style={{ color: v.savSurFg }}>{v.savSurLabel}</span>
            </div>
          </div>
          <span className="text-pretty pt-3 text-[14px] leading-normal text-ink-2">{v.savLine}</span>
          <button onClick={v.toggleSavExplain} className={cx(ROW_TOP, "mt-4 flex min-h-[52px] items-center justify-between")}>
            <span className="text-[15px] font-semibold">How the baseline works</span>
            <Icon d={P.expand} size={18} sw={2.2} className={cx("text-ink-3 transition-transform duration-200", v.savExplain && "rotate-180")} />
          </button>
          {v.savExplain && (
            <div className="flex flex-col gap-3 pb-1">
              <span className="text-pretty text-[14px] leading-[1.6] text-ink-2">{v.savExplainLine}</span>
              <div className="flex flex-col">
                {v.savSteps.map((x, i: number) => (
                  <div key={i} className={cx(ROW_TOP, "flex min-h-[50px] items-center gap-3")}>
                    <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-surface-2 font-display text-[12px] font-bold text-ink-2">{x.n}</span>
                    <span className="min-w-0 flex-1 text-[15px] leading-[1.35]">{x.label}</span>
                    <span className={cx(NUM, "whitespace-nowrap text-[18px] font-bold")} style={{ color: x.fg }}>{x.value}</span>
                  </div>
                ))}
                <button onClick={v.toBaseline} className={cx(ROW_TOP, "flex min-h-[52px] items-center gap-3")}>
                  <span className="flex-1 text-left text-[15px] font-semibold">Change baseline</span>
                  <span className="text-[14px] text-ink-3">{v.savBaseLabel}</span>
                  <Chevron />
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title={v.whereTitle}>
          <div className="flex flex-col gap-3 pt-1 pb-5">
            <div className="flex h-[10px] gap-0.5 overflow-hidden rounded-[5px] bg-bar-track">
              {v.splitRows.map((g, i: number) => <div key={i} className="h-full" style={{ width: g.width, background: g.color }} />)}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {v.splitRows.map((g, i: number) => (
                <div key={i} className="flex min-w-0 flex-col gap-0.5">
                  <span className={cx(NUM, "text-[28px] font-extrabold leading-[1.1]")}>{g.pct}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2"><Dot color={g.color} />{g.label}</span>
                </div>
              ))}
            </div>
          </div>
          {v.catRowsShown.map((c,i: number) => <button key={i} onClick={c.tap} className="press flex w-full flex-col gap-2 border-t border-line py-4 text-left"><span className="flex w-full items-center justify-between gap-3"><strong className="min-w-0 text-[15px] font-medium">{c.label}</strong><span className="whitespace-nowrap font-display text-[20px] font-semibold">{c.amount}</span></span><span className="flex w-full items-center justify-between text-[13px] text-ink-3"><span>{c.share} of spending</span><span style={{color:c.dFg}}>{c.dWord}</span></span><span className="h-[6px] w-full overflow-hidden rounded-full bg-bar-track"><span className="block h-full rounded-full" style={{width:c.width,background:c.color}} /></span></button>)}
          {v.catMore && (
            <button onClick={v.toggleCatsAll} className={cx(ROW_TOP, "flex min-h-[48px] items-center text-[14px] font-semibold text-action")}>{v.catMoreLabel}</button>
          )}
        </Section>

      </div>
    </div>
  );
}

// The part of the bar savings still has to fill before reaching the baseline.
const GAP = "repeating-linear-gradient(135deg, var(--warn) 0 3px, var(--tintW) 3px 6px)";


// Every deposit or every spend behind the Insights Income / Expenses figure.
export function Flow({ v }: { v: V }) {
  return (
    <RangeScreen v={v} title={v.flowName}>
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-[14px] font-semibold text-ink-2">{v.flowHeadLabel}</span>
        <Hero value={v.flowBig} fg={v.flowBigFg} />
        {v.flowSub && <span className="text-[14px]" style={{ color: v.flowSubFg }}>{v.flowSub}</span>}
      </div>
      {v.flowKinds.length > 0 && <Seg items={v.flowKinds} className="-mt-6 w-full rounded-xl" itemClass="flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-[8px] px-1 text-[13px]" />}
      <Section title={v.flowListTitle} action={<span className="text-[13px] text-ink-3">{v.flowCount}</span>}>
        {v.flowRows.map((r, i: number) => <TxCard key={i} r={r} />)}
        {v.flowEmptyLine && <span className={cx(ROW_TOP, "flex min-h-[60px] items-center text-[14px] text-ink-3")}>{v.flowEmptyLine}</span>}
      </Section>
    </RangeScreen>
  );
}

// Spending outside the necessities: how much, what a third less would keep, where and when it goes.
export function Leaks({ v }: { v: V }) {
  return (
    <RangeScreen v={v} title={v.t.leaks}>
      <div className="flex flex-col gap-1.5 pt-3">
        <span className="text-[14px] font-semibold text-ink-2">{v.leakHeadLabel}</span>
        <Hero value={v.leakBig} fs={v.leakFs} fg="var(--warnInk)" />
        <span className="text-pretty text-[15px] font-medium leading-[1.45] text-ink-2">{v.leakSentence}</span>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Stat label="Potential savings" value={v.leakCutLabel} fg="var(--pos)" className="text-[28px] leading-[1.15]">
            <span className="text-[13px] leading-[1.4] text-ink-3">with one-third less optional spending</span>
          </Stat>
          <Stat label="Daily average" value={v.leakPerDay} className="text-[28px] leading-[1.15]">
            <span className="text-[13px] leading-[1.4] text-ink-3">{v.leakPerDayMeta}</span>
          </Stat>
        </div>
      </div>

      <Section title="By category">
        {v.leaksNone && (
          <div className={cx(ROW_TOP, "flex min-h-[56px] items-center gap-3 text-[15px] font-medium text-pos")}>
            <Icon d={P.check} size={18} sw={2.4} />{v.leaksNoneLabel}
          </div>
        )}
        {v.leakRows.map((l, i: number) => <BarLine key={i} label={l.label} note={l.per} amount={l.amount} width={l.width} color="var(--warn)" />)}
      </Section>

      {v.leakTxRows.length > 0 && (
        <Section title="Optional transactions" action={<span className="text-[13px] text-ink-3">{v.leakTxCount}</span>}>
          {v.leakTxRows.map((r, i: number) => <TxCard key={i} r={r} />)}
        </Section>
      )}

      <Section title="Patterns">
        <div className={cx(ROW_TOP, "grid grid-cols-2 gap-4 pt-4")}>
          {v.leakStats.map((m, i: number) => (
            <div key={i} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] text-ink-3">{m.label}</span>
              <span className={cx(NUM, "truncate text-[24px] font-extrabold leading-[1.2]")}>{m.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <button onClick={v.toEssEdit} className="press flex min-h-[64px] items-center gap-4 border-y border-line text-left">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-medium">What counts as optional</span>
          <span className="truncate text-[13px] leading-[1.4] text-ink-3">{v.leakWhatLine}</span>
        </div>
        <Chevron />
      </button>
    </RangeScreen>
  );
}

// The savings baseline: the cushion goals never touch. Typed on a keypad; 3 or 6 months of essentials are one tap away.
export function Baseline({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden pt-2 pb-6">
      <TopBar onBack={v.baseBack} title="Savings baseline" />
      <div className="flex flex-1 flex-col gap-1.5 overflow-auto">
        <div className="flex flex-col gap-1.5 px-5">
          {v.baseSetupMode && <span className="text-[13px] font-semibold text-action">{v.baseSetupNote}</span>}
          <span className="text-pretty text-[14px] leading-normal text-ink-2">The cushion you keep untouched for emergencies. Goals only get money above it.</span>
        </div>
        <AmountEntry value={v.baseAmtLabel} fg={v.baseAmtFg} className="text-[52px]" caret="h-[40px]" />
        <span className="text-pretty px-5 text-[13px] leading-normal" style={{ color: v.baseStatusFg }}>{v.baseStatus}</span>
        {v.baseChips.length > 0 && (<>
          <span className="px-5 pt-3 text-[13px] font-semibold text-ink-3">Suggested · months of essential spending</span>
          <Chips items={v.baseChips} className="px-4" />
        </>)}
        <span className="text-pretty px-5 pt-3 text-[13px] leading-normal text-ink-3">{v.baseBasisLine}</span>
      </div>
      <Keypad keys={v.baseKeys} />
      <div className="flex-none px-5 pt-3 pb-5">
        <Cta onClick={v.baseSave} bg={v.baseCtaBg} fg={v.baseCtaFg} className="p-4 text-[15px]">{v.baseCta}</Cta>
      </div>
    </div>
  );
}
