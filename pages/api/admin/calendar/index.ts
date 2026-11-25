import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Calendar connection settings. GET reports status (never tokens), POST saves
// which calendar receives booking events, DELETE disconnects Google entirely.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method === "GET") {
    const connection = await prisma.calendarConnection.findUnique({ where: { id: "primary" } });
    const eventCount = await prisma.bookingCalendarEvent.count();
    return res.json({
      connected: Boolean(connection),
      connectedEmail: connection?.connectedEmail ?? "",
      calendarId: connection?.calendarId ?? "",
      calendarName: connection?.calendarName ?? "",
      eventCount,
    });
  }
  if (req.method === "POST") {
    const calendarId = clean(req.body.calendarId, 300);
    const calendarName = clean(req.body.calendarName, 120);
    if (!calendarId) return res.status(400).json({ error: "Enter the Google Calendar ID.", code: "CALENDAR_ID_REQUIRED" });
    const connection = await prisma.calendarConnection.findUnique({ where: { id: "primary" } });
    if (!connection) return res.status(409).json({ error: "Connect Google first, then choose the calendar.", code: "CONNECT_GOOGLE_FIRST" });
    await prisma.calendarConnection.update({ where: { id: "primary" }, data: { calendarId, calendarName } });
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await prisma.calendarConnection.deleteMany({ where: { id: "primary" } });
    return res.json({ ok: true });
  }
  return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
}
