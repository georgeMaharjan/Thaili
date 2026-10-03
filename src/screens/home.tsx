// Home, the Needs-review card stack, the weekly review and quick add.
import {
  AmountEntry, Bar, Btn, CARD, Chevron, Chip, Chips, Cta, HeadLink, HeaderActions, Hero, Icon, IconBtn, Keypad,
  LABEL, P, Pull, Section, TopBar, TxCard, cx, type V,
} from "@/components/ui";

export function Home({ v }: { v: V }) {
  const big = "font-display font-extrabold tabular-nums";
  const strip = "press flex min-h-14 items-center gap-3 rounded-2xl pr-3.5 pl-4 text-left";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-13 flex-none items-center justify-between py-1 pr-2 pl-5">
        <div className="flex items-center gap-2.25">
          <span className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-brand">
            <img src="./thaili-mark-line.png" alt="Thaili" className="block h-5.25 w-4 object-contain" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-[17px] font-bold leading-[1.15]">{v.bsMonth}</span>
            <span className="text-[12px] leading-[1.2] text-ink-3">{v.adRange}</span>
          </div>
        </div>
        <HeaderActions v={v} />
      </div>

      <Pull onRefresh={v.syncPull} className="flex-1">
      <div className="flex flex-col gap-8 px-5 pt-1 pb-26">
        <div className="flex flex-col gap-7 pt-4.5">
          <button onClick={v.toAccounts} className="press flex flex-col gap-1.5 text-left">
            <span className="flex items-center justify-between gap-3 text-[15px] font-semibold text-ink-2">{v.haveLabel}<Chevron /></span>
            <Hero value={v.totalBal} fs={v.balFs} />
            <span className="text-[14px] leading-normal text-ink-3">{v.haveMeta}</span>
          </button>

          <button onClick={v.toAccounts} className="press flex flex-col gap-3.5 text-left">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-bold text-ink-2">{v.budgetTitle}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-3">{v.dayOfLine}<Chevron /></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] text-ink-3">{v.spentWord}</span>
                <span className={cx(big, "whitespace-nowrap leading-[1.1] tracking-[-0.01em]")} style={{ fontSize: v.budgetFs }}>{v.homeSpent}</span>
              </div>
              <div className="flex min-w-0 flex-col items-end gap-0.5">
                <span className="text-[13px] text-ink-3">{v.leftWord}</span>
                <span className={cx(big, "whitespace-nowrap leading-[1.1] tracking-[-0.01em]")} style={{ color: v.leftFg, fontSize: v.budgetFs }}>{v.homeLeft}</span>
              </div>
            </div>
            <Bar width={v.targetWidth} color={v.budgetBar} className="h-2.5 rounded-[5px]" />
            <span className="text-[14px] leading-[1.45] text-ink-2">{v.budgetLine}</span>
          </button>

          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5">
            <Icon d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" sw={1.9} style={{ color: v.allowFg }} />
            <span className="min-w-0 flex-1 text-[15px] leading-[1.45]">
              {v.suggestLead}<span className="font-display text-[20px] font-extrabold" style={{ color: v.allowFg }}>{v.suggestAmt}</span>{v.suggestTail}
            </span>
          </div>
        </div>

        {(v.hasReview || v.weeklyDue) && <div className="-mt-2 flex flex-col gap-3">
            {v.hasReview && (
              <button onClick={v.toReviewStack} className={cx(strip, "bg-tint-u")}>
                <span className="flex h-6 min-w-6 flex-none items-center justify-center rounded-xl bg-uncat px-1.75 font-display text-[13px] font-bold text-canvas">{v.reviewCount}</span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.35]">{v.homeReviewLine}</span>
                <Icon d={P.next} size={16} sw={2.2} className="text-uncat" />
              </button>
            )}
            {v.weeklyDue && (
              <button onClick={v.toWeekly} className={cx(strip, "bg-tint-n")}>
                <Icon d="M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4M9 15l2 2 4-4" size={20} sw={1.9} className="text-navy" />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[15px] font-semibold leading-[1.35]">{v.weeklyLine}</span>
                  {v.weeklyMeta && <span className="text-[13px] leading-[1.35] text-ink-3">{v.weeklyMeta}</span>}
                </span>
                <Icon d={P.next} size={18} sw={2.2} className="text-navy" />
              </button>
            )}
          </div>}

        <Section title={v.t.goals} action={<HeadLink onClick={v.toGoal}>{v.goalsManage}</HeadLink>} className="gap-2.5">
          {v.floorPending && <span className="-mt-1.5 text-pretty text-[13px] leading-normal text-ink-2">{v.floorLine}</span>}
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pt-0.5 pb-1.5 [scrollbar-width:none]">
            {v.homeGoals.map((g: V, i: number) => (
              <button key={i} onClick={g.tap} className="press flex w-47 flex-none items-center gap-2.5 rounded-[14px] border border-line bg-surface py-2.5 pr-3.5 pl-2.5 text-left">
                <span className="flex size-9 flex-none items-center justify-center rounded-full" style={{ background: g.ring }}>
                  <span className="flex size-7.25 items-center justify-center rounded-full bg-surface font-display text-[11px] font-bold" style={{ color: g.pctFg }}>{g.pct}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-semibold leading-[1.3]">{g.name}</span>
                  <span className="truncate text-[13px] leading-[1.35] text-ink-3"><span className="font-display text-[15px] font-bold text-ink">{g.got}</span> / {g.target}</span>
                </span>
              </button>
            ))}
            <button onClick={v.toGoalNew} aria-label="New goal" className="press flex min-h-14 w-14.5 flex-none items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-bar-dim text-action">
              <Icon d={P.plus} size={20} />
            </button>
          </div>
        </Section>

        <Section title={v.t.recent} action={<HeadLink onClick={v.toTxns}>{v.t.seeAll}</HeadLink>}>
          {v.recent.map((t: V, i: number) => <TxCard key={i} r={t} />)}
        </Section>
      </div>
      </Pull>
    </div>
  );
}

export function Stack({ v }: { v: V }) {
  const action = "flex items-center gap-1.5 px-1 py-3 text-[13px] font-semibold";
  const tool = "flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 p-3.25 text-[13px] text-ink-2";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.stackExit} icon={P.close} label="Close" title={v.t.review}>
        <span className="flex-none px-3 text-[12.5px] font-semibold text-ink-3">{v.stackProgress}</span>
      </TopBar>
      {v.stackHasCard && (
        <div className="flex flex-1 flex-col gap-3.5 overflow-auto px-4 pb-6">
          <div className={cx(CARD, "flex flex-col gap-4.5 px-5.5 py-6")}>
            <div className="flex flex-col gap-1.25">
              <span className="font-display text-[52px] font-extrabold leading-none tracking-[-0.03em]">{v.cardAmount}</span>
              <span className="text-[15px] font-semibold text-ink-2">{v.cardMerchant}</span>
              <span className="text-[12px] text-ink-3">{v.cardMeta}</span>
            </div>
            <Chips items={v.cardCats} className="" />
            <div className="flex gap-2.5">
              <button onClick={v.cardNote} className={cx(tool, "min-w-0")}><Icon d={P.note} size={18} /><span className="truncate">{v.cardNoteLabel}</span></button>
              <button onClick={v.cardReceipt} className={tool}><Icon d={P.camera} size={18} />Receipt</button>
            </div>
          </div>
          <div className="flex items-center justify-between px-1.5">
            <button onClick={v.cardSkip} className={cx(action, "text-ink-3")}>Skip<Icon d="M5 12h14M13 6l6 6-6 6" size={16} /></button>
            <button onClick={v.cardOpen} className={cx(action, "text-action")}><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17ZM12 11v5M12 7.8h.01" size={17} />Details</button>
          </div>
        </div>
      )}
      {v.stackDone && (
        <div className="flex flex-1 flex-col justify-center gap-4 px-5.5 pb-7.5">
          <span className="flex size-14 items-center justify-center rounded-card bg-tint-g text-pos"><Icon d={P.check} size={30} sw={2.4} /></span>
          <div className="font-display text-[34px] font-bold leading-[1.15] tracking-[-0.02em]">Nothing left uncategorised</div>
          <Btn onClick={v.stackExit} className="self-start">Back to Home</Btn>
        </div>
      )}
    </div>
  );
}

export function Weekly({ v }: { v: V }) {
  const big = "font-display text-[42px] font-extrabold tracking-[-0.025em]";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3.25 px-5 py-2">
        <div className="flex items-center">
          <IconBtn d={P.close} label="Close" onClick={v.weekClose} className="-ml-3 text-ink" />
          <span className="flex-1 text-[13px] font-semibold text-action">{v.weekStepLabel}</span>
        </div>
        <div className="flex gap-1.5">
          {v.weekDots.map((d: V, i: number) => <span key={i} className="h-1 flex-1 rounded-xs" style={{ background: d.bg }} />)}
        </div>
        <div className="font-display text-[27px] font-bold leading-[1.2] tracking-[-0.015em]">{v.weekTitle}</div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pt-2">
        {v.week1 && (
          <div className={cx(CARD, "flex flex-col gap-2.5 p-5")}>
            <span className="text-[12.5px] text-ink-2">{v.week1Line}</span>
            <span className="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.025em]">{v.reviewCountBig}</span>
            <Btn onClick={v.toReviewStack} className="self-start">{v.week1Cta}</Btn>
          </div>
        )}

        {v.week2 && (<>
          <div className={cx(CARD, "flex flex-col gap-1.25 p-5")}>
            <div className="text-[12.5px] text-ink-2">Computed balance for {v.computedFor}</div>
            <div className={cx(big, "leading-[1.1]")}>{v.computedBal}</div>
          </div>
          <div className="flex flex-col gap-2.25">
            <div className={LABEL}>What does your bank app say?</div>
            <div className="flex items-center gap-2 rounded-2xl border-[1.5px] border-action bg-surface px-4 py-3.5">
              <span className="font-display text-[17px] font-semibold text-ink-3">Rs</span>
              <input inputMode="decimal" aria-label="Balance in your bank app" value={v.typedBal} onChange={v.balType}
                className="min-w-0 flex-1 bg-transparent p-0 font-display text-[32px] font-bold tracking-[-0.025em] text-ink outline-none" />
            </div>
          </div>
          {v.hasGap && (
            <div className="flex flex-col gap-3 rounded-card border border-warn bg-tint-w p-5">
              <div className="font-display text-[25px] font-bold leading-[1.2] text-warn-ink">{v.gapLine}</div>
              <div className="line-clamp-2 text-[13px] leading-[1.6] text-ink-2">{v.gapBody}</div>
              <div className="flex flex-col gap-2">
                <Btn onClick={v.gapCash}>{v.gapCta}</Btn>
                <Btn kind="secondary" onClick={v.gapLater}>Leave it for now</Btn>
              </div>
            </div>
          )}
          {v.gapClosed && <div className="rounded-card bg-tint-g p-5 text-[13.5px] leading-[1.6] text-ink-2">{v.gapClosedLine}</div>}
        </>)}

        {v.week3 && (<>
          <div className={cx(CARD, "flex flex-col gap-2.25 p-5")}>
            <span className={LABEL}>One thing worth knowing</span>
            <span className="font-display text-[24px] font-bold leading-[1.3] tracking-[-0.01em]">{v.insightLine}</span>
          </div>
          <div className={cx(CARD, "flex flex-col gap-2.5 p-5")}>
            <span className="text-[13.5px] font-semibold">The week ahead</span>
            <div className="flex items-baseline gap-2.25">
              <span className="font-display text-[19px] font-bold text-action">Rs</span>
              <span className={cx(big, "leading-none text-action")}>{v.allowAmount}</span>
              <span className="text-[13px] text-ink-2">a day, {v.daysLeftShort}</span>
            </div>
          </div>
        </>)}
      </div>

      <div className="flex flex-none items-center justify-between border-t border-line bg-canvas px-5 pt-3.5 pb-6">
        <button onClick={v.weekBack} className="px-1 py-2.5 text-[13px] font-semibold text-ink-2">{v.weekBackLabel}</button>
        <Btn kind="navy" onClick={v.weekNext}>{v.weekNextLabel}</Btn>
      </div>
    </div>
  );
}

export function Add({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col pt-2 pb-5.5">
      <TopBar onBack={v.addCancel} icon={P.close} label="Cancel" title={v.t.quickAdd} />
      <AmountEntry value={v.addEntry} fg={v.addFg} className="text-[58px]" caret="h-10.5" />
      <Chips items={v.addCats} className="px-4 pt-3" />
      <button onClick={v.toggleMore} className="flex items-center justify-between px-5 pt-3.25">
        <span className="text-[12.5px] text-ink-2">{v.addMoreLine}</span>
        <Icon d={P.expand} size={20} sw={2.2} className={cx("text-action transition-transform duration-200", v.addMoreOpen && "rotate-180")} />
      </button>
      {v.addMoreOpen && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {v.addSources.map((c: V, i: number) => <Chip key={i} c={c} check={false} className="px-3.5 py-2.5 text-[12.5px]" />)}
        </div>
      )}
      <div className="flex-1" />
      <Keypad keys={v.addKeys} tall />
      <div className="px-4 pt-3">
        <Cta onClick={v.commitAdd} bg={v.addCtaBg} fg={v.addCtaFg} className="p-4 text-[15.5px]">{v.addCta}</Cta>
      </div>
    </div>
  );
}
