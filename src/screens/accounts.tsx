// Accounts, one account, and the add/edit account form.
import {
  Amount, BalEye, CARD, Chevron, Chips, Cta, GoalCard, Hero, Icon, IconBtn, ItemRow, Keypad, LABEL, P, Seg, Tile, TopBar, cx, type V,
} from "@/components/ui";

export function Accounts({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-[52px] flex-none items-center px-5 py-1">
        <span className="font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.accounts}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-5 pt-2 pb-[104px]">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5"><span className={LABEL}>{v.t.totalAcross}</span><BalEye v={v} /></span>
          <Hero value={v.totalBal} fs={v.balFs} />
          <span className="truncate text-[13px] leading-[1.5] text-ink-2">{v.totalMeta}</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex h-[10px] gap-0.5 overflow-hidden rounded-[5px] bg-bar-track">
            {v.acctSplit.map((g: V, i: number) => <div key={i} className="h-full" style={{ width: g.width, background: g.color }} />)}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {v.acctSplit.map((g: V, i: number) => (
              <span key={i} className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2">
                <span className="size-[8px] flex-none rounded-full" style={{ background: g.color }} />{g.label}<span className="font-semibold text-ink">{g.pct}</span>
              </span>
            ))}
          </div>
        </div>

        <GoalCard v={v} />

        <button onClick={v.enableTransactionNotifications} className="press flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14px] font-semibold">{v.transactionNotificationsLabel}</span>
            <span className="text-[12px] leading-[1.5] text-ink-3">{v.transactionNotificationsNote}</span>
          </div>
          <span className="flex-none text-[13px] font-semibold text-action">{v.transactionNotificationsStatus}</span>
        </button>

        {v.acctGroups.map((grp: V) => (
          <div key={grp.key} className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center gap-2">
              <span className="flex h-[24px] items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold" style={{ background: grp.tint, color: grp.fg }}>
                <Icon d={grp.icon} size={14} sw={2.2} />{grp.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">{grp.hint}</span>
              <Amount className="text-[15px] font-bold">{grp.total}</Amount>
            </div>
            <div className="rounded-2xl border border-line bg-surface px-4">
              {grp.rows.map((a: V, i: number) => (
                <button key={i} onClick={a.tap} className={cx("flex min-h-[64px] w-full items-center gap-3 text-left", i > 0 && "border-t border-line")}>
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

        <button onClick={v.scanAccountApps} className="press mt-1 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-action">
          <Icon d={P.refresh} size={18} /><span className="text-[14px] font-semibold">{v.scanAccountAppsLabel}</span>
        </button>
        <button onClick={v.toSrcNew} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-bar-dim text-action">
          <Icon d={P.plus} size={18} /><span className="text-[14px] font-semibold">{v.t.addAccount}</span>
        </button>
      </div>
    </div>
  );
}

export function SourceDetail({ v }: { v: V }) {
  const flow = "flex flex-1 flex-col gap-1 rounded-2xl p-4";
  const flowLabel = "flex items-center gap-1.5 text-[13px] font-semibold";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.sourceBack}>
        <IconBtn d={P.edit} label="Edit account" onClick={v.srcEdit} />
      </TopBar>
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-5 pb-8">
        <div className="flex flex-col gap-1 pt-1.5 pb-3">
          <span className="min-w-0 truncate font-display text-[22px] font-bold tracking-[-0.01em]">{v.srcName}</span>
          <span className="font-display text-[52px] font-extrabold leading-[1.05] tracking-[-0.03em]">{v.srcBalance}</span>
          <span className="text-[12px] text-ink-3">{v.srcMeta}</span>
          <button onClick={v.srcEdit} className="w-fit text-[12px] font-semibold" style={{ color: v.srcAcctFg }}>{v.srcAcctLine}</button>
        </div>
        <div className="flex gap-3">
          <div className={cx(flow, "bg-tint-g text-pos")}>
            <span className={flowLabel}><Icon d={P.arrowDown} size={15} sw={2.2} />{v.t.inL}</span>
            <span className="font-display text-[22px] font-bold">{v.srcIn}</span>
          </div>
          <div className={cx(flow, "bg-tint-n text-navy")}>
            <span className={flowLabel}><Icon d={P.arrowUp} size={15} sw={2.2} />{v.t.outL}</span>
            <span className="font-display text-[22px] font-bold">{v.srcOut}</span>
          </div>
        </div>
        <div className={cx(CARD, "flex flex-col gap-3 px-5 py-4")}>
          <span className={LABEL}>Purpose</span>
          <Seg items={v.roleChips} itemClass="flex-1 rounded-[8px] p-2 text-center text-[13px]" />
        </div>
        <div className={cx(CARD, "-mt-px flex flex-col px-5")}>
          {v.srcTxns.map((x: V, i: number) => (
            <ItemRow key={i} look={x} title={x.title} sub={x.meta} onClick={x.tap} className="min-h-[60px] border-b border-line" right={<Amount fg={x.fg}>{x.amount}</Amount>} />
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
    <button onClick={onClick} className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-3" style={{ borderColor: border }}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={LABEL}>{label}</span>
        <span className={cx("font-display", valueClass)} style={{ color: fg }}>{value}</span>
      </div>
      <span className="flex-none text-[13px] font-semibold" style={{ color: hintFg }}>{hint}</span>
    </button>
  );
}

export function SrcNew({ v }: { v: V }) {
  const heading = "px-5 text-[13px] font-semibold text-ink-3";
  const seg = "flex-1 rounded-[10px] px-1 py-3 text-center text-[13px]";
  return (
    <div className="flex flex-1 flex-col overflow-hidden pt-2 pb-6">
      <TopBar onBack={v.srcNewCancel} icon={P.close} label="Cancel" title={v.srcNewTitle} />
      <div className="flex flex-1 flex-col overflow-auto">
        {v.srcNeedsAcct && (
          <Field onClick={v.pickAcctField} border={v.acctFieldBorder} label={v.acctFieldLabel} value={v.newSrcAcctLabel}
            valueClass="text-[22px] font-bold tracking-[-0.01em]" fg={v.newSrcAcctFg} hint={v.acctFieldHint} hintFg={v.acctFieldHintFg} />
        )}
        <Field onClick={v.pickAmtField} border={v.amtFieldBorder} label="Opening balance" value={"Rs " + v.newSrcAmtLabel}
          valueClass="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]" fg={v.newSrcAmtFg} hint={v.amtFieldHint} hintFg={v.amtFieldHintFg} />
        <div className="text-pretty px-5 pt-2 text-[12px] leading-[1.5] text-ink-3">{v.newSrcOpeningNote}</div>
        <div className={cx(heading, "pt-4")}>What kind</div>
        <div className="px-5 pt-2"><Seg items={v.newSrcKinds} itemClass={seg} /></div>
        <div className={cx(heading, "pt-4")}>{v.newSrcPickLabel}</div>
        <Chips items={v.newSrcNameChips} />
        <div className={cx(heading, "pt-4")}>What is it for</div>
        <div className="px-5 pt-2"><Seg items={v.newSrcRoles} itemClass={seg} /></div>
        <div className="text-pretty px-5 pt-3 pb-2 text-[13px] leading-[1.6] text-ink-2">{v.newSrcFeedNote}</div>
        {v.isEditSrc && (
          <button onClick={v.srcDelete} className="mx-5 mt-1 mb-3 rounded-2xl border border-line px-4 py-4 text-center text-[13px] font-semibold text-action">
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
