// Insights: one calm scroll for today, this week or this BS month — kept, income and expenses, leaks, savings, where it went.
// Income/Expenses and Leaks open their own screens; the savings baseline is set on its own screen too.
import type { ReactNode } from "react";
import { Chevron, Cta, HeadLink, Hero, Icon, IconBtn, P, Section, Seg, Stepper, TopBar, TxCard, cx, type V } from "@/components/ui";

const NUM = "font-display tabular-nums";
const ROW_TOP = "border-t border-line";
const RANGE_ITEM = "flex h-8.5 items-center whitespace-nowrap rounded-[9px] px-3 text-[13px]";
const Ranges = ({ v }: { v: V }) => <Seg items={v.ranges} className="flex-none rounded-xl" itemClass={RANGE_ITEM} />;
const Dot = ({ color }: { color: string }) => <span className="size-2 flex-none rounded-full" style={{ background: color }} />;

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
  <div className={cx(ROW_TOP, "flex min-h-16 flex-col justify-center gap-2")}>
    <div className="flex items-baseline gap-2.5">
      <span className="min-w-0 flex-1 truncate text-[16px] font-medium">{label}</span>
      <span className="whitespace-nowrap text-[12.5px] font-semibold text-ink-3" style={{ color: noteFg }}>{note}</span>
      <span className={cx(NUM, "min-w-20 flex-none whitespace-nowrap text-right text-[19px] font-bold")}>{amount}</span>
    </div>
    <div className="h-1 overflow-hidden rounded-xs bg-bar-track"><div className="h-full rounded-xs" style={{ width, background: color }} /></div>
  </div>
);

// A pushed screen with the period switch on the right of its back bar.
const RangeScreen = ({ v, title, children }: { v: V; title: ReactNode; children: ReactNode }) => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <div className="flex min-h-13 flex-none items-center gap-0.5 py-0.5 pr-4 pl-2">
      <IconBtn d={P.back} label="Back" onClick={v.leaksBack} />
      <span className="min-w-0 flex-1 truncate pl-1 font-display text-[18px] font-bold leading-[1.2]">{title}</span>
      <Ranges v={v} />
    </div>
    <div className="flex flex-1 flex-col gap-10 overflow-auto px-5 pt-2 pb-10">{children}</div>
  </div>
);

export function Insights({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center justify-between gap-3 px-5 py-2">
        <span className="min-w-0 truncate font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.insights}</span>
        <Ranges v={v} />
      </div>
      <div className="flex flex-1 flex-col gap-10 overflow-auto px-5 pt-2 pb-26">

        <div className="flex flex-col gap-1.5 pt-2.5">
          <span className="text-[14px] font-semibold text-ink-2">{v.keptHeadLabel}</span>
          <Hero value={v.keptBig} fs={v.keptFs} fg={v.keptFg} />
          <span className="text-pretty text-[15px] font-medium leading-[1.45] text-ink-2">{v.keptSentence}</span>
          <div className="mt-4.5 grid grid-cols-2 gap-4 border-t border-line pt-4">
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

        <button onClick={v.toLeaks} className="press -mt-3.5 flex min-h-17 items-center gap-3.5 rounded-2xl bg-tint-w py-2.5 pr-3.5 pl-4 text-left">
          <Icon d={DROP} size={22} sw={1.9} className="text-warn-ink" />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[13px] font-semibold text-warn-ink">{v.leakHeadLabel}</span>
            <span className={cx(NUM, "whitespace-nowrap text-[24px] font-extrabold leading-[1.15]")}>{v.leakAmtLabel}</span>
          </div>
          <div className="flex flex-none flex-col items-end gap-px">
            <span className="text-[12.5px] text-ink-2">Potential savings</span>
            <span className={cx(NUM, "whitespace-nowrap text-[18px] font-bold text-pos")}>{v.leakCutLabel}</span>
          </div>
          <Chevron />
        </button>

        <Section title="Savings" action={<HeadLink onClick={v.toGoal}>{v.t.goals}</HeadLink>}>
          <div className="flex flex-col gap-1 pt-1 pb-1.5">
            <span className="text-[13px] text-ink-3">{v.savAcctLine}</span>
            <Hero value={v.savPotBig} fs="44px" />
          </div>
          <div className="relative pt-5.5 pb-2">
            <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[12px] font-bold" style={{ left: v.baseLeft }}>Baseline</span>
            <div className="flex h-3 overflow-hidden rounded-md bg-bar-track">
              <div className="h-full bg-navy" style={{ width: v.savBaseW }} />
              <div className="h-full bg-pos" style={{ width: v.savSurW }} />
            </div>
            <div className="absolute top-4.25 bottom-0.75 -ml-px w-0.5 rounded-xs bg-ink" style={{ left: v.baseLeft }} />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1.5">
            <Stat label={<><Dot color="var(--navy)" />Baseline</>} value={v.savBaseLabel} className="text-[24px] leading-[1.2]" />
            <div className="flex min-w-0 flex-col items-end gap-0.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"><Dot color={v.savSurFg} />{v.savSurWord}</span>
              <span className={cx(NUM, "whitespace-nowrap text-[24px] font-extrabold leading-[1.2]")} style={{ color: v.savSurFg }}>{v.savSurLabel}</span>
            </div>
          </div>
          <span className="text-pretty pt-3 text-[14px] leading-normal text-ink-2">{v.savLine}</span>
          <button onClick={v.toggleSavExplain} className={cx(ROW_TOP, "mt-3.5 flex min-h-13 items-center justify-between")}>
            <span className="text-[15px] font-semibold">How the baseline works</span>
            <Icon d={P.expand} size={18} sw={2.2} className={cx("text-ink-3 transition-transform duration-200", v.savExplain && "rotate-180")} />
          </button>
          {v.savExplain && (
            <div className="flex flex-col gap-3 pb-1">
              <span className="text-pretty text-[14px] leading-[1.6] text-ink-2">{v.savExplainLine}</span>
              <div className="flex flex-col">
                {v.savSteps.map((x: V, i: number) => (
                  <div key={i} className={cx(ROW_TOP, "flex min-h-12.5 items-center gap-3")}>
                    <span className="flex size-5.5 flex-none items-center justify-center rounded-full bg-surface-2 font-display text-[12px] font-bold text-ink-2">{x.n}</span>
                    <span className="min-w-0 flex-1 text-[14.5px] leading-[1.35]">{x.label}</span>
                    <span className={cx(NUM, "whitespace-nowrap text-[17px] font-bold")} style={{ color: x.fg }}>{x.value}</span>
                  </div>
                ))}
                <button onClick={v.toBaseline} className={cx(ROW_TOP, "flex min-h-13 items-center gap-3")}>
                  <span className="flex-1 text-left text-[15px] font-semibold">Change baseline</span>
                  <span className="text-[14px] text-ink-3">{v.savBaseLabel}</span>
                  <Chevron />
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title={v.whereTitle}>
          <div className="flex flex-col gap-3 pt-1 pb-4.5">
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px] bg-bar-track">
              {v.splitRows.map((g: V, i: number) => <div key={i} className="h-full" style={{ width: g.width, background: g.color }} />)}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {v.splitRows.map((g: V, i: number) => (
                <div key={i} className="flex min-w-0 flex-col gap-0.5">
                  <span className={cx(NUM, "text-[28px] font-extrabold leading-[1.1]")}>{g.pct}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2"><Dot color={g.color} />{g.label}</span>
                </div>
              ))}
            </div>
          </div>
          {v.catRowsShown.map((c: V, i: number) => <BarLine key={i} label={c.label} note={c.dWord} noteFg={c.dFg} amount={c.amount} width={c.width} color={c.color} />)}
          {v.catMore && (
            <button onClick={v.toggleCatsAll} className={cx(ROW_TOP, "flex min-h-12 items-center text-[14px] font-semibold text-action")}>{v.catMoreLabel}</button>
          )}
        </Section>

      </div>
    </div>
  );
}

const DROP = "M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10Z";

// Every deposit or every spend behind the Insights Income / Expenses figure.
export function Flow({ v }: { v: V }) {
  return (
    <RangeScreen v={v} title={v.flowName}>
      <div className="flex flex-col gap-1 pt-2.5">
        <span className="text-[14px] font-semibold text-ink-2">{v.flowHeadLabel}</span>
        <Hero value={v.flowBig} fg={v.flowBigFg} />
        {v.flowSub && <span className="text-[14px]" style={{ color: v.flowSubFg }}>{v.flowSub}</span>}
      </div>
      <Section title={v.flowListTitle} action={<span className="text-[13px] text-ink-3">{v.flowCount}</span>}>
        {v.flowRows.map((r: V, i: number) => <TxCard key={i} r={r} />)}
        {v.flowEmptyLine && <span className={cx(ROW_TOP, "flex min-h-15 items-center text-[14px] text-ink-3")}>{v.flowEmptyLine}</span>}
      </Section>
    </RangeScreen>
  );
}

// Spending outside the necessities: how much, what a third less would keep, where and when it goes.
export function Leaks({ v }: { v: V }) {
  return (
    <RangeScreen v={v} title={v.t.leaks}>
      <div className="flex flex-col gap-1.5 pt-2.5">
        <span className="text-[14px] font-semibold text-ink-2">{v.leakHeadLabel}</span>
        <Hero value={v.leakBig} fs={v.leakFs} fg="var(--warnInk)" />
        <span className="text-pretty text-[15px] font-medium leading-[1.45] text-ink-2">{v.leakSentence}</span>
        <div className="mt-4.5 grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Stat label="Potential savings" value={v.leakCutLabel} fg="var(--pos)" className="text-[28px] leading-[1.15]">
            <span className="text-[13px] leading-[1.4] text-ink-3">if you cut leaks by a third</span>
          </Stat>
          <Stat label="Leaks per day" value={v.leakPerDay} className="text-[28px] leading-[1.15]">
            <span className="text-[13px] leading-[1.4] text-ink-3">{v.leakPerDayMeta}</span>
          </Stat>
        </div>
      </div>

      <Section title="By category">
        {v.leaksNone && (
          <div className={cx(ROW_TOP, "flex min-h-14 items-center gap-2.5 text-[15px] font-medium text-pos")}>
            <Icon d={P.check} size={18} sw={2.4} />{v.leaksNoneLabel}
          </div>
        )}
        {v.leakRows.map((l: V, i: number) => <BarLine key={i} label={l.label} note={l.per} amount={l.amount} width={l.width} color="var(--warn)" />)}
      </Section>

      {v.leakTxRows.length > 0 && (
        <Section title="Leak spends" action={<span className="text-[13px] text-ink-3">{v.leakTxCount}</span>}>
          {v.leakTxRows.map((r: V, i: number) => <TxCard key={i} r={r} />)}
        </Section>
      )}

      <Section title="Patterns">
        <div className={cx(ROW_TOP, "grid grid-cols-2 gap-4 pt-3.5")}>
          {v.leakStats.map((m: V, i: number) => (
            <div key={i} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] text-ink-3">{m.label}</span>
              <span className={cx(NUM, "truncate text-[24px] font-extrabold leading-[1.2]")}>{m.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <button onClick={v.toEssEdit} className="press flex min-h-16 items-center gap-3.5 border-y border-line text-left">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-medium">What counts as a leak</span>
          <span className="truncate text-[13px] leading-[1.4] text-ink-3">{v.leakWhatLine}</span>
        </div>
        <Chevron />
      </button>
    </RangeScreen>
  );
}

// The savings baseline: the cushion goals never touch. Also the last setup step before sync.
export function Baseline({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.baseBack} title="Savings baseline" />
      <div className="flex flex-1 flex-col gap-7.5 overflow-auto px-5 pt-1 pb-6">
        <div className="flex flex-col gap-2">
          {v.baseSetupMode && <span className="text-[13px] font-semibold text-action">Last step before sync</span>}
          <span className="text-pretty text-[15px] leading-[1.55] text-ink-2">The cushion you keep untouched for emergencies. Thaili protects it first — goals only get money above it.</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-ink-3">Your baseline</span>
          <Hero value={v.baseDraftBig} fs="60px" rs="text-[26px]" />
          <span className="text-pretty text-[14px] leading-normal" style={{ color: v.baseStatusFg }}>{v.baseStatus}</span>
        </div>
        <Section title="How to set it">
          {v.baseOptions.map((o: V, i: number) => (
            <button key={i} onClick={o.tap} className={cx(ROW_TOP, "press flex min-h-17 items-center gap-3.5 text-left")}>
              <span className="flex size-5.5 flex-none items-center justify-center rounded-full border-2" style={{ borderColor: o.ring }}>
                <span className="size-2.5 rounded-full" style={{ background: o.dot }} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-medium leading-[1.3]">{o.label}</span>
                <span className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-3">
                  {o.rec && <span className="flex h-5 items-center rounded-[10px] bg-tint-g px-2 text-[11.5px] font-bold text-pos">Suggested</span>}{o.meta}
                </span>
              </div>
              <span className={cx(NUM, "whitespace-nowrap text-[17px] font-bold")}>{o.amount}</span>
            </button>
          ))}
          {v.baseIsCustom && (
            <div className={cx(ROW_TOP, "flex min-h-16 items-center gap-2.5")}>
              <span className="flex-1 text-[14px] text-ink-3">Adjust by Rs 10,000</span>
              <Stepper onClick={v.baseDown}>−</Stepper>
              <Stepper onClick={v.baseUp}>+</Stepper>
            </div>
          )}
        </Section>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-2 px-4 py-3.5">
          <span className="text-[13px] font-bold text-ink-2">Where the essentials figure comes from</span>
          <span className="text-pretty text-[13.5px] leading-[1.55] text-ink-2">{v.baseBasisLine}</span>
        </div>
      </div>
      <div className="flex-none px-5 pt-3 pb-5.5">
        <Cta onClick={v.baseSave} bg="var(--action)" fg="var(--onAction)" className="min-h-13 text-[15.5px]">{v.baseCta}</Cta>
      </div>
    </div>
  );
}
