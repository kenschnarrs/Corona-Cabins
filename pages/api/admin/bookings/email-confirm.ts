import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { methodNotAllowed, requireAdmin } from "../../../../lib/admin-api";
import { effectiveBookingStatus } from "../../../../lib/booking";
import { changeBookingStatus } from "../../../../lib/booking-admin";
import { verifyConfirmToken } from "../../../../lib/email-actions";

// Confirm-from-email. Two things are required: a signed-in admin session
// (the allowlist, same as the dashboard) AND the signed token from the alert
// email, which names the one request this link may act on. GET only describes
// the request, so mail scanners that prefetch the link change nothing; only an
// explicit POST (the Confirm button) changes status.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);
  res.setHeader("Cache-Control", "no-store");
  if (!(await requireAdmin(req, res))) return;
  const token = req.method === "GET" ? req.query.token : req.body?.token;
  const verified = verifyConfirmToken(token);
  if (!verified.ok) return res.status(verified.code === "CONFIRM_LINK_EXPIRED" ? 410 : 400).json({ error: "This approval link is not valid.", code: verified.code });
  const inquiry = await prisma.inquiry.findUnique({ where: { id: String(verified.inquiryId) }, include: { cabins: { include: { cabin: { select: { name: true } } } } } });
  if (!inquiry) return res.status(404).json({ error: "Booking request not found.", code: "ADMIN_BOOKING_NOT_FOUND" });
  const first = inquiry.cabins[0];
  const effective = effectiveBookingStatus(inquiry.status, first?.startDate ?? inquiry.created_at, first?.endDate);
  const summary = () => ({
    requestNumber: inquiry.request_number,
    customerName: inquiry.customer_name,
    status: effective,
    stays: inquiry.cabins.map((stay) => ({ cabinName: stay.cabin.name, startDate: stay.startDate.toISOString().slice(0, 10), endDate: stay.endDate.toISOString().slice(0, 10) })),
  });
  if (req.method === "GET") return res.json({ booking: summary() });
  // Only a pending request can be approved from the email. Anything else
  // (already confirmed, cancelled by the guest, stay started) is reported as is.
  if (inquiry.status === "SCHEDULED") return res.json({ ok: true, alreadyConfirmed: true, booking: summary() });
  if (inquiry.status !== "PENDING") return res.status(409).json({ error: "This request is no longer pending, so it cannot be approved from email. Open the dashboard.", code: "BOOKING_NOT_PENDING", booking: summary() });
  const result = await changeBookingStatus(inquiry.id, "SCHEDULED");
  return res.status(result.httpStatus).json(result.httpStatus === 200 ? { ok: true, alreadyConfirmed: false, calendarSync: result.body.calendarSync, booking: { ...summary(), status: "SCHEDULED" } } : result.body);
}
