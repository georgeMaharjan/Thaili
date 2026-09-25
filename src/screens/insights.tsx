// Insights: Overview, Categories and Leaks for today, this week or this BS month.
import { Amount, BarRow, CARD, CardHead, Icon, IconBtn, ItemRow, ListCard, P, Seg, Tile, cx, type V } from "@/components/ui";

export function Insights({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3 px-5 pt-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.insights}</span>
          <Seg items={v.ranges} className="flex-none rounded-xl" itemClass="flex h-8 items-center whitespace-nowrap rounded-[9px] px-2.75 text-[12.5px]" />
        </div>
        <div className="flex rounded-xl bg-surface-2 p-0.75">
          {v.insTabs.map((tb: V, i: number) => (
            <span key={i} onClick={tb.tap} style={{ background: tb.bg, color: tb.fg, boxShadow: tb.shadow }}
              className="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-semibold">
              <Icon d={tb.icon} size={16} /><span className="min-w-0 truncate">{tb.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-24">
        {v.insBrief && <Overview v={v} />}
        {v.insSpend && <Categories v={v} />}
        {v.insLeaks && <Leaks v={v} />}
      </div>
    </div>
  );
}

const DeltaChip = ({ d }: { d: V }) => (
  <span className="flex h-7 flex-none items-center gap-1 whitespace-nowrap rounded-xl px-2.5 text-[13px] font-bold" style={{ background: d.bg, color: d.fg }}>
    <Icon d={d.icon} size={14} sw={2.4} />{d.text}
  </span>
);

const BigRs = ({ value }: { value: string }) => (
  <div className="flex min-w-0 items-baseline gap-2">
    <span className="flex-none font-display text-[22px] font-bold">Rs</span>
    <span className="min-w-0 truncate font-display text-[48px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{value}</span>
  </div>
);

function Overview({ v }: { v: V }) {
  return (<>
    <div className={cx(CARD, "flex flex-col gap-3.5 p-5 shadow-card")}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[13px] font-semibold text-ink-3">{v.spentHeadLabel}</span>
        <span className="flex flex-none items-center gap-2">
          <span className="whitespace-nowrap text-[12px] text-ink-3">{v.vsLabel}</span>
          <DeltaChip d={v.spentChip} />
        </span>
      </div>
      <BigRs value={v.spentBig} />
      <div className="grid grid-cols-3 gap-2 border-t border-line pt-3.5">
        {v.insTrio.map((m: V, i: number) => (
          <div key={i} className="flex min-w-0 items-center gap-2">
            <Tile d={m.icon} tint={m.tint} fg={m.ifg} className="size-8" size={17} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-display text-[17px] font-bold leading-[1.2] tabular-nums">{m.value}</span>
              <span className="truncate text-[12px] leading-[1.3] text-ink-3">{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={cx(CARD, "flex flex-col gap-3.5 px-5 py-4.5")}>
      <CardHead title={v.trendTitle}>
        <span className="flex flex-none items-center gap-1.5 whitespace-nowrap text-[12.5px] text-ink-3">
          <span className="h-0 w-3.5 border-t border-dashed border-bar-dim" />{v.trendAvgShort}
        </span>
      </CardHead>
      <div className="relative flex h-34 items-end gap-2">
        <div className="absolute inset-x-0 h-0 border-t border-dashed border-bar-dim" style={{ bottom: v.trendAvgPos }} />
        {v.trendBars.map((b: V, i: number) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="whitespace-nowrap font-display text-[12.5px] font-semibold" style={{ color: b.valFg }}>{b.value}</span>
            <div className="w-full rounded-t-[5px]" style={{ height: b.h, background: b.color }} />
            <span className="h-3.5 max-w-full truncate text-[12px] leading-3.5" style={{ color: b.labelFg }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>

    <ListCard title={v.topCatsTitle} action={
      <IconBtn d={P.next} label="All categories" onClick={v.toWhere} size={20} sw={2.2} className="-my-2 -mr-3 text-action" />
    }>
      {v.topCats4.map((c: V, i: number) => <BarRow key={i} c={c} />)}
    </ListCard>
  </>);
}

function Categories({ v }: { v: V }) {
  return (<>
    <div className={cx(CARD, "flex flex-col gap-3.5 px-5 py-4.5")}>
      <CardHead title={v.splitTitle} />
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-md bg-bar-track">
        {v.splitRows.map((g: V, i: number) => <div key={i} className="h-full" style={{ width: g.width, background: g.color }} />)}
      </div>
      <div className="flex flex-col gap-2.5">
        {v.splitRows.map((g: V, i: number) => (
          <div key={i} className="flex min-h-6 items-center gap-2.5">
            <Icon d={g.icon} size={18} style={{ color: g.ifg }} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{g.label}</span>
            <span className="flex-none text-[12.5px] font-semibold text-ink-3">{g.pct}</span>
            <Amount className="w-22 text-right text-[15px]">{g.amount}</Amount>
          </div>
        ))}
      </div>
    </div>

    <ListCard title={v.catsTitle}>
      {v.catRows.map((c: V, i: number) => (
        <BarRow key={i} c={c}>
          <span className="flex flex-none items-center gap-0.5 whitespace-nowrap text-[12px] font-bold" style={{ color: c.dFg }}>
            <Icon d={c.dIcon} size={13} sw={2.4} />{c.dText}
          </span>
        </BarRow>
      ))}
    </ListCard>

    <ListCard title={v.t.accounts}>
      {v.sourceRows.map((s: V, i: number) => (
        <ItemRow key={i} look={s} title={s.name} sub={s.meta} onClick={s.tap} className="min-h-15 border-t border-line" right={<Amount>{s.balance}</Amount>} />
      ))}
      <div onClick={v.toSrcNew} className="flex min-h-15 cursor-pointer items-center gap-3 border-t border-line text-action">
        <span className="flex size-9 flex-none items-center justify-center rounded-xl border-[1.5px] border-dashed border-bar-dim"><Icon d={P.plus} size={18} /></span>
        <span className="truncate text-[14px] font-semibold">{v.t.addAccount}</span>
      </div>
    </ListCard>
  </>);
}

function Leaks({ v }: { v: V }) {
  return (<>
    <div className="flex flex-col gap-3.5 rounded-card border border-warn bg-tint-w p-5 shadow-card">
      <div className="flex items-center gap-2.5">
        <Tile d={v.leakIcon} className="size-8 bg-surface text-warn-ink" size={17} sw={2} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-warn-ink">{v.leakHeadLabel}</span>
        <IconBtn d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" label="What counts as a leak" onClick={v.toEssEdit} size={20} className="-my-2 -mr-2.5 text-warn-ink" />
      </div>
      <BigRs value={v.leakBig} />
      <div className="flex flex-wrap items-center gap-2">
        <DeltaChip d={v.leakChip} />
        <span className="whitespace-nowrap text-[12px] text-ink-3">{v.vsLabel}</span>
        <span className="ml-auto flex h-7 flex-none items-center gap-1.25 whitespace-nowrap rounded-xl bg-surface px-2.5 text-[13px] font-bold text-ink-2">
          <Icon d={v.pieIcon} size={14} sw={2.2} />{v.leakShareLabel}
        </span>
      </div>
    </div>

    {v.leaksNone && (
      <div className="flex min-h-16 items-center gap-3 rounded-card border border-dashed border-bar-dim px-5 text-[13.5px] font-semibold text-pos">
        <Icon d={P.check} size={20} sw={2.4} /><span className="min-w-0 truncate">{v.leaksNoneLabel}</span>
      </div>
    )}

    <ListCard title={v.catsTitle}>
      {v.leakRows2.map((l: V, i: number) => (
        <BarRow key={i} c={l}><span className="flex-none whitespace-nowrap text-[12px] text-ink-3">{l.per}</span></BarRow>
      ))}
    </ListCard>

    <div className="grid grid-cols-2 gap-3">
      {v.leakStats.map((m: V, i: number) => (
        <div key={i} className={cx(CARD, "flex min-w-0 flex-col gap-2.5 p-4")}>
          <Tile d={m.icon} tint={m.tint} fg={m.ifg} className="size-8" size={17} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display text-[20px] font-bold leading-[1.2] tabular-nums">{m.value}</span>
            <span className="truncate text-[12.5px] leading-[1.35] text-ink-3">{m.label}</span>
          </div>
        </div>
      ))}
    </div>

    <ListCard title={v.biggestTitle}>
      {v.topSpends.map((x: V, i: number) => (
        <ItemRow key={i} look={x} title={x.title} sub={x.meta} onClick={x.tap} className="min-h-15 border-t border-line" right={<Amount>{x.amount}</Amount>} />
      ))}
    </ListCard>
  </>);
}
