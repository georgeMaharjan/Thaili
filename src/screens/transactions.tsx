import { Btn, Chevron, Chip, Cta, Icon, IconBtn, P, Pull, Section, TopBar, TxCard, cx, type V } from "@/components/ui";
import { CheckRow, Picker, Sheet } from "@/components/sheet";

export function Txns({ v }: { v: V }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <header className="flex flex-none flex-col gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center justify-between"><h1 className="font-display text-[28px] font-bold">{v.t.txns}</h1><IconBtn d={P.refresh} label="Refresh transactions" onClick={v.syncPull} className="text-ink-3" /></div>
      <label className="flex min-h-[48px] items-center gap-3 rounded-2xl bg-surface-2 pl-4 pr-1"><Icon d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14ZM20 20l-4-4" size={18} className="text-ink-3" /><input value={v.txQuery} onChange={v.txQueryType} placeholder="Search transactions" aria-label="Search transactions" className="min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none placeholder:text-ink-3" />{v.txQuery && <IconBtn d={P.close} label="Clear search" onClick={v.txQueryClear} size={18} />}</label>
      <div className="flex items-center gap-3"><div className="flex min-w-0 flex-1 items-center rounded-full border border-line pr-3"><IconBtn d={P.calendar} label="Choose custom dates" onClick={v.calShow} size={17} /><Picker placeholder="Date range" value={v.txRange} onChange={v.txRangeSet} options={v.dateChips.map((c: V,i: number) => ({ value: ["today","week","month","custom"][i], label: c.label }))} className="min-h-[44px] text-[14px]" /></div><button onClick={v.filtersShow} className={cx("press flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-semibold",v.txFilterCount ? "bg-navy text-canvas" : "border border-line")}><Icon d="M4 7h16M7 12h10M10 17h4" size={18} />Filters{v.txFilterCount > 0 && <span>{v.txFilterCount}</span>}</button></div>
      {v.txFilterSummary && <button onClick={v.filtersShow} className="text-left text-[13px] text-ink-2">{v.txFilterSummary}</button>}
    </header>
    <Pull onRefresh={v.syncPull} className="min-h-0 flex-1 px-5 pb-6">
      <div className="flex items-center justify-between border-b border-line py-3 text-[13px] text-ink-3" aria-live="polite"><span>{v.txCount} {v.txCount === 1 ? "transaction" : "transactions"}</span><span>Out <strong className="font-semibold text-ink">{v.txTotals.expenses}</strong></span></div>
      {v.txEmpty && <div className="flex flex-col gap-3 py-10 text-center"><strong className="text-[18px]">{v.txEmptyTitle}</strong><p className="text-[14px] text-ink-3">{v.txEmptyLine}</p><Btn kind="secondary" onClick={v.txReset}>Reset filters</Btn></div>}
      {v.txRows.map((r: V,i: number) => r.isHeader ? <h2 key={i} className="sticky top-0 z-1 bg-canvas pt-5 pb-1 text-[13px] font-semibold text-ink-3">{r.label}</h2> : <TxCard key={i} r={r} />)}
      {!v.txEmpty && <div className="flex justify-between pt-5 text-[13px] text-ink-3"><span>Income {v.txTotals.income}</span><span>Transfers excluded from totals</span></div>}
    </Pull>
    {v.filtersOpen && <Sheet title="Filter transactions" onClose={v.filtersClose}>
      <section className="flex flex-col gap-3"><h3 className="text-[14px] font-semibold">Spending type</h3><div className="native-segment">{[["all","All"],["essential","Essential"],["optional","Optional"]].map(([key,label]) => <button key={key} aria-pressed={v.filterSpending === key} onClick={() => v.filterSpendingSet(key)}>{label}</button>)}</div><p className="text-[13px] text-ink-3">All includes income and transfers.</p></section>
      <CheckRow checked={v.filterReview} onClick={v.filterReviewSet}>Needs review only</CheckRow>
      <section><h3 className="mb-1 text-[14px] font-semibold">Categories <span className="font-normal text-ink-3">· select one or more</span></h3>{v.filterCategories.map((c: V) => <CheckRow key={c.key} checked={c.selected} onClick={c.tap} meta={c.count}>{c.label}</CheckRow>)}</section>
      <div className="sticky -bottom-[24px] flex flex-col gap-2 border-t border-line bg-canvas pt-3 pb-2"><Btn onClick={v.filtersApply}>Show {v.filterResultCount} {v.filterResultCount === 1 ? "transaction" : "transactions"}</Btn><button onClick={v.filtersReset} className="min-h-[44px] text-[14px] font-semibold text-ink-2">Reset filters</button></div>
    </Sheet>}
    {v.calOpen && <CalSheet v={v} />}
  </div>;
}

export function Detail({ v }: { v: V }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <TopBar onBack={v.detailBack} title="Transaction" />
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-5 pt-3 pb-6">
      <section className="rounded-[20px] bg-surface-2 p-5">
        <span className="flex items-center gap-2 text-[14px] text-ink-2"><Icon d={v.detailKindIcon} size={18} />{v.detailKindLabel}</span>
        <div className="mt-3 break-words font-display text-[44px] font-bold leading-tight tabular-nums" style={{color:v.detailFg,fontSize:v.detailFs}}>{v.detailAmount}</div>
        <h1 className="mt-2 break-words text-[18px] font-semibold">{v.detailMerchant}</h1>
        <p className="mt-1 text-[13px] text-ink-3">{v.detailDate} · {v.detailAccount}</p>
      </section>
      <section aria-label="Transaction information" className="rounded-2xl border border-line bg-surface px-4">
        {v.detailFields.map((f: V,i: number) => { const content = <><span className="text-[13px] text-ink-3">{f.label}</span><span className="flex min-w-0 items-center justify-end gap-2"><span className="break-words text-right text-[15px]" style={{color:f.fg}}>{f.value}</span>{f.tap && <Chevron />}</span></>;return f.tap ? <button key={i} onClick={f.tap} className="grid min-h-[64px] w-full grid-cols-[80px_1fr] items-center gap-3 border-b border-line py-3 text-left last:border-0">{content}</button> : <div key={i} className="grid min-h-[64px] grid-cols-[80px_1fr] items-center gap-3 border-b border-line py-3 last:border-0">{content}</div>;})}
      </section>
      {v.detailAuto && <section className="rounded-2xl bg-tint-g p-4"><h2 className="text-[15px] font-semibold">Filed automatically</h2><p className="mt-2 text-[14px] leading-normal text-ink-2">{v.detailAutoLine}</p><button onClick={v.detailAutoDrop} className="mt-2 min-h-[44px] text-[14px] font-semibold text-action">Stop filing this automatically</button></section>}
      <section className="border-y border-line"><button onClick={v.toggleRaw} aria-expanded={v.rawOpen} className="flex min-h-[56px] w-full items-center justify-between text-[14px] font-semibold">Original message<Icon d={P.expand} size={18} className={v.rawOpen ? "rotate-180" : ""} /></button>{v.rawOpen && <p className="whitespace-pre-wrap break-words pb-4 font-mono text-[13px] leading-relaxed text-ink-2">{v.detailRaw || "No original message. This entry was added manually."}</p>}</section>
      <button onClick={v.askDelete} className="press flex min-h-[48px] items-center justify-center gap-2 text-[14px] font-semibold text-action"><Icon d={P.trash} size={18} />Delete transaction</button>
    </div>
    {v.detailShowCats && <Sheet title={v.detailCatsTitle} onClose={v.detailEditClose}><div className="flex flex-wrap gap-2">{v.detailCats.map((c: V,i: number) => <Chip key={i} c={c} className="min-h-[44px] px-4 py-2 text-[15px]" />)}</div><p className="text-[13px] text-ink-3">Your choice is saved when you select a category.</p></Sheet>}
    {v.remarkOpen && <Sheet title={v.remarkTitle} onClose={v.remarkCancel}><label className="field">Note<textarea value={v.remarkDraft} onChange={v.remarkType} maxLength={80} rows={3} placeholder="What was this for?" /></label><p className="text-[13px] text-ink-3">{v.remarkCount} · Original message stays unchanged.</p><Btn onClick={v.remarkSave}>Save note</Btn></Sheet>}
    {v.promptOpen && <Sheet title="Remember this merchant?" onClose={v.promptNo}><p className="text-[15px] leading-relaxed text-ink-2">{v.promptLine}</p><Btn onClick={v.promptYes}>Yes, file it for me</Btn><Btn kind="secondary" onClick={v.promptNo}>Just this time</Btn></Sheet>}
  </div>;
}

// Bottom sheet: pick a start day and an end day in one BS month at a time.
function CalSheet({ v }: { v: V }) {
  const field = "flex min-w-0 flex-col gap-0.5 rounded-[16px] border-[1.5px] px-4 py-3 text-left";
  return (
    <Sheet title="Custom range" onClose={v.calClose}>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={v.calPickFrom} className={field} style={{ borderColor: v.calFromBorder }}>
          <span className="text-[13px] text-ink-3">From</span>
          <span className="truncate text-[18px] font-semibold" style={{ color: v.calFromFg }}>{v.calFromLabel}</span>
        </button>
        <button onClick={v.calPickTo} className={field} style={{ borderColor: v.calToBorder }}>
          <span className="text-[13px] text-ink-3">To</span>
          <span className="truncate text-[18px] font-semibold" style={{ color: v.calToFg }}>{v.calToLabel}</span>
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <IconBtn d={P.back} label="Previous month" onClick={v.calPrev} size={20} className="-ml-3 text-ink-2" />
          <span className="text-[15px] font-bold">{v.calTitle}</span>
          <IconBtn d={P.next} label="Next month" onClick={v.calNext} size={20} className={cx("-mr-3", v.calHasNext ? "text-ink-2" : "text-bar-dim")} />
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((h, i) => <span key={i} className="flex h-[28px] items-center justify-center text-[12px] font-semibold text-ink-3">{h}</span>)}
          {v.calCells.map((d: V, i: number) => (
            <button key={i} onClick={d.tap} disabled={!d.label || d.future} className="flex h-[42px] items-center justify-center" style={{ background: d.band, borderRadius: d.bandR }}>
              <span className="flex size-[40px] items-center justify-center rounded-full font-display text-[16px]"
                style={{ fontWeight: d.weight, background: d.bg, color: d.fg, boxShadow: d.ring }}>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
      <Cta onClick={v.calApply} bg={v.calCtaBg} fg={v.calCtaFg} className="min-h-[52px] text-[15px]">{v.calCta}</Cta>
    </Sheet>
  );
}

export function Rules({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.rulesBack} title={v.t.rules} />
      <div className="flex flex-1 flex-col gap-6 overflow-auto px-5 pt-1 pb-8">
        <span className="text-pretty text-[14px] leading-[1.55] text-ink-2">{v.rulesStat}</span>
        <Section title="Your rules" action={<span className="text-[13px] text-ink-3">{v.rulesCount}</span>}>
          {v.ruleRows.map((r: V, i: number) => (
            <button key={i} onClick={r.edit} className="press flex min-h-[66px] items-center gap-4 border-t border-line text-left">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-mono text-[15px] font-semibold tracking-[.02em]">{r.kw}</span>
                <span className="truncate text-[13px] leading-[1.35] text-ink-3">
                  → <span className="font-semibold" style={{ color: r.catFg }}>{r.cat}</span> · {r.origin} · {r.matches}
                </span>
              </div>
              <Chevron />
            </button>
          ))}
          {v.rulesEmpty && (
            <span className="text-pretty border-t border-line py-4 text-[14px] leading-[1.55] text-ink-3">
              No rules yet. File a spend by hand and Thaili offers to remember it — or add one here.
            </span>
          )}
          <button onClick={v.ruleNew} className="press flex min-h-[56px] items-center gap-3 border-y border-line text-[15px] font-semibold text-action">
            <Icon d={P.plus} size={20} sw={2.2} />Add a rule
          </button>
        </Section>
      </div>
      {v.ruleSheet && <RuleSheet v={v} />}
    </div>
  );
}

// Bottom sheet: a keyword from the bank message and the category it files to.
function RuleSheet({ v }: { v: V }) {
  return (
    <Sheet title={v.ruleSheetTitle} onClose={v.ruleClose}>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-3">When the bank message contains</span>
        <div className="flex min-h-[52px] items-center gap-1 rounded-[16px] border-[1.5px] bg-surface pr-1 pl-4" style={{ borderColor: v.ruleKwBorder }}>
          <input autoFocus value={v.ruleKw} onChange={v.ruleKwType} placeholder="e.g. DARAZ" autoComplete="off" spellCheck={false}
            onKeyDown={(e) => { if (e.key === "Enter") v.ruleSave(); if (e.key === "Escape") v.ruleClose(); }}
            className="min-w-0 flex-1 bg-transparent py-3 font-mono text-[16px] tracking-[.03em] text-ink outline-none placeholder:text-ink-3" />
          {v.ruleKw && <IconBtn d={P.close} label="Clear" onClick={v.ruleKwClear} size={18} sw={2.2} className="text-ink-3" />}
        </div>
        {v.ruleMsg
          ? <span className="text-pretty text-[14px] leading-[1.45]" style={{ color: v.ruleMsgFg }}>
              {v.ruleMsg}{v.ruleMsgLink && <> <button onClick={v.ruleOpenDup} className="whitespace-nowrap font-bold text-action">Edit that rule</button></>}
            </span>
          : <span className="text-[13px] leading-[1.45] text-ink-3">{v.ruleHint}</span>}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-3">File it as</span>
        <div className="flex flex-wrap gap-2">
          {v.ruleCats.map((c: V, i: number) => <Chip key={i} c={c} check={false} className="h-[40px] rounded-full border-transparent pr-4 pl-3 text-[14px]" />)}
        </div>
      </div>
      <div className="flex gap-2">
        {v.ruleIsEdit && <button onClick={v.ruleDelete} className="press min-h-[52px] flex-none rounded-2xl border border-line px-5 text-[15px] font-semibold text-action">Delete</button>}
        <Cta onClick={v.ruleSave} bg={v.ruleSaveBg} fg={v.ruleSaveFg} className="min-h-[52px] flex-1 text-[15px]">{v.ruleSaveLabel}</Cta>
      </div>
    </Sheet>
  );
}
