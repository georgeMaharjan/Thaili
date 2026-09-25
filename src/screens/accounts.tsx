// Accounts tab, one account, and the add/edit account form.
import {
  Amount, CARD, Chevron, Chips, Cta, GoalCard, HeaderActions, Icon, IconBtn, ItemRow, Keypad, LABEL, P, Seg, Tile, TopBar, cx, type V,
} from "@/components/ui";

export function Accounts({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-13 flex-none items-center py-1 pr-2 pl-5">
        <span className="flex-1 font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.accounts}</span>
        <HeaderActions v={v} />
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-24">
        <div className="flex flex-col gap-1.5 px-1.5 pt-2 pb-1.5">
          <span className={LABEL}>{v.t.totalAcross}</span>
          <div className="flex items-baseline gap-2.25">
            <span className="font-display text-[24px] font-bold">Rs</span>
            <span className="font-display text-[54px] font-extrabold leading-[.95] tracking-[-0.03em]">{v.totalBal}</span>
          </div>
          <span className="truncate text-[13px] leading-[1.5] text-ink-2">{v.totalMeta}</span>
        </div>

        <div onClick={v.toSync} className="flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: v.syncStripBg }}>
          <Icon d={v.syncIconD} size={20} style={{ color: v.syncIconFg }} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold leading-[1.45] text-ink-2">{v.syncStripLine}</span>
          <Chevron />
        </div>

        <div className={cx(CARD, "px-4 py-0.5")}>
          {v.acctRows.map((a: V, i: number) => (
            <div key={i} onClick={a.tap} className="flex cursor-pointer items-center gap-3 border-b border-line py-3.25">
              <Tile d={a.icon} tint={a.tint} fg={a.ifg} className="size-9.5" size={20} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14px] font-semibold leading-[1.35]">{a.name}</span>
                <span className="truncate text-[12.5px] leading-[1.4] text-ink-3">{a.meta}</span>
              </div>
              <Amount>{a.balance}</Amount>
              <Chevron />
            </div>
          ))}
          <div onClick={v.toSrcNew} className="flex cursor-pointer items-center gap-3 py-3 text-action">
            <span className="flex size-9.5 flex-none items-center justify-center rounded-xl border-[1.5px] border-dashed border-bar-dim"><Icon d={P.plus} size={19} /></span>
            <span className="text-[14px] font-semibold">{v.t.addAccount}</span>
          </div>
        </div>

        <GoalCard v={v} />
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
          <span onClick={v.srcEdit} className="w-fit cursor-pointer text-[12px] font-semibold" style={{ color: v.srcAcctFg }}>{v.srcAcctLine}</span>
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
    <div onClick={onClick} className="mx-5 mt-2.5 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-surface px-3.75 py-3.25" style={{ borderColor: border }}>
      <div className="flex min-w-0 flex-col gap-0.75">
        <span className={LABEL}>{label}</span>
        <span className={cx("font-display", valueClass)} style={{ color: fg }}>{value}</span>
      </div>
      <span className="flex-none text-[12.5px] font-semibold" style={{ color: hintFg }}>{hint}</span>
    </div>
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
          <div onClick={v.srcDelete} className="mx-5 mt-1 mb-2.5 cursor-pointer rounded-2xl border border-line px-4 py-3.5 text-center text-[12.5px] font-semibold text-action">
            {v.srcDeleteLabel}
          </div>
        )}
      </div>
      <Keypad keys={v.newSrcKeys} />
      <div className="flex-none px-5 pt-3">
        <Cta onClick={v.newSrcCreate} bg={v.newSrcCtaBg} fg={v.newSrcCtaFg} className="p-4 text-[15px]">{v.newSrcCta}</Cta>
      </div>
    </div>
  );
}
