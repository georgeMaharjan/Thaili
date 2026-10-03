// The transaction list, one transaction, and the auto-filing rules.
import { Btn, CARD, Chip, Chips, Cta, Icon, IconBtn, P, Pull, Seg, TopBar, TxCard, cx, type V } from "@/components/ui";

export function Txns({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3.5 px-5 pt-2 pb-3">
        <span className="font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.txns}</span>
        <div className="flex h-11.5 items-center gap-2.5 rounded-[14px] bg-surface-2 pr-1 pl-3.5">
          <Icon d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14ZM20 20l-4-4" size={18} className="text-ink-3" />
          <input value={v.txQuery} onChange={v.txQueryType} placeholder="Search name, note, category or amount" aria-label="Search transactions"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3" />
          {v.txQuery && <IconBtn d={P.close} label="Clear search" onClick={v.txQueryClear} size={18} sw={2.2} className="size-10 text-ink-3" />}
        </div>
        <Seg items={v.txTabs} itemClass="flex h-9.5 flex-1 items-center justify-center rounded-[9px] text-[14px]" />
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {v.dateChips.map((c: V, i: number) => (
            <button key={i} onClick={c.tap} className="press flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-semibold"
              style={{ background: c.bg, color: c.fg, borderColor: c.border }}>
              {c.isCustom && <Icon d={P.calendar} size={15} />}{c.label}
            </button>
          ))}
        </div>
      </div>
      <Pull onRefresh={v.syncPull} className="flex-1 px-4 pb-26">
        {v.txEmpty && (
          <div className="flex flex-col items-center gap-1.5 px-5 py-12 text-center">
            <span className="text-[16px] font-semibold">{v.txEmptyTitle}</span>
            <span className="text-[14px] text-ink-3">{v.txEmptyLine}</span>
          </div>
        )}
        {v.txRows.map((r: V, i: number) => r.isHeader
          ? <div key={i} className="sticky top-0 z-1 -mx-4 bg-canvas px-5 pt-5 pb-1 text-[14px] font-bold text-ink-2">{r.label}</div>
          : <TxCard key={i} r={r} />)}
      </Pull>
      {v.calOpen && <CalSheet v={v} />}
    </div>
  );
}

// Bottom sheet: pick a start day and an end day in one BS month at a time.
function CalSheet({ v }: { v: V }) {
  const field = "flex min-w-0 flex-col gap-0.5 rounded-[14px] border-[1.5px] px-3.5 py-2.5 text-left";
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div onClick={v.calClose} className="absolute inset-0 bg-[rgba(20,16,12,.38)]" />
      <div className="relative flex flex-col gap-4 rounded-t-3xl bg-canvas px-5 pt-2.5 pb-6">
        <span className="h-1 w-10 self-center rounded-xs bg-bar-dim" />
        <div className="-my-1.5 -mr-2.5 flex items-center justify-between">
          <span className="font-display text-[22px] font-bold">Custom range</span>
          <IconBtn d={P.close} label="Close" onClick={v.calClose} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={v.calPickFrom} className={field} style={{ borderColor: v.calFromBorder }}>
            <span className="text-[12.5px] text-ink-3">From</span>
            <span className="truncate text-[17px] font-semibold" style={{ color: v.calFromFg }}>{v.calFromLabel}</span>
          </button>
          <button onClick={v.calPickTo} className={field} style={{ borderColor: v.calToBorder }}>
            <span className="text-[12.5px] text-ink-3">To</span>
            <span className="truncate text-[17px] font-semibold" style={{ color: v.calToFg }}>{v.calToLabel}</span>
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <IconBtn d={P.back} label="Previous month" onClick={v.calPrev} size={20} className="-ml-2.5 text-ink-2" />
            <span className="text-[15px] font-bold">{v.calTitle}</span>
            <IconBtn d={P.next} label="Next month" onClick={v.calNext} size={20} className={cx("-mr-2.5", v.calHasNext ? "text-ink-2" : "text-bar-dim")} />
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((h, i) => <span key={i} className="flex h-7 items-center justify-center text-[12px] font-semibold text-ink-3">{h}</span>)}
            {v.calCells.map((d: V, i: number) => (
              <button key={i} onClick={d.tap} disabled={!d.label || d.future} className="flex h-10.5 items-center justify-center" style={{ background: d.band, borderRadius: d.bandR }}>
                <span className="flex size-10 items-center justify-center rounded-full font-display text-[16px]"
                  style={{ fontWeight: d.weight, background: d.bg, color: d.fg, boxShadow: d.ring }}>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Cta onClick={v.calApply} bg={v.calCtaBg} fg={v.calCtaFg} className="min-h-13 text-[15.5px]">{v.calCta}</Cta>
      </div>
    </div>
  );
}

export function Detail({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.detailBack}>
        {v.editing
          ? <IconBtn d={P.check} label="Done" onClick={v.toggleEdit} className="text-action" />
          : <IconBtn d={P.edit} label="Edit" onClick={v.toggleEdit} />}
      </TopBar>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-6">
        <div className="flex flex-col gap-2 px-1.5 pt-2.5 pb-3.5">
          <span className="flex h-7 items-center gap-1.5 self-start rounded-full pr-3 pl-2.25 text-[13px] font-bold" style={{ background: v.detailKindBg, color: v.detailKindFg }}>
            <Icon d={v.detailKindIcon} size={15} sw={2.2} />{v.detailKindLabel}
          </span>
          <span className="font-display text-[52px] font-extrabold leading-none tracking-[-0.03em] tabular-nums" style={{ color: v.detailFg }}>{v.detailAmount}</span>
          <span className="text-[15px] font-semibold text-ink-2">{v.detailMerchant}</span>
        </div>

        {v.detailShowCats && (
          <div className="flex flex-col gap-2.5 px-1.5 pb-2">
            <div className="flex min-h-8 items-center justify-between">
              <span className="text-[15px] font-bold text-ink-2">{v.detailCatsTitle}</span>
              <span className="text-[13px] font-semibold" style={{ color: v.detailCatsHintFg }}>{v.detailCatsHint}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {v.detailCats.map((c: V, i: number) => <Chip key={i} c={c} check={false} className="h-11 border-transparent pr-4 pl-3.5 text-[14.5px]" />)}
            </div>
            {v.detailIsDebit && (
              <div className="flex gap-4 pt-0.5 text-[13px] text-ink-3">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-navy" />Essential</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn" />Leak</span>
              </div>
            )}
          </div>
        )}

        {v.promptOpen && (
          <div className="flex flex-col gap-3 rounded-card border border-navy bg-tint-n px-4.5 py-4">
            <span className="text-[13px] font-semibold text-navy">Do it every time?</span>
            <span className="text-pretty text-[13.5px] leading-[1.55]">{v.promptLine}</span>
            <div className="flex gap-2">
              <Btn kind="navy" onClick={v.promptYes} className="flex-1">Yes, file it for me</Btn>
              <Btn kind="secondary" onClick={v.promptNo} className="flex-none">Just once</Btn>
            </div>
          </div>
        )}

        {v.detailAuto && (
          <div className="flex flex-col gap-2 rounded-card bg-tint-g px-4.5 py-4">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-3">
              <Icon d="M20 6L9 17l-5-5" size={15} sw={2.2} />Filed by a rule
            </span>
            <span className="text-pretty text-[13px] leading-[1.55] text-ink-2">{v.detailAutoLine}</span>
            <button onClick={v.detailAutoDrop} className="text-[12.5px] font-semibold text-action">Stop filing this automatically</button>
          </div>
        )}

        {v.remarkOpen && (
          <div className="flex flex-col gap-3 rounded-card border border-action bg-surface px-4.5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-action">{v.remarkTitle}</span>
              <span className="text-[12px] text-ink-3">{v.remarkCount}</span>
            </div>
            <div className="flex min-h-13 items-center gap-1 rounded-[14px] bg-surface-2 pr-1 pl-3.5">
              <input autoFocus value={v.remarkDraft} onChange={v.remarkType} onKeyDown={v.remarkKey} placeholder="What was this for?" enterKeyHint="done"
                className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-3" />
              {v.remarkDraft && <IconBtn d={P.close} label="Clear" onClick={v.remarkClear} size={18} sw={2.2} className="text-ink-3" />}
            </div>
            <span className="text-pretty text-[12.5px] leading-normal text-ink-3">The bank&apos;s original message stays as it was.</span>
            <div className="flex gap-2">
              <Btn onClick={v.remarkSave} className="flex-1">Save</Btn>
              <Btn kind="secondary" onClick={v.remarkCancel} className="flex-none">Cancel</Btn>
            </div>
          </div>
        )}

        <div className={cx(CARD, "px-4.5 py-1")}>
          {v.detailFields.map((f: V, i: number) => {
            const Row = f.tap ? "button" : "div"; // Category and Remarks are tappable
            return (
              <Row key={i} onClick={f.tap} className="flex min-h-12 w-full items-center justify-between gap-3.5 border-b border-line">
                <span className="text-[13px] text-ink-3">{f.label}</span>
                <span className="flex items-center gap-2.5">
                  <span className="text-right text-[13.5px] font-medium" style={{ color: f.fg }}>{f.value}</span>
                  <span className="text-[13px] font-semibold text-action">{f.action}</span>
                </span>
              </Row>
            );
          })}
        </div>

        <button onClick={v.toggleRaw} className={cx(CARD, "flex flex-col gap-2.5 px-4.5 py-4")}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-2">Original message</span>
            <Icon d={P.expand} size={20} sw={2.2} className={cx("text-ink-3 transition-transform duration-200", v.rawOpen && "rotate-180")} />
          </div>
          {v.rawOpen && <div className="rounded-xl bg-surface-2 p-3.5 font-mono text-[12.5px] leading-[1.65] text-ink-2">{v.detailRaw}</div>}
        </button>

        <button onClick={v.askDelete} className="press flex min-h-13 items-center justify-center rounded-2xl text-[15px] font-semibold text-action">
          Delete transaction
        </button>
      </div>
    </div>
  );
}

export function Rules({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.rulesBack} title={v.t.rules} />
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-7">
        <div className="text-pretty px-1.5 pt-1 pb-1.5 text-[13px] leading-[1.6] text-ink-2">{v.rulesStat}</div>
        <div className={cx(CARD, "flex flex-col gap-2.5 p-4")}>
          <span className="text-[13.5px] font-semibold">Add a rule</span>
          <div className="flex items-center gap-2">
            <input value={v.ruleKw} onChange={v.ruleKwType} placeholder="A word in the message: DARAZ, PATHAO"
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13.5px] text-ink outline-none" />
            <button onClick={v.ruleAdd} className="flex-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] font-semibold" style={{ color: v.ruleAddFg }}>Add</button>
          </div>
          <Chips items={v.ruleCats} className="" />
          <span className="text-pretty text-[12.5px] leading-[1.5] text-ink-3">Any spend whose message contains it is filed there — older uncategorised ones too.</span>
        </div>
        {v.ruleRows.map((r: V, i: number) => (
          <div key={i} className={cx(CARD, "flex items-center justify-between gap-3 px-4.25 py-3.75")}>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[13.5px] font-semibold leading-[1.45] [word-break:break-word]">{r.kw} → {r.cat}</span>
              <span className="text-[12.5px] leading-[1.45] text-ink-3">{r.origin} · {r.matches}</span>
            </div>
            <IconBtn d={P.trash} label="Remove rule" onClick={r.drop} className="-my-2 -mr-2.5 text-action" />
          </div>
        ))}
        {v.rulesEmpty && (
          <div className="text-pretty rounded-card border border-dashed border-bar-dim px-5 py-5.5 text-[13px] leading-[1.6] text-ink-2">
            No rules. Every spend will ask you for a category — file one and Thaili offers to remember it.
          </div>
        )}
      </div>
    </div>
  );
}
