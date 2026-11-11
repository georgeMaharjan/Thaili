import { Chevron,Cta,Icon,P,PersonFields,Section,Seg,Toggle,TopBar,cx } from "@/components/ui";
import type { ReactNode } from "react";
import type { SettingsScreenModel as V } from "../features/settings/screen-model";

const SEG_ITEM = "rounded-[8px] px-4 py-2 text-[13px]";
const ROW = "flex min-h-[64px] w-full items-center gap-4 border-t border-line";

function Pref({ d, label, meta, children }: { d: string; label: string; meta: string; children: ReactNode }) {
  return (
    <div className={ROW}>
      <Icon d={d} size={20} sw={1.8} className="text-ink-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-medium">{label}</span>
        <span className="truncate text-[13px] text-ink-3">{meta}</span>
      </div>
      {children}
    </div>
  );
}

export function Settings({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.settingsBack} title={v.t.settings} />
      <div className="flex flex-1 flex-col gap-8 overflow-auto px-5 pt-2 pb-8">
        <div className="flex flex-col gap-3">
        <button onClick={v.toProfile} className="press flex items-center gap-4 py-1 text-left">
          <Initials text={v.userInitials} className="size-[52px] text-[20px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-display text-[20px] font-bold leading-[1.2]">{v.userName}</span>
            <span className="text-[13px] tabular-nums text-ink-3">{v.userPhone}</span>
          </div>
          <span className="flex-none text-[13px] font-semibold text-action">{v.editLabel}</span>
        </button>
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
          <Icon d="M7 3h10v18H7ZM11 18h2" size={20} className={v.storageProblem ? "text-action" : "text-ink-3"} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[14px] font-semibold">{v.storageTitle}</span>
            <span className="text-[13px] leading-[1.45] text-ink-3">{v.storageLine}</span>
          </div>
        </div>
        </div>

        <Section title={v.prefsTitle}>
          <Pref d="M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8ZM12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
            label={v.t.appearance} meta={v.t.appearanceMeta}>
            <Seg className="flex-none rounded-xl" itemClass={SEG_ITEM} items={[
              { label: v.t.light, tap: v.setLight, bg: v.lightBg, fg: v.lightFg, shadow: v.lightSh },
              { label: v.t.dark, tap: v.setDark, bg: v.darkBg, fg: v.darkFg, shadow: v.darkSh },
            ]} />
          </Pref>
          <Pref d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"
            label="Language · भाषा" meta={v.t.langMeta}>
            <Seg className="flex-none rounded-xl" itemClass={SEG_ITEM} items={[
              { label: "EN", tap: v.setEn, bg: v.enBg, fg: v.enFg, shadow: v.enSh },
              { label: "नेपाली", tap: v.setNp, bg: v.npBg, fg: v.npFg, shadow: v.npSh },
            ]} />
          </Pref>
          {/* Spacing: one multiplier on every gap and margin in the app. Text and touch targets keep their size. */}
          <div className="flex flex-col gap-3 border-t border-line py-4">
            <div className="flex items-center gap-4">
              <Icon d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M11 15v6" size={20} sw={1.8} className="text-ink-3" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-medium">{v.spacingLabel}</span>
                <span className="text-[13px] text-ink-3">{v.spacingMeta}</span>
              </div>
            </div>
            <Seg className="rounded-xl" itemClass="flex h-[40px] flex-1 items-center justify-center rounded-[8px] text-[14px]" items={v.densityOpts} />
          </div>
        </Section>

        <Section title={v.permissionTitle}>
          <p className="mb-4 text-[13px] leading-[1.5] text-ink-3">{v.permissionIntro}</p>
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            {v.permissionRows.map(permission => <button type="button" key={permission.key} onClick={permission.tap}
              className="press flex min-h-[96px] w-full items-start gap-3 border-t border-line px-4 py-4 text-left first:border-t-0">
              <span aria-hidden="true" className={cx("mt-0.5 flex size-[36px] flex-none items-center justify-center rounded-xl", permission.on ? "bg-tint-g text-pos" : "bg-surface-2 text-ink-2")}>
                <Icon d={permission.icon} size={19} sw={1.8} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.35]">{permission.label}</span>
                  <span className={cx("flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", permission.on ? "bg-tint-g text-pos" : "bg-surface-2 text-ink-3")}>
                    {permission.on && <Icon d={P.check} size={12} sw={2.5} />}{permission.state}
                  </span>
                </span>
                <span className="text-[13px] leading-[1.45] text-ink-3">{permission.detail}</span>
              </span>
              <Icon d={P.next} size={16} sw={2.2} className="mt-2 flex-none text-ink-3" />
            </button>)}
            <button type="button" onClick={v.openAndroidPermissions} className="press flex min-h-[48px] w-full items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-4 py-3 text-[13px] font-semibold text-ink-2">
              <span>{v.androidPermissionsLabel}</span><Icon d="M14 4h6v6M20 4 10 14M10 5H5v14h14v-5" size={16} />
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-ink-3">
            <Icon d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM12 10v6M12 7h.01" size={15} className="mt-0.5 flex-none" />
            <p className="text-[12px] leading-[1.5]">{v.permissionNote}</p>
          </div>
        </Section>

        <Section title={v.smsAccessTitle} action={<span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-semibold tabular-nums text-ink-2">{v.smsBankCount}</span>}>
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

        <Section title={v.manageTitle}>
          {v.settingRows.map((s, i: number) => (
            <button key={i} onClick={s.tap} className={cx(ROW, "press text-left")}>
              <Icon d={s.icon} size={20} sw={1.8} className="text-ink-3" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[16px] font-medium leading-[1.3]">{s.label}</span>
                <span className="truncate text-[13px] leading-[1.4] text-ink-3">{s.meta}</span>
              </div>
              <span className="flex-none text-[14px] font-semibold text-ink-2">{s.value}</span>
              <Chevron />
            </button>
          ))}
        </Section>
      </div>
    </div>
  );
}

const Initials = ({ text, className }: { text: string; className: string }) => (
  <span className={cx("flex flex-none items-center justify-center rounded-full bg-navy font-display font-bold text-canvas", className)}>{text}</span>
);

// Name and number, edited in place. The avatar follows the name as it is typed.
export function Profile({ v }: { v: V }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar onBack={v.profBack} title={v.profTitle} />
      <div className="flex flex-1 flex-col gap-8 overflow-auto px-5 pt-2 pb-6">
        <div className="flex flex-col items-center gap-3 pt-2">
          <Initials text={v.profInitials} className="size-[84px] text-[32px]" />
          <span className="text-[13px] text-ink-3">{v.profSince}</span>
        </div>
        <PersonFields editingLabel={v.numericEditingLabel} labels={v.regLabels} name={v.profName} onName={v.profNameType} nameBorder={v.profNameBorder}
          phone={v.profPhone} onPhone={v.profPhoneType} phoneBorder={v.profPhoneBorder} hint={v.profPhoneHint} hintFg={v.profPhoneHintFg} />
      </div>
      <div className="flex-none px-5 pt-3 pb-5">
        <Cta onClick={v.profSave} bg={v.profCtaBg} fg={v.profCtaFg} className="min-h-[52px] text-[15px]">{v.profCta}</Cta>
      </div>
    </div>
  );
}

export function Privacy({ v }: { v: V }) {
  return <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar onBack={v.privacyBack} title={v.privacyTitle} />
    <div className="flex flex-1 flex-col gap-6 overflow-auto px-5 pt-2 pb-8">
      {v.privacySections.map(section => <section key={section.title} className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-ink">{section.title}</h2>
        <p className="text-[14px] leading-[1.65] text-ink-2">{section.text}</p>
      </section>)}
    </div>
  </div>;
}
