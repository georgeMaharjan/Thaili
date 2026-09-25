// The transaction list, one transaction, and the auto-filing rules.
import { Amount, Btn, CARD, Chips, Icon, IconBtn, ItemRow, P, Seg, TopBar, cx, type V } from "@/components/ui";

export function Txns({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3 px-5 pt-2 pb-3">
        <div className="font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.txns}</div>
        <Seg items={v.txTabs} itemClass="flex-1 rounded-[9px] p-2.5 text-center text-[13px]" />
      </div>
      <div className="flex-1 overflow-auto pb-24">
        {v.txRows.map((r: V, i: number) => r.isHeader
          ? <div key={i} className="px-5 pt-3.75 pb-1.5 text-[13px] font-semibold text-ink-3">{r.label}</div>
          : <ItemRow key={i} look={r} title={r.title} sub={r.cat} subFg={r.catFg} onClick={r.tap}
              className="border-b border-line px-5 py-3" right={<Amount fg={r.fg} className="text-[15.5px]">{r.amount}</Amount>} />)}
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
        <div className="flex flex-col gap-1 px-1.5 pt-2.5 pb-3.5">
          <span className="font-display text-[52px] font-extrabold leading-none tracking-[-0.03em]" style={{ color: v.detailFg }}>{v.detailAmount}</span>
          <span className="text-[15px] font-semibold text-ink-2">{v.detailMerchant}</span>
        </div>

        {v.editing && (
          <div className="flex flex-col gap-3 rounded-card border border-action bg-surface px-4.5 py-4">
            <span className="text-[13px] font-semibold text-action">Change the category</span>
            <Chips items={v.detailCats} className="" />
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
            <span onClick={v.detailAutoDrop} className="cursor-pointer text-[12.5px] font-semibold text-action">Stop filing this automatically</span>
          </div>
        )}

        <div className={cx(CARD, "px-4.5 py-1")}>
          {v.detailFields.map((f: V, i: number) => (
            <div key={i} onClick={f.tap} className={cx("flex min-h-12 items-center justify-between gap-3.5 border-b border-line", f.tap && "cursor-pointer")}>
              <span className="text-[13px] text-ink-3">{f.label}</span>
              <span className="flex items-center gap-2.5">
                <span className="text-right text-[13.5px] font-medium" style={{ color: f.fg }}>{f.value}</span>
                <span className="text-[13px] font-semibold text-action">{f.action}</span>
              </span>
            </div>
          ))}
        </div>

        <div onClick={v.toggleRaw} className={cx(CARD, "flex cursor-pointer flex-col gap-2.5 px-4.5 py-4")}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-2">Original message</span>
            <Icon d={P.expand} size={20} sw={2.2} className={cx("text-ink-3 transition-transform duration-200", v.rawOpen && "rotate-180")} />
          </div>
          {v.rawOpen && <div className="rounded-xl bg-surface-2 p-3.5 font-mono text-[12.5px] leading-[1.65] text-ink-2">{v.detailRaw}</div>}
        </div>

        <div onClick={v.askDelete} className="press flex min-h-13 cursor-pointer items-center justify-center rounded-2xl text-[15px] font-semibold text-action">
          Delete transaction
        </div>
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
