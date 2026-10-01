import type { ReactNode } from "react";
import { CARD, Chevron, Icon, IconBtn, Seg, Tile, cx, type V } from "@/components/ui";

const SEG_ITEM = "rounded-[9px] px-3.5 py-2.5 text-[13px]";

function Pref({ d, label, meta, children }: { d: string; label: string; meta: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Tile d={d} className="size-9 bg-surface-2 text-ink-2" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-medium">{label}</span>
        <span className="truncate text-[12.5px] text-ink-3">{meta}</span>
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
      <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 pt-1 pb-24">
        <button onClick={v.toSync} className="flex items-center gap-3.5 rounded-card border p-4" style={{ background: v.acctCardBg, borderColor: v.acctCardBorder }}>
          <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-surface" style={{ color: v.acctCardFg }}><Icon d={v.syncIconD} sw={1.9} /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <span className="wrap-anywhere text-[14px] font-semibold" style={{ color: v.acctCardFg }}>{v.acctCardTitle}</span>
            <span className="truncate text-[12px] leading-[1.5] text-ink-2">{v.acctCardLine}</span>
          </div>
          <Chevron />
        </button>

        <div className={cx(CARD, "flex flex-col gap-3 px-4 py-3")}>
          <Pref d="M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8ZM12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
            label={v.t.appearance} meta={v.t.appearanceMeta}>
            <Seg className="flex-none rounded-xl" itemClass={SEG_ITEM} items={[
              { label: v.t.light, tap: v.setLight, bg: v.lightBg, fg: v.lightFg },
              { label: v.t.dark, tap: v.setDark, bg: v.darkBg, fg: v.darkFg },
            ]} />
          </Pref>
          <div className="h-px bg-line" />
          <Pref d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"
            label="Language · भाषा" meta={v.t.langMeta}>
            <Seg className="flex-none rounded-xl" itemClass={SEG_ITEM} items={[
              { label: "EN", tap: v.setEn, bg: v.enBg, fg: v.enFg },
              { label: "नेपाली", tap: v.setNp, bg: v.npBg, fg: v.npFg },
            ]} />
          </Pref>
        </div>

        <div className={cx(CARD, "px-4 py-0.5")}>
          {v.settingRows.map((s: V, i: number) => (
            <button key={i} onClick={s.tap} className="flex w-full items-center gap-3 border-b border-line py-3">
              <Tile d={s.icon} className="size-9 bg-surface-2 text-ink-2" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14px] font-medium leading-[1.35]">{s.label}</span>
                <span className="truncate text-[12.5px] leading-[1.4] text-ink-3">{s.meta}</span>
              </div>
              <span className="flex-none text-[12.5px] font-semibold text-ink-2">{s.value}</span>
              <Chevron />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
