import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import type { CabinProps } from "../lib/types";
import { apiErrorMessage, cabinCopy, useLanguage } from "../lib/i18n";
import { formatPrice } from "../lib/cabins";

type Conflict = { cabinId: string; cabinName: string; unavailableFrom: string; unavailableUntil: string };
type Props = { cabins: CabinProps[] };

export default function BookingFlow({ cabins }: Props) {
  const { t, lang } = useLanguage();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const b = t.booking;
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [requestNumber, setRequestNumber] = useState<number | null>(null);
  // Same-day check-in is not offered: the earliest arrival is tomorrow, and
  // departure is at least the day after arrival (1-night minimum), matching
  // the server rules in parseStayDates.
  const addDays = (value: string, days: number) => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);
  const formatDisplayDate = (value: string) => new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
  const nights = useMemo(() => startDate && endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)) : 0, [startDate, endDate]);
  const total = cabins.filter((c) => selected.includes(c.id)).reduce((sum, c) => sum + Number(c.price_per_night) * nights, 0);

  // A cabin detail page links here as /?cabin=<id>#booking: preselect that
  // cabin while keeping the other cabins selectable for the same request.
  useEffect(() => {
    const cabin = router.query.cabin;
    if (typeof cabin === "string" && cabins.some((c) => c.id === cabin)) {
      setSelected((ids) => (ids.includes(cabin) ? ids : [...ids, cabin]));
    }
  }, [router.query.cabin, cabins]);

  const editRequest = () => { setStatus("idle"); setMessage(""); setConflicts([]); };
  const toggleCabin = (id: string) => { setSelected((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]); editRequest(); };

  async function checkAvailability() {
    setStatus("checking"); setMessage(""); setConflicts([]);
    const response = await fetch("/api/bookings/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cabinIds: selected, startDate, endDate }) });
    const data = await response.json();
    if (!response.ok) { setStatus("error"); setMessage(apiErrorMessage(t, data, b.error)); return; }
    if (data.conflicts?.length) { setStatus("error"); setConflicts(data.conflicts); setMessage(b.conflictIntro); return; }
    setStatus("available"); setMessage(b.available);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.user?.email) { await signIn("google", { callbackUrl: `${router.asPath.split("#")[0]}#booking` }); return; }
    if (status !== "available") return checkAvailability();
    setStatus("submitting");
    const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cabinIds: selected, startDate, endDate, customerName, customerEmail, customerPhone, notes, website: "", locale: lang }) });
    const data = await response.json();
    if (!response.ok) { setStatus("error"); setMessage(apiErrorMessage(t, data, b.error)); setConflicts(data.conflicts || []); return; }
    setRequestNumber(typeof data.requestNumber === "number" ? data.requestNumber : null); setMessage(""); setConflicts([]); setStatus("success");
  }

  // A submitted request replaces the form with a dedicated confirmation
  // screen carrying the booking summary, instead of an inline banner.
  if (status === "success") {
    const confirmedCabins = cabins.filter((c) => selected.includes(c.id));
    return <section id="booking" className="bg-[#fffaf2] px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[1050px]">
        <div role="status" className="border border-[#4d7b55] bg-[#eef8ef] p-8 shadow-[0_18px_50px_rgba(73,39,19,.08)]">
          <h2 className="m-0 text-[clamp(32px,4vw,48px)] font-medium leading-[1.05] tracking-[-.03em]">{b.confirmationTitle}</h2>
          <p className="mt-4 max-w-[690px] leading-relaxed">{b.confirmationBody}</p>
          <dl className="mt-6 grid gap-x-8 gap-y-3 font-sans text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.confirmationId}</dt><dd className="m-0 mt-1 break-all">{requestNumber !== null ? `#${requestNumber}` : ""}</dd></div>
            <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.chooseCabins}</dt><dd className="m-0 mt-1">{confirmedCabins.map((c) => cabinCopy(t, c.name)?.name || c.name).join(", ")}</dd></div>
            <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.arrival}</dt><dd className="m-0 mt-1">{formatDisplayDate(startDate)}</dd></div>
            <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.departure}</dt><dd className="m-0 mt-1">{formatDisplayDate(endDate)}</dd></div>
            {nights > 0 && <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.estimated}</dt><dd className="m-0 mt-1">{nights} {nights === 1 ? b.night : b.nights} · {formatPrice(total)}</dd></div>}
            <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.name}</dt><dd className="m-0 mt-1">{customerName}</dd></div>
            <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{b.email}</dt><dd className="m-0 mt-1 break-all">{session?.user?.email || customerEmail}</dd></div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/customer/bookings" className="bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-white">{b.confirmationStatusLink}</a>
            <button type="button" onClick={editRequest} className="border border-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-terra">{b.confirmationAnother}</button>
          </div>
        </div>
      </div>
    </section>;
  }

  return <section id="booking" className="bg-[#fffaf2] px-5 py-24 sm:px-8">
    <div className="mx-auto max-w-[1050px]">
      <p className="mb-3 font-sans text-xs font-bold uppercase tracking-[.22em] text-eyebrow">{b.eyebrow}</p>
      <h2 className="m-0 max-w-[760px] text-[clamp(42px,6vw,72px)] font-medium leading-[.98] tracking-[-.045em]">{b.heading}</h2>
      <p className="mt-5 max-w-[690px] leading-relaxed text-muted">{b.intro}</p>
      <form onSubmit={submit} className="mt-10 grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-7">
          <fieldset><legend className="mb-3 font-sans text-xs font-extrabold uppercase tracking-[.14em]">1. {b.chooseCabins}</legend>
            <div className="grid gap-3 sm:grid-cols-3">{cabins.map((c) => { const copy = cabinCopy(t, c.name); const active = selected.includes(c.id); return <label key={c.id} className={`cursor-pointer border p-4 transition ${active ? "border-terra bg-[#fff0e5] shadow" : "border-cardborder bg-white"}`}><input type="checkbox" className="mr-2 accent-[#9a3f1d]" checked={active} onChange={() => toggleCabin(c.id)}/><strong className="block mt-2 text-xl">{copy?.name || c.name}</strong><span className="font-sans text-xs text-muted">{formatPrice(c.price_per_night)} {t.cabins.perNight}</span></label> })}</div>
          </fieldset>
          <fieldset><legend className="mb-3 font-sans text-xs font-extrabold uppercase tracking-[.14em]">2. {b.chooseDates}</legend>
            <div className="grid gap-4 sm:grid-cols-2"><label className="font-sans text-sm font-bold">{b.arrival}<input required min={tomorrow} type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); editRequest(); }} className="mt-2 block w-full border border-cardborder bg-white p-3 font-normal"/></label><label className="font-sans text-sm font-bold">{b.departure}<input required min={startDate ? addDays(startDate, 1) : addDays(tomorrow, 1)} type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); editRequest(); }} className="mt-2 block w-full border border-cardborder bg-white p-3 font-normal"/></label></div>
            <p className="font-sans text-xs leading-relaxed text-muted">{b.timesAndBuffer}</p>
          </fieldset>
          <button type="button" disabled={!selected.length || !startDate || !endDate || status === "checking"} onClick={checkAvailability} className="bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-white disabled:opacity-40">{status === "checking" ? b.checking : b.check}</button>
          {(message || conflicts.length > 0) && <div role="status" className={`border p-5 ${status === "available" ? "border-[#4d7b55] bg-[#eef8ef]" : "border-[#b55332] bg-[#fff0e8]"}`}><p className="m-0 font-sans font-bold">{message}</p>{conflicts.map((c) => <p className="mb-0 font-sans text-sm" key={c.cabinId}><strong>{c.cabinName}</strong>: {b.conflictDates.replace("{start}", c.unavailableFrom).replace("{end}", c.unavailableUntil)}</p>)}{status === "error" && <button type="button" onClick={editRequest} className="mt-4 font-sans text-xs font-extrabold uppercase tracking-[.1em] text-terra underline">{b.edit}</button>}</div>}
        </div>
        <aside className="border border-cardborder bg-card p-6 shadow-[0_18px_50px_rgba(73,39,19,.08)]">
          <h3 className="mt-0 text-3xl">3. {b.details}</h3>
          <div className="space-y-4"><label className="block font-sans text-sm font-bold">{b.name}<input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-2 block w-full border border-cardborder bg-white p-3 font-normal" maxLength={120}/></label><label className="block font-sans text-sm font-bold">{b.email}<input required readOnly={!!session?.user?.email} type="email" value={session?.user?.email || customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-2 block w-full border border-cardborder bg-white p-3 font-normal read-only:bg-[#f2eee8]" maxLength={254}/></label><label className="block font-sans text-sm font-bold">{b.phone}<input required type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-2 block w-full border border-cardborder bg-white p-3 font-normal" maxLength={40}/></label><label className="block font-sans text-sm font-bold">{b.notes}<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 block min-h-[110px] w-full border border-cardborder bg-white p-3 font-normal" maxLength={2000}/></label></div>
          {nights > 0 && selected.length > 0 && <p className="border-t border-cardborder pt-4 font-sans text-sm"><strong>{nights} {nights === 1 ? b.night : b.nights}</strong><br/>{b.estimated}: {formatPrice(total)}</p>}
          <p className="font-sans text-xs leading-relaxed text-muted">{b.requestNote}</p>
          {sessionStatus !== "authenticated" && <p className="font-sans text-xs leading-relaxed text-muted">{b.signInNote}</p>}
          <button type="submit" disabled={status !== "available"} className="w-full bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-white disabled:opacity-40">{status === "submitting" ? b.submitting : b.submit}</button>
        </aside>
      </form>
    </div>
  </section>;
}
