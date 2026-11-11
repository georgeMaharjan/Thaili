import { Chevron,Cta,Icon,PersonFields,Section,Seg,TopBar,cx } from "@/components/ui";
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

        <Section title={v.smsAccessTitle}>
          <p className="pb-3 text-[13px] leading-[1.6] text-ink-3">{v.smsAccessNote}</p>
          {v.smsBankRows.map(bank => (
            <button key={bank.key} role="switch" aria-checked={bank.on} onClick={bank.tap} className={cx(ROW, "press justify-between gap-4 text-left")}>
              <span className="text-[15px] font-medium">{bank.label}</span>
              <span className={cx("flex-none text-[14px] font-semibold", bank.on ? "text-pos" : "text-ink-3")}>{bank.stateLabel}</span>
            </button>
          ))}
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
