import { Chevron,Icon,P,Section,Toggle,TopBar,cx } from "@/components/ui";
import type { BankSmsScreenModel as V } from "../features/settings/bank-sms-screen-model";

export function BankSms({ v }: { v: V }) {
  return <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar onBack={v.bankSmsBack} title={v.smsAccessTitle} />
    <div className="flex flex-1 flex-col gap-6 overflow-auto px-5 pt-2 pb-8">
      <div className="rounded-card border border-line bg-surface px-4 py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">{v.smsPermissionTitle}</span>
        </div>
        <p className="mb-3 text-[13px] leading-[1.5] text-ink-3">{v.smsPermissionNote}</p>
        <button type="button" onClick={v.manageSmsPermission} className="press flex min-h-[44px] w-full items-center justify-between gap-3 border-t border-line pt-3 text-[14px] font-semibold text-action">
          <span>{v.smsPermissionAction}</span><Icon d="M14 4h6v6M20 4 10 14M10 5H5v14h14v-5" size={16} />
        </button>
      </div>
      <Section title={v.smsBanksTitle} action={<span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-semibold tabular-nums text-ink-2">{v.smsBankCount}</span>}>
        <p className="mb-4 mt-1 text-[13px] leading-[1.5] text-ink-3">{v.smsAccessIntro}</p>
        <button type="button" onClick={v.refreshSmsSenders} disabled={v.smsSenderRefreshing || !v.smsSenderCanScan} aria-disabled={v.smsSenderRefreshing || !v.smsSenderCanScan}
          className="press mb-3 flex min-h-[40px] items-center gap-2 text-[13px] font-semibold text-action disabled:opacity-50">
          <Icon d="M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" size={16} />
          {v.smsSenderRefreshing ? v.smsSenderScanLabel : v.smsSenderRefreshLabel}
        </button>
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          {v.smsBankRows.map(bank => (
            <div key={bank.key} className="border-t border-line first:border-t-0">
              <button type="button" role="switch" aria-label={bank.label} aria-checked={bank.on} aria-describedby={"sms-bank-" + bank.key} onClick={bank.tap}
                className="press flex min-h-[76px] w-full items-center gap-3 px-4 py-4 text-left">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px] font-semibold leading-[1.35]">{bank.label}</span>
                  <span id={"sms-bank-" + bank.key} className="text-[12px] leading-[1.4] text-ink-3">{bank.detail}</span>
                </span>
                <span aria-hidden="true" className="flex flex-none items-center"><Toggle t={bank.toggle} /></span>
              </button>
              {bank.on && <div className="border-t border-line bg-surface-2 px-4 py-3">
                <p className="mb-2 text-[12px] font-semibold text-ink-2">{v.smsSenderChooseLabel}</p>
                {bank.senderRows.length ? bank.senderRows.map(sender => (
                  <button type="button" key={sender.id} role="checkbox" aria-checked={sender.selected} onClick={sender.tap}
                    className="press flex min-h-[44px] w-full items-center gap-3 text-left">
                    <span aria-hidden="true" className={cx("flex size-5 items-center justify-center rounded-md border", sender.selected ? "border-action bg-action text-on-action" : "border-line bg-surface text-ink-3")}>
                      {sender.selected && <Icon d="M5 12 10 17 20 7" size={14} sw={2.4} />}
                    </span>
                    <span className="break-all text-[14px] font-medium text-ink">{sender.id}</span>
                  </button>
                )) : <p className="text-[12px] leading-[1.5] text-ink-3">{v.smsSenderScanLabel}</p>}
              </div>}
            </div>
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
