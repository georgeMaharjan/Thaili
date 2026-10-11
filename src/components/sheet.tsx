"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, P, cx } from "./ui";

const OUT_MS = 220;

/** Bottom sheet that slides up, follows a downward drag and slides away when let go
 * far or fast enough. Backdrop tap and Escape slide it away too; Android Back is
 * handled by the same state in the navigation controller. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const [dy, setDy] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; t: number; on: boolean } | null>(null);
  useEffect(() => { close.current = onClose; });

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => close.current(), OUT_MS);
  };
  const dismissRef = useRef(dismiss);
  useEffect(() => { dismissRef.current = dismiss; });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); dismissRef.current(); }
      if (e.key !== "Tab") return;
      const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]') || []);
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener("keydown", key);
    return () => { dialog?.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  // Drag starts anywhere once the content is scrolled to the top, like a native sheet.
  // Touch listeners (not pointer events) so a downward pull can win over the browser's own pan.
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const start = (e: TouchEvent) => { drag.current = { y: e.touches[0].clientY, t: e.timeStamp, on: false }; };
    const move = (e: TouchEvent) => {
      const d = drag.current;
      if (!d) return;
      const delta = e.touches[0].clientY - d.y;
      if (!d.on) {
        if (delta < -4 || (body.current?.scrollTop ?? 0) > 0) { drag.current = null; return; }
        if (delta < 8) return;
        d.on = true;
        setDragging(true);
      }
      e.preventDefault();
      setDy(Math.max(0, delta));
    };
    const end = (e: TouchEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d?.on) return;
      setDragging(false);
      const delta = (e.changedTouches[0]?.clientY ?? d.y) - d.y;
      const fast = delta / Math.max(1, e.timeStamp - d.t) > 0.5;
      if (delta > panel.offsetHeight / 4 || fast) dismissRef.current();
      else setDy(0);
    };
    panel.addEventListener("touchstart", start, { passive: true });
    panel.addEventListener("touchmove", move, { passive: false });
    panel.addEventListener("touchend", end);
    panel.addEventListener("touchcancel", end);
    return () => { panel.removeEventListener("touchstart", start); panel.removeEventListener("touchmove", move); panel.removeEventListener("touchend", end); panel.removeEventListener("touchcancel", end); };
  }, []);

  return <div className="absolute inset-0 z-30 flex items-end" data-native-overlay>
    <div className={cx("sheet-scrim absolute inset-0 bg-black/45", leaving && "sheet-scrim-out")} onClick={dismiss} aria-hidden="true" />
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
      className="sheet-panel relative flex max-h-[92%] w-full flex-col rounded-t-[24px] bg-canvas shadow-xl outline-none"
      style={{ transform: leaving ? "translateY(100%)" : `translateY(${dy}px)`, transition: dragging ? "none" : `transform ${OUT_MS}ms cubic-bezier(.2,.8,.2,1)` }}>
      <span className="mt-3 h-1 w-10 flex-none self-center rounded-full bg-bar-dim" />
      <div className="flex flex-none items-center justify-between gap-3 px-5 py-3">
        <h2 className="font-display text-[24px] font-bold">{title}</h2>
        <button type="button" onClick={dismiss} className="sr-only">Close</button>
      </div>
      <div ref={body} className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-1 pb-6">{children}</div>
    </div>
  </div>;
}

/** Native-feeling replacement for <select>: a field that opens a sheet of choices.
 * onChange gets the same { target: { value } } shape a select change event has. */
export function Picker({ label, value, options, placeholder, onChange, className }: {
  label?: string; value: string; options: { value: string; label: string }[]; placeholder?: string;
  onChange: (e: { target: { value: string } }) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  const field = <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={label ? undefined : placeholder}
    className={cx("press flex min-h-[52px] w-full min-w-0 items-center justify-between gap-2 text-left", className)}>
    <span className={cx("truncate", !current && "text-ink-3")}>{current?.label ?? placeholder}</span>
    <Icon d={P.expand} size={18} className="text-ink-3" />
  </button>;
  return <>
    {label ? <div className="field"><span>{label}</span><div className="picker-field">{field}</div></div> : field}
    {open && <Sheet title={label ?? placeholder ?? ""} onClose={() => setOpen(false)}>
      <div className="-mt-2 flex flex-col">
        {options.map(o => <CheckRow key={o.value} checked={o.value === value} onClick={() => { onChange({ target: { value: o.value } }); setOpen(false); }}>{o.label}</CheckRow>)}
      </div>
    </Sheet>}
  </>;
}

/** A full-width list row with a trailing check, in place of a web checkbox or radio. */
export function CheckRow({ checked, onClick, meta, children }: { checked: boolean; onClick: () => void; meta?: ReactNode; children: ReactNode }) {
  return <button type="button" aria-pressed={checked} onClick={onClick}
    className="press-bg flex min-h-[56px] w-full items-center gap-3 border-b border-line text-left text-[16px] last:border-0">
    <span className={cx("flex-1", checked && "font-semibold")}>{children}</span>
    {meta != null && <span className="text-[13px] text-ink-3">{meta}</span>}
    <span className="flex w-[20px] flex-none justify-center">{checked && <Icon d={P.check} size={20} sw={2.4} className="text-action" />}</span>
  </button>;
}
