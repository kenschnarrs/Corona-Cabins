import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { findBookingConflicts, parseStayDates } from "../../../lib/booking";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const cabinIds = Array.isArray(req.body.cabinIds) ? req.body.cabinIds.filter((id: unknown): id is string => typeof id === "string") : [];
  if (!cabinIds.length || cabinIds.length > 10 || new Set(cabinIds).size !== cabinIds.length) return res.status(400).json({ error: "Choose at least one cabin." });
  try {
    const { startDate, endDate } = parseStayDates(req.body.startDate, req.body.endDate);
    const existing = await prisma.cabin.findMany({ where: { id: { in: cabinIds } }, select: { id: true } });
    if (existing.length !== cabinIds.length) return res.status(400).json({ error: "One or more selected cabins no longer exist." });
    const conflicts = await findBookingConflicts(prisma, cabinIds, startDate, endDate);
    return res.json({ available: conflicts.length === 0, conflicts });
  } catch (error) {
    if (error instanceof Error && ["Choose valid arrival and departure dates.", "Departure must be after arrival.", "Arrival cannot be in the past.", "Dates must be within the next two years."].includes(error.message)) return res.status(400).json({ error: error.message });
    console.error("Availability check failed", error);
    return res.status(500).json({ error: "Availability is temporarily unavailable. Please try again." });
  }
}
