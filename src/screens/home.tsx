// Home, the Needs-review card stack, the weekly review and quick add.
import {
  Amount, AmountEntry, Bar, Btn, CARD, Chip, Chips, Cta, GoalCard, HeaderActions, Icon, IconBtn, ItemRow, Keypad,
  LABEL, P, Tile, TopBar, cx, type V,
} from "@/components/ui";

const PILL = "flex h-7.5 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.75 text-[13px] font-semibold";

export function Home({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-13 flex-none items-center justify-between py-1 pr-2 pl-5">
        <div className="flex items-center gap-2.25">
          <span className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-brand">
            <img src="./thaili-mark-cream.png" alt="Thaili" className="block h-4.25 w-4 object-contain" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-[17px] font-bold leading-[1.15]">{v.bsMonth}</span>
            <span className="text-[12px] leading-[1.2] text-ink-3">{v.adRange}</span>
          </div>
        </div>
        <HeaderActions v={v} />
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-24">
        <div className="flex flex-col gap-1.5 px-1.5 pt-5.5 pb-1.5">
          <span className={LABEL}>{v.allowLabel}</span>
          <div className="flex items-baseline gap-2.25" style={{ color: v.allowFg }}>
            <span className="font-display text-[27px] font-bold">Rs</span>
            <span className="font-display text-[78px] font-extrabold leading-[.88] tracking-[-0.035em]">{v.allowAmount}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className={cx(PILL, "bg-surface-2 text-ink-2")}><Icon d={P.calendar} size={15} />{v.daysChip}</span>
            <span className={PILL} style={{ background: v.remainBg, color: v.remainFg }}><Icon d={P.wallet} size={15} />{v.remainShort}</span>
          </div>
        </div>

        {v.hasReview && (
          <div onClick={v.toReviewStack} className="press flex cursor-pointer items-center justify-between gap-3 rounded-card border border-warn bg-tint-w px-4.5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8.5 flex-none items-center justify-center rounded-xl bg-warn-ink font-display text-[16px] font-bold text-canvas">{v.reviewCount}</span>
              <span className="min-w-0 truncate text-[14.5px] font-semibold leading-[1.35]">{v.reviewLine}</span>
            </div>
            <Icon d={P.next} size={18} sw={2.2} className="text-warn-ink" />
          </div>
        )}

        <div className={cx(CARD, "flex flex-col gap-3.25 px-5 py-4.5 shadow-card")}>
          <div className="flex items-baseline justify-between">
            <span className="text-[14.5px] font-semibold">{v.t.roomToSpend}</span>
            <span className="text-[12px] font-semibold" style={{ color: v.targetFg }}>{v.targetPct}</span>
          </div>
          <Bar width={v.targetWidth} color={v.targetBar} className="h-2.5 rounded-[5px]" />
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
            <span className="min-w-0 truncate font-display font-semibold tabular-nums">{v.spentOfTarget}</span>
            <span className="flex flex-none items-center gap-1.25 whitespace-nowrap text-ink-3">
              <Icon d="M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16ZM12 8v4l3 2" size={15} />{v.paceShort}
            </span>
          </div>
        </div>

        <div className={cx(CARD, "flex flex-col gap-0.5 px-5 py-4.5")}>
          <div className="flex items-baseline justify-between">
            <span className="text-[14.5px] font-semibold">{v.t.recent}</span>
            <span onClick={v.toTxns} className="-my-3 flex cursor-pointer items-center gap-0.5 py-3 pl-3 text-[12.5px] font-semibold text-action">
              {v.t.seeAll}<Icon d={P.next} size={16} />
            </span>
          </div>
          {v.recent.map((t: V, i: number) => (
            <ItemRow key={i} look={t} title={t.title} sub={t.cat} subFg={t.catFg} onClick={t.tap}
              className="min-h-14 border-t border-line" right={<Amount fg={t.fg} className="text-[15.5px]">{t.amount}</Amount>} />
          ))}
        </div>

        <GoalCard v={v} />

        <div onClick={v.toWeekly} className={cx(CARD, "press flex cursor-pointer items-center gap-3 px-4 pt-4 pb-3.75")}>
          <Tile d="M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4M9 15l2 2 4-4" className="size-9 bg-tint-n text-navy" />
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-[1.35]">{v.t.weekly}</span>
          <Icon d={P.next} size={16} sw={2.2} className="text-ink-3" />
        </div>
      </div>
    </div>
  );
}

export function Stack({ v }: { v: V }) {
  const action = "flex cursor-pointer items-center gap-1.5 px-1 py-3 text-[13px] font-semibold";
  const tool = "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 p-3.25 text-[13px] text-ink-2";
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
              <span onClick={v.cardNote} className={cx(tool, "min-w-0")}><Icon d={P.note} size={18} /><span className="truncate">{v.cardNoteLabel}</span></span>
              <span onClick={v.cardReceipt} className={tool}><Icon d={P.camera} size={18} />Receipt</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-1.5">
            <span onClick={v.cardSkip} className={cx(action, "text-ink-3")}>Skip<Icon d="M5 12h14M13 6l6 6-6 6" size={16} /></span>
            <span onClick={v.cardOpen} className={cx(action, "text-action")}><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17ZM12 11v5M12 7.8h.01" size={17} />Details</span>
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
              <input inputMode="numeric" aria-label="Balance in your bank app" value={v.typedBal} onChange={v.balType}
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
        <span onClick={v.weekBack} className="cursor-pointer px-1 py-2.5 text-[13px] font-semibold text-ink-2">{v.weekBackLabel}</span>
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
      <div onClick={v.toggleMore} className="flex cursor-pointer items-center justify-between px-5 pt-3.25">
        <span className="text-[12.5px] text-ink-2">{v.addMoreLine}</span>
        <Icon d={P.expand} size={20} sw={2.2} className={cx("text-action transition-transform duration-200", v.addMoreOpen && "rotate-180")} />
      </div>
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
