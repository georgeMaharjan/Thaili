// Picks the screen for v.screen and draws what floats above it: tab bar, sheets, toast.
import type { ComponentType, ReactNode } from "react";
import { Btn, Icon, P, Tile, cx, type V } from "@/components/ui";
import { Accounts, SourceDetail, SrcNew } from "./accounts";
import { GoalNew, Goals } from "./goals";
import { Add, Home, Stack, Weekly } from "./home";
import { Baseline, Flow, Insights, Leaks } from "./insights";
import { Cats, Detect, Permission, Scan, Source, Welcome } from "./onboarding";
import { Settings } from "./settings";
import { Merge, Restore, Signup, Sync } from "./sync";
import { Detail, Rules, Txns } from "./transactions";

const SCREENS: Record<string, ComponentType<{ v: V }>> = {
  welcome: Welcome, permission: Permission, detect: Detect, source: Source, "src-new": SrcNew, scan: Scan, cats: Cats,
  signup: Signup, restore: Restore, merge: Merge, sync: Sync,
  home: Home, txns: Txns, stack: Stack, detail: Detail, weekly: Weekly, insights: Insights, flow: Flow, leaks: Leaks, baseline: Baseline, add: Add, rules: Rules,
  accounts: Accounts, "source-detail": SourceDetail, goals: Goals, "goal-new": GoalNew, settings: Settings,
};

export default function Screens({ v }: { v: V }) {
  const Screen = SCREENS[v.screen];
  return (<>
    <Screen v={v} />
    {v.showTabs && <TabBar v={v} />}
    {v.deleting && <DeleteSheet v={v} />}
    {v.hasStopSheet && <StopSheet v={v} />}
    {v.hasToast && (
      <div className="absolute inset-x-4 flex items-center justify-between gap-3 rounded-[15px] bg-toast-bg px-4.5 py-3.5 text-toast-fg shadow-[0_10px_26px_rgba(0,0,0,.28)]" style={{ bottom: v.toastBottom }}>
        <span className="text-[13px] leading-[1.45]">{v.toast}</span>
        {v.canUndo && <button onClick={v.undo} className="flex-none text-[12.5px] font-bold text-toast-accent">Undo</button>}
      </div>
    )}
  </>);
}

const TABS = [
  { key: "home", label: "home", d: "M3.5 10.5 12 3.8l8.5 6.7V20a1 1 0 0 1-1 1h-4v-6h-7v6h-4a1 1 0 0 1-1-1Z" },
  { key: "txns", label: "txns", d: "M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6L7.4 19 5 20.5ZM9 9h6M9 13h4" },
  { key: "insights", label: "insights", d: "M5 20v-6M12 20V7M19 20v-9" },
  { key: "settings", label: "settings", d: P.gear },
];

function TabBar({ v }: { v: V }) {
  const tab = (t: (typeof TABS)[number]) => {
    const on = v.screen === t.key;
    return (
      <button key={t.key} onClick={() => v.goTab(t.key)} className={cx("relative flex h-14.5 flex-1 flex-col items-center justify-center gap-1", on ? "text-action" : "text-ink-3")}>
        <Icon d={t.d} sw={on ? 2.4 : 1.7} />
        <span className="text-[12.5px] font-semibold">{v.t[t.label]}</span>
        {t.key === "txns" && v.hasReview && (
          <span className="absolute -top-0.5 right-3.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-[9px] bg-action px-1.25 text-[12px] font-bold text-on-action">{v.reviewCount}</span>
        )}
      </button>
    );
  };
  return (
    <div className="relative flex h-18 flex-none items-center border-t border-line bg-surface px-2 shadow-[0_-8px_20px_rgba(64,48,24,.06)]">
      {TABS.slice(0, 2).map(tab)}
      <div className="w-17 flex-none" />
      {TABS.slice(2).map(tab)}
      <button onClick={v.toAdd} aria-label="Quick add" className="press absolute top-1/2 left-1/2 z-2 flex size-14.5 -translate-x-1/2 -translate-y-[82%] items-center justify-center rounded-[20px] border-4 border-canvas bg-action text-on-action shadow-[0_10px_24px_rgba(64,48,24,.28),0_2px_6px_rgba(64,48,24,.16)]">
        <Icon d="M12 5.5v13M5.5 12h13" size={26} sw={2.6} />
      </button>
    </div>
  );
}

const Sheet = ({ onClose, children, className }: { onClose?: () => void; children: ReactNode; className: string }) => (
  <div onClick={onClose} className="absolute inset-0 flex items-end bg-[rgba(34,30,25,.6)] p-4">
    <div onClick={(e) => e.stopPropagation()} className={cx("flex w-full flex-col rounded-card bg-surface", className)}>{children}</div>
  </div>
);

function DeleteSheet({ v }: { v: V }) {
  return (
    <Sheet className="gap-3.25 px-5.5 py-6.5">
      <span className="font-display text-[23px] font-bold">Confirm it&apos;s you</span>
      <span className="text-pretty text-[13px] leading-[1.6] text-ink-2">
        Your fingerprint or screen lock. The entry moves to Archive and can be brought back for 30 days — on every synced phone.
      </span>
      <div className="flex gap-2.5 pt-1">
        <button onClick={v.cancelDelete} className="flex-1 rounded-xl border border-line bg-surface-2 p-3.5 text-center text-[13.5px] font-semibold text-ink-2">Cancel</button>
        <Btn onClick={v.confirmDelete} className="flex-1">Use fingerprint</Btn>
      </div>
    </Sheet>
  );
}

function StopSheet({ v }: { v: V }) {
  const option = "flex items-center gap-3 rounded-2xl border p-3.5";
  return (
    <Sheet onClose={v.cancelStop} className="gap-2.5 px-4.5 pt-6 pb-2.5">
      <span className="px-1 font-display text-[23px] font-bold">{v.t.stopTitle}</span>
      <button onClick={v.stopThis} className={cx(option, "border-line")}>
        <Tile d={P.cloudOff} className="size-9 bg-surface-2 text-ink-2" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">{v.t.stopThis}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-3">{v.t.stopThisMeta}</span>
        </div>
      </button>
      <button onClick={v.deleteSynced} className={cx(option, "border-action")}>
        <Tile d={P.trash} className="size-9 bg-tint-r text-action" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-action">{v.t.delSynced}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-3">{v.t.delSyncedMeta}</span>
        </div>
      </button>
      <button onClick={v.cancelStop} className="p-3.5 text-center text-[13.5px] font-semibold text-ink-2">{v.t.cancel}</button>
    </Sheet>
  );
}
