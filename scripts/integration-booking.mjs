// Production-shaped integration gate: boots against the real Next server,
// real Postgres + Prisma, and real NextAuth session cookies (minted locally
// with the same NEXTAUTH_SECRET the server uses - no Google involved).
// Runs only against disposable CI/local databases, never production.
import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.INTEGRATION_BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.NEXTAUTH_SECRET;
assert.ok(SECRET, "NEXTAUTH_SECRET is required to mint test sessions");
const prisma = new PrismaClient();

const CUSTOMER = "customer.test@example.test";
const OTHER = "other.customer@example.test";
const ADMIN = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "").split(",")[0].trim();
assert.ok(ADMIN, "ADMIN_EMAIL_ALLOWLIST must name one test admin");

async function sessionCookie(email) {
  const jwt = await encode({ token: { name: "Integration Test", email, picture: null, sub: email }, secret: SECRET, maxAge: 3600 });
  return `next-auth.session-token=${jwt}`;
}
async function api(path, { method = "GET", email, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (email) headers.Cookie = await sessionCookie(email);
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* HTML error page */ }
  return { status: res.status, data, html: data === null ? text.slice(0, 60) : null };
}
function check(name, cond, extra) {
  assert.ok(cond, `${name}${extra ? ` :: ${JSON.stringify(extra)}` : ""}`);
  console.log(`ok - ${name}`);
}

// Far-future windows keep the suite independent of the real calendar.
const D = (offsetDays) => { const d = new Date(Date.now() + offsetDays * 86400000); return d.toISOString().slice(0, 10); };

const cabins = await prisma.cabin.findMany({ select: { id: true, name: true } });
check("seed cabins exist", cabins.length >= 3, cabins.map(c => c.name));
const grande = cabins.find(c => /Grande/.test(c.name));

// ---- Anonymous authorization boundaries ----
let r = await api("/api/customer/bookings");
check("anonymous customer list rejected", r.status === 401, r.status);
r = await api("/api/admin/bookings");
check("anonymous admin list rejected", r.status === 401, r.status);
r = await api(`/api/admin/bookings/does-not-matter`, { method: "PATCH", body: { status: "SCHEDULED" } });
check("anonymous admin mutation rejected", r.status === 401, r.status);
r = await api("/api/bookings", { method: "POST", body: { cabinIds: [grande.id], startDate: D(30), endDate: D(32), customerName: "Anon", customerPhone: "0000000" } });
check("anonymous booking create rejected", r.status === 401, r.status);

// ---- Signed-in non-admin cannot reach admin APIs ----
r = await api("/api/admin/bookings", { email: CUSTOMER });
check("customer session blocked from admin list", r.status === 401, r.status);
r = await api(`/api/admin/bookings/does-not-matter`, { method: "PATCH", email: CUSTOMER, body: { status: "SCHEDULED" } });
check("customer session blocked from admin mutation", r.status === 401, r.status);

// ---- Customer booking creation binds identity to the session ----
const b1Start = D(30), b1End = D(32);
r = await api("/api/bookings", { method: "POST", email: CUSTOMER, body: { cabinIds: [grande.id], startDate: b1Start, endDate: b1End, customerName: "Integration Customer", customerEmail: "spoofed@evil.test", customerPhone: "0000000", notes: "integration", website: "" } });
check("customer booking created", r.status === 201 && r.data?.requestId, r);
const b1 = r.data.requestId;
r = await api("/api/customer/bookings", { email: CUSTOMER });
const b1Row = r.data.find(row => row.id === b1);
check("customer sees own booking as PENDING", b1Row?.status === "PENDING" && b1Row?.effective_status === "PENDING", b1Row);
check("booking email forced to session email", b1Row?.customer_email === CUSTOMER, b1Row?.customer_email);
r = await api("/api/customer/bookings", { email: OTHER });
check("other customer cannot see the booking", r.status === 200 && !r.data.some(row => row.id === b1));

// ---- Conflict reporting and the 8-hour cleaning buffer ----
r = await api("/api/bookings/availability", { method: "POST", body: { cabinIds: [grande.id], startDate: D(31), endDate: D(33) } });
check("overlap reported with cabin name", r.status === 200 && r.data.available === false && r.data.conflicts[0].cabinName === grande.name, r.data);
r = await api("/api/bookings/availability", { method: "POST", body: { cabinIds: [grande.id], startDate: b1End, endDate: D(34) } });
check("same-day turnover blocked by cleaning buffer", r.status === 200 && r.data.available === false, r.data);
r = await api("/api/bookings/availability", { method: "POST", body: { cabinIds: [grande.id], startDate: D(33), endDate: D(34) } });
check("arrival after buffer is available", r.status === 200 && r.data.available === true, r.data);
r = await api("/api/bookings", { method: "POST", email: CUSTOMER, body: { cabinIds: [grande.id], startDate: D(31), endDate: D(33), customerName: "Integration Customer", customerPhone: "0000000", website: "" } });
check("overlapping create refused with 409", r.status === 409 && Array.isArray(r.data.conflicts), r);

// ---- Customer cancellation lifecycle ----
r = await api(`/api/customer/bookings/${b1}`, { method: "PATCH", email: OTHER, body: { action: "cancel" } });
check("other customer cannot cancel the booking", r.status === 404, r.status);
r = await api(`/api/customer/bookings/${b1}`, { method: "PATCH", email: CUSTOMER, body: { action: "cancel" } });
check("customer cancels own pre-active booking", r.status === 200 && r.data.status === "CUSTOMER_CANCELLED", r);
r = await api(`/api/customer/bookings/${b1}`, { method: "PATCH", email: CUSTOMER, body: { action: "cancel" } });
check("cancelled booking cannot be cancelled again", r.status === 409, r.status);
r = await api("/api/bookings/availability", { method: "POST", body: { cabinIds: [grande.id], startDate: b1Start, endDate: b1End } });
check("customer cancellation frees the dates", r.status === 200 && r.data.available === true, r.data);

// ---- Management lifecycle: the PR #5 regression and its guard rails ----
r = await api("/api/admin/bookings", { email: ADMIN });
check("admin list works and includes customer details", r.status === 200 && r.data.some(row => row.id === b1 && row.customer_email === CUSTOMER), r.status);

const mk = async (start, end) => {
  const made = await api("/api/bookings", { method: "POST", email: CUSTOMER, body: { cabinIds: [grande.id], startDate: start, endDate: end, customerName: "Integration Customer", customerPhone: "0000000", website: "" } });
  assert.equal(made.status, 201, JSON.stringify(made));
  return made.data.requestId;
};
const b2 = await mk(D(40), D(42));     // will be confirmed
r = await api(`/api/admin/bookings/${b2}`, { method: "PATCH", email: ADMIN, body: { status: "SCHEDULED" } });
check("management confirms a pending request (regression: shipped 500)", r.status === 200 && r.data.status === "SCHEDULED", r);
// b3 overlaps the now-scheduled b2; the public API refuses overlapping creates, so insert the fixture directly.
const b3Row = await prisma.inquiry.create({ data: { customer_name: "Integration Customer", customer_email: CUSTOMER, customer_phone: "0000000", notes: "integration", status: "PENDING", cabins: { create: [{ cabinId: grande.id, startDate: new Date(D(41)), endDate: new Date(D(43)), header: "overlap fixture", body: "" }] } } });
const b3 = b3Row.id;
r = await api(`/api/admin/bookings/${b3}`, { method: "PATCH", email: ADMIN, body: { status: "SCHEDULED" } });
check("confirm blocked by overlapping scheduled stay", r.status === 409, r.status);
r = await api(`/api/admin/bookings/${b3}`, { method: "PATCH", email: ADMIN, body: { status: "CUSTOMER_CANCELLED" } });
check("management cannot set the customer-cancelled state", r.status === 400, r.status);
r = await api(`/api/admin/bookings/${b3}`, { method: "PATCH", email: ADMIN, body: { status: "MANAGEMENT_CANCELLED" } });
check("management cancels the request", r.status === 200 && r.data.status === "MANAGEMENT_CANCELLED", r);
r = await api(`/api/admin/bookings/${b3}`, { method: "PATCH", email: ADMIN, body: { status: "MANAGEMENT_CANCELLED" } });
check("already-cancelled request cannot be cancelled again by management", r.status === 409, r.status);
// Ken's rule: management MAY reactivate a cancelled request, but only when the dates still pass the conflict check.
// b3 overlaps b2's scheduled stay, so both reactivation targets must be refused.
r = await api(`/api/admin/bookings/${b3}`, { method: "PATCH", email: ADMIN, body: { status: "SCHEDULED" } });
check("reactivation to scheduled refused when dates are now booked", r.status === 409, r.status);
r = await api(`/api/admin/bookings/${b3}`, { method: "PATCH", email: ADMIN, body: { status: "PENDING" } });
check("reactivation to pending refused when dates are now booked", r.status === 409, r.status);
// b1 (customer-cancelled) still has free dates, so reactivation succeeds there.
r = await api(`/api/admin/bookings/${b1}`, { method: "PATCH", email: ADMIN, body: { status: "PENDING" } });
check("management reactivates a customer-cancelled request when dates are free", r.status === 200 && r.data.status === "PENDING", r);
r = await api(`/api/admin/bookings/${b1}`, { method: "PATCH", email: ADMIN, body: { status: "SCHEDULED" } });
check("reactivated request confirms when dates are free", r.status === 200 && r.data.status === "SCHEDULED", r);
// Customers have no reactivation path at all.
r = await api(`/api/customer/bookings/${b3}`, { method: "PATCH", email: CUSTOMER, body: { action: "reactivate" } });
check("customer cannot reactivate a cancelled booking", r.status === 400, r.status);

// ---- Time-derived ACTIVE / COMPLETED states (direct fixtures: the public API rejects past arrivals) ----
const past = new Date(Date.now() - 86400000 * 10);
const pastEnd = new Date(Date.now() - 86400000 * 8);
const nowStart = new Date(Date.now() - 86400000);
const nowEnd = new Date(Date.now() + 86400000 * 2);
await prisma.inquiry.create({ data: { customer_name: "Derived Past", customer_email: CUSTOMER, customer_phone: "0000000", notes: "integration", status: "SCHEDULED", cabins: { create: [{ cabinId: grande.id, startDate: past, endDate: pastEnd, header: "past", body: "" }] } } });
const activeRow = await prisma.inquiry.create({ data: { customer_name: "Derived Active", customer_email: CUSTOMER, customer_phone: "0000000", notes: "integration", status: "SCHEDULED", cabins: { create: [{ cabinId: grande.id, startDate: nowStart, endDate: nowEnd, header: "active", body: "" }] } } });
r = await api("/api/customer/bookings", { email: CUSTOMER });
const completed = r.data.find(row => row.customer_name === "Derived Past");
const active = r.data.find(row => row.id === activeRow.id);
check("past scheduled stay derives COMPLETED", completed?.effective_status === "COMPLETED", completed?.effective_status);
check("ongoing scheduled stay derives ACTIVE", active?.effective_status === "ACTIVE", active?.effective_status);
r = await api(`/api/customer/bookings/${activeRow.id}`, { method: "PATCH", email: CUSTOMER, body: { action: "cancel" } });
check("customer cannot cancel an active stay", r.status === 409, r.status);
r = await api(`/api/admin/bookings/${activeRow.id}`, { method: "PATCH", email: ADMIN, body: { status: "SCHEDULED" } });
check("management cannot edit a stay that already started", r.status === 409, r.status);

await prisma.$disconnect();
console.log("\nbooking integration suite passed");
