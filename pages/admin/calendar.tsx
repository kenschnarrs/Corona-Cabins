import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { authOptions } from "../api/auth/[...nextauth]";
import { isAdminEmail } from "../../lib/admin";
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
  const [status, setStatus] = React.useState(initial);
  const [calendarId, setCalendarId] = React.useState(initial.calendarId);
  const [calendarName, setCalendarName] = React.useState(initial.calendarName);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setMessage("Google Calendar connected. Save the calendar ID below, then sync.");
    if (params.get("error")) setError(params.get("error") || "The connection failed.");
    if (params.get("connected") || params.get("error")) window.history.replaceState(null, "", "/admin/calendar");
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
    if (!response.ok) return setError(data.error || "Could not save the calendar.");
    setMessage("Calendar saved. Scheduled bookings will sync to it from now on.");
    await refresh();
  }

  async function syncNow() {
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/calendar/sync", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(data.error || "Sync failed.");
    setMessage(`Synced ${data.synced} scheduled booking${data.synced === 1 ? "" : "s"}${data.failed ? `, ${data.failed} failed (${(data.errors || []).join("; ")})` : ""}.`);
    await refresh();
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google? Existing calendar events stay, but bookings stop syncing.")) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/calendar", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return setError("Could not disconnect.");
    setMessage("Google disconnected.");
    await refresh();
  }

  return <Layout><Seo title="Calendar sync | Cabañas Corona" path="/admin/calendar"/><main className="mx-auto max-w-[760px] px-5 py-12">
    <p className="font-sans text-xs font-bold uppercase tracking-[.18em] text-eyebrow">Admin</p>
    <h1 className="m-0 text-[clamp(38px,5vw,60px)] font-medium leading-none tracking-[-.045em]">Google Calendar sync</h1>
    <p className="text-muted">Confirmed bookings appear on one Google Calendar, one event per cabin stay. Pending requests stay off the calendar; cancellations remove their events. Events are pinned to cabin time (America/Chihuahua, UTC-6 year-round; check-in 1 PM, check-out 12 PM).</p>
    {message && <p className="mt-6 border border-cardborder bg-card p-4 font-sans font-bold">{message}</p>}
    {error && <p className="mt-6 border border-[#b55332] bg-[#fff0e8] p-4 font-sans font-bold">{error}</p>}
    <section className="mt-8 border border-cardborder bg-card p-6 shadow">
      <h2 className="m-0 text-2xl">1. Connect Google</h2>
      {status.connected
        ? <p className="font-sans text-sm">Connected{status.connectedEmail ? ` as ${status.connectedEmail}` : ""}. Reconnect if Google access lapses.</p>
        : <p className="font-sans text-sm text-muted">Not connected. Use the Google account that owns the bookings calendar.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/api/admin/calendar/connect" className="bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white">{status.connected ? "Reconnect Google" : "Connect Google"}</a>
        {status.connected && <button type="button" disabled={busy} onClick={disconnect} className="border border-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-terra">Disconnect</button>}
      </div>
    </section>
    <section className="mt-6 border border-cardborder bg-card p-6 shadow">
      <h2 className="m-0 text-2xl">2. Pick the calendar</h2>
      <p className="font-sans text-sm text-muted">The calendar ID from Google Calendar settings (it looks like <code>…@group.calendar.google.com</code>). The calendar&apos;s own display zone is stuck on Central; the sync pins cabin time (America/Chihuahua) on every event, so no change is needed there.</p>
      <label className="mt-4 block font-sans text-xs font-bold uppercase tracking-[.12em]">Calendar ID
        <input value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className="mt-2 w-full border border-cardborder bg-white p-3 font-sans text-sm font-normal normal-case tracking-normal" placeholder="…@group.calendar.google.com" />
      </label>
      <label className="mt-4 block font-sans text-xs font-bold uppercase tracking-[.12em]">Calendar name (optional)
        <input value={calendarName} onChange={(e) => setCalendarName(e.target.value)} className="mt-2 w-full border border-cardborder bg-white p-3 font-sans text-sm font-normal normal-case tracking-normal" placeholder="Cabañas Corona" />
      </label>
      <button type="button" disabled={busy || !status.connected} onClick={saveCalendar} className="mt-4 bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white disabled:opacity-50">Save calendar</button>
    </section>
    <section className="mt-6 border border-cardborder bg-card p-6 shadow">
      <h2 className="m-0 text-2xl">3. Sync</h2>
      <p className="font-sans text-sm text-muted">{status.eventCount} booking event{status.eventCount === 1 ? "" : "s"} currently tracked. Confirming, moving back to pending, or cancelling a booking updates the calendar automatically; use this to backfill or repair.</p>
      <button type="button" disabled={busy || !status.connected || !status.calendarId} onClick={syncNow} className="mt-4 bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white disabled:opacity-50">Sync scheduled bookings now</button>
    </section>
    <p className="mt-8 font-sans text-sm"><Link href="/admin" className="underline">← Back to cabin admin</Link></p>
  </main></Layout>;
}
