"use client";
import Screens from "@/screens";
import { Splash } from "@/screens/onboarding";
import React from "react";
import { hapticTap } from "../lib/device";
import { DENSITY } from "../lib/format";
import { TABS } from "../lib/nav";
import { AppController } from "./controller";

export class ThailiApp extends AppController {
  render() {
    // Splash while the pouch loads, so a returning user never flashes the welcome screen.
    const v = this.state.loaded && !this.state.splash ? this.renderVals() : null;
    // Transition for this screen change: back slides from the left, tab to tab fades, else push.
    const scr = this.state.screen;
    if (scr !== this.shownScreen) {
      this.anim = !this.shownScreen ? "" : this.popping ? "scr-back"
        : TABS.indexOf(scr) > -1 && TABS.indexOf(this.shownScreen) > -1 ? "scr-fade" : "scr-fwd";
      this.shownScreen = scr;
    }
    return (
      <div ref={el => { this.root = el; }} data-theme={this.state.theme} style={{ "--sp": DENSITY[this.state.density] } as React.CSSProperties} onClickCapture={e => { if (e.target instanceof Element && e.target.closest(".press, .press-bg, button")) hapticTap(); }}
        className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-canvas text-ink pt-[var(--safe-area-inset-top,env(safe-area-inset-top))] pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom))]">
        {v && this.state.storageStatus.kind === "error" && !this.state.locked && <div role="alert" className="flex-none bg-tint-r px-5 py-2 text-[13px] text-action">Unable to save on this phone. Check available storage and reopen Thaili.</div>}
        {!v ? <Splash /> : this.state.locked ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex size-[72px] items-center justify-center rounded-[20px] bg-brand">
              <img src="./thaili-mark-line.png" alt="Thaili" className="h-[50px] w-[36px] object-contain" />
            </div>
            <div className="text-[15px] text-ink-2">Thaili is locked</div>
            {this.state.unlockError && <div role="alert" className="max-w-[320px] px-5 text-center text-[14px] text-action">{this.state.unlockError}</div>}
            <button onClick={this.unlock} disabled={this.state.unlockBusy} aria-busy={this.state.unlockBusy}
              className="rounded-[16px] bg-action px-10 py-4 text-[15px] font-semibold text-on-action disabled:opacity-60">{this.state.unlockBusy ? "Authenticating…" : "Unlock"}</button>
          </div>
        ) : <div key={scr} className={"scr " + this.anim}><Screens v={v} /></div>}
      </div>
    );
  }
}
