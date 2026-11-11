import { Chevron,Icon,P,Section,Toggle,TopBar,cx } from "@/components/ui";
import type { BankSmsScreenModel as V } from "../features/settings/bank-sms-screen-model";

export function BankSms({ v }: { v: V }) {
  return <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar onBack={v.bankSmsBack} title={v.smsAccessTitle} />
    <div className="flex flex-1 flex-col gap-6 overflow-auto px-5 pt-2 pb-8">
      <div className="rounded-card border border-line bg-surface px-4 py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">{v.smsPermissionTitle}</span>
          <span className={cx("rounded-full px-2 py-1 text-[12px] font-semibold", v.smsPermissionOn ? "bg-tint-g text-pos" : "bg-surface-2 text-ink-3")}>{v.smsPermissionState}</span>
        </div>
        <p className="mb-3 text-[13px] leading-[1.5] text-ink-3">{v.smsPermissionNote}</p>
        <button type="button" onClick={v.manageSmsPermission} className="press flex min-h-[44px] w-full items-center justify-between gap-3 border-t border-line pt-3 text-[14px] font-semibold text-action">
          <span>{v.smsPermissionAction}</span><Icon d="M14 4h6v6M20 4 10 14M10 5H5v14h14v-5" size={16} />
        </button>
      </div>
      <Section title={v.smsBanksTitle} action={<span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-semibold tabular-nums text-ink-2">{v.smsBankCount}</span>}>
        <p className="mb-4 mt-1 text-[13px] leading-[1.5] text-ink-3">{v.smsAccessIntro}</p>
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          {v.smsBankRows.map(bank => (
            <button type="button" key={bank.key} role="switch" aria-label={bank.label} aria-checked={bank.on} aria-describedby={"sms-bank-" + bank.key} onClick={bank.tap}
              className="press flex min-h-[80px] w-full items-center gap-3 border-t border-line px-4 py-4 text-left first:border-t-0">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[15px] font-semibold leading-[1.35]">{bank.label}</span>
                <span id={"sms-bank-" + bank.key} className="text-[12px] leading-[1.4] text-ink-3">{bank.detail}</span>
              </span>
              <span aria-hidden="true" className="flex flex-none items-center gap-2">
                <span className={cx("text-[12px] font-semibold", bank.on ? "text-action" : "text-ink-3")}>{bank.stateLabel}</span>
                <Toggle t={bank.toggle} />
              </span>
            </button>
          ))}
          {!v.smsBankRows.length && <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
            <span className="mb-1 flex size-[40px] items-center justify-center rounded-xl bg-tint-n text-ink-2"><Icon d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" size={22} /></span>
            <span className="text-[15px] font-semibold">{v.smsEmptyTitle}</span>
            <p className="text-[13px] leading-[1.5] text-ink-3">{v.smsEmptyNote}</p>
            <button type="button" onClick={v.openSmsAccounts} className="press mt-1 flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-action">{v.smsAccountsLabel}<Chevron /></button>
          </div>}
        </div>
        <details className="group mt-2 text-ink-3">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[12px] font-semibold [&::-webkit-details-marker]:hidden">
            <Icon d={P.expand} size={15} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />{v.smsAccessDetailsLabel}
          </summary>
          <p className="pb-3 text-[12px] leading-[1.6]">{v.smsAccessNote}</p>
        </details>
        <div className="mt-1 rounded-card border border-line bg-tint-n px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-ink">
            <Icon d={P.refresh} size={18} sw={1.9} /><span className="text-[14px] font-semibold">{v.smsRecoverTitle}</span>
          </div>
          <p id="sms-recovery-hint" className="mb-3 text-[13px] leading-[1.5] text-ink-2">{v.smsRecoverHint}</p>
          <button type="button" onClick={v.recoverBankSms} disabled={!v.smsCanRecover} aria-describedby="sms-recovery-hint" style={{ opacity: 1 }}
            className={cx("press flex min-h-[48px] w-full items-center justify-center rounded-xl px-3 py-3 text-center text-[14px] font-semibold", v.smsCanRecover ? "bg-action text-on-action" : "border border-line bg-surface text-ink-2")}>
            {v.smsRecoverLabel}
          </button>
        </div>
      </Section>
    </div>
  </div>;
}
