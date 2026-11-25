import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";
import { syncAllScheduledBookings } from "../../../../lib/google-calendar";

// Manual backfill / repair: pushes every scheduled booking to the connected
// calendar (creating or updating its events).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const connection = await prisma.calendarConnection.findUnique({ where: { id: "primary" } });
  if (!connection?.calendarId) return res.status(409).json({ error: "Connect Google and set the calendar ID first." });
  const result = await syncAllScheduledBookings();
  return res.json(result);
}
