import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { addDays, bookedDays, nextSelection, type CabinBlockedRanges } from "../lib/availability";

type Props = {
  cabinIds: string[];
  selectedIds: string[];
  startDate: string;
  endDate: string;
  /** Called with the new arrival/departure pair (departure "" while choosing). */
  onChange: (start: string, end: string) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Guest-facing availability calendar. Booked days come from the public
 * /api/bookings/calendar endpoint (dates only). Tapping fills the same
 * arrival/departure fields as the date inputs below it; the server still
 * re-checks everything when the guest checks availability and submits.
 */
export default function AvailabilityCalendar({ cabinIds, selectedIds, startDate, endDate, onChange }: Props) {
  const { t, lang } = useLanguage();
  const a = t.availability;
  const [blocked, setBlocked] = useState<CabinBlockedRanges | null>(null);
  const [failed, setFailed] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);
  const firstBookable = addDays(todayKey, 1);
  const [month, setMonth] = useState(() => ({ year: Number(todayKey.slice(0, 4)), month: Number(todayKey.slice(5, 7)) - 1 }));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bookings/calendar").then((r) => (r.ok ? r.json() : Promise.reject(new Error("calendar")))).then((data) => { if (!cancelled) setBlocked(data.blocked ?? {}); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const booked = useMemo(() => bookedDays(blocked ?? {}, selectedIds, cabinIds), [blocked, selectedIds, cabinIds]);
  const locale = lang === "es" ? "es-MX" : "en-US";
  const rawMonth = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(month.year, month.month, 1)));
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1).replace(/ De /, " de ");
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(new Date(Date.UTC(2023, 0, 1 + i))));
  const firstWeekday = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month.year}-${pad(month.month + 1)}-${pad(i + 1)}`)];
  const shiftMonth = (delta: number) => setMonth(({ year, month: m }) => { const d = new Date(Date.UTC(year, m + delta, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; });
  const atCurrentMonth = month.year === Number(todayKey.slice(0, 4)) && month.month === Number(todayKey.slice(5, 7)) - 1;

  function pick(day: string) {
    const next = nextSelection(startDate, endDate, day, booked);
    setNotice(next.blockedRange ? a.rangeBlocked : "");
    onChange(next.start, next.end);
  }

  const inStay = (day: string) => !!startDate && !!endDate && day >= startDate && day <= endDate;
  return <div className="border border-cardborder bg-white p-4" data-testid="availability-calendar">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h4 className="m-0 font-sans text-xs font-extrabold uppercase tracking-[.14em]">{a.heading}</h4>
      <div className="flex items-center gap-1 font-sans">
        <button type="button" aria-label={a.prevMonth} disabled={atCurrentMonth} onClick={() => shiftMonth(-1)} className="h-9 w-9 border border-cardborder text-lg disabled:opacity-30">‹</button>
        <span className="min-w-[130px] text-center text-sm font-bold" aria-live="polite">{monthLabel}</span>
        <button type="button" aria-label={a.nextMonth} onClick={() => shiftMonth(1)} className="h-9 w-9 border border-cardborder text-lg">›</button>
      </div>
    </div>
    <p className="mb-3 mt-2 font-sans text-xs leading-relaxed text-muted">{a.intro}</p>
    <div className="grid grid-cols-7 gap-1 text-center font-sans text-[11px] font-bold uppercase text-muted">{weekdays.map((w) => <span key={w}>{w}</span>)}</div>
    <div className="mt-1 grid grid-cols-7 gap-1">
      {cells.map((day, index) => {
        if (!day) return <span key={`blank-${index}`} />;
        const isBooked = booked.has(day);
        const isPast = day < firstBookable;
        const selected = inStay(day);
        const edge = day === startDate || day === endDate;
        const disabled = isBooked || isPast;
        const base = "h-10 border font-sans text-sm sm:h-11";
        const tone = isBooked ? "border-transparent bg-[#efe4d6] text-[#a8957f] line-through" : isPast ? "border-transparent text-[#c9bba8]" : edge ? "border-terra bg-terra font-bold text-white" : selected ? "border-terra bg-[#fff0e5]" : "border-cardborder bg-white hover:border-terra";
        return <button key={day} type="button" disabled={disabled} aria-pressed={selected} aria-label={`${new Intl.DateTimeFormat(locale, { timeZone: "UTC", dateStyle: "full" }).format(new Date(`${day}T00:00:00Z`))}${isBooked ? `, ${a.legendBooked}` : ""}`} data-day={day} data-booked={isBooked ? "true" : undefined} onClick={() => pick(day)} className={`${base} ${tone}`}>{Number(day.slice(8))}</button>;
      })}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-muted">
      <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 border border-cardborder bg-white" />{a.legendFree}</span>
      <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 bg-[#efe4d6]" />{a.legendBooked}</span>
      <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 bg-terra" />{a.legendSelected}</span>
    </div>
    <p className="mb-0 mt-2 font-sans text-xs leading-relaxed text-muted" role="status">
      {notice || (failed ? a.loadError : !blocked ? a.loading : startDate && !endDate ? a.pickDeparture : selectedIds.length ? a.hintSelected : a.hintAll)}
    </p>
  </div>;
}
