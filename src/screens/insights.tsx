// Insights: one calm scroll for today, this week or this BS month — total, trend, where it went, leaks, biggest spends.
import type { ReactNode } from "react";
import { HeadLink, Icon, P, Section, Seg, TxLine, cx, type V } from "@/components/ui";

const NUM = "font-display tabular-nums";
const ROW_TOP = "border-t border-line";

// A labelled number in a stat row.
const Stat = ({ m, className }: { m: V; className: string }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-[13px] text-ink-3">{m.label}</span>
    <span className={cx(NUM, "truncate font-extrabold", className)} style={{ color: m.vfg }}>{m.value}</span>
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

export function Insights({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center justify-between gap-3 px-5 py-2">
        <span className="min-w-0 truncate font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.insights}</span>
        <Seg items={v.ranges} className="flex-none rounded-xl" itemClass="flex h-8.5 items-center whitespace-nowrap rounded-[9px] px-3 text-[13px]" />
      </div>
      <div className="flex flex-1 flex-col gap-11 overflow-auto px-5 pt-2 pb-26">

        <div className="flex flex-col gap-1.5 pt-2.5">
          <span className="text-[14px] font-medium text-ink-2">{v.spentHeadLabel}</span>
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="flex-none font-display text-[28px] font-bold">Rs</span>
            <span className={cx(NUM, "min-w-0 truncate text-[76px] font-extrabold leading-[.95] tracking-[-0.03em]")}>{v.spentBig}</span>
          </div>
          {v.spentSentence && <span className="text-[17px] font-semibold leading-[1.4]" style={{ color: v.spentChip.fg }}>{v.spentSentence}</span>}
          <div className="mt-5 grid grid-cols-3 border-t border-line pt-4">
            {v.insTrio.map((m: V, i: number) => <Stat key={i} m={m} className="text-[28px] leading-[1.1] tracking-[-0.01em]" />)}
          </div>
        </div>

        <Section title={v.trendTitle} action={
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-3">
            <span className="h-0 w-3.5 border-t border-dashed border-ink-3" />{v.trendAvgShort}
          </span>
        }>
          <div className="relative mt-2 flex h-35 items-end gap-2.5">
            <div className="absolute inset-x-0 h-0 border-t border-dashed border-bar-dim" style={{ bottom: v.trendAvgPos }} />
            {v.trendBars.map((b: V, i: number) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="whitespace-nowrap font-display text-[18px] font-extrabold" style={{ color: b.valFg }}>{b.value}</span>
                <div className="w-full rounded-t-md rounded-b-xs" style={{ height: b.h, background: b.color }} />
                <span className="h-3.5 max-w-full truncate text-[12px] leading-3.5" style={{ color: b.labelFg }}>{b.label}</span>
              </div>
            ))}
          </div>
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
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2">
                    <span className="size-2 flex-none rounded-full" style={{ background: g.color }} />{g.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {v.catRowsShown.map((c: V, i: number) => <BarLine key={i} label={c.label} note={c.dWord} noteFg={c.dFg} amount={c.amount} width={c.width} color={c.color} />)}
          {v.catMore && (
            <button onClick={v.toggleCatsAll} className={cx(ROW_TOP, "flex min-h-12 items-center text-[14px] font-semibold text-action")}>{v.catMoreLabel}</button>
          )}
        </Section>

        <Section title={v.t.leaks} action={
          <HeadLink onClick={v.toEssEdit}>{v.leakEditLabel}</HeadLink>
        }>
          <div className="flex flex-col gap-1 pt-1 pb-4">
            <div className="flex items-baseline gap-1.5 text-warn-ink">
              <span className="font-display text-[24px] font-bold">Rs</span>
              <span className={cx(NUM, "text-[52px] font-extrabold leading-none tracking-[-0.02em]")}>{v.leakBig}</span>
            </div>
            <span className="text-pretty text-[16px] font-medium leading-[1.45] text-ink-2">{v.leakSentence}</span>
          </div>
          {v.leaksNone && (
            <div className={cx(ROW_TOP, "flex min-h-14 items-center gap-2.5 text-[15px] font-medium text-pos")}>
              <Icon d={P.check} size={18} sw={2.4} />{v.leaksNoneLabel}
            </div>
          )}
          {v.leakRowsTop.map((l: V, i: number) => <BarLine key={i} label={l.label} note={l.per} amount={l.amount} width={l.width} color="var(--warn)" />)}
          <div className={cx(ROW_TOP, "grid grid-cols-2 gap-4 pt-3.5")}>
            {v.leakStats.map((m: V, i: number) => <Stat key={i} m={m} className="text-[24px] leading-[1.2]" />)}
          </div>
        </Section>

        <Section title={v.biggestTitle}>
          {v.topSpends.map((x: V, i: number) => <TxLine key={i} r={x} />)}
        </Section>

      </div>
    </div>
  );
}
