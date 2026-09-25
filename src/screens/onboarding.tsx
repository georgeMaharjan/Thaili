// First run: welcome → SMS permission → app scan → accounts → 90-day history → categories.
import { Btn, CARD, Chip, Cta, Seg, StepHead, Stepper, Toggle, cx, type V } from "@/components/ui";

const PAGE = "flex flex-1 flex-col px-5 pt-4 pb-7";
const ROW = "flex items-center justify-between gap-3 rounded-2xl border bg-surface px-4";

export function Welcome({ v }: { v: V }) {
  const lang = [
    { label: "EN", tap: v.setEn, bg: v.enBg, fg: v.enFg },
    { label: "नेपाली", tap: v.setNp, bg: v.npBg, fg: v.npFg },
  ];
  return (
    <div className="flex flex-1 flex-col justify-between px-7 pt-10 pb-8.5">
      <div className="flex flex-col gap-7">
        <div className="-mt-6 -mr-2 mb-3 flex justify-end">
          <Seg items={lang} itemClass="rounded-[9px] px-3.5 py-2.5 text-[13px]" />
        </div>
        <div className="flex size-24 items-center justify-center rounded-[28px] bg-brand">
          <img src="./thaili-mark-cream.png" alt="Thaili" className="block h-14.5 w-13.5 object-contain" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[50px] font-bold leading-none tracking-[-0.02em]">Thaili</span>
            <span className="font-display text-[28px] font-medium leading-none text-ink-3">थैली</span>
          </div>
          <div className="font-display text-[21px] font-medium leading-[1.4] text-ink-2">{v.t.tagline}</div>
        </div>
        <div className="text-[12.5px] leading-[1.6] text-ink-3">{v.t.welcomeSub}</div>
      </div>
      <div className="flex flex-col gap-2.5">
        <Btn onClick={v.toPermission}>{v.t.getStarted}</Btn>
        <Btn kind="secondary" onClick={v.toRestoreAuth}>{v.t.otherPhone}</Btn>
      </div>
    </div>
  );
}

export function Permission({ v }: { v: V }) {
  return (
    <div className={cx(PAGE, "gap-4.5")}>
      <StepHead v={v} onBack={v.obBack} step={v.t.step1} title={v.t.permTitle} sub={v.t.permSub} />
      <div className="flex flex-col gap-2.5">
        {v.perms.map((p: V, i: number) => (
          <div key={i} onClick={p.tap} className={cx(ROW, "cursor-pointer border-line py-3.75")}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold leading-[1.35]">{p.name}</span>
              <span className="text-[12.5px] leading-[1.5] text-ink-3">{p.detail}</span>
            </div>
            <Toggle t={p} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-tint-n px-4 py-3.75 text-[12.5px] leading-[1.6] text-ink-2">{v.permNote}</div>
      <div className="flex-1" />
      <Btn onClick={v.toDetect}>{v.permCta}</Btn>
    </div>
  );
}

export function Detect({ v }: { v: V }) {
  return (
    <div className={cx(PAGE, "gap-4 overflow-hidden")}>
      <StepHead v={v} onBack={v.obBack} step={v.t.step2} title={v.detectTitle} sub={v.detectSub} className="flex-none gap-2" />
      {v.detectScanning && (
        <div className="flex flex-1 flex-col justify-center gap-3.25">
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-bar-track">
            <div className="h-full w-2/5 animate-[thaili-sweep_1.15s_ease-in-out_infinite] rounded-[3px] bg-action" />
          </div>
          <span className="text-[12.5px] text-ink-3">Reading the installed-app list…</span>
        </div>
      )}
      {v.detectDone && (
        <div className="flex min-h-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-1 flex-col gap-2.5 overflow-auto">
            {v.detectRows.map((d: V, i: number) => (
              <div key={i} onClick={d.tap} className={cx(ROW, "cursor-pointer py-3.5")} style={{ borderColor: d.border }}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14.5px] font-semibold leading-[1.35]">{d.app}</span>
                  <span className="text-[12.5px] leading-[1.45] text-ink-3">{d.detail}</span>
                </div>
                <Toggle t={d} />
              </div>
            ))}
          </div>
          <div className="flex flex-none flex-col gap-2">
            <Cta onClick={v.detectConfirm} bg={v.detectCtaBg} fg={v.detectCtaFg} className="p-4.25 text-[15.5px]">{v.detectCta}</Cta>
            <span onClick={v.detectSkip} className="cursor-pointer p-1 text-center text-[12.5px] font-semibold text-ink-3">Skip — I&apos;ll add accounts by hand</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Source({ v }: { v: V }) {
  return (
    <div className={cx(PAGE, "gap-4 overflow-hidden")}>
      <StepHead v={v} onBack={v.obBack} step={v.t.step3} title={v.t.srcTitle} sub={v.t.srcSub} />
      <div className="flex flex-1 flex-col gap-2.5 overflow-auto">
        {v.setupSources.map((s: V, i: number) => (
          <div key={i} onClick={s.tap} className={cx(ROW, "press cursor-pointer border-line py-3.75")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold leading-[1.35]">{s.name}</span>
              <span className="text-[12.5px] leading-[1.4] text-ink-3">{s.detail}</span>
              <span className="text-[12.5px] font-semibold leading-[1.4]" style={{ color: s.acctFg }}>{s.acct}</span>
            </div>
            <div className="flex flex-none flex-col items-end gap-0.5">
              <span className="font-display text-[15px] font-semibold tabular-nums" style={{ color: s.openFg }}>{s.opening}</span>
              <span className="text-[12px] text-ink-3">{s.openLabel}</span>
            </div>
          </div>
        ))}
        <div onClick={v.toSrcNew} className="press cursor-pointer rounded-2xl border border-dashed border-bar-dim px-4 py-3.75 text-[14px] font-semibold text-ink-2">
          Add what the scan can&apos;t see
        </div>
      </div>
      <Cta onClick={v.setupNext} bg={v.setupCtaBg} fg={v.setupCtaFg} className="p-4.25 text-[15.5px]">{v.setupContinue}</Cta>
    </div>
  );
}

export function Scan({ v }: { v: V }) {
  return (
    <div className={cx(PAGE, "gap-4 overflow-hidden")}>
      <StepHead v={v} onBack={v.obBack} step={v.t.step4} title={v.scanTitle} sub={v.scanSub} />
      <div className="flex flex-1 flex-col gap-2.5 overflow-auto">
        {v.scanGroups.map((g: V, i: number) => (
          <div key={i} className={cx(ROW, "border-line py-3.75")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14px] font-semibold leading-[1.35]">{g.label}</span>
              <span className="text-[12.5px] leading-[1.4] text-ink-3">{g.meta}</span>
            </div>
            <span className="flex-none rounded-lg px-2.5 py-1.25 text-[12.5px] font-bold" style={{ background: g.tagBg, color: g.tagFg }}>{g.tag}</span>
          </div>
        ))}
      </div>
      <Btn onClick={v.toCats}>{v.scanCta}</Btn>
      <div onClick={v.scanSkipTap} className="-mt-1.5 -mb-2.5 cursor-pointer p-2.5 text-center text-[13px] font-semibold text-ink-3">{v.scanSkip}</div>
    </div>
  );
}

export function Cats({ v }: { v: V }) {
  return (
    <div className={cx(PAGE, "gap-3.75 overflow-auto")}>
      <StepHead v={v} onBack={v.obBack} step={v.catsStepLabel} title={v.t.catsTitle} sub={v.t.catsSub} className="flex-none gap-2" />
      <div className="flex flex-none flex-wrap content-start gap-2.25">
        {v.catPicks.map((c: V, i: number) => <Chip key={i} c={c} check={false} className="px-4 py-3 text-[13.5px]" />)}
      </div>
      <div className={cx(CARD, "flex flex-col gap-2.5 p-4")}>
        <span className="text-[13.5px] font-semibold">Add your own</span>
        <div className="flex items-center gap-2">
          <input value={v.newCatName} onChange={v.newCatType} placeholder="School fees, loan EMI, puja"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13.5px] text-ink outline-none" />
          <span onClick={v.addCustomCat} className="flex-none cursor-pointer rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] font-semibold" style={{ color: v.newCatFg }}>Add</span>
        </div>
        <span className="text-pretty text-[12.5px] leading-[1.5] text-ink-3">{v.addCatNote}</span>
      </div>
      <div className={cx(CARD, "flex flex-col gap-2 p-4")}>
        <span className="text-[13.5px] font-semibold">Monthly savings target</span>
        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] font-semibold text-ink-3">Rs</span>
          <span className="font-display text-[30px] font-bold tracking-[-0.02em]">{v.saveTargetLabel}</span>
          <span className="flex-1" />
          <Stepper onClick={v.saveDown}>−</Stepper>
          <Stepper onClick={v.saveUp}>+</Stepper>
        </div>
        <span className="text-pretty text-[12.5px] leading-[1.5] text-ink-3">{v.saveTargetNote}</span>
      </div>
      {v.catsEdit && (
        <div className={cx(CARD, "flex flex-col gap-2.75 p-4")}>
          <span className="text-[13.5px] font-semibold">What counts as a leak</span>
          {v.essRows.map((r: V, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-[13px]">{r.label}</span>
              <Seg className="flex-none rounded-[10px]" itemClass="rounded-lg px-3 py-1.75 text-[12.5px]" items={[
                { label: "Essential", tap: r.setEss, bg: r.essBg, fg: r.essFg },
                { label: "Leak", tap: r.setLeak, bg: r.leakBg, fg: r.leakFg },
              ]} />
            </div>
          ))}
        </div>
      )}
      <Cta onClick={v.catsNext} bg={v.catCtaBg} fg={v.catCtaFg} className="p-4.25 text-[15.5px]">{v.catCta}</Cta>
    </div>
  );
}
