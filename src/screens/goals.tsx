// The savings floor, the goals it funds, and the new-goal form.
import { Bar, Btn, CARD, Chips, Icon, IconBtn, LABEL, P, Seg, Stepper, TopBar, cx, type V } from "@/components/ui";

const SQUARE = "flex size-[44px] flex-none items-center justify-center rounded-xl border border-line bg-surface-2";

export function Goals({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.goalsBack} title={v.t.goals}>
        <IconBtn d={P.plus} label="New goal" onClick={v.toGoalNew} className="text-action" />
      </TopBar>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-5 pb-8">
        <div className={cx(CARD, "flex flex-col gap-3 px-5 py-5")}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={LABEL}>Savings baseline</span>
            <span className="flex-none text-[13px] font-bold" style={{ color: v.floorStateFg }}>{v.floorState}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[32px] font-extrabold leading-none tracking-[-0.025em]">{v.savingsPotLabel}</span>
            <span className="text-[13px] text-ink-3">of {v.savingsGoalLabel}</span>
          </div>
          <Bar width={v.floorWidth} color={v.floorBar} className="h-[10px] rounded-[5px]" />
          <div className="truncate text-[13px] text-ink-3">{v.savingsFrom}</div>
          <div className="mt-0.5 h-px bg-line" />
          <span className={LABEL}>How the surplus is shared</span>
          <Seg items={v.splitModes} itemClass="flex-1 rounded-[8px] p-2 text-center text-[13px]" />
          <div className="flex items-center gap-2 pt-0.5">
            <span className="flex-1 text-[13px] text-ink-3">Move the baseline</span>
            <Stepper onClick={v.savingsDown} small>−</Stepper>
            <Stepper onClick={v.savingsUp} small>+</Stepper>
          </div>
        </div>

        {v.hasSurplus && (
          <div className="flex flex-col gap-3 rounded-card bg-tint-g px-5 py-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold text-pos">Surplus {v.surplusLabel}</span>
              <span className="flex-none text-[13px] font-semibold text-ink-2">{v.surplusFreeLabel}</span>
            </div>
            <div className="flex h-[14px] overflow-hidden rounded-[5px] bg-bar-track">
              {v.surplusSegments.map((g: V, i: number) => <div key={i} className="h-full border-r-2 border-tint-g" style={{ width: g.width, background: g.color }} />)}
            </div>
            {v.surplusSegments.map((g: V, i: number) => (
              <div key={i} className="flex items-baseline justify-between text-[13px]">
                <span className="flex items-center gap-2 text-ink-2"><span className="size-[8px] rounded-full" style={{ background: g.color }} />{g.name}</span>
                <span className="font-display font-semibold">{g.amount}</span>
              </div>
            ))}
          </div>
        )}

        {v.goalCards.map((g: V, i: number) => (
          <div key={i} className={cx(CARD, "flex flex-col gap-3 px-5 py-5")}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="flex-none font-display text-[12px] font-bold text-ink-3">{g.rank}</span>
                <span className="min-w-0 truncate text-[15px] font-semibold leading-[1.3]">{g.name}</span>
                <span className="flex-none rounded-md bg-surface-2 px-2 py-1 text-[13px] font-semibold text-ink-2">{g.shareBadge}</span>
              </span>
              <span className="flex-none text-[13px] font-bold" style={{ color: g.paceFg }}>{g.pace}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.025em]">{g.got}</span>
              <span className="text-[13px] text-ink-3">of {g.target}</span>
            </div>
            <Bar width={g.width} color={g.bar} className="h-[9px] rounded-[5px]" />
            <div className="flex items-center justify-between gap-3 text-[12px] text-ink-2">
              <span className="min-w-0 truncate">{g.by}</span>
              <span className="flex-none whitespace-nowrap text-right">{g.need}</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <button onClick={g.up} aria-label="Move up" className={SQUARE} style={{ color: g.upFg }}><Icon d={P.arrowUp} size={19} /></button>
              <button onClick={g.down} aria-label="Move down" className={SQUARE} style={{ color: g.downFg }}><Icon d={P.arrowDown} size={19} /></button>
              <button onClick={g.remove} aria-label="Delete goal" className={cx(SQUARE, "ml-auto text-action")}><Icon d={P.trash} size={19} /></button>
            </div>
          </div>
        ))}

        {v.noGoals && (
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-bar-dim px-6 py-6">
            <span className="font-display text-[20px] font-bold leading-[1.3]">No goals yet</span>
            <Btn onClick={v.toGoalNew}>Create your first goal</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export function GoalNew({ v }: { v: V }) {
  return (
    <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={e => { e.preventDefault(); v.goalCreate(); }}>
      <TopBar onBack={v.goalCancel} icon={P.close} label="Cancel goal" title={v.t.newGoal} />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-5 pt-3 pb-6">
        <label className="field">Goal name
          <input value={v.goalDraftName} onChange={v.goalNameType} maxLength={60} autoComplete="off" enterKeyHint="next" placeholder="What are you saving for?" required />
        </label>
        <label className="flex flex-col gap-2 rounded-[20px] bg-surface-2 p-5">
          <span className="text-[14px] text-ink-2">Target amount</span>
          <span className="flex min-w-0 items-baseline gap-2"><span className="font-display text-[22px] text-ink-3">Rs</span><input aria-label="Target amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={v.goalAmount} onChange={v.goalAmountType} className="min-w-0 w-full bg-transparent font-display text-[44px] font-bold tabular-nums outline-none" /></span>
        </label>
        <p className="text-[14px] text-ink-2">{v.goalNeedLine}</p>
        <div className="flex flex-col gap-3"><span className="text-[14px] font-semibold text-ink-2">Funding priority</span><Chips items={v.goalPosChips} className="px-0" /></div>
        {v.goalError && <p role="alert" className="text-[14px] text-action">{v.goalError}</p>}
      </div>
      <div className="flex-none border-t border-line bg-canvas px-5 py-4">
        <button type="submit" disabled={!v.goalReady} className="press flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-action px-4 py-3 text-center text-[16px] font-semibold text-on-action">Create goal</button>
      </div>
    </form>
  );
}
