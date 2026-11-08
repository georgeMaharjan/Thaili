// Building blocks shared by every screen. Colours, fonts, radii and shadows are
// Tailwind theme tokens (see @theme in globals.css); colours that depend on state
// arrive ready-made from the view model in lib/logic.tsx.
import { useRef,useState,type CSSProperties,type ReactNode } from "react";

// The composed application model is inferred from checked feature builders.
export type V = import("../features/view-model").AppViewModel;

export type ToggleModel = { justify: string; track: string };
export type ChipModel = { label: string; tap: () => void; bg: string; fg: string; border: string; weight?: CSSProperties["fontWeight"]; check?: string; dot?: string };
export type SegmentModel = { label: string; tap: () => void; bg: string; fg: string; shadow?: string };
export type KeyModel = { label: string; tap: () => void; fg: string; isBack?: boolean };
export type TransactionCardModel = { title: string; tap: () => void; icon: string; amount: string; fg: string; isUncat: boolean; chip: string; meta?: string };

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
  eye: "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z",
  eyeOff: "M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.3 6.9C3.9 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2",
  wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.8h.01",
  gear: "M12 8.9a3.1 3.1 0 1 0 0 6.2a3.1 3.1 0 1 0 0-6.2ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z",
};

// Class sets repeated across screens.
export const CARD = "rounded-card border border-line bg-surface";
export const H1 = "font-display text-[28px] font-bold leading-[1.18] tracking-[-0.015em]";
export const SUB = "text-pretty text-[14px] leading-[1.6] text-ink-2";
export const LABEL = "text-[13px] font-semibold text-ink-3";
const ROUND_BTN = "press flex size-[44px] flex-none items-center justify-center rounded-full";

export function Icon({ d, size = 22, sw = 2, className, style, children }: {
  d?: string; size?: number; sw?: number; className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw}
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
    <button type="button" onClick={onClick} aria-label={label} className={cx(ROUND_BTN, className)} style={style}>
      {children ?? <Icon d={d} size={size} sw={sw} />}
    </button>
  );
}

/** Back/close button, a title, and optional actions on the right. */
export function TopBar({ onBack, icon = P.back, label = "Back", title, children }: {
  onBack: () => void; icon?: string; label?: string; title?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] flex-none items-center gap-0.5 px-2 py-0.5">
      <IconBtn d={icon} label={label} onClick={onBack} />
      <span className="min-w-0 flex-1 truncate pl-1 font-display text-[18px] font-bold leading-[1.2]">{title}</span>
      {children}
    </div>
  );
}

/** Onboarding header: back, progress dots, step label, title and explainer. */
export function StepHead({ v, onBack, step, title, sub, className = "gap-2", titleClass = H1, subClass = SUB }: {
  v: Pick<V, "obDots">; onBack: () => void; step: ReactNode; title: ReactNode; sub: ReactNode;
  className?: string; titleClass?: string; subClass?: string;
}) {
  return (
    <div className={cx("flex flex-col", className)}>
      <div className="-mt-3 mb-0.5 -ml-3 flex items-center gap-2">
        <IconBtn d={P.back} label="Back" onClick={onBack} />
        <div className="flex flex-1 gap-1">
          {v.obDots.map((d, i: number) => <span key={i} className="h-[4px] flex-1 rounded-xs" style={{ background: d.bg }} />)}
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
    <button type="button" onClick={onClick} className={cx("press flex min-h-[52px] items-center justify-center rounded-2xl px-6 text-center text-[15px] font-semibold", BTN[kind], className)}>
      {children}
    </button>
  );
}

/** Full-width call to action whose colours say whether it is ready. `className` sets padding and size. */
export function Cta({ onClick, bg, fg, className, children }: {
  onClick: () => void; bg: string; fg: string; className: string; children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} style={{ background: bg, color: fg }} className={cx("press w-full rounded-2xl text-center font-semibold", className)}>
      {children}
    </button>
  );
}

/** Centred text link under a call to action. */
export const TextLink = ({ onClick, className = "p-2 text-ink-3", children }: { onClick: () => void; className?: string; children: ReactNode }) => (
  <button type="button" onClick={onClick} className={cx("text-center text-[13px] font-semibold", className)}>{children}</button>
);

/** On/off switch drawn from the view model's `justify` and `track`. */
export function Toggle({ t, small }: { t: ToggleModel; small?: boolean }) {
  return (
    <span className={cx("flex flex-none rounded-full p-1", small ? "h-[27px] w-[46px]" : "h-[28px] w-[48px]")} style={{ justifyContent: t.justify, background: t.track }}>
      <span className={cx("rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)]", small ? "size-[21px]" : "size-[22px]")} />
    </span>
  );
}

/** A pick-one chip; `c` is a chip() from the view model. */
export function Chip({ c, check = true, className = "px-4 py-3 text-[14px]" }: { c: ChipModel; check?: boolean; className?: string }) {
  return (
    <button type="button" onClick={c.tap} aria-pressed={Boolean(c.check)} className={cx("press rounded-xl border leading-[1.3]", c.dot && "flex items-center gap-2", className)}
      style={{ background: c.bg, color: c.fg, borderColor: c.border, fontWeight: c.weight }}>
      {c.dot && <span className="size-[8px] flex-none rounded-full" style={{ background: c.dot }} />}
      {check && c.check}{c.label}
    </button>
  );
}

export const Chips = ({ items, className = "px-5 pt-2" }: { items: ChipModel[]; className?: string }) => (
  <div className={cx("flex flex-wrap gap-2", className)}>
    {items.map((c, i: number) => <Chip key={i} c={c} />)}
  </div>
);

/** Segmented control. `itemClass` sets each segment's padding, radius and text size. */
export function Seg({ items, itemClass, className = "rounded-xl" }: { items: SegmentModel[]; itemClass: string; className?: string }) {
  return (
    <div className={cx("flex bg-surface-2 p-1", className)}>
      {items.map((x, i: number) => (
        <button type="button" key={i} onClick={x.tap} aria-pressed={x.bg !== "transparent"} className={cx("font-semibold", itemClass)} style={{ background: x.bg, color: x.fg, boxShadow: x.shadow }}>{x.label}</button>
      ))}
    </div>
  );
}

export function Keypad({ keys, tall }: { keys: KeyModel[]; tall?: boolean }) {
  return (
    <div className="grid flex-none grid-cols-3 gap-px border-t border-line bg-line">
      {keys.map((k, i: number) => (
        <button type="button" key={i} onClick={k.tap} style={{ color: k.fg }}
          className={cx("press-bg flex items-center justify-center bg-canvas font-display font-semibold", tall ? "h-[58px] text-[24px]" : "h-[54px] text-[24px]")}>
          {k.isBack && <Icon d={P.backspace} size={24} sw={1.9} />}{k.label}
        </button>
      ))}
    </div>
  );
}

/** A big "Rs 12,000" readout above a keypad, with a caret. */
export function AmountEntry({ value, fg, className, caret }: { value: ReactNode; fg: string; className: string; caret: string }) {
  return (
    <div className="flex items-baseline gap-2 px-5 pt-3 pb-0.5">
      <span className="font-display text-[22px] font-bold text-ink-3">Rs</span>
      <span className={cx("font-display font-extrabold leading-none tracking-[-0.035em]", className)} style={{ color: fg }}>{value}</span>
      <span className={cx("w-[2px] bg-action", caret)} />
    </div>
  );
}

/** −/+ square button. */
export const Stepper = ({ onClick, small, children }: { onClick: () => void; small?: boolean; children: ReactNode }) => (
  <button type="button" onClick={onClick} className={cx("flex items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-2", small ? "size-[40px] text-[20px]" : "size-[44px] text-[20px]")}>
    {children}
  </button>
);

/** Rounded icon square. Colours come from `tint`/`fg`, or from classes in `className`. */
export function Tile({ d, tint, fg, className = "size-[36px]", size = 19, sw = 1.9 }: {
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
  look: { icon: string; tint?: string; ifg?: string }; title: ReactNode; sub: ReactNode; subFg?: string; right?: ReactNode; onClick: () => void; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cx("press flex w-full items-center gap-3", className)}>
      <Tile d={look.icon} tint={look.tint} fg={look.ifg} />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[14px] leading-[1.35]">{title}</span>
        <span className="truncate text-[13px] leading-[1.4]" style={{ color: subFg }}>{sub}</span>
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

/** Savings floor summary on Home and Accounts; opens Goals. */
/** Page section: a quiet heading with an optional action on the right, then its rows. */
export const Section = ({ title, action, className, children }: { title: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) => (
  <div className={cx("flex flex-col", className)}>
    <div className="flex min-h-[32px] items-center justify-between pb-1">
      <span className="text-[15px] font-bold text-ink-2">{title}</span>{action}
    </div>
    {children}
  </div>
);

/** Small text link in a section heading ("See all", "Manage"). */
export const HeadLink = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className="-my-3 flex items-center gap-0.5 py-3 pl-3 text-[13px] font-semibold text-action">
    {children}<Icon d={P.next} size={14} sw={2.4} />
  </button>
);

/** Hide/show-balance eye, 36px target. Its handler stops the tap reaching whatever row it sits in. */
export const BalEye = ({ v }: { v: Pick<V, "toggleBal" | "balEyeLabel" | "balEyeD"> }) => (
  <button type="button" onClick={v.toggleBal} aria-label={v.balEyeLabel} className="press -m-1.5 flex size-[36px] flex-none items-center justify-center rounded-full text-ink-3">
    <Icon d={v.balEyeD} size={18} sw={1.9} />
  </button>
);

/** Labelled name + "+977" mobile fields, as Register and Profile both use them. */
export function PersonFields({ name, onName, nameBorder, namePh, phone, onPhone, phoneBorder, hint, hintFg, labels, editingLabel = "Editing" }: {
  name: string; onName: import("react").ChangeEventHandler<HTMLInputElement>; nameBorder: string; namePh?: string; phone: string; onPhone: import("react").ChangeEventHandler<HTMLInputElement>;
  phoneBorder: string; hint: string; hintFg: string; labels: { name: string; phone: string }; editingLabel?: string;
}) {
  const [focused, setFocused] = useState<"name" | "phone" | null>(null);
  const editing = <span aria-hidden="true" className="rounded-lg bg-action px-2 py-0.5 text-[12px] font-bold text-on-action">{editingLabel}</span>;
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="flex min-h-[24px] items-center justify-between gap-2"><span className={LABEL}>{labels.name}</span>{focused === "name" && editing}</span>
        <input value={name} onChange={onName} placeholder={namePh} autoComplete="name" aria-label={labels.name} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
          className={cx("rounded-2xl border-2 px-4 py-4 text-[16px] text-ink outline-none placeholder:text-ink-3", focused === "name" ? "bg-tint-r" : "bg-surface")} style={{ borderColor: focused === "name" ? "var(--action)" : nameBorder }} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="flex min-h-[24px] items-center justify-between gap-2"><span className={LABEL}>{labels.phone}</span>{focused === "phone" && editing}</span>
        <div className={cx("flex items-stretch overflow-hidden rounded-2xl border-2", focused === "phone" ? "bg-tint-r" : "bg-surface")} style={{ borderColor: focused === "phone" ? "var(--action)" : phoneBorder }}>
          <span className="flex flex-none items-center border-r border-line pr-3 pl-4 text-[16px] font-semibold text-ink-2">+977</span>
          <input value={phone} onChange={onPhone} inputMode="numeric" autoComplete="tel-national" aria-label={labels.phone} onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)} placeholder="98XXXXXXXX"
            className="min-w-0 flex-1 bg-transparent px-4 py-4 text-[16px] tracking-[.02em] text-ink outline-none placeholder:text-ink-3" />
        </div>
        <span className="text-[13px] leading-normal" style={{ color: hintFg }}>{hint}</span>
      </label>
    </div>
  );
}

/** The headline figure: a small "Rs" beside a big number. `fs` is the number's font size. */
export const Hero = ({ value, fs = "52px", fg, rs = "text-[22px]" }: { value: ReactNode; fs?: string; fg?: string; rs?: string }) => (
  <span className="flex min-w-0 items-baseline gap-2" style={{ color: fg }}>
    <span className={cx("flex-none font-display font-bold", rs)}>Rs</span>
    <span className="min-w-0 whitespace-nowrap font-display font-extrabold leading-none tracking-[-0.03em] tabular-nums" style={{ fontSize: fs }}>{value}</span>
  </span>
);


/** One transaction as a card: kind-tinted icon, title over kind and account, amount over category. `r` comes from rowLook(). */
export function TxCard({ r }: { r: TransactionCardModel }) {
  return <button type="button" onClick={r.tap} className="press flex min-h-[72px] w-full items-center gap-3 border-b border-line py-3 text-left">
    <span className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-surface-2 text-ink-2"><Icon d={r.icon} size={19} sw={1.8} /></span>
    <span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="truncate text-[15px] font-semibold leading-snug">{r.title}</strong><span className={cx("text-[13px] leading-snug",r.isUncat ? "text-uncat" : "text-ink-3")}>{r.chip} · {r.meta}</span></span>
    <span className="flex-none whitespace-nowrap font-display text-[20px] font-semibold tabular-nums" style={{color:r.fg}}>{r.amount}</span>
  </button>;
}

/** A scrolling column you can pull down from the top to refresh. onRefresh runs once per pull. */
export function Pull({ onRefresh, className, children }: { onRefresh: () => unknown; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const READY = 64;
  const end = () => {
    if (start.current === null) return;
    start.current = null;
    setDragging(false);
    if (pull < READY) { setPull(0); return; }
    setBusy(true);
    setPull(44);
    Promise.resolve(onRefresh()).finally(() => { setBusy(false); setPull(0); });
  };
  return (
    <div ref={box} className={cx("flex flex-col overflow-auto", className)}
      onTouchStart={(e) => { if (!busy && box.current && box.current.scrollTop <= 0) { start.current = e.touches[0].clientY; setDragging(true); } }}
      onTouchMove={(e) => {
        if (start.current === null) return;
        const d = e.touches[0].clientY - start.current;
        if (d <= 0) { start.current = null; setDragging(false); setPull(0); return; }
        setPull(Math.min(d * 0.5, 96)); // half the finger's travel, so it feels like a pull
      }}
      onTouchEnd={end} onTouchCancel={end}>
      <div aria-live="polite" className="flex flex-none items-center justify-center overflow-hidden text-[13px] font-semibold text-ink-3"
        style={{ height: pull, transition: dragging ? "none" : "height .2s" }}>
        {busy ? "Refreshing…" : pull >= READY ? "Release to refresh" : "Pull to refresh"}
      </div>
      {children}
    </div>
  );
}

export function GoalCard({ v }: { v: Pick<V, "toGoal" | "goalName" | "goalLabel" | "goalWidth" | "goalNote"> }) {
  return (
    <button type="button" onClick={v.toGoal} className="press flex flex-col gap-3 rounded-card bg-tint-g px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-semibold text-pos">{v.goalName}</span>
        <span className="flex-none font-display text-[14px] font-bold text-pos">{v.goalLabel}</span>
      </div>
      <Bar width={v.goalWidth} color="var(--pos)" className="h-[8px] rounded-sm" />
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-pretty text-[13px] leading-[1.5] text-ink-2">{v.goalNote}</span>
        <Icon d={P.next} size={18} className="text-pos" />
      </div>
    </button>
  );
}
