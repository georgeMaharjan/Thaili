import { BS_EN, BS_NP, bsOf, daysInBsMonth, monthKey, monthName } from "./bs.ts";

const AD_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** All labels and financial periods in a render share one explicit clock. */
export function calendarAt(today: Date) {
  const TODAY_BS = bsOf(today), MONTH_KEY = monthKey(TODAY_BS);
  const dayOf = (off: number) => {
    const day = new Date(today);
    day.setDate(day.getDate() - off);
    return day;
  };
  const bsLabel = (off: number) => { const b = bsOf(dayOf(off)); return b.d + " " + BS_EN[b.m] + " " + b.y; };
  return { TODAY_BS, MONTH_KEY, DAY_OF_MONTH: TODAY_BS.d, DAYS_IN_MONTH: daysInBsMonth(TODAY_BS.y, TODAY_BS.m),
    MONTH_EN: BS_EN[TODAY_BS.m], MONTH_NP: BS_NP[TODAY_BS.m], PREV_MONTH_EN: monthName(MONTH_KEY - 1),
    dayOf, bsLabel, bsDay: (off: number) => bsLabel(off).replace(/ \d+$/, ""),
    dayLabel: (off: number) => off === 0 ? "Today · " + bsLabel(off).replace(/ \d+$/, "")
      : off === 1 ? "Yesterday · " + bsLabel(off).replace(/ \d+$/, "") : bsLabel(off),
    adLabel: (off: number) => { const d = dayOf(off); return d.getDate() + " " + AD_MONTHS[d.getMonth()] + " " + d.getFullYear(); },
    wdShort: (off: number) => WD[dayOf(off).getDay()] };
}
