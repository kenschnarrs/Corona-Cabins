import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { authOptions } from "../api/auth/[...nextauth]";
import { isAdminEmail } from "../../lib/admin";
import { adminErrorMessage, useLanguage } from "../../lib/i18n";
import prisma from "../../lib/prisma";

type Props = {
  connected: boolean;
  connectedEmail: string;
  calendarId: string;
  calendarName: string;
  eventCount: number;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || !isAdminEmail(session.user?.email)) return { redirect: { destination: "/auth/signin", permanent: false } };
  const connection = await prisma.calendarConnection.findUnique({ where: { id: "primary" } });
  const eventCount = await prisma.bookingCalendarEvent.count();
  return {
    props: {
      connected: Boolean(connection),
      connectedEmail: connection?.connectedEmail ?? "",
      calendarId: connection?.calendarId ?? "",
      calendarName: connection?.calendarName ?? "",
      eventCount,
    },
  };
};

export default function AdminCalendar(initial: Props) {
  const { t } = useLanguage();
  const a = t.admin.calendar;
  const [status, setStatus] = React.useState(initial);
  const [calendarId, setCalendarId] = React.useState(initial.calendarId);
  const [calendarName, setCalendarName] = React.useState(initial.calendarName);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setMessage(a.connectedMessage);
    if (params.get("error")) setError(adminErrorMessage(t, { code: params.get("error") }, a.connectFailed));
    if (params.get("connected") || params.get("error")) window.history.replaceState(null, "", "/admin/calendar");
    // Runs once on mount; the dictionaries for the initial render are the right ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    const response = await fetch("/api/admin/calendar");
    if (response.ok) setStatus(await response.json());
  }

  async function saveCalendar() {
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarId, calendarName }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(adminErrorMessage(t, data, a.saveFailed));
    setMessage(a.calendarSaved);
    await refresh();
  }

  async function syncNow() {
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/calendar/sync", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(adminErrorMessage(t, data, a.syncFailed));
    const synced = (data.synced === 1 ? a.synced_one : a.synced_other).replace("{synced}", String(data.synced));
    const failed = data.failed ? a.syncFailedCount.replace("{failed}", String(data.failed)).replace("{errors}", (data.errors || []).join("; ")) : "";
    setMessage(`${synced}${failed}.`);
    await refresh();
  }

  async function disconnect() {
    if (!window.confirm(a.disconnectConfirm)) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/calendar", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return setError(a.disconnectFailed);
    setMessage(a.disconnected);
    await refresh();
  }

  return <Layout><Seo title={a.seoTitle} path="/admin/calendar"/><main className="mx-auto max-w-[760px] px-5 py-12">
    <p className="font-sans text-xs font-bold uppercase tracking-[.18em] text-eyebrow">{t.admin.eyebrow}</p>
    <h1 className="m-0 text-[clamp(38px,5vw,60px)] font-medium leading-none tracking-[-.045em]">{a.heading}</h1>
    <p className="text-muted">{a.intro}</p>
    {message && <p className="mt-6 border border-cardborder bg-card p-4 font-sans font-bold">{message}</p>}
    {error && <p className="mt-6 border border-[#b55332] bg-[#fff0e8] p-4 font-sans font-bold">{error}</p>}
    <section className="mt-8 border border-cardborder bg-card p-6 shadow">
      <h2 className="m-0 text-2xl">{a.connectHeading}</h2>
      {status.connected
        ? <p className="font-sans text-sm">{status.connectedEmail ? a.connectedAs.replace("{email}", status.connectedEmail) : a.connectedNoEmail}</p>
        : <p className="font-sans text-sm text-muted">{a.notConnected}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/api/admin/calendar/connect" className="bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white">{status.connected ? a.reconnectGoogle : a.connectGoogle}</a>
        {status.connected && <button type="button" disabled={busy} onClick={disconnect} className="border border-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-terra">{a.disconnect}</button>}
      </div>
    </section>
    <section className="mt-6 border border-cardborder bg-card p-6 shadow">
      <h2 className="m-0 text-2xl">{a.pickHeading}</h2>
      <p className="font-sans text-sm text-muted">{a.pickIntro}</p>
      <label className="mt-4 block font-sans text-xs font-bold uppercase tracking-[.12em]">{a.calendarIdLabel}
        <input value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className="mt-2 w-full border border-cardborder bg-white p-3 font-sans text-sm font-normal normal-case tracking-normal" placeholder="…@group.calendar.google.com" />
      </label>
      <label className="mt-4 block font-sans text-xs font-bold uppercase tracking-[.12em]">{a.calendarNameLabel}
        <input value={calendarName} onChange={(e) => setCalendarName(e.target.value)} className="mt-2 w-full border border-cardborder bg-white p-3 font-sans text-sm font-normal normal-case tracking-normal" placeholder="Cabañas Corona" />
      </label>
      <button type="button" disabled={busy || !status.connected} onClick={saveCalendar} className="mt-4 bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white disabled:opacity-50">{a.saveCalendar}</button>
    </section>
    <section className="mt-6 border border-cardborder bg-card p-6 shadow">
      <h2 className="m-0 text-2xl">{a.syncHeading}</h2>
      <p className="font-sans text-sm text-muted">{(status.eventCount === 1 ? a.tracked_one : a.tracked_other).replace("{count}", String(status.eventCount))} {a.syncAutoNote}</p>
      <button type="button" disabled={busy || !status.connected || !status.calendarId} onClick={syncNow} className="mt-4 bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white disabled:opacity-50">{a.syncNow}</button>
    </section>
    <p className="mt-8 font-sans text-sm"><Link href="/admin" className="underline">{a.backLink}</Link></p>
  </main></Layout>;
}
