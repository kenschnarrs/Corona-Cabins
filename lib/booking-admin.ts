import { BookingStatus } from "@prisma/client";
import prisma from "./prisma";
import { effectiveBookingStatus, findBookingConflicts, isCancelledStatus, MANAGEMENT_TARGET_STATUSES, managementTransitionError, ManagementTransitionErrorCode } from "./booking";
import { syncBookingCalendarTransition } from "./google-calendar";
import { sendBookingCancelledEmail, sendBookingScheduledEmail } from "./email";

export type StatusChangeResult = { httpStatus: number; body: Record<string, unknown> };

/**
 * The one management status change: validation, availability re-check,
 * calendar sync, and guest email. Shared by the dashboard (PATCH
 * /api/admin/bookings/[id]) and the confirm-from-email link, so both paths
 * enforce exactly the same rules.
 */
export async function changeBookingStatus(inquiryId: string, requested: unknown): Promise<StatusChangeResult> {
  const status = typeof requested === "string" ? requested as BookingStatus : null;
  if (!status || !Object.values(BookingStatus).includes(status)) return { httpStatus: 400, body: { error: "Invalid status.", code: "INVALID_STATUS" } };
  const current = await prisma.inquiry.findUnique({ where: { id: inquiryId }, include: { cabins: { include: { cabin: { select: { name: true } } } } } });
  if (!current) return { httpStatus: 404, body: { error: "Booking request not found.", code: "ADMIN_BOOKING_NOT_FOUND" } };
  if (!MANAGEMENT_TARGET_STATUSES.includes(status)) return { httpStatus: 400, body: { error: "Management may set pending, scheduled, or management cancelled.", code: "INVALID_MANAGEMENT_STATUS" } };
  const firstStay = current.cabins[0];
  const effective = effectiveBookingStatus(current.status, firstStay?.startDate ?? current.created_at, firstStay?.endDate);
  const transitionError = managementTransitionError(effective, status);
  if (transitionError) {
    const transitionMessages: Record<ManagementTransitionErrorCode, string> = {
      STAY_ALREADY_STARTED: "A stay that has already started can no longer be changed.",
      REQUEST_ALREADY_CANCELLED: "This booking request is already cancelled.",
    };
    return { httpStatus: 409, body: { error: transitionMessages[transitionError], code: transitionError } };
  }
  // Confirming always re-checks availability; reactivating a cancelled request
  // blocks its dates again, so it must pass the same check.
  if (status === "SCHEDULED" || isCancelledStatus(current.status)) {
    for (const item of current.cabins) {
      const conflicts = await findBookingConflicts(prisma, [item.cabinId], item.startDate, item.endDate, current.id);
      if (conflicts.length) return { httpStatus: 409, body: { error: `${conflicts[0].cabinName} is no longer available.`, code: "CABIN_NO_LONGER_AVAILABLE", cabin: conflicts[0].cabinName } };
    }
  }
  const booking = await prisma.inquiry.update({ where: { id: current.id }, data: { status } });
  // Confirmed bookings land on the admin Google Calendar; pending and
  // cancelled bookings come off it. A calendar outage never fails the booking
  // change itself - the outcome is reported so the admin can re-sync.
  const calendarSync = await syncBookingCalendarTransition(current.id, status);
  const emailBooking = {
    customerName: current.customer_name,
    customerEmail: current.customer_email,
    locale: current.locale === "en" ? "en" as const : "es" as const,
    requestNumber: current.request_number,
    stays: current.cabins.map((stay) => ({ cabinName: stay.cabin.name, startDate: stay.startDate, endDate: stay.endDate })),
  };
  if (status === "SCHEDULED" && current.status !== "SCHEDULED") await sendBookingScheduledEmail(emailBooking);
  if (status === "MANAGEMENT_CANCELLED" && !isCancelledStatus(current.status)) await sendBookingCancelledEmail(emailBooking);
  return { httpStatus: 200, body: { ...booking, calendarSync } };
}
