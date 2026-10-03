import type { ReactNode } from "react";
import { Chevron, Icon, IconBtn, Section, Seg, cx, type V } from "@/components/ui";

const SEG_ITEM = "rounded-[9px] px-3.5 py-2.25 text-[13px]";
const ROW = "flex min-h-16 w-full items-center gap-3.5 border-t border-line";

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
      <div className="flex min-h-13 flex-none items-center py-1 pr-2 pl-5">
        <span className="flex-1 font-display text-[28px] font-bold tracking-[-0.015em]">{v.t.settings}</span>
        <IconBtn d={v.syncIconD} label="Sync" onClick={v.toSync} sw={1.9} className="" style={{ color: v.syncIconFg }} />
      </div>
      <div className="flex flex-1 flex-col gap-8 overflow-auto px-5 pt-2 pb-26">
        <button onClick={v.toSync} className="press flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left" style={{ background: v.acctCardBg }}>
          <Icon d={v.syncIconD} sw={1.9} style={{ color: v.acctCardFg }} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="wrap-anywhere text-[16px] font-semibold leading-[1.3]">{v.acctCardTitle}</span>
            <span className="text-[13px] leading-[1.45] text-ink-2">{v.acctCardLine}</span>
          </div>
          <Chevron />
        </button>

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
        </Section>

        <Section title={v.manageTitle}>
          {v.settingRows.map((s: V, i: number) => (
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
