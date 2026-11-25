import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { apiErrorMessage, cabinCopy, useLanguage } from "../../lib/i18n";
import { whatsappLink } from "../../lib/whatsapp";

type Booking = { id: string; status: string; effective_status: string; created_at: string; request_number: number; cabins: { cabin: { name: string }; startDate: string; endDate: string }[] };

export default function CustomerBookings() {
  const { t, lang } = useLanguage();
  const c = t.customerBookings;
  const { data: session, status } = useSession(); const [bookings, setBookings] = React.useState<Booking[]>([]); const [error, setError] = React.useState("");
  const load = React.useCallback(async () => { const response = await fetch("/api/customer/bookings"); if (response.ok) setBookings(await response.json()); }, []);
  React.useEffect(() => { if (status === "authenticated") load(); }, [status, load]);
  const formatDisplayDate = (value: string) => new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { timeZone: "UTC", weekday: "short", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
  const waHref = (requestNumber: number) => whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "", t.whatsapp.messageWithNumber.replace("{number}", String(requestNumber)));
  const statusLabel = (value: string) => (t.statuses as Record<string, string>)[value] ?? value.replaceAll("_", " ");
  async function cancel(id: string) { setError(""); const response = await fetch(`/api/customer/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) }); const data = await response.json().catch(() => ({})); if (!response.ok) return setError(apiErrorMessage(t, data, c.cancelError)); await load(); }
  if (status !== "authenticated") return <Layout><Seo title={c.seoTitle} path="/customer/bookings"/><main className="mx-auto max-w-[760px] px-5 py-20 text-center"><h1 className="text-5xl">{c.heading}</h1><p className="text-muted">{c.signInBody}</p><button onClick={() => signIn("google", { callbackUrl: "/customer/bookings" })} className="mt-5 bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white">{c.signInCta}</button></main></Layout>;
  return <Layout><Seo title={c.seoTitle} path="/customer/bookings"/><main className="mx-auto max-w-[960px] px-5 py-12"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-sans text-xs font-bold uppercase tracking-[.16em] text-eyebrow">{c.signedInAs} {session.user?.email}</p><h1 className="m-0 text-5xl">{c.heading}</h1></div><button onClick={() => signOut()} className="font-sans text-xs font-bold uppercase underline">{c.signOut}</button></div>{error && <p className="mt-6 border border-[#b55332] bg-[#fff0e8] p-4 font-sans font-bold">{error}</p>}<div className="mt-8 space-y-5">{!bookings.length && <p className="text-muted">{c.empty}</p>}{bookings.map((booking) => { const canCancel = ["PENDING","SCHEDULED"].includes(booking.effective_status); return <article key={booking.id} className="border border-cardborder bg-card p-6 shadow"><div className="flex flex-wrap justify-between gap-3"><strong className="font-sans text-xs uppercase tracking-[.12em] text-terra">{statusLabel(booking.effective_status)}</strong><span className="font-sans text-xs text-muted">{c.requestLabel} #{booking.request_number}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{booking.cabins.map((item) => <div key={item.cabin.name} className="border border-cardborder bg-white p-4"><h2 className="m-0 text-2xl">{cabinCopy(t, item.cabin.name)?.name || item.cabin.name}</h2><p className="font-sans text-sm">{formatDisplayDate(item.startDate.slice(0,10))} → {formatDisplayDate(item.endDate.slice(0,10))}</p></div>)}</div>{waHref(booking.request_number) && <a href={waHref(booking.request_number)} target="_blank" rel="noopener noreferrer" className="mr-3 mt-5 inline-block bg-[#1f8f4e] px-4 py-3 font-sans text-xs font-extrabold uppercase text-white">{t.whatsapp.cta}</a>}{canCancel && <button onClick={() => cancel(booking.id)} className="mt-5 border border-terra px-4 py-3 font-sans text-xs font-extrabold uppercase text-terra">{c.cancel}</button>}</article>})}</div></main></Layout>;
}
