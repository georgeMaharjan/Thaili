// Building blocks shared by every screen. Colours, fonts, radii and shadows are
// Tailwind theme tokens (see @theme in globals.css); colours that depend on state
// arrive ready-made from the view model in lib/logic.tsx.
import type { CSSProperties, ReactNode } from "react";

// The view model from ThailiLogic.renderVals(). logic.tsx is untyped, so this is too.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type V = any;

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Icon paths used by the screens themselves (data icons come from the view model). */
export const P = {
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6 6 18",
  next: "M9 6l6 6-6 6",
  expand: "M6 9l6 6 6-6",
  check: "M4 12.5l5.2 5L20 6.5",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
  trash: "M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
  cloudOff: "M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18ZM4 4l16 16",
  backspace: "M9 5h11v14H9l-6-7ZM12.5 9.5l5 5M17.5 9.5l-5 5",
  note: "M5 4h14v12l-4 4H5ZM15 20v-4h4M8.5 9h7M8.5 12.5h4",
  camera: "M4 8h3l2-2.5h6L17 8h3v11H4ZM12 9.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7Z",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  calendar: "M4 6h16v14H4ZM4 10h16M8 3.5v4M16 3.5v4",
  wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.8h.01",
  gear: "M12 8.9a3.1 3.1 0 1 0 0 6.2a3.1 3.1 0 1 0 0-6.2ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z",
};

// Class sets repeated across screens.
export const CARD = "rounded-card border border-line bg-surface";
export const H1 = "font-display text-[28px] font-bold leading-[1.18] tracking-[-0.015em]";
export const SUB = "text-pretty text-[13.5px] leading-[1.6] text-ink-2";
export const LABEL = "text-[13px] font-semibold text-ink-3";
const ROUND_BTN = "press flex size-11 flex-none items-center justify-center rounded-full";

export function Icon({ d, size = 22, sw = 2, className, style, children }: {
  d?: string; size?: number; sw?: number; className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" className={cx("flex-none", className)} style={style}>
      {d && <path d={d} />}
      {children}
    </svg>
  );
}

export const Chevron = () => <Icon d={P.next} size={16} sw={2.2} className="text-ink-3" />;

export function IconBtn({ d, label, onClick, className = "text-ink", style, size, sw, children }: {
  d?: string; label: string; onClick?: () => void; className?: string; style?: CSSProperties;
  size?: number; sw?: number; children?: ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} className={cx(ROUND_BTN, className)} style={style}>
      {children ?? <Icon d={d} size={size} sw={sw} />}
    </button>
  );
}

/** Sync and Settings shortcuts in the Home and Accounts headers. */
export function HeaderActions({ v }: { v: V }) {
  return (
    <div className="flex flex-none items-center">
      <IconBtn d={v.syncIconD} label="Sync" onClick={v.toSync} sw={1.9} className="" style={{ color: v.syncIconFg }} />
      <IconBtn d={P.wallet} label="Accounts" onClick={v.toAccounts} sw={1.8} className="text-ink-2" />
    </div>
  );
}

/** Back/close button, a title, and optional actions on the right. */
export function TopBar({ onBack, icon = P.back, label = "Back", title, children }: {
  onBack: () => void; icon?: string; label?: string; title?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex min-h-13 flex-none items-center gap-0.5 px-2 py-0.5">
      <IconBtn d={icon} label={label} onClick={onBack} />
      <span className="min-w-0 flex-1 truncate pl-1 font-display text-[18px] font-bold leading-[1.2]">{title}</span>
      {children}
    </div>
  );
}

/** Onboarding header: back, progress dots, step label, title and explainer. */
export function StepHead({ v, onBack, step, title, sub, className = "gap-2", titleClass = H1, subClass = SUB }: {
  v: V; onBack: () => void; step: ReactNode; title: ReactNode; sub: ReactNode;
  className?: string; titleClass?: string; subClass?: string;
}) {
  return (
    <div className={cx("flex flex-col", className)}>
      <div className="-mt-2.5 mb-0.5 -ml-3 flex items-center gap-2">
        <IconBtn d={P.back} label="Back" onClick={onBack} />
        <div className="flex flex-1 gap-1.25">
          {v.obDots.map((d: V, i: number) => <span key={i} className="h-1 flex-1 rounded-xs" style={{ background: d.bg }} />)}
        </div>
      </div>
      <div className="text-[13px] font-semibold text-action">{step}</div>
      <div className={titleClass}>{title}</div>
      <div className={subClass}>{sub}</div>
    </div>
  );
}

const BTN = {
  primary: "bg-action text-on-action",
  secondary: "border border-line bg-surface text-ink",
  navy: "bg-navy text-canvas",
};

/** The 52px-tall button. */
export function Btn({ onClick, kind = "primary", className, children }: {
  onClick?: () => void; kind?: keyof typeof BTN; className?: string; children: ReactNode;
}) {
  return (
    <button onClick={onClick} className={cx("press flex min-h-13 items-center justify-center rounded-2xl px-5.5 text-center text-[15px] font-semibold", BTN[kind], className)}>
      {children}
    </button>
  );
}

/** Full-width call to action whose colours say whether it is ready. `className` sets padding and size. */
export function Cta({ onClick, bg, fg, className, children }: {
  onClick: () => void; bg: string; fg: string; className: string; children: ReactNode;
}) {
  return (
    <button onClick={onClick} style={{ background: bg, color: fg }} className={cx("press w-full rounded-2xl text-center font-semibold", className)}>
      {children}
    </button>
  );
}

/** Centred text link under a call to action. */
export const TextLink = ({ onClick, className = "p-2 text-ink-3", children }: { onClick: () => void; className?: string; children: ReactNode }) => (
  <button onClick={onClick} className={cx("text-center text-[12.5px] font-semibold", className)}>{children}</button>
);

/** On/off switch drawn from the view model's `justify` and `track`. */
export function Toggle({ t, small }: { t: V; small?: boolean }) {
  return (
    <span className={cx("flex flex-none rounded-full p-0.75", small ? "h-6.75 w-11.5" : "h-7 w-12")} style={{ justifyContent: t.justify, background: t.track }}>
      <span className={cx("rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)]", small ? "size-5.25" : "size-5.5")} />
    </span>
  );
}

/** A pick-one chip; `c` is a chip() from the view model. */
export function Chip({ c, check = true, className = "px-3.5 py-3 text-[13.5px]" }: { c: V; check?: boolean; className?: string }) {
  return (
    <button onClick={c.tap} className={cx("press rounded-xl border leading-[1.3]", className)}
      style={{ background: c.bg, color: c.fg, borderColor: c.border, fontWeight: c.weight }}>
      {check && c.check}{c.label}
    </button>
  );
}

export const Chips = ({ items, className = "px-4 pt-2.25" }: { items: V[]; className?: string }) => (
  <div className={cx("flex flex-wrap gap-2", className)}>
    {items.map((c: V, i: number) => <Chip key={i} c={c} />)}
  </div>
);

/** Segmented control. `itemClass` sets each segment's padding, radius and text size. */
export function Seg({ items, itemClass, className = "rounded-xl" }: { items: V[]; itemClass: string; className?: string }) {
  return (
    <div className={cx("flex bg-surface-2 p-0.75", className)}>
      {items.map((x: V, i: number) => (
        <button key={i} onClick={x.tap} className={cx("font-semibold", itemClass)} style={{ background: x.bg, color: x.fg, boxShadow: x.shadow }}>{x.label}</button>
      ))}
    </div>
  );
}

export function Keypad({ keys, tall }: { keys: V[]; tall?: boolean }) {
  return (
    <div className="grid flex-none grid-cols-3 gap-px border-t border-line bg-line">
      {keys.map((k: V, i: number) => (
        <button key={i} onClick={k.tap} style={{ color: k.fg }}
          className={cx("press-bg flex items-center justify-center bg-canvas font-display font-semibold", tall ? "h-14.5 text-[24px]" : "h-13.5 text-[23px]")}>
          {k.isBack && <Icon d={P.backspace} size={24} sw={1.9} />}{k.label}
        </button>
      ))}
    </div>
  );
}

/** A big "Rs 12,000" readout above a keypad, with a caret. */
export function AmountEntry({ value, fg, className, caret }: { value: ReactNode; fg: string; className: string; caret: string }) {
  return (
    <div className="flex items-baseline gap-2.25 px-5 pt-2.5 pb-0.5">
      <span className="font-display text-[24px] font-bold text-ink-3">Rs</span>
      <span className={cx("font-display font-extrabold leading-none tracking-[-0.035em]", className)} style={{ color: fg }}>{value}</span>
      <span className={cx("w-0.5 bg-action", caret)} />
    </div>
  );
}

/** −/+ square button. */
export const Stepper = ({ onClick, small, children }: { onClick: () => void; small?: boolean; children: ReactNode }) => (
  <button onClick={onClick} className={cx("flex items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-2", small ? "size-10 text-[19px]" : "size-11 text-[20px]")}>
    {children}
  </button>
);

/** Rounded icon square. Colours come from `tint`/`fg`, or from classes in `className`. */
export function Tile({ d, tint, fg, className = "size-9", size = 19, sw = 1.9 }: {
  d: string; tint?: string; fg?: string; className?: string; size?: number; sw?: number;
}) {
  return (
    <span className={cx("flex flex-none items-center justify-center rounded-xl", className)} style={{ background: tint, color: fg }}>
      <Icon d={d} size={size} sw={sw} />
    </span>
  );
}

export const Amount = ({ fg, className = "text-[15px]", children }: { fg?: string; className?: string; children: ReactNode }) => (
  <span className={cx("flex-none whitespace-nowrap font-display font-semibold tabular-nums", className)} style={{ color: fg }}>{children}</span>
);

/** Icon tile, a title over a sub-line, and whatever goes on the right. `look` has icon/tint/ifg. */
export function ItemRow({ look, title, sub, subFg = "var(--ink3)", right, onClick, className }: {
  look: V; title: ReactNode; sub: ReactNode; subFg?: string; right?: ReactNode; onClick: () => void; className?: string;
}) {
  return (
    <button onClick={onClick} className={cx("press flex w-full items-center gap-3", className)}>
      <Tile d={look.icon} tint={look.tint} fg={look.ifg} />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[13.5px] leading-[1.35]">{title}</span>
        <span className="truncate text-[12.5px] leading-[1.4]" style={{ color: subFg }}>{sub}</span>
      </div>
      {right}
    </button>
  );
}

export const Bar = ({ width, color, className }: { width: string; color: string; className: string }) => (
  <div className={cx("overflow-hidden bg-bar-track", className)}>
    <div className="h-full" style={{ width, background: color }} />
  </div>
);

/** The ✓ list of what sync keeps. */
export const Includes = ({ v, title, className }: { v: V; title: string; className: string }) => (
  <div className={cx(CARD, "flex flex-col gap-2.25", className)}>
    <span className={LABEL}>{title}</span>
    {v.syncIncludes.map((x: V, i: number) => (
      <div key={i} className="flex items-start gap-2.25">
        <Icon d={P.check} size={13} sw={3} className="mt-1" style={{ color: x.fg }} />
        <span className="text-pretty text-[12.5px] leading-[1.55] text-ink-2">{x.text}</span>
      </div>
    ))}
  </div>
);

/** Savings floor summary on Home and Accounts; opens Goals. */
/** Page section: a quiet heading with an optional action on the right, then its rows. */
export const Section = ({ title, action, className, children }: { title: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) => (
  <div className={cx("flex flex-col", className)}>
    <div className="flex min-h-8 items-center justify-between pb-1">
      <span className="text-[15px] font-bold text-ink-2">{title}</span>{action}
    </div>
    {children}
  </div>
);

/** Small text link in a section heading ("See all", "Manage"). */
export const HeadLink = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button onClick={onClick} className="-my-2.5 py-2.5 pl-3 text-[13px] font-semibold text-action">{children}</button>
);

/** One transaction in a flat list: plain icon, title over category, amount. */
export function TxLine({ r, className = "min-h-15" }: { r: V; className?: string }) {
  return (
    <button onClick={r.tap} className={cx("press flex w-full items-center gap-3.5 border-t border-line text-left", className)}>
      <Icon d={r.icon} size={20} sw={1.8} className="text-ink-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[16px] font-medium leading-[1.3]">{r.title}</span>
        <span className="truncate text-[13px] leading-[1.35]" style={{ color: r.catFg || "var(--ink3)" }}>{r.cat ?? r.meta}</span>
      </div>
      <span className="flex-none whitespace-nowrap font-display text-[19px] font-bold tabular-nums" style={{ color: r.fg }}>{r.amount}</span>
    </button>
  );
}

export function GoalCard({ v }: { v: V }) {
  return (
    <button onClick={v.toGoal} className="press flex flex-col gap-2.5 rounded-card bg-tint-g px-5 py-4.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[14.5px] font-semibold text-pos">{v.goalName}</span>
        <span className="flex-none font-display text-[14px] font-bold text-pos">{v.goalLabel}</span>
      </div>
      <Bar width={v.goalWidth} color="var(--pos)" className="h-2 rounded-sm" />
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12.5px] leading-[1.5] text-ink-2">{v.goalNote}</span>
        <Icon d={P.next} size={18} className="text-pos" />
      </div>
    </button>
  );
}
