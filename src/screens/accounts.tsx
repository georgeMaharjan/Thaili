// Accounts, one account, and the add/edit account form.
import {
  Amount, CARD, Chevron, Chips, Cta, GoalCard, Icon, IconBtn, ItemRow, Keypad, LABEL, P, Seg, Tile, TopBar, cx, type V,
} from "@/components/ui";

export function Accounts({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.accountsBack} title={v.t.accounts}>
        <IconBtn d={v.syncIconD} label="Sync" onClick={v.toSync} sw={1.9} className="" style={{ color: v.syncIconFg }} />
      </TopBar>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-7">
        <GoalCard v={v} />
        <div className="flex flex-col gap-1.5 px-1.5 pt-2 pb-1.5">
          <span className={LABEL}>{v.t.totalAcross}</span>
          <div className="flex items-baseline gap-2.25">
            <span className="font-display text-[24px] font-bold">Rs</span>
            <span className="font-display text-[54px] font-extrabold leading-[.95] tracking-[-0.03em]">{v.totalBal}</span>
          </div>
          <span className="truncate text-[13px] leading-[1.5] text-ink-2">{v.totalMeta}</span>
        </div>

        <button onClick={v.toSync} className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: v.syncStripBg }}>
          <Icon d={v.syncIconD} size={20} style={{ color: v.syncIconFg }} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold leading-[1.45] text-ink-2">{v.syncStripLine}</span>
          <Chevron />
        </button>

        <div className="flex flex-col gap-2.5 px-1 pb-1">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px] bg-bar-track">
            {v.acctSplit.map((g: V, i: number) => <div key={i} className="h-full" style={{ width: g.width, background: g.color }} />)}
          </div>
          <div className="flex flex-wrap gap-x-4.5 gap-y-1.5">
            {v.acctSplit.map((g: V, i: number) => (
              <span key={i} className="flex items-center gap-1.75 whitespace-nowrap text-[13px] text-ink-2">
                <span className="size-2 flex-none rounded-full" style={{ background: g.color }} />{g.label}<span className="font-semibold text-ink">{g.pct}</span>
              </span>
            ))}
          </div>
        </div>

        {v.acctGroups.map((grp: V) => (
          <div key={grp.key} className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-6 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-bold" style={{ background: grp.tint, color: grp.fg }}>
                <Icon d={grp.icon} size={14} sw={2.2} />{grp.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3">{grp.hint}</span>
              <Amount className="text-[15px] font-bold">{grp.total}</Amount>
            </div>
            <div className="rounded-2xl border border-line bg-surface px-4">
              {grp.rows.map((a: V, i: number) => (
                <button key={i} onClick={a.tap} className={cx("flex min-h-15.5 w-full items-center gap-3 text-left", i > 0 && "border-t border-line")}>
                  <Tile d={a.icon} tint={grp.tint} fg={grp.fg} size={19} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium leading-[1.3]">{a.name}</span>
                    <span className="truncate text-[13px] leading-[1.35] text-ink-3">{a.meta}</span>
                  </div>
                  <Amount className="text-[16px]">{a.balance}</Amount>
                  <Chevron />
                </button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={v.toSrcNew} className="mt-1 flex min-h-13 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-bar-dim text-action">
          <Icon d={P.plus} size={18} /><span className="text-[14px] font-semibold">{v.t.addAccount}</span>
        </button>
      </div>
    </div>
  );
}

export function SourceDetail({ v }: { v: V }) {
  const flow = "flex flex-1 flex-col gap-0.75 rounded-2xl p-3.75";
  const flowLabel = "flex items-center gap-1.5 text-[13px] font-semibold";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.sourceBack}>
        <IconBtn d={P.edit} label="Edit account" onClick={v.srcEdit} />
      </TopBar>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-24">
        <div className="flex flex-col gap-1.25 px-1.5 pt-1.5 pb-3">
          <span className="min-w-0 truncate font-display text-[22px] font-bold tracking-[-0.01em]">{v.srcName}</span>
          <span className="font-display text-[46px] font-extrabold leading-[1.05] tracking-[-0.03em]">{v.srcBalance}</span>
          <span className="text-[12px] text-ink-3">{v.srcMeta}</span>
          <button onClick={v.srcEdit} className="w-fit text-[12px] font-semibold" style={{ color: v.srcAcctFg }}>{v.srcAcctLine}</button>
        </div>
        <div className="flex gap-2.5">
          <div className={cx(flow, "bg-tint-g text-pos")}>
            <span className={flowLabel}><Icon d={P.arrowDown} size={15} sw={2.2} />{v.t.inL}</span>
            <span className="font-display text-[21px] font-bold">{v.srcIn}</span>
          </div>
          <div className={cx(flow, "bg-tint-n text-navy")}>
            <span className={flowLabel}><Icon d={P.arrowUp} size={15} sw={2.2} />{v.t.outL}</span>
            <span className="font-display text-[21px] font-bold">{v.srcOut}</span>
          </div>
        </div>
        <div className={cx(CARD, "flex flex-col gap-2.5 px-4.5 py-4")}>
          <span className={LABEL}>Purpose</span>
          <Seg items={v.roleChips} itemClass="flex-1 rounded-[9px] p-2.25 text-center text-[12.5px]" />
        </div>
        <div className={cx(CARD, "-mt-px flex flex-col px-4.5")}>
          {v.srcTxns.map((x: V, i: number) => (
            <ItemRow key={i} look={x} title={x.title} sub={x.meta} onClick={x.tap} className="min-h-15 border-b border-line" right={<Amount fg={x.fg}>{x.amount}</Amount>} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ onClick, border, label, value, valueClass, fg, hint, hintFg }: {
  onClick: () => void; border: string; label: string; value: string; valueClass: string; fg: string; hint: string; hintFg: string;
}) {
  return (
    <button onClick={onClick} className="mx-5 mt-2.5 flex items-center justify-between gap-3 rounded-2xl border bg-surface px-3.75 py-3.25" style={{ borderColor: border }}>
      <div className="flex min-w-0 flex-col gap-0.75">
        <span className={LABEL}>{label}</span>
        <span className={cx("font-display", valueClass)} style={{ color: fg }}>{value}</span>
      </div>
      <span className="flex-none text-[12.5px] font-semibold" style={{ color: hintFg }}>{hint}</span>
    </button>
  );
}

export function SrcNew({ v }: { v: V }) {
  const heading = "px-5 text-[13px] font-semibold text-ink-3";
  const seg = "flex-1 rounded-[10px] px-1 py-2.5 text-center text-[12.5px]";
  return (
    <div className="flex flex-1 flex-col overflow-hidden pt-2 pb-5.5">
      <TopBar onBack={v.srcNewCancel} icon={P.close} label="Cancel" title={v.srcNewTitle} />
      <div className="flex flex-1 flex-col overflow-auto">
        {v.srcNeedsAcct && (
          <Field onClick={v.pickAcctField} border={v.acctFieldBorder} label={v.acctFieldLabel} value={v.newSrcAcctLabel}
            valueClass="text-[22px] font-bold tracking-[-0.01em]" fg={v.newSrcAcctFg} hint={v.acctFieldHint} hintFg={v.acctFieldHintFg} />
        )}
        <Field onClick={v.pickAmtField} border={v.amtFieldBorder} label="Opening balance" value={"Rs " + v.newSrcAmtLabel}
          valueClass="text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em]" fg={v.newSrcAmtFg} hint={v.amtFieldHint} hintFg={v.amtFieldHintFg} />
        <div className="text-pretty px-5 pt-2 text-[12px] leading-[1.5] text-ink-3">{v.newSrcOpeningNote}</div>
        <div className={cx(heading, "pt-3.5")}>What kind</div>
        <div className="px-5 pt-2.25"><Seg items={v.newSrcKinds} itemClass={seg} /></div>
        <div className={cx(heading, "pt-4")}>{v.newSrcPickLabel}</div>
        <Chips items={v.newSrcNameChips} />
        <div className={cx(heading, "pt-4")}>What is it for</div>
        <div className="px-5 pt-2.25"><Seg items={v.newSrcRoles} itemClass={seg} /></div>
        <div className="text-pretty px-5 pt-3 pb-2 text-[12.5px] leading-[1.6] text-ink-2">{v.newSrcFeedNote}</div>
        {v.isEditSrc && (
          <button onClick={v.srcDelete} className="mx-5 mt-1 mb-2.5 rounded-2xl border border-line px-4 py-3.5 text-center text-[12.5px] font-semibold text-action">
            {v.srcDeleteLabel}
          </button>
        )}
      </div>
      <Keypad keys={v.newSrcKeys} />
      <div className="flex-none px-5 pt-3">
        <Cta onClick={v.newSrcCreate} bg={v.newSrcCtaBg} fg={v.newSrcCtaFg} className="p-4 text-[15px]">{v.newSrcCta}</Cta>
      </div>
    </div>
  );
}
