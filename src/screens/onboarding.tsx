// First run: welcome → SMS permission → app scan → accounts → 90-day history → categories.
import { Btn, CARD, Chip, Cta, Icon, Seg, StepHead, Stepper, Toggle, cx, type V } from "@/components/ui";

const PAGE = "flex flex-1 flex-col px-5 pt-4 pb-7";
const ROW = "flex items-center justify-between gap-3 rounded-2xl border bg-surface px-4";

// One stroke along the mark's line art; the splash reveals the mark by drawing it.
const MARK_D = "M215.0,289.0 L224.0,281.0 L232.0,265.0 L234.0,241.0 L229.0,219.0 L210.0,187.0 L178.0,147.0 L176.0,139.0 L178.0,115.0 L162.0,117.0 L160.0,113.0 L152.0,111.0 L112.0,107.0 L106.0,88.0 L68.0,48.0 L60.0,34.0 L60.0,22.0 L66.0,14.0 L80.0,8.0 L108.0,10.0 L156.0,36.0 L178.0,40.0 L204.0,22.0 L217.0,19.0 L230.0,22.0 L236.0,32.0 L231.0,53.0 L217.0,69.0 L193.0,89.0 L181.0,107.0 L179.0,115.0 L190.0,112.0 L203.0,113.0 L215.0,118.0 L217.0,124.0 L209.0,135.0 L202.0,133.0 L172.0,97.0 L169.0,89.0 L169.0,66.0 L178.0,41.0 L162.0,119.0 L134.0,126.0 L110.0,127.0 L112.0,111.0 L110.0,105.0 L87.0,110.0 L83.0,116.0 L85.0,121.0 L102.0,128.0 L108.0,126.0 L102.0,129.0 L101.0,133.0 L56.0,176.0 L33.0,207.0 L13.0,253.0 L10.0,293.0 L16.0,320.0 L32.0,349.0 L63.0,376.0 L96.0,391.0 L127.0,398.0 L172.0,399.0 L211.0,392.0 L251.0,372.0 L269.0,353.0 L280.0,332.0 L287.0,307.0 L287.0,267.0 L278.0,236.0 L264.0,207.0 L243.0,176.0 L210.0,141.0 L209.0,136.0";

// Shown while the pouch loads (and at least as long as the draw-in).
export function Splash() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7">
      <svg viewBox="0 0 298 409" width="130" height="179" className="block flex-none" aria-label="Thaili">
        <defs>
          <mask id="th-shape"><image href="./thaili-mark-line.png" width="298" height="409" /></mask>
          <mask id="th-reveal">
            <path d={MARK_D} className="thaili-draw" fill="none" stroke="#fff" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" />
          </mask>
        </defs>
        <g mask="url(#th-reveal)"><rect width="298" height="409" mask="url(#th-shape)" className="fill-brand" /></g>
      </svg>
      <div className="thaili-rise flex items-baseline gap-2.5">
        <span className="font-display text-[44px] font-bold leading-none tracking-[-0.02em]">Thaili</span>
        <span className="font-display text-[24px] font-medium leading-none text-ink-3">थैली</span>
      </div>
    </div>
  );
}

export function Welcome({ v }: { v: V }) {
  const lang = [
    { label: "EN", tap: v.setEn, bg: v.enBg, fg: v.enFg },
    { label: "नेपाली", tap: v.setNp, bg: v.npBg, fg: v.npFg },
  ];
  const chips = [
    { label: v.t.w1, icon: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.5-2M4 4l16 16" /></> },
    { label: v.t.w2, icon: <path d="M4 5h16v11H9l-5 4z" /> },
    { label: v.t.w3, icon: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 17h2" /></> },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pt-1 pb-7.5">
      <div className="flex justify-end">
        <Seg items={lang} itemClass="rounded-[9px] px-3.5 py-2.5 text-[13px]" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8.5">
        <div role="img" aria-label="Thaili" className="aspect-[298/409] h-56 max-h-[28vh] flex-none bg-brand [mask:url(/thaili-mark-line.png)_center/contain_no-repeat]" />
        <div className="thaili-intro flex flex-col items-center gap-3 text-center" style={{ animationDelay: "150ms" }}>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[52px] font-bold leading-none tracking-[-0.02em]">Thaili</span>
            <span className="font-display text-[28px] font-medium leading-none text-ink-3">थैली</span>
          </div>
          <div className="max-w-77.5 font-display text-[18px] font-medium leading-[1.4] text-balance text-ink-2">{v.t.tagline}</div>
        </div>
        <div className="thaili-intro flex flex-wrap justify-center gap-2" style={{ animationDelay: "330ms" }}>
          {chips.map(c => (
            <span key={c.label} className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-xl bg-surface-2 px-3 text-[12.5px] font-semibold text-ink-2">
              <Icon size={15} sw={2.1} className="text-brand">{c.icon}</Icon>{c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="thaili-intro flex flex-col gap-2.5" style={{ animationDelay: "510ms" }}>
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
          <button key={i} onClick={p.tap} className={cx(ROW, "border-line py-3.75")}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold leading-[1.35]">{p.name}</span>
              <span className="text-[12.5px] leading-[1.5] text-ink-3">{p.detail}</span>
            </div>
            <Toggle t={p} />
          </button>
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
              <button key={i} onClick={d.tap} className={cx(ROW, "py-3.5")} style={{ borderColor: d.border }}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14.5px] font-semibold leading-[1.35]">{d.app}</span>
                  <span className="text-[12.5px] leading-[1.45] text-ink-3">{d.detail}</span>
                </div>
                <Toggle t={d} />
              </button>
            ))}
          </div>
          <div className="flex flex-none flex-col gap-2">
            <Cta onClick={v.detectConfirm} bg={v.detectCtaBg} fg={v.detectCtaFg} className="p-4.25 text-[15.5px]">{v.detectCta}</Cta>
            <button onClick={v.detectSkip} className="p-1 text-center text-[12.5px] font-semibold text-ink-3">Skip — I&apos;ll add accounts by hand</button>
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
          <button key={i} onClick={s.tap} className={cx(ROW, "press border-line py-3.75")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold leading-[1.35]">{s.name}</span>
              <span className="text-[12.5px] leading-[1.4] text-ink-3">{s.detail}</span>
              <span className="text-[12.5px] font-semibold leading-[1.4]" style={{ color: s.acctFg }}>{s.acct}</span>
            </div>
            <div className="flex flex-none flex-col items-end gap-0.5">
              <span className="font-display text-[15px] font-semibold tabular-nums" style={{ color: s.openFg }}>{s.opening}</span>
              <span className="text-[12px] text-ink-3">{s.openLabel}</span>
            </div>
          </button>
        ))}
        <button onClick={v.toSrcNew} className="press rounded-2xl border border-dashed border-bar-dim px-4 py-3.75 text-[14px] font-semibold text-ink-2">
          Add what the scan can&apos;t see
        </button>
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
      <button onClick={v.scanSkipTap} className="-mt-1.5 -mb-2.5 p-2.5 text-center text-[13px] font-semibold text-ink-3">{v.scanSkip}</button>
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
          <button onClick={v.addCustomCat} className="flex-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] font-semibold" style={{ color: v.newCatFg }}>Add</button>
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
