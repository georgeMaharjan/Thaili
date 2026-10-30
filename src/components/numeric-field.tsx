"use client";
import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { numericEntry, type NumericEntryKind } from "../lib/numeric-entry";
import { Icon, P, cx } from "./ui";

/** A real text input preserves native caret, selection and clipboard behavior.
 * Numeric inputMode requests the appropriate phone keyboard without type=number's cursor limitations.
 */
export function NumericField({ value, onChange, label, hint, kind, maxDigits, prefix, autoFocus, inputRef, onFocus,
  onNext, nextLabel, editingLabel, clearLabel, placeholder, errors }: {
  value: string; onChange(value: string): void; label: string; hint: string; kind: NumericEntryKind; maxDigits: number;
  prefix?: string; autoFocus?: boolean; inputRef?: RefObject<HTMLInputElement | null>; onFocus?(): void;
  onNext?(): void; nextLabel?: string; editingLabel: string; clearLabel: string; placeholder: string;
  errors: Record<"characters" | "length" | "precision", string>;
}) {
  const localRef = useRef<HTMLInputElement>(null), ref = inputRef || localRef;
  const id = useId();
  const [focused, setFocused] = useState(false), [error, setError] = useState<string | null>(null);
  const pendingCaret = useRef<{ value: string; caret: number } | null>(null);
  useLayoutEffect(() => {
    const pending = pendingCaret.current, input = ref.current;
    if (!pending) return;
    pendingCaret.current = null;
    if (input?.value === pending.value && document.activeElement === input) input.setSelectionRange(pending.caret, pending.caret);
  });
  return (
    <div className={cx("rounded-2xl border-2 px-4 py-3 transition-colors", focused ? "border-action bg-tint-r" : "border-line bg-surface")}>
      <div className="flex min-h-[24px] items-center justify-between gap-2">
        <label htmlFor={id} className="text-[14px] font-semibold text-ink">{label}</label>
        {focused && <span className="flex items-center gap-1 rounded-lg bg-action px-2 py-0.5 text-[12px] font-bold text-on-action"><Icon d={P.edit} size={12} />{editingLabel}</span>}
      </div>
      <div className="flex min-h-[52px] items-center gap-2">
        {prefix && <span aria-hidden="true" className="flex-none text-[20px] font-semibold text-ink-3">{prefix}</span>}
        <input ref={ref} id={id} type="text" value={value} autoFocus={autoFocus} inputMode={kind === "amount" ? "decimal" : "numeric"}
          autoComplete="off" spellCheck={false} enterKeyHint={onNext ? "next" : "done"} placeholder={placeholder}
          aria-describedby={id + "-hint"} aria-invalid={!!error}
          onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => setFocused(false)}
          onChange={event => {
            const input = event.currentTarget;
            const result = numericEntry(input.value, input.selectionStart ?? input.value.length, kind, maxDigits);
            if ("error" in result) { setError(errors[result.error]); return; }
            if (result.value !== input.value) pendingCaret.current = result;
            setError(null); onChange(result.value);
          }}
          onKeyDown={event => {
            if (event.key !== "Enter") return;
            event.preventDefault(); if (onNext) onNext(); else event.currentTarget.blur();
          }}
          className={cx("min-w-0 flex-1 bg-transparent py-1 font-display font-bold tabular-nums text-ink caret-action outline-none placeholder:text-bar-dim", kind === "amount" ? "text-[32px] tracking-[-0.02em]" : "text-[28px] tracking-[.12em]")} />
        {value && <button type="button" aria-label={clearLabel} onMouseDown={event => event.preventDefault()}
          onClick={() => { setError(null); onChange(""); ref.current?.focus(); }}
          className="flex size-[44px] flex-none items-center justify-center rounded-full text-ink-3"><Icon d={P.close} size={18} /></button>}
      </div>
      <div className="flex items-start justify-between gap-3">
        <span id={id + "-hint"} role={error ? "alert" : undefined} className={cx("text-[12px] leading-[1.5]", error ? "text-action" : "text-ink-2")}>{error || hint}</span>
        {onNext && <button type="button" onClick={onNext} className="flex min-h-[36px] flex-none items-center gap-1 text-[13px] font-semibold text-action">{nextLabel}<Icon d={P.next} size={15} /></button>}
      </div>
    </div>
  );
}
