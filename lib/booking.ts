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

export type ConflictWhere = {
  cabinId: { in: string[] };
  inquiryId?: { not: string };
  inquiry: { status: { in: StoredBookingStatus[] } };
  startDate: { lt: Date };
  endDate: { gt: Date };
};

/**
 * Overlap window for one cabin stay, including the cleaning buffer.
 * The booking being confirmed/examined is excluded on the CabinInquiry row
 * itself (inquiryId lives there, not on the Inquiry relation filter).
 */
export function bookingConflictWhere(cabinIds: string[], startDate: Date, endDate: Date, excludeInquiryId?: string): ConflictWhere {
  const bufferMs = CLEANING_BUFFER_HOURS * 60 * 60 * 1000;
  return {
    cabinId: { in: cabinIds },
    ...(excludeInquiryId ? { inquiryId: { not: excludeInquiryId } } : {}),
    inquiry: { status: { in: ["PENDING", "SCHEDULED", "ACTIVE"] } },
    startDate: { lt: new Date(endDate.getTime() + bufferMs) },
    endDate: { gt: new Date(startDate.getTime() - bufferMs) },
  };
}

export async function findBookingConflicts(
  db: Pick<PrismaClient, "cabinInquiry">,
  cabinIds: string[],
  startDate: Date,
  endDate: Date,
  excludeInquiryId?: string
): Promise<BookingConflict[]> {
  const rows = await db.cabinInquiry.findMany({
    where: bookingConflictWhere(cabinIds, startDate, endDate, excludeInquiryId),
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


export type StoredBookingStatus = "PENDING" | "SCHEDULED" | "CUSTOMER_CANCELLED" | "MANAGEMENT_CANCELLED" | "ACTIVE" | "COMPLETED";

/** ACTIVE is displayed from real time; no scheduler or background mutation is needed. */
export function effectiveBookingStatus(status: StoredBookingStatus, startDate: Date, endDate?: Date, now = new Date()): StoredBookingStatus {
  if (status === "CUSTOMER_CANCELLED" || status === "MANAGEMENT_CANCELLED") return status;
  if ((status === "SCHEDULED" || status === "ACTIVE" || status === "COMPLETED") && endDate && now >= endDate) return "COMPLETED";
  if (status === "SCHEDULED" && now >= startDate) return "ACTIVE";
  return status;
}

export const MANAGEMENT_TARGET_STATUSES: StoredBookingStatus[] = ["PENDING", "SCHEDULED", "MANAGEMENT_CANCELLED"];

/**
 * Ken's lifecycle: a cancellation (by customer or management) is final, and a
 * stay that already started is over the line for management edits. ACTIVE and
 * COMPLETED are time-derived and never stored, so the second branch is a
 * defensive guard only.
 */
export function managementTransitionError(current: StoredBookingStatus): string | null {
  if (current === "CUSTOMER_CANCELLED" || current === "MANAGEMENT_CANCELLED") return "Cancelled booking requests are final and cannot be changed.";
  if (current === "ACTIVE" || current === "COMPLETED") return "A stay that has already started can no longer be changed.";
  return null;
}
