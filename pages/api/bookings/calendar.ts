import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getBlockedRanges } from "../../../lib/availability";

// Public, read-only: blocked date ranges per cabin for the guest calendar.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" });
  }
  try {
    const blocked = await getBlockedRanges(prisma);
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res.json({ blocked });
  } catch (error) {
    console.error("Calendar availability failed", error);
    return res.status(500).json({ error: "Availability is temporarily unavailable. Please try again.", code: "AVAILABILITY_UNAVAILABLE" });
  }
}
