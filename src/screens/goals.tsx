// The savings floor, the goals it funds, and the new-goal form.
import { AmountEntry, Bar, Btn, CARD, Chips, Cta, Icon, IconBtn, Keypad, LABEL, P, Seg, Stepper, TopBar, cx, type V } from "@/components/ui";

const SQUARE = "flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2";

export function Goals({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.goalsBack} title={v.t.goals}>
        <IconBtn d={P.plus} label="New goal" onClick={v.toGoalNew} className="text-action" />
      </TopBar>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-24">
        <div className={cx(CARD, "flex flex-col gap-3 px-5 py-4.5")}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={LABEL}>Savings floor</span>
            <span className="flex-none text-[12.5px] font-bold" style={{ color: v.floorStateFg }}>{v.floorState}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">{v.savingsPotLabel}</span>
            <span className="text-[13px] text-ink-3">of {v.savingsGoalLabel}</span>
          </div>
          <Bar width={v.floorWidth} color={v.floorBar} className="h-2.5 rounded-[5px]" />
          <div className="truncate text-[12.5px] text-ink-3">{v.savingsFrom}</div>
          <div className="mt-0.5 h-px bg-line" />
          <span className={LABEL}>How the surplus is shared</span>
          <Seg items={v.splitModes} itemClass="flex-1 rounded-[9px] p-2 text-center text-[12.5px]" />
          <div className="flex items-center gap-2.25 pt-0.5">
            <span className="flex-1 text-[12.5px] text-ink-3">Move the floor</span>
            <Stepper onClick={v.savingsDown} small>−</Stepper>
            <Stepper onClick={v.savingsUp} small>+</Stepper>
          </div>
        </div>

        {v.hasSurplus && (
          <div className="flex flex-col gap-2.75 rounded-card bg-tint-g px-5 py-4.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14.5px] font-semibold text-pos">Surplus {v.surplusLabel}</span>
              <span className="flex-none text-[12.5px] font-semibold text-ink-2">{v.surplusFreeLabel}</span>
            </div>
            <div className="flex h-3.5 overflow-hidden rounded-[5px] bg-bar-track">
              {v.surplusSegments.map((g: V, i: number) => <div key={i} className="h-full border-r-2 border-tint-g" style={{ width: g.width, background: g.color }} />)}
            </div>
            {v.surplusSegments.map((g: V, i: number) => (
              <div key={i} className="flex items-baseline justify-between text-[12.5px]">
                <span className="flex items-center gap-2 text-ink-2"><span className="size-2 rounded-full" style={{ background: g.color }} />{g.name}</span>
                <span className="font-display font-semibold">{g.amount}</span>
              </div>
            ))}
          </div>
        )}

        {v.goalCards.map((g: V, i: number) => (
          <div key={i} className={cx(CARD, "flex flex-col gap-2.75 px-5 py-4.5")}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="flex-none font-display text-[12px] font-bold text-ink-3">{g.rank}</span>
                <span className="min-w-0 truncate text-[15px] font-semibold leading-[1.3]">{g.name}</span>
                <span className="flex-none rounded-md bg-surface-2 px-1.75 py-0.75 text-[13px] font-semibold text-ink-2">{g.shareBadge}</span>
              </span>
              <span className="flex-none text-[12.5px] font-bold" style={{ color: g.paceFg }}>{g.pace}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[30px] font-extrabold leading-none tracking-[-0.025em]">{g.got}</span>
              <span className="text-[13px] text-ink-3">of {g.target}</span>
            </div>
            <Bar width={g.width} color={g.bar} className="h-2.25 rounded-[5px]" />
            <div className="flex items-center justify-between gap-3 text-[12px] text-ink-2">
              <span className="min-w-0 truncate">{g.by}</span>
              <span className="flex-none whitespace-nowrap text-right">{g.need}</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span onClick={g.up} aria-label="Move up" className={SQUARE} style={{ color: g.upFg }}><Icon d={P.arrowUp} size={19} /></span>
              <span onClick={g.down} aria-label="Move down" className={SQUARE} style={{ color: g.downFg }}><Icon d={P.arrowDown} size={19} /></span>
              <span onClick={g.remove} aria-label="Delete goal" className={cx(SQUARE, "ml-auto text-action")}><Icon d={P.trash} size={19} /></span>
            </div>
          </div>
        ))}

        {v.noGoals && (
          <div className="flex flex-col items-start gap-2.5 rounded-card border border-dashed border-bar-dim px-5.5 py-6.5">
            <span className="font-display text-[20px] font-bold leading-[1.3]">No goals yet</span>
            <Btn onClick={v.toGoalNew}>Create your first goal</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export function GoalNew({ v }: { v: V }) {
  const heading = "px-5 text-[13px] font-semibold text-ink-3";
  return (
    <div className="flex flex-1 flex-col overflow-hidden pt-2 pb-5.5">
      <TopBar onBack={v.goalCancel} icon={P.close} label="Cancel" title={v.t.newGoal} />
      <div className="flex flex-1 flex-col overflow-auto">
        <AmountEntry value={v.goalAmtLabel} fg={v.goalAmtFg} className="text-[54px]" caret="h-10" />
        <div className="px-5 pt-1.5 text-[12px] text-ink-3">{v.goalNeedLine}</div>
        <div className={cx(heading, "pt-3.5")}>What for</div>
        <Chips items={v.goalNameChips} />
        <div className={cx(heading, "pt-4")}>Where in the line</div>
        <Chips items={v.goalPosChips} />
      </div>
      <Keypad keys={v.goalKeys} />
      <div className="flex-none px-4 pt-3">
        <Cta onClick={v.goalCreate} bg={v.goalCtaBg} fg={v.goalCtaFg} className="p-4 text-[15.5px]">{v.goalCta}</Cta>
      </div>
    </div>
  );
}
