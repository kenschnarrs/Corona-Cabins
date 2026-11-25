import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireCustomer } from "../../../../lib/customer-api";
import { effectiveBookingStatus } from "../../../../lib/booking";
import { syncBookingCalendarTransition } from "../../../../lib/google-calendar";
import { sendBookingCancelledEmail } from "../../../../lib/email";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireCustomer(req, res); if (!auth) return;
  if (req.method !== "PATCH") { res.setHeader("Allow", "PATCH"); return res.status(405).json({ error: "Method not allowed." }); }
  if (req.body.action !== "cancel") return res.status(400).json({ error: "Invalid action." });
  const booking = await prisma.inquiry.findFirst({ where: { id: String(req.query.id), customer_email: auth.email }, include: { cabins: { include: { cabin: { select: { name: true } } } } } });
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  const effective = effectiveBookingStatus(booking.status, booking.cabins[0]?.startDate ?? booking.created_at, booking.cabins[0]?.endDate);
  if (!["PENDING", "SCHEDULED"].includes(effective)) return res.status(409).json({ error: "This booking can no longer be cancelled by the customer." });
  const updated = await prisma.inquiry.update({ where: { id: booking.id }, data: { status: "CUSTOMER_CANCELLED" } });
  const calendarSync = await syncBookingCalendarTransition(booking.id, "CUSTOMER_CANCELLED");
  await sendBookingCancelledEmail({
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    locale: booking.locale === "en" ? "en" as const : "es" as const,
    stays: booking.cabins.map((stay) => ({ cabinName: stay.cabin.name, startDate: stay.startDate, endDate: stay.endDate })),
  });
  return res.json({ ...updated, calendarSync });
}
