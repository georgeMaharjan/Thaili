import type { Screen as ScreenName } from "../application/routes";
// Picks the screen for v.screen and draws what floats above it: tab bar, sheets, toast.
import { Sheet } from "@/components/sheet";
import { Btn,Icon,P,cx,type V } from "@/components/ui";
import type { ComponentType } from "react";
import { Accounts,SourceDetail,SrcNew } from "./accounts";
import { GoalNew,Goals } from "./goals";
import { Add,Home,Stack } from "./home";
import { Baseline,Flow,Insights,Leaks } from "./insights";
import { Cats,Detect,Permission,Register,Scan,Source,Welcome } from "./onboarding";
import { Privacy,Profile,Settings } from "./settings";
import { BankSms } from "./bank-sms";
import { Detail,Rules,Txns } from "./transactions";

const SCREENS: Record<ScreenName, ComponentType<{ v: V }>> = {
  welcome: Welcome, register: Register, permission: Permission, detect: Detect, source: Source, "src-new": SrcNew, scan: Scan, cats: Cats,
  home: Home, txns: Txns, stack: Stack, detail: Detail, insights: Insights, flow: Flow, leaks: Leaks, baseline: Baseline, add: Add, rules: Rules,
  accounts: Accounts, "source-detail": SourceDetail, goals: Goals, "goal-new": GoalNew, settings: Settings, "bank-sms": BankSms, profile: Profile, privacy: Privacy,
};

export default function Screens({ v }: { v: V }) {
  const Screen = SCREENS[v.screen];
  return (<>
    <Screen v={v} />
    {v.showTabs && <TabBar v={v} />}
    {v.discardAdd && <Sheet title="Discard this entry?" onClose={v.keepAdd}><p className="text-[14px] text-ink-2">Your unfinished transaction has not been saved.</p><Btn onClick={v.keepAdd}>Keep editing</Btn><Btn kind="secondary" onClick={v.discardEntry}>Discard entry</Btn></Sheet>}
    {v.discardGoal && <Sheet title="Discard this goal?" onClose={v.keepGoal}><p className="text-[14px] text-ink-2">Your goal has not been saved.</p><Btn onClick={v.keepGoal}>Keep editing</Btn><Btn kind="secondary" onClick={v.discardGoalEntry}>Discard goal</Btn></Sheet>}
    {v.deleting && <DeleteSheet v={v} />}
    {v.hasToast && (
      <div className="pointer-events-none absolute inset-x-[16px] flex items-center justify-between gap-2 rounded-[16px] bg-toast-bg py-2 pr-2 pl-4 text-toast-fg shadow-[0_10px_26px_rgba(0,0,0,.28)]" style={{ bottom: v.toastBottom }}>
        <span role="status" aria-atomic="true" className="min-w-0 flex-1 text-[13px] leading-[1.45] break-words">{v.toast}</span>
        {v.canUndo && <button type="button" onClick={v.undo} className="pointer-events-auto min-h-[44px] min-w-[44px] flex-none px-2 text-[13px] font-bold text-toast-accent">Undo</button>}
        <button type="button" onClick={v.dismissToast} aria-label={v.dismissToastLabel}
          className="pointer-events-auto flex size-[44px] flex-none items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2">
          <Icon d={P.close} size={18} />
        </button>
      </div>
    )}
  </>);
}

// Icon-only: the label is the button's accessible name.
const TABS = [
  { key: "home", label: "home", d: "M3.5 10.5 12 3.8l8.5 6.7V20a1 1 0 0 1-1 1h-4v-6h-7v6h-4a1 1 0 0 1-1-1Z" },
  { key: "txns", label: "txns", d: "M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6L7.4 19 5 20.5ZM9 9h6M9 13h4" },
  { key: "insights", label: "insights", d: "M5 20v-6M12 20V7M19 20v-9" },
  { key: "accounts", label: "accounts", d: P.wallet },
] as const;

function TabBar({ v }: { v: V }) {
  const tab = (t: (typeof TABS)[number]) => {
    const on = v.screen === t.key;
    return (
      <button key={t.key} onClick={() => v.goTab(t.key)} aria-label={v.t[t.label]} aria-current={on ? "page" : undefined}
        className={cx("relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[12px]", on ? "font-semibold text-action" : "text-ink-3")}>
        <Icon d={t.d} size={21} sw={on ? 2.2 : 1.7} /><span>{v.t[t.label]}</span>
        {t.key === "txns" && v.hasReview && (
          <span className="absolute top-0 right-[calc(50%-22px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-action px-1 text-[12px] font-bold text-on-action">{v.reviewCount}</span>
        )}
      </button>
    );
  };
  return (
    <nav aria-label="Main navigation" className="relative flex h-[72px] flex-none items-center border-t border-line bg-surface px-2">
      {TABS.slice(0, 2).map(tab)}
      <div className="w-[68px] flex-none" />
      {TABS.slice(2).map(tab)}
      <button onClick={v.toAdd} aria-label={v.t.quickAdd} className="press absolute top-1/2 left-1/2 z-2 flex size-[48px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[16px] bg-action text-on-action">
        <Icon d="M12 5.5v13M5.5 12h13" size={22} sw={2} /><span className="text-[12px]">Add</span>
      </button>
    </nav>
  );
}

function DeleteSheet({ v }: { v: V }) {
  return (
    <Sheet title="Delete transaction?" onClose={v.cancelDelete}>

      <span className="text-pretty text-[13px] leading-[1.6] text-ink-2">
        This removes the entry from your pouch. You can undo immediately after deleting.
      </span>
      <div className="flex gap-3 pt-1">
        <button onClick={v.cancelDelete} className="flex-1 rounded-xl border border-line bg-surface-2 p-4 text-center text-[14px] font-semibold text-ink-2">Cancel</button>
        <Btn onClick={v.confirmDelete} className="flex-1">Delete entry</Btn>
      </div>
    </Sheet>
  );
}
