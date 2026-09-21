import type { PrismaClient } from "@prisma/client";

export const CLEANING_BUFFER_HOURS = 8;
export const CHECK_IN_HOUR = 13;
export const CHECK_OUT_HOUR = 12;

export type BookingConflict = {
  cabinId: string;
  cabinName: string;
  unavailableFrom: string;
  unavailableUntil: string;
};

export function parseStayDates(start: unknown, end: unknown) {
  if (typeof start !== "string" || typeof end !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error("Choose valid arrival and departure dates.");
  }
  const startDate = new Date(`${start}T${String(CHECK_IN_HOUR).padStart(2, "0")}:00:00.000Z`);
  const endDate = new Date(`${end}T${String(CHECK_OUT_HOUR).padStart(2, "0")}:00:00.000Z`);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
    throw new Error("Departure must be after arrival.");
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (startDate < today) throw new Error("Arrival cannot be in the past.");
  const max = new Date(today);
  max.setUTCFullYear(max.getUTCFullYear() + 2);
  if (endDate > max) throw new Error("Dates must be within the next two years.");
  return { startDate, endDate };
}

export async function findBookingConflicts(
  db: Pick<PrismaClient, "cabinInquiry">,
  cabinIds: string[],
  startDate: Date,
  endDate: Date
): Promise<BookingConflict[]> {
  const bufferMs = CLEANING_BUFFER_HOURS * 60 * 60 * 1000;
  const bufferedStart = new Date(startDate.getTime() - bufferMs);
  const bufferedEnd = new Date(endDate.getTime() + bufferMs);
  const rows = await db.cabinInquiry.findMany({
    where: {
      cabinId: { in: cabinIds },
      inquiry: { status: { in: ["PENDING", "CONFIRMED"] } },
      startDate: { lt: bufferedEnd },
      endDate: { gt: bufferedStart },
    },
    include: { cabin: { select: { name: true } } },
    orderBy: { startDate: "asc" },
  });
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (seen.has(row.cabinId)) return [];
    seen.add(row.cabinId);
    return [{
      cabinId: row.cabinId,
      cabinName: row.cabin.name,
      unavailableFrom: row.startDate.toISOString().slice(0, 10),
      unavailableUntil: row.endDate.toISOString().slice(0, 10),
    }];
  });
}
