import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";
import { effectiveBookingStatus, findBookingConflicts, isCancelledStatus, MANAGEMENT_TARGET_STATUSES, managementTransitionError } from "../../../../lib/booking";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const status = typeof req.body.status === "string" ? req.body.status as BookingStatus : null;
  if (!status || !Object.values(BookingStatus).includes(status)) return res.status(400).json({ error: "Invalid status." });
  const current = await prisma.inquiry.findUnique({ where: { id: String(req.query.id) }, include: { cabins: true } });
  if (!current) return res.status(404).json({ error: "Booking request not found." });
  if (!MANAGEMENT_TARGET_STATUSES.includes(status)) return res.status(400).json({ error: "Management may set pending, scheduled, or management cancelled." });
  const firstStay = current.cabins[0];
  const effective = effectiveBookingStatus(current.status, firstStay?.startDate ?? current.created_at, firstStay?.endDate);
  const transitionError = managementTransitionError(effective, status);
  if (transitionError) return res.status(409).json({ error: transitionError });
  // Confirming always re-checks availability; reactivating a cancelled request
  // blocks its dates again, so it must pass the same check.
  if (status === "SCHEDULED" || isCancelledStatus(current.status)) {
    for (const item of current.cabins) {
      const conflicts = await findBookingConflicts(prisma, [item.cabinId], item.startDate, item.endDate, current.id);
      if (conflicts.length) return res.status(409).json({ error: `${conflicts[0].cabinName} is no longer available.` });
    }
  }
  const booking = await prisma.inquiry.update({ where: { id: current.id }, data: { status } });
  return res.json(booking);
}
