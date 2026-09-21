import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";
import { findBookingConflicts } from "../../../../lib/booking";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const status = typeof req.body.status === "string" ? req.body.status as BookingStatus : null;
  if (!status || !Object.values(BookingStatus).includes(status)) return res.status(400).json({ error: "Invalid status." });
  const current = await prisma.inquiry.findUnique({ where: { id: String(req.query.id) }, include: { cabins: true } });
  if (!current) return res.status(404).json({ error: "Booking request not found." });
  if (status === "CONFIRMED") {
    for (const item of current.cabins) {
      const conflicts = await findBookingConflicts(prisma, [item.cabinId], item.startDate, item.endDate);
      const other = conflicts.filter((c) => c.cabinId !== item.cabinId || current.status === "CANCELLED" || current.status === "DECLINED");
      if (other.length) return res.status(409).json({ error: `${other[0].cabinName} is no longer available.` });
    }
  }
  const booking = await prisma.inquiry.update({ where: { id: current.id }, data: { status } });
  return res.json(booking);
}
