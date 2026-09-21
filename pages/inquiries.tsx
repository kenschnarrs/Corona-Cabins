import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { signOut } from "next-auth/react";
import Layout from "../components/Layout";
import Seo from "../components/Seo";
import { authOptions } from "./api/auth/[...nextauth]";
import { isAdminEmail } from "../lib/admin";
import prisma from "../lib/prisma";

type Booking = { id: string; status: string; customer_name: string; customer_email: string; customer_phone: string; notes: string; created_at: string; cabins: { cabin: { name: string }; startDate: string; endDate: string }[] };
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || !isAdminEmail(session.user?.email)) return { redirect: { destination: "/api/auth/signin", permanent: false } };
  const bookings = await prisma.inquiry.findMany({ include: { cabins: { include: { cabin: { select: { name: true } } }, orderBy: { startDate: "asc" } } }, orderBy: { created_at: "desc" }, take: 250 });
  return { props: { bookings: JSON.parse(JSON.stringify(bookings)) } };
};
export default function InquiriesPage({ bookings: initial }: { bookings: Booking[] }) {
  const [bookings, setBookings] = React.useState(initial); const [error, setError] = React.useState("");
  async function setStatus(id: string, status: string) { setError(""); const response = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) return setError(data.error || "Could not update request."); setBookings((rows) => rows.map((row) => row.id === id ? { ...row, status } : row)); }
  return <Layout><Seo title="Booking requests | Cabañas Corona" path="/inquiries"/><main className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8"><div className="flex items-start justify-between gap-5"><div><p className="font-sans text-xs font-bold uppercase tracking-[.18em] text-eyebrow">Admin calendar</p><h1 className="m-0 text-[clamp(38px,5vw,60px)] font-medium leading-none tracking-[-.045em]">Booking requests</h1><p className="text-muted">Pending, scheduled, and active bookings block availability, including the 8-hour cleaning buffer.</p></div><button type="button" onClick={() => signOut()} className="bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.13em] text-white">Sign out</button></div>{error && <p className="mt-6 border border-[#b55332] bg-[#fff0e8] p-4 font-sans font-bold">{error}</p>}<div className="mt-8 space-y-5">{bookings.length === 0 && <p className="text-muted">No booking requests yet.</p>}{bookings.map((booking) => <article key={booking.id} className="border border-cardborder bg-card p-6 shadow"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="m-0 font-sans text-xs font-bold uppercase tracking-[.12em] text-terra">{booking.status}</p><h2 className="my-2 text-3xl">{booking.customer_name}</h2><p className="m-0 font-sans text-sm"><a className="underline" href={`mailto:${booking.customer_email}`}>{booking.customer_email}</a> · <a className="underline" href={`tel:${booking.customer_phone}`}>{booking.customer_phone}</a></p></div><p className="m-0 font-sans text-xs text-muted">Received {new Date(booking.created_at).toLocaleString()}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{booking.cabins.map((item) => <div key={item.cabin.name} className="border border-cardborder bg-white p-4"><strong>{item.cabin.name}</strong><div className="font-sans text-sm">{item.startDate.slice(0,10)} → {item.endDate.slice(0,10)}</div></div>)}</div>{booking.notes && <p className="mt-4 whitespace-pre-wrap text-muted">{booking.notes}</p>}<div className="mt-5 flex flex-wrap gap-2">{["PENDING","SCHEDULED","MANAGEMENT_CANCELLED"].map((status) => <button key={status} disabled={booking.status === status} onClick={() => setStatus(booking.id, status)} className="border border-terra px-3 py-2 font-sans text-[10px] font-extrabold uppercase tracking-[.08em] text-terra disabled:bg-terra disabled:text-white">{status}</button>)}</div></article>)}</div></main></Layout>;
}
