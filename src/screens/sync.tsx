// Turning sync on (email + code), joining from another phone, combining pouches, and the Sync screen.
// ponytail: these screens still run on the design's prototype data in logic.tsx (no real sync backend).
import { Amount, Btn, CARD, Cta, Icon, IconBtn, Includes, LABEL, P, Seg, StepHead, TextLink, Toggle, TopBar, cx, type V } from "@/components/ui";

const SMALL_BTN = "flex min-h-11 items-center gap-1.75 rounded-xl border border-line bg-surface px-3.5 text-[12.5px] font-semibold";
const SUB13 = "text-pretty text-[13px] leading-[1.6] text-ink-2";

export function Signup({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden pt-3.5 pb-5">
      <StepHead v={v} onBack={v.authBack} step={v.authStepLabel} title={v.authTitle} sub={v.authSub} className="flex-none gap-1.75 px-5"
        titleClass="font-display text-[26px] font-bold leading-[1.18] tracking-[-0.015em]" subClass={SUB13} />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {v.authPhoneStep && (
          <div className="flex flex-col gap-3.25 px-5 pt-4 pb-1.5">
            <div className="flex flex-col gap-1.75">
              <span className={LABEL}>Email</span>
              <input type="email" value={v.authEmail} onChange={v.authEmailType} placeholder="you@gmail.com" autoComplete="email"
                className="rounded-2xl border bg-surface px-4 py-3.75 text-[16px] text-ink outline-none" style={{ borderColor: v.authEmailBorder }} />
              <span className="text-[12.5px] leading-[1.5]" style={{ color: v.authEmailHintFg }}>{v.authEmailHint}</span>
            </div>
            <Includes v={v} title="What travels with the account" className="px-4.5 py-4" />
          </div>
        )}
        {v.authCodeStep && (
          <div className="flex flex-col gap-3.25 px-5 pt-5 pb-1.5">
            <div className="relative flex gap-2">
              {v.authCodeBoxes.map((b: V, i: number) => (
                <span key={i} className="flex h-14.5 flex-1 items-center justify-center rounded-2xl border bg-surface font-display text-[28px] font-bold text-ink" style={{ borderColor: b.border }}>{b.ch}</span>
              ))}
              <input value={v.authCode} onChange={v.authCodeType} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Six-digit code"
                className="absolute inset-0 size-full cursor-text bg-transparent text-[16px] opacity-0" />
            </div>
            <span className="text-[12.5px] leading-[1.6] text-ink-2">{v.authCodeNote}</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={v.authPaste} className={cx(SMALL_BTN, "text-ink-2")}><Icon d="M8 4h8v3H8ZM6 5.5H5v15h14v-15h-1" size={16} />{v.t.paste}</button>
              <button onClick={v.authResend} className={SMALL_BTN} style={{ color: v.authResendFg }}><Icon d={P.refresh} size={16} />{v.authResendLabel}</button>
              <button onClick={v.authEditPhone} className={cx(SMALL_BTN, "text-ink-2")}><Icon d={P.edit} size={16} />{v.t.email}</button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-none flex-col gap-2 px-5 pt-3">
        <Cta onClick={v.authSubmit} bg={v.authCtaBg} fg={v.authCtaFg} className="p-4 text-[15px]">{v.authCta}</Cta>
        {v.authShowJoin && <TextLink onClick={v.authJoin} className="p-2 text-action">{v.t.joinOther}</TextLink>}
        <TextLink onClick={v.authSkip}>{v.authSkipLabel}</TextLink>
      </div>
    </div>
  );
}

export function Restore({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 overflow-auto px-5 pt-4 pb-6.5">
      <StepHead v={v} onBack={v.restoreBack} step={v.t.joinLabel} title="Your pouch is waiting" sub={v.restoreLine} className="gap-1.75"
        titleClass="font-display text-[27px] font-bold leading-[1.18] tracking-[-0.015em]" subClass={SUB13} />
      <div className={cx(CARD, "grid grid-cols-2 gap-4 p-4.5")}>
        {v.restoreStats.map((r: V, i: number) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="font-display text-[27px] font-extrabold leading-none tracking-[-0.02em]">{r.value}</span>
            <span className="text-[12.5px] leading-[1.4] text-ink-3">{r.label}</span>
          </div>
        ))}
      </div>
      <div className="text-pretty rounded-card bg-tint-n px-4.5 py-4 text-[12.5px] leading-[1.6] text-ink-2">{v.t.restoreNote}</div>
      <div className="flex-1" />
      <Btn onClick={v.restoreNow}>{v.t.restoreCta}</Btn>
      <TextLink onClick={v.restoreFresh} className="p-2.5 text-ink-3">{v.t.restoreOther}</TextLink>
    </div>
  );
}

export function Merge({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.mergeBack} title={v.t.combine} />
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pt-1 pb-4">
        <div className="flex flex-col gap-1.5 px-1.5 pb-1">
          <span className="font-display text-[26px] font-bold leading-[1.2] tracking-[-0.015em]">{v.mergeTitle}</span>
          <span className={SUB13}>{v.mergeSub}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {v.mergeSides.map((m: V, i: number) => (
            <div key={i} className={cx(CARD, "flex flex-col gap-1.5 p-4")}>
              <span className="flex items-center gap-1.75 text-[13px] font-semibold text-ink-3"><Icon d={m.icon} size={15} />{m.label}</span>
              <span className="font-display text-[32px] font-extrabold leading-none tracking-[-0.02em]">{m.count}</span>
              <span className="text-[12.5px] leading-[1.4] text-ink-3">{m.meta}</span>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-card bg-tint-g px-4 py-3.5">
          <Icon d={P.check} size={18} className="mt-0.5 text-pos" />
          <span className="text-pretty text-[12.5px] leading-[1.55] text-ink-2">{v.mergeSameLine}</span>
        </div>
        <div className={cx(CARD, "flex flex-col gap-3 px-4.5 pt-4 pb-1.5")}>
          <span className="text-[13px] font-semibold text-warn-ink">{v.t.lookSame}</span>
          {v.mergePairs.map((p: V, i: number) => (
            <div key={i} className="flex flex-col gap-2.5 border-b border-line pb-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13.5px] font-semibold leading-[1.35]">{p.title}</span>
                  <span className="text-[12.5px] leading-[1.4] text-ink-3">{p.meta}</span>
                </div>
                <Amount>{p.amount}</Amount>
              </div>
              <Seg itemClass="flex-1 rounded-[9px] px-1.5 py-2.75 text-center text-[12.5px]" items={[
                { label: v.t.sameSpend, tap: p.setSame, bg: p.sameBg, fg: p.sameFg },
                { label: v.t.keepBoth, tap: p.setBoth, bg: p.bothBg, fg: p.bothFg },
              ]} />
            </div>
          ))}
        </div>
        <div className={cx(CARD, "flex flex-col gap-2.5 px-4.5 py-4")}>
          <span className="text-[13px] font-semibold text-warn-ink">{v.t.balDiffers}</span>
          <span className="text-pretty text-[12.5px] leading-[1.55] text-ink-2">{v.mergeBalLine}</span>
          {v.mergeBalOpts.map((o: V, i: number) => (
            <button key={i} onClick={o.tap} className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] px-3.75 py-3" style={{ borderColor: o.border, background: o.bg }}>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold">{o.label}</span>
                <span className="text-[12.5px] text-ink-3">{o.meta}</span>
              </div>
              <span className="flex-none font-display text-[16px] font-bold">{o.amount}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-none flex-col gap-1 border-t border-line px-5 pt-3 pb-5">
        <Cta onClick={v.mergeNow} bg={v.mergeCtaBg} fg={v.mergeCtaFg} className="p-4 text-[15px]">{v.mergeCta}</Cta>
        <TextLink onClick={v.mergeReplace} className="p-2.5 text-ink-3">{v.t.useSyncedOnly}</TextLink>
      </div>
    </div>
  );
}

export function Sync({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.syncBack} title={v.t.sync} />
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pb-7">
        {v.signedIn ? (
          <div className="flex flex-col gap-3">
            <div className={cx(CARD, "flex flex-col gap-3 p-5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.75">
                  <span className="wrap-anywhere font-display text-[19px] font-bold">{v.acctPhone}</span>
                  <span className="text-[12px] text-ink-3">{v.acctSince}</span>
                </div>
                <span className="flex flex-none items-center gap-1.25 rounded-[10px] bg-tint-g px-2.5 py-1.5 text-[12.5px] font-bold text-pos">
                  <Icon d={P.check} size={13} />{v.t.syncOn}
                </span>
              </div>
              <div className="h-px bg-line" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-ink-2">{v.syncStatus}</span>
                <IconBtn d={P.refresh} label="Sync now" onClick={v.backupNow} className="-my-2.5 -mr-2.5 text-action" />
              </div>
            </div>
            <div className={cx(CARD, "px-4.5 py-1.5")}>
              {v.deviceRows.map((d: V, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-line py-3.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13.5px] font-semibold leading-[1.35]">{d.name}</span>
                    <span className="truncate text-[12.5px] leading-[1.4] text-ink-3">{d.meta}</span>
                  </div>
                  {d.cur
                    ? <span className="flex-none rounded-lg bg-tint-g px-2.25 py-1.25 text-[12.5px] font-bold text-pos">{v.t.thisPhone}</span>
                    : <IconBtn d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" label="Remove this phone" onClick={d.tap} className="-my-2 -mr-2.5 text-action" />}
                </div>
              ))}
            </div>
            <div className={cx(CARD, "flex flex-col gap-3 px-4.5 py-3.5")}>
              {v.syncToggles.map((t: V, i: number) => (
                <button key={i} onClick={t.tap} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13.5px] font-semibold">{t.label}</span>
                    <span className="truncate text-[12.5px] leading-[1.5] text-ink-3">{t.meta}</span>
                  </div>
                  <Toggle t={t} small />
                </button>
              ))}
            </div>
            <Includes v={v} title="Kept in your account" className="p-4.5" />
            <button onClick={v.askStopSync} className="flex items-center justify-center gap-2 rounded-card border border-line p-3.75 text-[13px] font-semibold text-action">
              <Icon d={P.cloudOff} size={17} />{v.t.stopSync}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.25 rounded-card border border-warn bg-tint-w p-5">
              <span className="flex items-center gap-2.25 font-display text-[20px] font-bold text-warn-ink"><Icon d={P.cloudOff} />{v.t.syncOffTitle}</span>
              <span className="text-pretty text-[12.5px] leading-[1.6] text-ink-2">{v.acctCardLine}</span>
              <Btn onClick={v.startCreate} className="mt-1">{v.t.turnOnSync}</Btn>
            </div>
            <button onClick={v.startRestore} className="rounded-card border border-line p-3.75 text-center text-[13px] font-semibold text-ink-2">{v.t.joinOther}</button>
          </div>
        )}
      </div>
    </div>
  );
}
