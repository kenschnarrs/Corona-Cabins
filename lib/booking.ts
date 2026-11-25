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

/**
 * Machine-readable codes for guest-facing validation failures. APIs return
 * the code alongside the English message so the site can show the guest the
 * same error in their own language (see the `errors` dictionary).
 */
export type StayDateErrorCode =
  | "INVALID_DATES"
  | "DEPARTURE_NOT_AFTER_ARRIVAL"
  | "ARRIVAL_NOT_FUTURE"
  | "DATES_TOO_FAR";

export class StayDateError extends Error {
  constructor(public code: StayDateErrorCode, message: string) {
    super(message);
    this.name = "StayDateError";
  }
}

export function parseStayDates(start: unknown, end: unknown) {
  if (typeof start !== "string" || typeof end !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new StayDateError("INVALID_DATES", "Choose valid arrival and departure dates.");
  }
  const startDate = new Date(`${start}T${String(CHECK_IN_HOUR).padStart(2, "0")}:00:00.000Z`);
  const endDate = new Date(`${end}T${String(CHECK_OUT_HOUR).padStart(2, "0")}:00:00.000Z`);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
    throw new StayDateError("DEPARTURE_NOT_AFTER_ARRIVAL", "Departure must be after arrival.");
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const arrivalDay = new Date(startDate);
  arrivalDay.setUTCHours(0, 0, 0, 0);
  // Same-day check-in is not offered: arrival must be a future date, so
  // past days AND today are rejected together.
  if (arrivalDay <= today) throw new StayDateError("ARRIVAL_NOT_FUTURE", "Arrival must be tomorrow or later; same-day check-in is not available.");
  const max = new Date(today);
  max.setUTCFullYear(max.getUTCFullYear() + 2);
  if (endDate > max) throw new StayDateError("DATES_TOO_FAR", "Dates must be within the next two years.");
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
 * Ken's lifecycle: management may reactivate a cancelled request to PENDING or
 * SCHEDULED (the caller must then re-run the conflict check, since the freed
 * dates may have been booked since), but a stay that already started is over
 * the line for management edits. Callers pass the EFFECTIVE status: ACTIVE and
 * COMPLETED are time-derived and never stored.
 */
export function isCancelledStatus(status: StoredBookingStatus): boolean {
  return status === "CUSTOMER_CANCELLED" || status === "MANAGEMENT_CANCELLED";
}

// Returns a machine-readable code; the admin API pairs it with the English
// fallback message and the admin UI maps the code into the admin's language.
export type ManagementTransitionErrorCode = "STAY_ALREADY_STARTED" | "REQUEST_ALREADY_CANCELLED";

export function managementTransitionError(current: StoredBookingStatus, target: StoredBookingStatus): ManagementTransitionErrorCode | null {
  if (current === "ACTIVE" || current === "COMPLETED") return "STAY_ALREADY_STARTED";
  if (isCancelledStatus(current) && target === "MANAGEMENT_CANCELLED") return "REQUEST_ALREADY_CANCELLED";
  return null;
}
