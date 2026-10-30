import { dated } from "../lib/bs.ts";
import { calendarAt } from "../lib/calendar.ts";
import type { AppState, StatePatch, StateWriter } from "./state.ts";
type CalendarState = Pick<AppState, "calendarDay" | "tx" | "calKey" | "txFrom" | "txTo" | "calA" | "calB">;
export function calendarRollover(state: CalendarState, today: Date): StatePatch | null {
  const calendarDay = today.toDateString();
  if (calendarDay === state.calendarDay) return null;
  const elapsed = Math.round((new Date(calendarDay).getTime() - new Date(state.calendarDay).getTime()) / 86400000);
  const shift = (value: number | null) => value === null ? null : value + elapsed;
  return {
    calendarDay, tx: state.tx.map(t => dated(t, today)),
    calKey: state.calKey === calendarAt(new Date(state.calendarDay)).MONTH_KEY ? calendarAt(today).MONTH_KEY : state.calKey,
    txFrom: shift(state.txFrom), txTo: shift(state.txTo), calA: shift(state.calA), calB: shift(state.calB)
  };
}
export class CalendarClock {
  private timer?: ReturnType<typeof setTimeout>;
  private snapshot: () => CalendarState;
  private commit: StateWriter;
  private today: () => Date;
  constructor(snapshot: () => CalendarState, commit: StateWriter, today = () => new Date()) {
    this.snapshot = snapshot; this.commit = commit; this.today = today;
  }
  refresh = () => {
    const today = this.today(), patch = calendarRollover(this.snapshot(), today);
    if (patch) this.commit(patch);
    clearTimeout(this.timer);
    const midnight = new Date(today); midnight.setHours(24, 0, 0, 0);
    this.timer = setTimeout(this.refresh, midnight.getTime() - today.getTime() + 50);
  };
  dispose() { clearTimeout(this.timer); }
}
