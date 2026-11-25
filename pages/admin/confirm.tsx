import React from "react";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { adminErrorMessage, cabinCopy, useLanguage } from "../../lib/i18n";

type Summary = { requestNumber: number; customerName: string; status: string; stays: { cabinName: string; startDate: string; endDate: string }[] };

// Landing page for the "Review and approve" button in the admin alert email.
// Opening it only reads the request; the Confirm button posts the signed token.
export default function ConfirmFromEmail() {
  const { t, lang } = useLanguage();
  const c = t.admin.confirmEmail;
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "confirming" | "done" | "already" | "signin" | "error">("loading");
  const [error, setError] = React.useState("");
  const [calendarWarning, setCalendarWarning] = React.useState("");
  const locale = lang === "es" ? "es-MX" : "en-US";
  const formatDay = (value: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
  const statusLabel = (value: string) => (t.statuses as Record<string, string>)[value] ?? value;

  React.useEffect(() => {
    if (!router.isReady || sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") { setState("signin"); return; }
    if (!token) { setState("error"); setError(c.noToken); return; }
    let cancelled = false;
    fetch(`/api/admin/bookings/email-confirm?token=${encodeURIComponent(token)}`)
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) { setState("error"); setError(adminErrorMessage(t, data, c.loadError)); return; }
        setSummary(data.booking); setState(data.booking.status === "SCHEDULED" ? "already" : "ready");
      })
      .catch(() => { if (!cancelled) { setState("error"); setError(c.loadError); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, token, sessionStatus]);

  async function confirm() {
    setState("confirming"); setError("");
    const response = await fetch("/api/admin/bookings/email-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = adminErrorMessage(t, data, c.confirmError);
      if (data.booking) setSummary(data.booking);
      setError(typeof data.cabin === "string" ? message.replace("{cabin}", data.cabin) : message);
      setState("error"); return;
    }
    if (data.booking) setSummary(data.booking);
    if (data.calendarSync === "failed") setCalendarWarning(t.admin.inquiries.calendarSyncFailed);
    else if (data.calendarSync === "not-connected") setCalendarWarning(t.admin.inquiries.calendarNotConnected);
    setState(data.alreadyConfirmed ? "already" : "done");
  }

  return <Layout><Seo title={c.seoTitle} path="/admin/confirm"/><main className="mx-auto max-w-[720px] px-5 py-12 sm:px-8">
    <p className="font-sans text-xs font-bold uppercase tracking-[.18em] text-eyebrow">{c.eyebrow}</p>
    <h1 className="m-0 text-[clamp(32px,5vw,48px)] font-medium leading-none tracking-[-.03em]">{c.heading}</h1>
    {state === "loading" && <p className="mt-6 text-muted">{c.loading}</p>}
    {state === "signin" && <><p className="mt-6 leading-relaxed text-muted">{c.signInBody}</p><button type="button" onClick={() => signIn("google", { callbackUrl: router.asPath })} className="mt-4 bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-white">{c.signInCta}</button></>}
    {error && <p role="alert" className="mt-6 border border-[#b55332] bg-[#fff0e8] p-4 font-sans font-bold">{error}</p>}
    {summary && <>
      <p className="mt-5 leading-relaxed text-muted">{c.intro}</p>
      <dl className="mt-6 grid gap-x-8 gap-y-4 border border-cardborder bg-card p-6 font-sans text-sm sm:grid-cols-2" data-testid="confirm-summary">
        <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{c.request}</dt><dd className="m-0 mt-1">#{summary.requestNumber}</dd></div>
        <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{c.status}</dt><dd className="m-0 mt-1">{statusLabel(summary.status)}</dd></div>
        <div><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{c.guest}</dt><dd className="m-0 mt-1">{summary.customerName}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">{c.stays}</dt>{summary.stays.map((stay) => <dd key={stay.cabinName} className="m-0 mt-1">{cabinCopy(t, stay.cabinName)?.name || stay.cabinName}: {formatDay(stay.startDate)} → {formatDay(stay.endDate)}</dd>)}</div>
      </dl>
    </>}
    {state === "done" && <p role="status" className="mt-6 border border-[#4d7b55] bg-[#eef8ef] p-4 font-sans font-bold">{c.done}</p>}
    {state === "already" && <p role="status" className="mt-6 border border-[#4d7b55] bg-[#eef8ef] p-4 font-sans font-bold">{c.alreadyDone}</p>}
    {calendarWarning && <p role="alert" className="mt-4 border border-[#b55332] bg-[#fff0e8] p-4 font-sans text-sm">{calendarWarning}</p>}
    {(state === "ready" || state === "confirming") && <button type="button" onClick={confirm} disabled={state === "confirming"} className="mt-6 bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-white disabled:opacity-40">{state === "confirming" ? c.confirming : c.confirm}</button>}
    <p className="mt-8 font-sans text-sm"><Link href="/inquiries" className="underline">{c.dashboard}</Link></p>
  </main></Layout>;
}
